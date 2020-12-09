import {compare, genSalt, hash} from 'bcryptjs';
import {createHash} from 'crypto';
import {decode,encode} from 'jwt-simple';
import {has as hasLang} from 'langs';
import {join,resolve} from 'path';
import randomstring from 'randomstring';
import slugify from 'slugify';
import { v4 as uuidV4 } from 'uuid';
import logger from 'winston';

import {getSongCountForUser, getSongTimeSpentForUser} from '../dao/kara';
import { addUser as DBAddUser,
	checkNicknameExists as DBCheckNicknameExists,
	deleteUser as DBDeleteUser,
	editUser as DBEditUser,
	findFingerprint as DBFindFingerprint,
	getRandomGuest as DBGetRandomGuest,
	getUser as DBGetUser,
	listGuests as DBListGuests,
	listUsers as DBListUsers,
	lowercaseAllUsers,
	mergeUserData,
	reassignToUser as DBReassignToUser,
	resetGuestsPassword as DBResetGuestsPassword,
	selectAllDupeUsers,
	updateExpiredUsers as DBUpdateExpiredUsers,
	updateUserFingerprint as DBUpdateUserFingerprint,
	updateUserLastLogin as DBUpdateUserLastLogin,
	updateUserPassword as DBUpdateUserPassword} from '../dao/user';
import {User} from '../lib/types/user';
import {getConfig, resolvedPathAvatars,resolvedPathTemp, setConfig} from '../lib/utils/config';
import {imageFileTypes} from '../lib/utils/constants';
import {asyncCopy, asyncExists, asyncReadDir, asyncStat, asyncUnlink, detectFileType} from '../lib/utils/files';
import {emitWS} from '../lib/utils/ws';
import {Config} from '../types/config';
import { DBGuest } from '../types/database/user';
import {UserOpts} from '../types/user';
import {defaultGuestNames} from '../utils/constants';
import sentry from '../utils/sentry';
import {getState} from '../utils/state';
import { addToFavorites, getFavorites } from './favorites';
import { createRemoteUser, editRemoteUser, getUsersFetched } from './userOnline';

const userLoginTimes = new Map();

/** Unflag connected accounts from database if they expired	 */
async function updateExpiredUsers() {
	try {
		const time = new Date().getTime() - (getConfig().Frontend.AuthExpireTime * 60 * 1000);
		await DBUpdateExpiredUsers(new Date(time));
		await DBResetGuestsPassword();
	} catch(err) {
		logger.error('Expiring users failed (will try again in one minute)', {service: 'User', obj: err});
	}
}

/** Create JSON Web Token from timestamp, JWT Secret, role and username */
export function createJwtToken(username: string, role: string, config?: Config): string {
	const conf = config || getConfig();
	const timestamp = new Date().getTime();
	return encode(
		{ username, iat: timestamp, role },
		conf.App.JwtSecret
	);
}

/** Decode token to see if it matches */
export function decodeJwtToken(token: string, config?: Config) {
	const conf = config || getConfig();
	return decode(token, conf.App.JwtSecret);
}

/** To avoid flooding database UPDATEs, only update login time every 5 minute for a user */
export function updateLastLoginName(login: string) {
	if (!userLoginTimes.has(login)) {
		userLoginTimes.set(login, new Date());
		DBUpdateUserLastLogin(login);
	}
	if (userLoginTimes.get(login) < new Date(new Date().getTime() - (60 * 1000))) {
		userLoginTimes.set(login, new Date());
		DBUpdateUserLastLogin(login);
	}
}

/** Edit local user profile */
export async function editUser(username: string, user: User, avatar: Express.Multer.File, role: string, opts: UserOpts = {
	editRemote: true,
	renameUser: false,
	noPasswordCheck: false
}) {
	username = username.toLowerCase();
	try {
		const currentUser = await findUserByName(username);
		if (!currentUser) throw {code: 404, msg: 'USER_NOT_EXISTS'};
		if (currentUser.type === 2 && role !== 'admin') throw {code: 403, msg: 'Guests are not allowed to edit their profiles'};
		// If we're renaming a user, user.login is going to be set to something different than username
		if (!opts.renameUser) user.login = username;
		user.old_login = username;
		if (!user.bio) user.bio = null;
		if (!user.url) user.url = null;
		if (!user.email) user.email = null;
		if (!user.nickname) user.nickname = currentUser.nickname;
		if (!user.series_lang_mode && user.series_lang_mode !== 0) user.series_lang_mode = -1;
		if (user.series_lang_mode < -1 || user.series_lang_mode > 4) throw {code: 400, msg: 'Invalid series_lang_mode'};
		if (user.main_series_lang && !hasLang('2B', user.main_series_lang)) throw {code: 400, msg: `main_series_lang is not a valid ISO639-2B code (received ${user.main_series_lang})`};
		if (user.fallback_series_lang && !hasLang('2B', user.fallback_series_lang)) throw {code: 400, msg: `fallback_series_lang is not a valid ISO639-2B code (received ${user.fallback_series_lang})`};
		if (user.type === 0 && role !== 'admin') throw {code: 403, msg: 'Admin flag permission denied'};
		if (user.type !== 0 && !user.type) user.type = currentUser.type;
		if (user.type && +user.type !== currentUser.type && role !== 'admin') throw {code: 403, msg: 'Only admins can change a user\'s type'};
		// Check if login already exists.
		if (currentUser.nickname !== user.nickname && await DBCheckNicknameExists(user.nickname)) throw {code: 409, msg: 'Nickname already exists'};
		// Tutorial done is local only, so it's not transferred from KM Server for online users, so we'll check out with currentUser.
		if (user.flag_tutorial_done === undefined) user.flag_tutorial_done = currentUser.flag_tutorial_done;
		if (avatar?.path) {
			// If a new avatar was sent, it is contained in the avatar object
			// Let's move it to the avatar user directory and update avatar info in database
			// If the user is remote, we keep the avatar's original filename since it comes from KM Server.
			try {
				user.avatar_file = await replaceAvatar(currentUser.avatar_file, avatar);
			} catch(err) {
				//Non-fatal
				logger.warn('', {service: 'User', obj: err});
			}
		} else {
			user.avatar_file = currentUser.avatar_file;
		}
		await DBEditUser(user);
		logger.debug(`${username} (${user.nickname}) profile updated`, {service: 'User'});
		let KMServerResponse: any;
		try {
			if (user.login.includes('@') && opts.editRemote && +getConfig().Online.Users) KMServerResponse = await editRemoteUser(user);
		} catch(err) {
			logger.warn(err, {service: 'RemoteUser'});
			throw {code: 500};
		}
		// Modifying passwords is not allowed in demo mode
		if (user.password && !getState().isDemo) {
			if (!opts.noPasswordCheck && user.password.length < 8) throw {code: 400, msg: 'PASSWORD_TOO_SHORT'};
			user.password = await hashPasswordbcrypt(user.password);
			await DBUpdateUserPassword(user.login,user.password);
		}
		emitWS('userUpdated', username);
		return {
			user,
			onlineToken: KMServerResponse?.token
		};
	} catch (err) {
		logger.error(`Failed to update ${username}'s profile`, {service: 'User', obj: err});
		if (!err.msg) err.msg = 'USER_EDIT_ERROR';
		throw err;
	}
}

/** Get all guest users */
export function listGuests(): Promise<DBGuest[]> {
	return DBListGuests();
}

/** Get all users (including guests) */
export function listUsers(): Promise<User[]> {
	return DBListUsers();
}

/** Replace old avatar image by new one sent from editUser or createUser */
async function replaceAvatar(oldImageFile: string, avatar: Express.Multer.File): Promise<string> {
	try {
		const fileType = await detectFileType(avatar.path);
		if (!imageFileTypes.includes(fileType.toLowerCase())) throw 'Wrong avatar file type';
		// Construct the name of the new avatar file with its ID and filetype.
		const newAvatarFile = `${uuidV4()}.${fileType}`;
		const newAvatarPath = resolve(resolvedPathAvatars(), newAvatarFile);
		const oldAvatarPath = resolve(resolvedPathAvatars(), oldImageFile);
		if (await asyncExists(oldAvatarPath) &&
			oldImageFile !== 'blank.png') {
			try {
				await asyncUnlink(oldAvatarPath);
			} catch(err) {
				logger.warn(`Unable to unlink old avatar ${oldAvatarPath}`, {service: 'User', obj: err});
			}
		}
		try {
			await asyncCopy(avatar.path, newAvatarPath, {overwrite: true});
		} catch(err) {
			logger.error(`Could not copy new avatar ${avatar.path} to ${newAvatarPath}`, {service: 'User', obj: err});
		}
		return newAvatarFile;
	} catch (err) {
		sentry.error(err);
		throw `Unable to replace avatar ${oldImageFile} with ${avatar.path} : ${err}`;
	}
}

/** Get user by its name, with non-public info like password and mail removed (or not) */
export async function findUserByName(username: string, opt = {
	public: false
}): Promise<User> {
	if (!username) throw('No user provided');
	username = username.toLowerCase();
	//Check if user exists in db
	const userdata = await DBGetUser(username);
	if (userdata) {
		if (!userdata.bio || opt.public) userdata.bio = null;
		if (!userdata.url || opt.public) userdata.url = null;
		if (!userdata.email || opt.public) userdata.email = null;
		if (opt.public) {
			userdata.password = null;
			userdata.fingerprint = null;
		}
		return userdata;
	}
	return null;
}

/** Hash passwords with sha256 */
export function hashPassword(password: string): string {
	const hash = createHash('sha256');
	hash.update(password);
	return hash.digest('hex');
}

/** Hash passwords with bcrypt */
export async function hashPasswordbcrypt(password: string): Promise<string> {
	return hash(password, await genSalt(10));
}


/** Check if password matches or if user type is 2 (guest) and password in database is empty. */
export async function checkPassword(user: User, password: string): Promise<boolean> {
	// First we test if password needs to be updated to new hash
	const hashedPasswordSHA = hashPassword(password);
	const hashedPasswordbcrypt = await hashPasswordbcrypt(password);

	if (user.password === hashedPasswordSHA) {
		// Needs update to bcrypt hashed password
		await DBUpdateUserPassword(user.login, hashedPasswordbcrypt);
		user.password = hashedPasswordbcrypt;
	}

	if (await compare(password, user.password) || (user.type === 2 && !user.password)) {
		// If password was empty for a guest, we set it to the password given on login (which is its device fingerprint).
		if (user.type === 2 && !user.password) await DBUpdateUserPassword(user.login, hashedPasswordbcrypt);
		return true;
	}
	return false;
}

/** Checks database for a user's fingerprint */
export async function findFingerprint(fingerprint: string): Promise<string> {
	// If fingerprint is present we return the login name of that user
	// If not we find a new guest account to assign to the user.
	let guest = await DBFindFingerprint(fingerprint);
	if (getState().isTest) logger.debug('Guest matches fingerprint: ', {service: 'User', obj: guest});
	if (guest) return guest;
	guest = await DBGetRandomGuest();
	if (getState().isTest) logger.debug('New guest logging in: ', {service: 'User', obj: guest});
	if (!guest) return null;
	await DBUpdateUserPassword(guest, await hashPasswordbcrypt(fingerprint));
	return guest;
}

/** Update a guest user's fingerprint */
export function updateUserFingerprint(username: string, fingerprint: string) {
	return DBUpdateUserFingerprint(username, fingerprint);
}

/** Create ADMIN user only if security code matches */
export function createAdminUser(user: User, remote: boolean, requester: User) {
	if (requester.type === 0 || user.securityCode === getState().securityCode) {
		return createUser(user, { createRemote: remote, admin: true });
	} else {
		throw {code: 403, msg: 'Wrong security code'};
	}
}

/** Create new user (either local or online. Defaults to online) */
export async function createUser(user: User, opts: UserOpts = {
	admin: false,
	createRemote: true,
	noPasswordCheck: false
}) {
	user.type = user.type || 1;
	if (opts.admin) user.type = 0;
	user.nickname = user.nickname || user.login;
	user.login = user.login.toLowerCase();
	user.last_login_at = new Date();
	user.avatar_file = user.avatar_file || 'blank.png';
	user.flag_online = user.flag_online || false;

	user.bio = user.bio || null;
	user.url = user.url || null;
	user.email = user.email || null;
	if (user.type === 2) user.flag_online = false;

	try {
		await newUserIntegrityChecks(user);
		if (user.login.includes('@')) {
			user.nickname = user.login.split('@')[0];
			// Retry integrity checks
			try {
				await newUserIntegrityChecks(user);
			} catch(err) {
				// If nickname isn't allowed, append something random to it
				user.nickname = `${user.nickname} ${randomstring.generate({
					length: 3,
					charset: 'numeric'
				})}`;
				logger.warn(`Nickname ${user.login.split('@')[0]} already exists in database. New nickname for ${user.login} is ${user.nickname}`, {service: 'User'});
			}
			if (user.login.split('@')[0] === 'admin') throw { code: 403, msg: 'USER_CREATE_ERROR', details: 'Admin accounts are not allowed to be created online' };
			if (!+getConfig().Online.Users) throw { code: 403, msg : 'USER_CREATE_ERROR', details: 'Creating online accounts is not allowed on this instance'};
			if (opts.createRemote) await createRemoteUser(user);
		}
		if (user.password) {
			if (user.password.length < 8 && !opts.noPasswordCheck) throw {code: 411, msg: 'PASSWORD_TOO_SHORT', details: user.password.length};
			user.password = await hashPasswordbcrypt(user.password);
		}
		await DBAddUser(user);
		if (user.type < 2) logger.info(`Created user ${user.login}`, {service: 'User'});
		delete user.password;
		return true;
	} catch (err) {
		logger.error(`Unable to create user ${user.login}`, {service: 'User', obj: err});
		if (!err.msg) err.msg = 'USER_CREATE_ERROR';
		throw err;
	}
}

/** Checks if a user can be created */
async function newUserIntegrityChecks(user: User) {
	if (user.type < 2 && !user.password) throw { code: 400, msg: 'USER_EMPTY_PASSWORD'};
	if (user.type === 2 && user.password) throw { code: 400, msg: 'GUEST_WITH_PASSWORD'};

	// Check if login already exists.
	if (await DBGetUser(user.login) || await DBCheckNicknameExists(user.login)) {
		logger.error(`User/nickname ${user.login} already exists, cannot create it`, {service: 'User'});
		throw { code: 409, msg: 'USER_ALREADY_EXISTS', data: {username: user.login}};
	}
}

/** Remove a user from database */
export async function deleteUser(username: string) {
	try {
		if (username === 'admin') throw {code: 406, msg:  'USER_DELETE_ADMIN_DAMEDESU', details: 'Admin user cannot be deleted as it is necessary for the Karaoke Instrumentality Project'};
		if (!username) throw('No user provided');
		username = username.toLowerCase();
		const user = await findUserByName(username);
		if (!user) throw {code: 404, msg: 'USER_NOT_EXISTS'};
		//Reassign karas and playlists owned by the user to the admin user
		await DBReassignToUser(username, 'admin');
		await DBDeleteUser(username);
		if (getUsersFetched().has(username)) getUsersFetched().delete(username);
		logger.debug(`Deleted user ${username}`, {service: 'User'});
		emitWS('usersUpdated');
		return true;
	} catch (err) {
		logger.error(`Unable to delete user ${username}`, {service: 'User', obj: err});
		if (!err.msg) err.msg = 'USER_DELETE_ERROR';
		throw err;
	}
}

/** Updates all guest avatars with those present in KM's codebase in the assets folder */
async function updateGuestAvatar(user: DBGuest) {
	const bundledAvatarFile = `${slugify(user.login, {
		lower: true,
		remove: /['"!,?()]/g
	})}.jpg`;
	const bundledAvatarPath = join(__dirname, '../../assets/guestAvatars/', bundledAvatarFile);
	if (!await asyncExists(bundledAvatarPath)) {
		// Bundled avatar does not exist for this user, skipping.
		return false;
	}
	let avatarStats: any = {};
	try {
		avatarStats = await asyncStat(resolve(resolvedPathAvatars(), user.avatar_file));
	} catch(err) {
		// It means one avatar has disappeared, we'll put a 0 size on it so the replacement is triggered later
		avatarStats.size = 0;
	}
	const bundledAvatarStats = await asyncStat(bundledAvatarPath);
	if (avatarStats.size !== bundledAvatarStats.size) {
		// bundledAvatar is different from the current guest Avatar, replacing it.
		// Since pkg is fucking up with copy(), we're going to read/write file in order to save it to a temporary directory
		const tempFile = resolve(resolvedPathTemp(), bundledAvatarFile);
		await asyncCopy(bundledAvatarPath, tempFile);
		editUser(user.login, user, {
			fieldname: null,
			path: tempFile,
			originalname: null,
			encoding: null,
			mimetype: null,
			destination: null,
			filename: null,
			buffer: null,
			size: null,
			stream: null,
		}, 'admin', {
			renameUser: false,
			editRemote: false
		}).catch((err) => {
			logger.error(`Unable to change guest avatar for ${user.login}`, {service: 'User', obj: err});
		});
	}
}

/** Check all guests to see if we need to replace their avatars with built-in ones */
async function checkGuestAvatars() {
	logger.debug('Updating default avatars', {service: 'User'});
	const guests = await listGuests();
	guests.forEach(u => updateGuestAvatar(u));
}

/** Create default guest accounts */
async function createDefaultGuests() {
	const guests = await listGuests();
	if (guests.length >= defaultGuestNames.length) return 'No creation of guest account needed';
	const guestsToCreate = [];
	for (const guest of defaultGuestNames) {
		if (!guests.find(g => g.login === guest.toLowerCase())) guestsToCreate.push(guest);
	}
	let maxGuests = guestsToCreate.length;
	if (getState().isTest) maxGuests = 1;
	logger.debug(`Creating ${maxGuests} new guest accounts`, {service: 'User'});
	for (let i = 0; i < maxGuests; i++) {
		if (!await findUserByName(guestsToCreate[i])) await createUser({
			login: guestsToCreate[i],
			type: 2
		});
	}
	logger.debug('Default guest accounts created', {service: 'User'});
}

/** Initializing user auth module */
export async function initUserSystem() {
	// Expired guest accounts will be cleared on launch and every minute via repeating action
	updateExpiredUsers();
	setInterval(updateExpiredUsers, 60000);

	// Check if a admin user exists just in case. If not create it with a random password.
	if (!await findUserByName('admin')) {
		await createUser({
			login: 'admin',
			password: randomstring.generate(8)
		}, {
			admin: true
		});
		setConfig({ App: { FirstRun: true }});
	}

	if (getState().isTest) {
		if (!await findUserByName('adminTest')) {
			await createUser({
				login: 'adminTest',
				password: 'ceciestuntest'
			}, {
				admin: true
			});
		}
		if (!await findUserByName('adminTest2')) {
			await createUser({
				login: 'adminTest2',
				password: 'ceciestuntest'
			}, {
				admin: true
			});
		}
		if (!await findUserByName('publicTest')) {
			await createUser({
				login: 'publicTest',
				password: 'ceciestuntest',
				type: 1
			}, {
				admin: false
			});
		}
	} else {
		if (await findUserByName('adminTest')) deleteUser('adminTest');
		if (await findUserByName('publicTest')) deleteUser('publicTest');
		if (await findUserByName('adminTest2')) deleteUser('adminTest2');
	}

	userChecks();
	if (getState().opt.forceAdminPassword) await generateAdminPassword();
	// Find admin users.
	const users = await listUsers();
	const adminUsers = users
		.filter(u => u.type === 0 && u.login !== 'admin')
		// Sort by last login at in descending order.
		.sort((a, b) => (a.last_login_at < b.last_login_at) ? 1 : -1);
	logger.debug('Admin users', {service: 'User', obj: JSON.stringify(adminUsers)});
	sentry.setUser(adminUsers[0]?.login || 'admin', adminUsers[0]?.email || undefined);
}

/** Performs defaults checks and creations for avatars/guests. This is done synchronously here because these are linked, but userChecks is called asynchronously to speed up init process */
async function userChecks() {
	await createDefaultGuests();
	await checkGuestAvatars();
	await checkUserAvatars();
	await cleanupAvatars();
	await lowercaseMigration();
}

/** Verifies that all avatars are > 0 bytes or exist. If they don't, recopy the blank avatar over them */
async function checkUserAvatars() {
	logger.debug('Checking if all avatars exist', {service: 'User'});
	const users = await listUsers();
	const defaultAvatar = resolve(resolvedPathAvatars(), 'blank.png');
	for (const user of users) {
		const file = resolve(resolvedPathAvatars(), user.avatar_file);
		if (!await asyncExists(file)) {
			await asyncCopy(
				defaultAvatar,
				file,
				{overwrite: true}
			);
		} else {
			const stat = await asyncStat(file);
			if (stat.size === 0) await asyncCopy(
				defaultAvatar,
				file,
				{overwrite: true}
			);
		}
	}
}

/** This is done because updating avatars generate a new name for the file. So unused avatar files are now cleaned up. */
async function cleanupAvatars() {
	logger.debug('Cleaning up unused avatars', {service: 'User'});
	const users = await listUsers();
	const avatars = [];
	for (const user of users) {
		if (!avatars.includes(user.avatar_file)) avatars.push(user.avatar_file);
	}
	const avatarFiles = await asyncReadDir(resolvedPathAvatars());
	for (const file of avatarFiles) {
		const avatar = avatars.find(a => a === file);
		if (!avatar && file !== 'blank.png') {
			const fullFile = resolve(resolvedPathAvatars(), file);
			try {
				logger.debug(`Deleting old file ${fullFile}`, {service: 'Users'});
				await asyncUnlink(fullFile);
			} catch(err) {
				logger.warn(`Failed deleting old file ${fullFile}`, {service: 'Users', obj: err});
				//Non-fatal
			}
		}
	}
	return true;
}

/** Update song quotas for a user */
export async function updateSongsLeft(username: string, playlist_id?: number) {
	const conf = getConfig();
	username = username.toLowerCase();
	const user = await findUserByName(username);
	let quotaLeft: number;
	if (!playlist_id) playlist_id = getState().publicPlaylistID;
	if (user.type >= 1 && +conf.Karaoke.Quota.Type > 0) {
		switch(+conf.Karaoke.Quota.Type) {
		case 2:
			const time = await getSongTimeSpentForUser(playlist_id,username);
			quotaLeft = +conf.Karaoke.Quota.Time - time;
			break;
		default:
		case 1:
			const count = await getSongCountForUser(playlist_id, username);
			quotaLeft = +conf.Karaoke.Quota.Songs - count;
			break;
		}
	} else {
		quotaLeft = -1;
	}
	emitWS('quotaAvailableUpdated', {
		username: user.login,
		quotaLeft: quotaLeft,
		quotaType: +conf.Karaoke.Quota.Type
	});
}

/** Resets admin's password when appFirstRun is set to true. */
export async function generateAdminPassword(): Promise<string> {
	const adminPassword = getState().opt.forceAdminPassword || randomstring.generate(8);
	await editUser('admin',
		{
			password: adminPassword,
			nickname: 'Dummy Plug System',
			type: 0
		},
		null,
		'admin');
	return adminPassword;
}

export async function lowercaseMigration() {
	// First get list of users with double names
	const users = await selectAllDupeUsers();
	if (users.length > 0) {
		// So we have some users who're the same. Let's make a map
		const duplicateUsers = new Map();
		// Regroup users
		for (const user of users) {
			if (duplicateUsers.has(user.pk_login.toLowerCase())) {
				const arr = duplicateUsers.get(user.pk_login.toLowerCase());
				arr.push(user);
				duplicateUsers.set(user.pk_login.toLowerCase(), arr);
			} else {
				duplicateUsers.set(user.pk_login.toLowerCase(), [user]);
			}
		}
		// Now, let's decide what to do.
		for (const [login, dupeUsers] of duplicateUsers.entries()) {
			// First, is it online or local ?
			if (login.includes('@')) {
				// This case is simple, we keep the first one and delete the others.
				// Profile and favorites will be redownloaded anyway.
				// Remove first element of the users array, we'll keep this one.
				dupeUsers.shift();
				for (const user of dupeUsers) {
					await deleteUser(user.pk_login);
				}
			} else {
				// User is local only
				// We take the first user since our SQL query should have ordered by number of favorites and last_login_at first.
				// The only downside to this is the unlucky person who had alot of favorites, and created a second account later and didn't add all the old favorites he had. Poor guy.
				const mainUser = dupeUsers[0].pk_login;
				dupeUsers.shift();
				// We need to merge their data with mainUser
				for (const user of dupeUsers) {
					// Special case for favorites since we may break the unique constraint if the two users had the same favorites.
					const favs = await getFavorites({username: user.pk_login});
					const favsToAdd = favs.content.map(f => f.kid);
					const promises = [
						mergeUserData(user.pk_login, mainUser),
						addToFavorites(mainUser, favsToAdd)
					];
					await Promise.all(promises);
					await deleteUser(user.pk_login);
				}
			}
		}
	}
	// Let's pray this doesn't catch fire.
	try {
		await lowercaseAllUsers();
	} catch(err) {
		logger.error('Unable to lowercase all users', {service: 'User', obj: err});
		sentry.error(err, 'Warning');
	}
}
