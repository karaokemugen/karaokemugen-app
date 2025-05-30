import { compare, genSalt, hash } from 'bcryptjs';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { copy } from 'fs-extra';
import { sign, verify } from 'jsonwebtoken';
import { deburr, merge, sample } from 'lodash';
import { resolve } from 'path';
import randomstring from 'randomstring';
import { v4 as uuidV4 } from 'uuid';

import { selectSongCountForUser, selectSongTimeSpentForUser } from '../dao/playlist.js';
import {
	deleteTempUsers,
	deleteUser,
	insertUser,
	reassignToUser,
	selectUsers,
	updateUser,
	updateUserLastLogin,
	updateUserPassword,
} from '../dao/user.js';
import { DBUser } from '../lib/types/database/user.js';
import { OldJWTToken, User, UserParams } from '../lib/types/user.js';
import { getConfig, resolvedPath, setConfig } from '../lib/utils/config.js';
import { asciiRegexp, imageFileTypes, userRegexp } from '../lib/utils/constants.js';
import { ErrorKM } from '../lib/utils/error.js';
import { detectFileType, fileExists } from '../lib/utils/files.js';
import logger, { profile } from '../lib/utils/logger.js';
import { emitWS } from '../lib/utils/ws.js';
import { Config } from '../types/config.js';
import { UserOpts } from '../types/user.js';
import { defaultGuestNames } from '../utils/constants.js';
import sentry from '../utils/sentry.js';
import { getState } from '../utils/state.js';
import { stopSub } from '../utils/userPubSub.js';
import { resetNewAccountCode } from './auth.js';
import { createRemoteUser, editRemoteUser, getUsersFetched } from './userOnline.js';

const service = 'User';

const userLoginTimes = new Map();

const userCache: Map<string, DBUser> = new Map();

export async function getAvailableGuest() {
	const guest = (await selectUsers({ randomGuest: true }))[0];
	if (!guest) return null;
	if (getState().isTest) logger.debug('New guest logging in: ', { service, obj: guest });
	return guest;
}

/** Create JSON Web Token from timestamp, JWT Secret, role and username */
export function createJwtToken(username: string, role: string, config?: Config): string {
	const conf = config || getConfig();
	return sign({ username, role }, conf.App.JwtSecret);
}

/** Decode token to see if it matches */
export function decodeJwtToken(token: string, config?: Config): OldJWTToken {
	const conf = config || getConfig();
	return verify(token, conf.App.JwtSecret) as any;
}

/** To avoid flooding database UPDATEs, only update login time every 5 minute for a user */
export function updateLastLoginName(login: string) {
	if (!userLoginTimes.has(login)) {
		userLoginTimes.set(login, new Date());
		updateUserLastLogin(login);
	}
	if (userLoginTimes.get(login) < new Date(new Date().getTime() - 60 * 1000)) {
		userLoginTimes.set(login, new Date());
		updateUserLastLogin(login);
	}
}

async function checkNicknameExists(nickname: string) {
	return (
		await selectUsers({
			singleNickname: nickname,
		})
	)[0];
}
/** Edit local user profile */
export async function editUser(
	username: string,
	user: User,
	avatar: Express.Multer.File,
	role: string,
	opts: UserOpts = {
		editRemote: false,
		renameUser: false,
		noPasswordCheck: false,
	}
) {
	try {
		if (!username) throw new ErrorKM('INVALID_DATA', 400, false);
		username = username.trim().toLowerCase();

		if (user.bio) user.bio = user.bio.trim();
		if (user.email) user.email = user.email.trim();
		if (user.nickname) user.nickname = user.nickname.trim();
		if (user.url) user.url = user.url.trim();
		user.login = user.login?.trim().toLowerCase();
		// Banner are not editable through the app
		if (opts.editRemote) delete user.banner;
		const currentUser = await getUser(username, true, true);
		if (!currentUser) throw new ErrorKM('UNKNOWN_USER', 404, false);
		if (currentUser.type === 2 && role !== 'admin') throw new ErrorKM('GUESTS_CANNOT_EDIT', 403, false);
		const mergedUser = merge(currentUser, user);
		delete mergedUser.password;
		if (!mergedUser.social_networks) mergedUser.social_networks = {};
		if (user.password) {
			if (!opts.noPasswordCheck && user.password.length < 8) throw new ErrorKM('PASSWORD_TOO_SHORT', 411);
			const password = await hashPasswordbcrypt(user.password);
			await updateUserPassword(username, password);
		}
		if (user.type && +user.type !== currentUser.type && role !== 'admin') {
			throw new ErrorKM('USER_CANNOT_CHANGE_TYPE', 403, false);
		}
		// If we're renaming a user, mergedUser.login is going to be set to something different than username
		mergedUser.old_login = username;
		// Check if login already exists.
		if (user.nickname && currentUser.nickname !== user.nickname && (await checkNicknameExists(user.nickname))) {
			throw new ErrorKM('NICKNAME_ALREADY_IN_USE', 409, false);
		}
		if (avatar?.path) {
			// If a new avatar was sent, it is contained in the avatar object
			// Let's move it to the avatar user directory and update avatar info in database
			// If the user is remote, we keep the avatar's original filename since it comes from KM Server.
			try {
				mergedUser.avatar_file = await replaceAvatar(currentUser.avatar_file, avatar);
			} catch (err) {
				// Non-fatal
				logger.warn('Cannot replace avatar', { service, obj: err });
			}
		} else {
			mergedUser.avatar_file = currentUser.avatar_file;
		}
		const updatedUser = await updateUser(mergedUser);
		delete updatedUser.password;
		let KMServerResponse: any;
		try {
			if (updatedUser.login.includes('@') && opts.editRemote && getConfig().Online.RemoteUsers.Enabled) {
				KMServerResponse = await editRemoteUser(
					{ ...updatedUser, password: user.password || undefined },
					opts.editRemote,
					!!avatar?.path
				);
			}
		} catch (err) {
			logger.warn('Cannot push user changes to remote', { service, obj: err });
			throw err;
		}
		userCache.set(updatedUser.login, updatedUser);
		emitWS('userUpdated', username);
		logger.debug(`${username} (${mergedUser.nickname}) profile updated`, { service });
		return {
			user: updatedUser,
			onlineToken: KMServerResponse?.token,
		};
	} catch (err) {
		logger.error(`Failed to update ${username}'s profile`, { service, obj: err });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('USER_EDIT_ERROR');
	}
}

/** Get all users (including guests) */
export function getUsers(params: UserParams = {}): Promise<DBUser[]> {
	try {
		return selectUsers(params);
	} catch (err) {
		logger.error(`Error listing users : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('USER_LIST_ERROR');
	}
}

/** Replace old avatar image by new one sent from editUser or createUser */
async function replaceAvatar(oldImageFile: string, avatar: Express.Multer.File): Promise<string> {
	try {
		const fileType = await detectFileType(avatar.path);
		if (!imageFileTypes.includes(fileType.toLowerCase())) throw 'Wrong avatar file type';
		// Construct the name of the new avatar file with its ID and filetype.
		const newAvatarFile = `${uuidV4()}.${fileType}`;
		const newAvatarPath = resolve(resolvedPath('Avatars'), newAvatarFile);
		const oldAvatarPath = resolve(resolvedPath('Avatars'), oldImageFile);
		if ((await fileExists(oldAvatarPath)) && oldImageFile !== 'blank.png') {
			try {
				await fs.unlink(oldAvatarPath);
			} catch (err) {
				logger.warn(`Unable to unlink old avatar ${oldAvatarPath}`, { service, obj: err });
			}
		}
		try {
			await copy(avatar.path, newAvatarPath, { overwrite: true });
		} catch (err) {
			logger.error(`Could not copy new avatar ${avatar.path} to ${newAvatarPath}`, { service, obj: err });
		}
		return newAvatarFile;
	} catch (err) {
		sentry.error(err);
		throw `Unable to replace avatar ${oldImageFile} with ${avatar.path} : ${err}`;
	}
}

/** Get user by its name, with non-public info like password and mail removed (or not) */
export async function getUser(username: string, full = false, showPassword = false, role = 'admin', fromCache = false) {
	try {
		if (!username) throw new ErrorKM('INVALID_DATA', 400, false);
		username = username.toLowerCase();
		if (fromCache) return userCache.get(username);

		// Check if user exists in db
		const userdata = (
			await selectUsers({
				singleUser: username,
				full,
				showPassword,
			})
		)[0];
		if (!userdata?.flag_public && role !== 'admin') throw new ErrorKM('UNKNOWN_USER', 404, false);
		return userdata;
	} catch (err) {
		logger.error(`Error getting user ${username} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('USER_VIEW_ERROR');
	}
}

/** Hash passwords with sha256 */
export function hashPassword(password: string): string {
	const hache = createHash('sha256');
	// Come on, I needed a name different than hash.
	hache.update(password);
	return hache.digest('hex');
}

/** Hash passwords with bcrypt */
export async function hashPasswordbcrypt(password: string): Promise<string> {
	return hash(password, await genSalt(10));
}

/** Check if password matches or if user type is 2 (guest) and password in database is empty. */
export async function checkPassword(user: User, password: string): Promise<boolean> {
	if ((await compare(password, user.password)) || (user.type === 2 && !user.password)) {
		return true;
	}
	delete user.password;
	return false;
}

/** Create ADMIN user only if security code matches */
export function createAdminUser(user: User, remote: boolean, requester: User) {
	if (requester.type === 0 || user.securityCode === getState().securityCode) {
		return createUser(user, { createRemote: remote, admin: true });
	}
	throw { code: 403, msg: 'UNAUTHORIZED' };
}

/** Create new user (either local or online. Defaults to online) */
export async function createUser(
	user: User,
	opts: UserOpts = {
		admin: false,
		createRemote: true,
		noPasswordCheck: false,
	}
) {
	try {
		if (!opts.admin && !getConfig().Frontend.AllowUserCreation) {
			throw new ErrorKM('USER_CREATION_DISABLED', 403, false);
		}
		if (!opts.admin && getConfig().Frontend.RequireSecurityCodeForNewAccounts) {
			if (user.securityCode !== getState().newAccountCode) {
				throw new ErrorKM('USER_CREATION_WRONG_SECURITY_CODE', 403, false);
			}
			resetNewAccountCode();
		}
		user.login = user.login.trim().toLowerCase();
		if (user.password) user.password = user.password.trim();
		if (!user.login.split('@')[0].match(userRegexp)) {
			logger.error(`Invalid user name: ${user.login}`, { service });
			throw new ErrorKM('USER_LOGIN_INVALID', 400, false);
		}
		// If nickname is not supplied, guess one
		user.nickname ||= user.login.includes('@') ? user.login.split('@')[0] : user.login;
		user = {
			last_login_at: new Date(0),
			avatar_file: 'blank.png',
			language: getConfig().App.Language,
			flag_sendstats: null,
			flag_tutorial_done: false,
			type: 1,
			...user,
		};

		if (opts.admin) user.type = 0;
		if (user.type === 2) {
			user.flag_sendstats = true;
			user.language = null;
		}
		if (user.type === undefined) user.type = 1;

		await newUserIntegrityChecks(user).catch(err => {
			if (user.login.includes('@')) {
				// If nickname isn't allowed, append something random to it and retry integrity checks
				user.nickname = `${user.nickname}${randomstring.generate({
					length: 3,
					charset: 'numeric',
				})}`;
				logger.warn(
					`Nickname ${user.login.split('@')[0]} already exists in database. New nickname for ${
						user.login
					} is ${user.nickname}`,
					{ service }
				);
			} else {
				throw err;
			}
			return newUserIntegrityChecks(user);
		});
		if (user.password) {
			if (user.password.length < 8 && !opts.noPasswordCheck) {
				throw new ErrorKM('PASSWORD_TOO_SHORT', 411, false);
			}
		}
		if (user.login.includes('@')) {
			if (user.login.split('@')[0] === 'admin') {
				logger.error('Admin accounts are not allowed to be created online', { service });
				throw new ErrorKM('USER_CREATE_ERROR', 403, false);
			}
			if (!+getConfig().Online.RemoteUsers.Enabled) {
				logger.error('Creating online accounts is not allowed on this instance', { service });
				throw new ErrorKM('USER_CREATE_ERROR_ONLINE_DISABLED', 403, false);
			}
			if (opts.createRemote) await createRemoteUser(user);
		}

		if (user.password) {
			user.password = await hashPasswordbcrypt(user.password);
		}
		await insertUser(user);
		userCache.set(user.login, user);
		if (user.type < 2) logger.info(`Created user ${user.login}`, { service });
		delete user.password;
		return true;
	} catch (err) {
		logger.error(`Error creating user : ${err.message ? err.message : err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('USER_CREATE_ERROR');
	}
}

/** Checks if a user can be created */
async function newUserIntegrityChecks(user: User) {
	if (!asciiRegexp.test(user.login)) throw new ErrorKM('USER_ASCII_CHARACTERS_ONLY', 400, false);
	if (user.type < 2 && !user.password) throw new ErrorKM('USER_EMPTY_PASSWORD', 400, false);
	if (user.type === 2 && user.password) throw new ErrorKM('GUEST_WITH_PASSWORD', 400, false);
	// Check if login already exists.
	if ((await selectUsers({ singleUser: user.login }))[0] || (await checkNicknameExists(user.login))) {
		logger.error(`User/nickname ${user.login} already exists, cannot create it`, { service });
		throw new ErrorKM('USER_ALREADY_EXISTS', 409, false);
	}
}

/** Remove a user from database */
export async function removeUser(username: string) {
	try {
		if (!username) throw new ErrorKM('INVALID_DATA', 400, false);
		if (username === 'admin') {
			logger.error('Admin user cannot be deleted as it is necessary for the Karaoke Instrumentality Project', {
				service,
			});
			throw new ErrorKM('USER_DELETE_ADMIN_DAMEDESU', 406, false);
		}
		username = username.toLowerCase();
		const user = (await selectUsers({ singleUser: username }))[0];
		if (!user) throw new ErrorKM('UNKNOWN_USER', 404, false);
		// Reassign karas and playlists owned by the user to the admin user
		await reassignToUser(username, 'admin');
		await deleteUser(username);
		if (username.includes('@')) {
			const [login, instance] = username.split('@');
			stopSub(login, instance);
		}
		getUsersFetched().delete(username);
		userCache.delete(username);

		logger.debug(`Deleted user ${username}`, { service });
		emitWS('usersUpdated');
		return true;
	} catch (err) {
		logger.error(`Unable to delete user ${username}`, { service, obj: err });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('USER_DELETE_ERROR');
	}
}

/** Updates all guest avatars with those present in KM's codebase in the assets folder */
async function updateGuestAvatar(user: DBUser, random?: boolean) {
	let bundledAvatarFile = '';
	const bundledAvatarAssets = resolve(getState().resourcePath, 'assets/guestAvatars/');
	if (random) {
		const dir = await fs.readdir(bundledAvatarAssets);
		bundledAvatarFile = sample(dir);
	} else {
		bundledAvatarFile = `${user.login}.jpg`;
	}
	const bundledAvatarPath = resolve(bundledAvatarAssets, bundledAvatarFile);
	if (!(await fileExists(bundledAvatarPath))) {
		logger.error(`${bundledAvatarPath} does not exist`, { service });
		// Bundled avatar does not exist for this user, skipping.
		return false;
	}
	let avatarStats: any = {};
	try {
		avatarStats = await fs.stat(resolve(resolvedPath('Avatars'), user.avatar_file));
	} catch (err) {
		// It means one avatar has disappeared, we'll put a 0 size on it so the replacement is triggered later
		avatarStats.size = 0;
	}
	const bundledAvatarStats = await fs.stat(bundledAvatarPath);
	if (avatarStats.size !== bundledAvatarStats.size) {
		// bundledAvatar is different from the current guest Avatar, replacing it.
		editUser(
			user.login,
			user,
			{
				fieldname: null,
				path: bundledAvatarPath,
				originalname: null,
				encoding: null,
				mimetype: null,
				destination: null,
				filename: null,
				buffer: null,
				size: null,
				stream: null,
			},
			'admin',
			{
				renameUser: false,
				editRemote: false,
			}
		).catch(err => {
			logger.error(`Unable to change guest avatar for ${user.login}`, { service, obj: err });
		});
	}
}

/** Check all guests to see if we need to replace their avatars with built-in ones */
async function checkGuestAvatars() {
	logger.debug('Updating default avatars', { service });
	const guests = await getUsers({ guestOnly: true });
	guests.forEach(u => updateGuestAvatar(u));
}

export async function createTemporaryGuest(name: string) {
	const user = {
		login: sanitizeLogin(name),
		nickname: name,
		type: 2,
		flag_temporary: true,
	};
	await createUser(user);
	updateGuestAvatar(user, true);
	return user;
}

/** Sanitize logins, mainly for default guest names */
function sanitizeLogin(login: string): string {
	return deburr(
		login
			.toLowerCase()
			.replaceAll(' ', '_')
			.replaceAll('!', '')
			.replaceAll("'", '')
			.replaceAll('/', '_')
			.replaceAll('<', '')
			.replaceAll('?', '_')
			.replaceAll('"', '')
	);
}

/** Create default guest accounts */
async function createDefaultGuests() {
	const guests = await getUsers({ guestOnly: true });
	if (guests.length >= defaultGuestNames.length) return 'No creation of guest account needed';
	const guestsToCreate = [];
	for (const guest of defaultGuestNames) {
		if (!guests.find(g => g.nickname === guest)) guestsToCreate.push(guest);
	}
	logger.debug(`Creating ${guestsToCreate.length} new guest accounts`, { service });
	for (const guest of guestsToCreate) {
		if (!(await getUser(sanitizeLogin(guest)))) {
			try {
				await createUser({
					login: sanitizeLogin(guest),
					nickname: guest,
					type: 2,
				});
				if (getState().isTest) {
					break;
				}
			} catch (err) {
				// Not a big problem, it probably means the guest account exists already for some reason.
			}
		}
	}
	logger.debug('Default guest accounts created', { service });
}

/** Initializing user auth module */
export async function initUserSystem() {
	// Check if a admin user exists just in case. If not create it with a random password.
	profile('initUserSystem');
	let users = await getUsers();
	if (!users.find(u => u.login === 'admin')) {
		await createUser(
			{
				login: 'admin',
				password: randomstring.generate(8),
			},
			{
				admin: true,
			}
		);

		// User initialisation for headless installations
		if (process.env.INITIAL_USER_NAME && process.env.INITIAL_USER_PASSWORD) {
			try {
				await createUser(
					{
						login: process.env.INITIAL_USER_NAME,
						password: process.env.INITIAL_USER_PASSWORD,
					},
					{
						admin: true,
					}
				);
			} catch (err) {
				logger.error(`Unable to create initial user : ${err}`, { service });
				// This should be fatal because the user will never be re-created with these env vars since the admin user was created one function ago.
				throw err;
			}
		}

		setConfig({ App: { FirstRun: true } });
	}

	if (getState().isTest) {
		if (!users.find(u => u.login === 'admintest')) {
			await createUser(
				{
					login: 'adminTest',
					password: 'ceciestuntest',
				},
				{
					admin: true,
				}
			);
		}
		if (!users.find(u => u.login === 'admintest2')) {
			await createUser(
				{
					login: 'adminTest2',
					password: 'ceciestuntest',
				},
				{
					admin: true,
				}
			);
		}
		if (!users.find(u => u.login === 'publictest')) {
			await createUser(
				{
					login: 'publicTest',
					password: 'ceciestuntest',
					type: 1,
				},
				{
					admin: false,
				}
			);
		}
	} else {
		if (users.find(u => u.login === 'admintest')) deleteUser('adminTest');
		if (users.find(u => u.login === 'publictest')) deleteUser('publicTest');
		if (users.find(u => u.login === 'admintest2')) deleteUser('adminTest2');
	}

	userChecks();
	if (getState().opt.forceAdminPassword) await generateAdminPassword();
	// Find admin users.
	// We are querying again to be sure to have all users listed
	users = await getUsers({ full: true });
	const adminUsers = users
		.filter(u => u.type === 0 && u.login !== 'admin')
		// Sort by last login at in descending order.
		.sort((a, b) => (a.last_login_at < b.last_login_at ? 1 : -1));
	logger.debug('Admin users', { service, obj: JSON.stringify(adminUsers) });
	sentry.setUser(adminUsers[0]?.login || 'admin');

	// Init user cache
	for (const user of users) {
		userCache.set(user.login, user);
	}
	profile('initUserSystem');
}

/** Performs defaults checks and creations for avatars/guests. This is done synchronously here because these are linked, but userChecks is called asynchronously to speed up init process */
async function userChecks() {
	await createDefaultGuests();
	await checkGuestAvatars();
	await checkUserAvatars();
	await deleteTempUsers();
	await cleanupAvatars();
}

/** Verifies that all avatars are > 0 bytes or exist. If they don't, recopy the blank avatar over them */
async function checkUserAvatars() {
	logger.debug('Checking if all avatars exist', { service });
	const users = await getUsers();
	const defaultAvatar = resolve(resolvedPath('Avatars'), 'blank.png');
	for (const user of users) {
		if (!user.avatar_file) {
			logger.warn(`User ${user.login} has no avatar file`, { service });
			continue;
		}
		const file = resolve(resolvedPath('Avatars'), user.avatar_file);
		if (!(await fileExists(file))) {
			await copy(defaultAvatar, file, { overwrite: true });
		} else {
			const fstat = await fs.stat(file);
			if (fstat.size === 0) await copy(defaultAvatar, file, { overwrite: true });
		}
	}
}

/** This is done because updating avatars generate a new name for the file. So unused avatar files are now cleaned up. */
async function cleanupAvatars() {
	logger.debug('Cleaning up unused avatars', { service });
	const users = await getUsers();
	const avatars = [];
	for (const user of users) {
		if (!avatars.includes(user.avatar_file)) avatars.push(user.avatar_file);
	}
	const avatarFiles = await fs.readdir(resolvedPath('Avatars'));
	for (const file of avatarFiles) {
		const avatar = avatars.find(a => a === file);
		if (!avatar && file !== 'blank.png') {
			const fullFile = resolve(resolvedPath('Avatars'), file);
			try {
				logger.debug(`Deleting old file ${fullFile}`, { service });
				await fs.unlink(fullFile);
			} catch (err) {
				logger.warn(`Failed deleting old file ${fullFile}`, { service, obj: err });
				// Non-fatal
			}
		}
	}
	return true;
}

/** Update song quotas for a user */
export async function updateSongsLeft(username: string, plaid?: string) {
	try {
		const conf = getConfig();
		username = username.toLowerCase();
		const user = await getUser(username);
		let quotaLeft: number;
		if (!plaid) plaid = getState().publicPlaid;
		const playlistsToConsider =
			conf?.Karaoke?.Quota?.FreeAcceptedSongs === true
				? [plaid]
				: [getState().publicPlaid, getState().currentPlaid, plaid];
		if (user.type >= 1 && +conf.Karaoke.Quota.Type > 0) {
			switch (+conf.Karaoke.Quota.Type) {
				case 2:
					const time = await selectSongTimeSpentForUser(playlistsToConsider, username);
					quotaLeft = +conf.Karaoke.Quota.Time - time;
					break;
				case 1:
				default:
					const count = await selectSongCountForUser(playlistsToConsider, username);
					quotaLeft = +conf.Karaoke.Quota.Songs - count;
					break;
			}
		} else {
			quotaLeft = -1;
		}
		emitWS('quotaAvailableUpdated', {
			username: user.login,
			quotaLeft,
			quotaType: +conf.Karaoke.Quota.Type,
		});
	} catch (err) {
		logger.error(`Unable to update songs left for user ${username}`, { service, obj: err });
		sentry.error(err);
		// Non-fatal
	}
}

let adminPasswordCache: string;

/** Resets admin's password when appFirstRun is set to true. */
export async function generateAdminPassword(): Promise<string> {
	const adminPassword = adminPasswordCache || getState().opt.forceAdminPassword || randomstring.generate(8);
	await editUser(
		'admin',
		{
			login: 'admin',
			password: adminPassword,
			nickname: 'Dummy Plug System',
			type: 0,
			flag_sendstats: false,
		},
		null,
		'admin'
	);
	adminPasswordCache = adminPassword;
	return adminPassword;
}
