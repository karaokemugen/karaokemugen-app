import {getConfig, setConfig, resolvedPathTemp, resolvedPathAvatars} from '../lib/utils/config';
import {Config} from '../types/config';
import {freePLCBeforePos, getPlaylistContentsMini, freePLC} from './playlist';
import {convertToRemoteFavorites} from './favorites';
import {detectFileType, asyncExists, asyncUnlink, asyncReadDir, asyncCopy, asyncStat, asyncCopyAlt, replaceExt} from '../lib/utils/files';
import {createHash} from 'crypto';
import {resolve, join} from 'path';
import logger from 'winston';
import uuidV4 from 'uuid/v4';
import {imageFileTypes} from '../lib/utils/constants';
import {defaultGuestNames} from '../utils/constants';
import randomstring from 'randomstring';
import {on} from '../lib/utils/pubsub';
import {getSongCountForUser, getSongTimeSpentForUser} from '../dao/kara';
import {emitWS} from '../lib/utils/ws';
import {profile} from '../lib/utils/logger';
import {getState, setState} from '../utils/state';
import got from 'got';
import { getRemoteToken, upsertRemoteToken } from '../dao/user';
import formData from 'form-data';
import { createReadStream } from 'fs';
import { writeStreamToFile } from '../lib/utils/files';
import { fetchAndAddFavorites } from './favorites';
import {encode, decode} from 'jwt-simple';
import {UserOpts, Tokens, SingleToken} from '../types/user';
import {Token, Role, User} from '../lib/types/user';
import { PLC } from '../types/playlist';
import {updateExpiredUsers as DBUpdateExpiredUsers,
	resetGuestsPassword as DBResetGuestsPassword,
	updateUserLastLogin as DBUpdateUserLastLogin,
	checkNicknameExists as DBCheckNicknameExists,
	editUser as DBEditUser,
	updateUserPassword as DBUpdateUserPassword,
	listGuests as DBListGuests,
	listUsers as DBListUsers,
	getUser as DBGetUser,
	findFingerprint as DBFindFingerprint,
	getRandomGuest as DBGetRandomGuest,
	updateUserFingerprint as DBUpdateUserFingerprint,
	addUser as DBAddUser,
	reassignToUser as DBReassignToUser,
	deleteUser as DBDeleteUser
} from '../dao/user';
import {has as hasLang} from 'langs';
import slugify from 'slugify';
import { createCircleAvatar } from '../utils/imageProcessing';

let userLoginTimes = new Map();
let usersFetched = new Set();
let databaseBusy = false;

on('databaseBusy', (status: boolean) => {
	databaseBusy = status;
});

/** Converts a online user to a local one by removing its online account from KM Server */
export async function removeRemoteUser(token: Token, password: string): Promise<SingleToken> {
	const instance = token.username.split('@')[1];
	const username = token.username.split('@')[0];
	// Verify that no local user exists with the name we're going to rename it to
	if (await findUserByName(username)) throw 'User already exists locally, delete it first.';
	// Verify that password matches with online before proceeding
	const onlineToken = await remoteLogin(token.username, password);
	await got(`https://${instance}/api/users`, {
		method: 'DELETE',
		headers: {
			authorization: onlineToken.token
		}
	});
	// Renaming user locally
	const user = await findUserByName(token.username);
	user.login = username;
	await editUser(token.username, user, null, 'admin', {
		editRemote: false,
		renameUser: true
	});
	return {
		token: createJwtToken(user.login, token.role)
	};
}

/** Unflag connected accounts from database if they expired	 */
async function updateExpiredUsers() {
	try {
		if (!databaseBusy) {
			const time = new Date().getTime() - (getConfig().Frontend.AuthExpireTime * 60 * 1000);
			await DBUpdateExpiredUsers(new Date(time));
			await DBResetGuestsPassword();
		}
	} catch(err) {
		logger.error(`[User] Expiring users failed (will try again in one minute) : ${err}`);
	}
}

/** Get remote avatar from KM Server */
export async function fetchRemoteAvatar(instance: string, avatarFile: string): Promise<string> {
	// If this stops working, use got() and a stream: true property again
	const res = await got.stream(`https://${instance}/avatars/${avatarFile}`);
	const avatarPath = resolve(resolvedPathTemp(), avatarFile);
	try {
		await writeStreamToFile(res, avatarPath);
	} catch(err) {
		logger.warn(`[User] Could not write remote avatar to local file ${avatarFile} : ${err}`);
	}
	return avatarPath;
}

/** Login as online user on KM Server and fetch profile data, avatar, favorites and such and upserts them in local database */
export async function fetchAndUpdateRemoteUser(username: string, password: string, onlineToken?: Token): Promise<User> {
	// We try to login to KM Server using the provided login password.
	// If login is successful, we get user profile data and create user if it doesn't exist already in our local database.
	// If it exists, we edit the user instead.
	if (!onlineToken) onlineToken = await remoteLogin(username, password);
	// if OnlineToken is empty, it means we couldn't fetch user data, let's not continue but don't throw an error
	if (onlineToken.token) {
		let remoteUser: User;
		try {
			remoteUser = await getRemoteUser(username, onlineToken.token);
		} catch(err) {
			throw err;
		}
		// Check if user exists. If it does not, create it.
		let user = await findUserByName(username);
		if (!user) {
			await createUser({
				login: username,
				password: password
			}, {
				createRemote: false
			});
		}
		// Update user with new data
		let avatar_file = null;
		if (remoteUser.avatar_file !== 'blank.png') {
			let avatarPath = '';
			try {
				avatarPath = await fetchRemoteAvatar(username.split('@')[1], remoteUser.avatar_file);
			} catch(err) {
				throw err;
			}
			avatar_file = {
				path: avatarPath
			};
		}
		// Checking if user has already been fetched during this session or not
		if (!usersFetched.has(username)) {
			usersFetched.add(username);
			user = await editUser(
				username,
				{
					bio: remoteUser.bio,
					url: remoteUser.url,
					email: remoteUser.email,
					nickname: remoteUser.nickname,
					password: password,
					series_lang_mode: remoteUser.series_lang_mode,
					main_series_lang: remoteUser.main_series_lang,
					fallback_series_lang: remoteUser.fallback_series_lang
				},
				avatar_file,
				'admin',
				{ editRemote: false	}
			);
		}
		user.onlineToken = onlineToken.token;
		return user;
	} else {
		//Onlinetoken was not provided : KM Server might be offline
		//We'll try to find user in local database. If failure return an error
		let user = await findUserByName(username);
		if (!user) throw {code: 'USER_LOGIN_ERROR'};
		return user;
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

/** Converting a local account to a online one.	*/
export async function convertToRemoteUser(token: Token, password: string , instance: string): Promise<Tokens> {
	if (token.username === 'admin') throw 'Admin user cannot be converted to an online account';
	const user = await findUserByName(token.username);
	if (!user) throw 'User unknown';
	if (!await checkPassword(user, password)) throw 'Wrong password';
	user.login = `${token.username}@${instance}`;
	user.password = password;
	try {
		await createRemoteUser(user);
		const remoteUser = await remoteLogin(user.login, password);
		upsertRemoteToken(user.login, remoteUser.token);
		await editUser(token.username, user, null, token.role, {
			editRemote: false,
			renameUser: true
		});
		await convertToRemoteFavorites(user.login);
		return {
			onlineToken: remoteUser.token,
			token: createJwtToken(user.login, token.role)
		};
	} catch(err) {
		throw `Unable to convert user to remote (remote has been created) : ${err}`;
	}
}

/** To avoid flooding database UPDATEs, only update login time every minute for a user */
export async function updateLastLoginName(login: string) {
	if (!userLoginTimes.has(login)) {
		userLoginTimes.set(login, new Date());
		return await DBUpdateUserLastLogin(login);
	}
	if (userLoginTimes.get(login) < new Date(new Date().getTime() - (60 * 1000))) {
		userLoginTimes.set(login, new Date());
		return await DBUpdateUserLastLogin(login);
	}
}

/** Edit online user's profile, including avatar. */
async function editRemoteUser(user: User) {
	// Fetch remote token
	const remoteToken = getRemoteToken(user.login);
	const [login, instance] = user.login.split('@');
	const form = new formData();

	// Create the form data sent as payload to edit remote user
	if (user.avatar_file !== 'blank.png') form.append('avatarfile', createReadStream(resolve(resolvedPathAvatars(), user.avatar_file)), user.avatar_file);
	form.append('nickname', user.nickname);
	if (user.bio) form.append('bio', user.bio);
	if (user.email) form.append('email', user.email);
	if (user.url) form.append('url', user.url);
	if (user.password) form.append('password', user.password);
	if (user.main_series_lang) form.append('main_series_lang', user.main_series_lang);
	if (user.fallback_series_lang) form.append('fallback_series_lang', user.fallback_series_lang);
	try {
		await got(`https://${instance}/api/users/${login}`, {
			method: 'PUT',
			body: form,
			headers: {
				authorization: remoteToken.token
			}
		});
	} catch(err) {
		throw `Remote update failed : ${err.response ? err.response.body : err}`;
	}
}

/** Edit local user profile */
export async function editUser(username: string, user: User, avatar: Express.Multer.File, role: string, opts: UserOpts = {
	editRemote: true,
	renameUser: false,
}) {
	try {
		let currentUser = await findUserByName(username);
		if (!currentUser) throw 'User unknown';
		if (currentUser.type === 2 && role !== 'admin') throw 'Guests are not allowed to edit their profiles';
		// If we're renaming a user, user.login is going to be set to something different than username
		if (!opts.renameUser) user.login = username;
		user.old_login = username;
		if (!user.bio) user.bio = null;
		if (!user.url) user.url = null;
		if (!user.email) user.email = null;
		if (!user.nickname) user.nickname = currentUser.nickname;
		if (!user.series_lang_mode) user.series_lang_mode = -1;
		if (user.series_lang_mode < -1 || user.series_lang_mode > 4) throw 'Invalid series_lang_mode';
		if (user.main_series_lang && !hasLang('2B', user.main_series_lang)) throw `main_series_lang is not a valid ISO639-2B code (received ${user.main_series_lang})`;
		if (user.fallback_series_lang && !hasLang('2B', user.fallback_series_lang)) throw `fallback_series_lang is not a valid ISO639-2B code (received ${user.fallback_series_lang})`;
		if (user.type === 0 && role !== 'admin') throw 'Admin flag permission denied';
		if (user.type !== 0 && !user.type) user.type = currentUser.type;
		if (user.type && +user.type !== currentUser.type && role !== 'admin') throw 'Only admins can change a user\'s type';
		// Check if login already exists.
		if (currentUser.nickname !== user.nickname && await DBCheckNicknameExists(user.nickname)) throw 'Nickname already exists';
		if (avatar && avatar.path) {
			// If a new avatar was sent, it is contained in the avatar object
			// Let's move it to the avatar user directory and update avatar info in database
			// If the user is remote, we keep the avatar's original filename since it comes from KM Server.
			user.avatar_file = await replaceAvatar(currentUser.avatar_file, avatar);
			createCircleAvatar(resolve(resolvedPathAvatars(), user.avatar_file));
		} else {
			user.avatar_file = currentUser.avatar_file;
		}
		await DBEditUser(user);
		logger.debug(`[User] ${username} (${user.nickname}) profile updated`);
		if (user.login.includes('@') && opts.editRemote && +getConfig().Online.Users) await editRemoteUser(user);
		// Modifying passwords is not allowed in demo mode
		if (user.password && !getState().isDemo) {
			user.password = hashPassword(user.password);
			await DBUpdateUserPassword(user.login,user.password);
		}
		return user;
	} catch (err) {
		logger.error(`[User] Failed to update ${username}'s profile : ${err}`);
		throw {
			message: err,
			data: user.nickname
		};
	}
}

/** Get all guest users */
export async function listGuests(): Promise<User[]> {
	return await DBListGuests();
}

/** Get all users (including guests) */
export async function listUsers(): Promise<User[]> {
	return await DBListUsers();
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
				logger.warn(`[User] Unable to unlink old avatar ${oldAvatarPath} : ${err}`);
			}
			const oldAvatarCirclePath = replaceExt(oldAvatarPath, '.circle.png');
			try {
				if (await asyncExists(oldAvatarCirclePath)) await asyncUnlink(oldAvatarCirclePath);
			} catch(err) {
				logger.warn(`[User] Unable to unlink old avatar circle path ${oldAvatarCirclePath} : ${err}`);
			}
		}
		try {
			await asyncCopy(avatar.path, newAvatarPath, {overwrite: true});
		} catch(err) {
			logger.error(`[User] Could not copy new avatar ${avatar.path} to ${newAvatarPath} : ${err}`);
		}
		return newAvatarFile;
	} catch (err) {
		throw `Unable to replace avatar ${oldImageFile} with ${avatar.path} : ${err}`;
	}
}

/** Get user by its name, with non-public info like password and mail removed (or not) */
export async function findUserByName(username: string, opt = {
	public: false
}): Promise<User> {
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

/** Check if password matches or if user type is 2 (guest) and password in database is empty. */
export async function checkPassword(user: User, password: string): Promise<boolean> {
	const hashedPassword = hashPassword(password);
	if (user.password === hashedPassword || (user.type === 2 && !user.password)) {
		// If password was empty for a guest, we set it to the password given on login (which is its device fingerprint).
		if (user.type === 2 && !user.password) await DBUpdateUserPassword(user.login, hashedPassword);
		return true;
	}
	return false;
}

/** Checks database for a user's fingerprint */
export async function findFingerprint(fingerprint: string): Promise<string> {
	// If fingerprint is present we return the login name of that user
	// If not we find a new guest account to assign to the user.
	let guest = await DBFindFingerprint(fingerprint);
	if (getState().isTest) logger.debug(JSON.stringify(guest));
	if (guest) return guest;
	guest = await DBGetRandomGuest();
	if (getState().isTest) logger.debug(JSON.stringify(guest));
	if (!guest) return null;
	await DBUpdateUserPassword(guest, hashPassword(fingerprint));
	return guest;
}

/** Update a guest user's fingerprint */
export async function updateUserFingerprint(username: string, fingerprint: string) {
	return await DBUpdateUserFingerprint(username, fingerprint);
}

/** Check if the online token we have is still valid on KM Server */
export async function remoteCheckAuth(instance: string, token: string) {
	try {
		const res = await got.get(`https://${instance}/api/auth/check`, {
			headers: {
				authorization: token
			}
		});
		return res.body;
	} catch(err) {
		logger.debug(`[RemoteUser] Got error when check auth : ${err}`);
		return false;
	}
}

/** Function called when you enter a login/password and login contains an @. We're checking login/password pair against KM Server  */
export async function remoteLogin(username: string, password: string): Promise<Token> {
	const [login, instance] = username.split('@');
	try {
		const res = await got.post(`https://${instance}/api/auth/login`, {
			form: {
				username: login,
				password: password
			}
		});
		return JSON.parse(res.body);
	} catch(err) {
		// Remote login returned 401 so we throw an error
		// For other errors, no error is thrown
		if (err.statusCode === 401) throw 'Unauthorized';
		logger.debug(`[RemoteUser] Got error when connectiong user ${username} : ${err}`);
		return {
			token: null,
			role: null,
			username: null
		};
	}
}

export async function resetRemotePassword(user: string) {
	const [username, instance] = user.split('@');
	try {
		await got.post(`https://${instance}/api/users/${username}/resetpassword`);
	} catch (err) {

		logger.error(`[RemoteUser] Could not trigger reset password for ${user} : ${err.response ? err.response.body : err}`);
		throw err;
	}
}

/** Get all users from KM Server */
async function getAllRemoteUsers(instance: string): Promise<User[]> {
	try {
		const users = await got(`https://${instance}/api/users`,
			{
				responseType: 'json'
			});
		return users.body as User[];
	} catch(err) {
		logger.debug(`[RemoteUser] Got error when get all remote users : ${err}`);
		throw {
			code: 'USER_CREATE_ERROR_ONLINE',
			message: err.response ? err.response.body : err
		};
	}
}

/** Create a user on KM Server */
async function createRemoteUser(user: User) {
	const [login, instance] = user.login.split('@');
	const users = await getAllRemoteUsers(instance);
	if (users.filter(u => u.login === login).length === 1) throw {
		code: 'USER_ALREADY_EXISTS_ONLINE',
		message: `User already exists on ${instance} or incorrect password`
	};
	try {
		await got.post(`https://${instance}/api/users`, {
			form: {
				login: login,
				password: user.password
			}
		});
	} catch(err) {
		logger.debug(`[RemoteUser] Got error when create remote user ${login} : ${err}`);
		throw {
			code: 'USER_CREATE_ERROR_ONLINE',
			message: err.response ? err.response.body : err
		};
	}
}

/** Get user data from KM Server */
export async function getRemoteUser(username: string, token: string): Promise<User> {
	const [login, instance] = username.split('@');
	try {
		const res = await got(`https://${instance}/api/users/${login}`, {
			headers: {
				authorization: token
			},
			responseType: 'json'
		});
		return res.body;
	} catch(err) {
		if (err.statusCode === 401) throw 'Unauthorized';
		throw `Unknown error : ${err.response ? err.response.body : err}`;
	}
}

/** Create ADMIN user only if security code matches */
export async function createAdminUser(user: User, remote: boolean, requester: User) {
	if (requester.type === 0 || user.securityCode === getState().securityCode) {
		return await createUser(user, { createRemote: remote, admin: true });
	} else {
		throw 'Wrong security code';
	}
}

/** Create new user (either local or online. Defaults to online) */
export async function createUser(user: User, opts: UserOpts = {
	admin: false,
	createRemote: true
}) {
	user.type = user.type || 1;
	if (opts.admin) user.type = 0;
	user.nickname = user.nickname || user.login;
	user.last_login_at = new Date();
	user.avatar_file = user.avatar_file || 'blank.png';
	user.flag_online = user.flag_online || false;

	user.bio = user.bio || null;
	user.url = user.url || null;
	user.email = user.email || null;
	if (user.type === 2) user.flag_online = false;
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
			logger.warn(`[User] Nickname ${user.login.split('@')[0]} already exists in database. New nickname for ${user.login} is : ${user.nickname}`);
		}
		if (user.login.split('@')[0] === 'admin') throw { code: 'USER_CREATE_ERROR', data: 'Admin accounts are not allowed to be created online' };
		if (!+getConfig().Online.Users) throw { code: 'USER_CREATE_ERROR', data: 'Creating online accounts is not allowed on this instance'};
		if (opts.createRemote) await createRemoteUser(user);
	}
	if (user.password) user.password = hashPassword(user.password);
	try {
		await DBAddUser(user);
		if (user.type < 2) logger.info(`[User] Created user ${user.login}`);
		delete user.password;
		logger.debug(`[User] User data : ${JSON.stringify(user, null, 2)}`);
		return true;
	} catch (err) {
		logger.error(`[User] Unable to create user ${user.login} : ${err}`);
		throw { code: 'USER_CREATE_ERROR', data: err};
	}
}

/** Checks if a user can be created */
async function newUserIntegrityChecks(user: User) {
	if (user.type < 2 && !user.password) throw { code: 'USER_EMPTY_PASSWORD'};
	if (user.type === 2 && user.password) throw { code: 'GUEST_WITH_PASSWORD'};

	// Check if login already exists.
	if (await DBGetUser(user.login) || await DBCheckNicknameExists(user.login)) {
		logger.error(`[User] User/nickname ${user.login} already exists, cannot create it`);
		throw { code: 'USER_ALREADY_EXISTS', data: {username: user.login}};
	}
}

/** Remove a user from database */
export async function deleteUser(username: string) {
	try {
		if (username === 'admin') throw {code: 'USER_DELETE_ADMIN_DAMEDESU', message: 'Admin user cannot be deleted as it is necessary for the Karaoke Instrumentality Project'};
		const user = await findUserByName(username);
		if (!user) throw {code: 'USER_NOT_EXISTS'};
		//Reassign karas and playlists owned by the user to the admin user
		await DBReassignToUser(username, 'admin');
		await DBDeleteUser(username);
		if (usersFetched.has(username)) usersFetched.delete(username);
		logger.debug(`[User] Deleted user ${username}`);
		return true;
	} catch (err) {
		logger.error(`[User] Unable to delete user ${username} : ${err}`);
		throw ({code: 'USER_DELETE_ERROR', data: err});
	}
}

/** Updates all guest avatars with those present in KM's codebase in the assets folder */
async function updateGuestAvatar(user: User) {
	const bundledAvatarFile = `${slugify(user.login, {
		lower: true,
		remove: /['"!,\?()]/g
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
		await asyncCopyAlt(bundledAvatarPath, tempFile);
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
			logger.error(`[User] Unable to change guest avatar for ${user.login} : ${JSON.stringify(err)}`);
		});
	}
}

/** Check all guests to see if we need to replace their avatars with built-in ones */
async function checkGuestAvatars() {
	logger.debug('[User] Updating default avatars');
	const guests = await listGuests();
	guests.forEach(u => updateGuestAvatar(u));
}

/** Create default guest accounts */
async function createDefaultGuests() {
	const guests = await listGuests();
	if (guests.length >= defaultGuestNames.length) return 'No creation of guest account needed';
	let guestsToCreate = [];
	for (const guest of defaultGuestNames) {
		if (!guests.find(g => g.login === guest)) guestsToCreate.push(guest);
	}
	let maxGuests = guestsToCreate.length;
	if (getState().isTest) maxGuests = 1;
	logger.debug(`[User] Creating ${maxGuests} new guest accounts`);
	for (let i = 0; i < maxGuests; i++) {
		if (!await findUserByName(guestsToCreate[i])) await createUser({
			login: guestsToCreate[i],
			type: 2
		});
	}
	logger.debug('[User] Default guest accounts created');
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
	} else {
		if (await findUserByName('adminTest')) await deleteUser('adminTest');
	}

	createDefaultGuests().then(() => checkGuestAvatars());
	cleanupAvatars();
	if (getState().opt.forceAdminPassword) await generateAdminPassword();
	setState({securityCode: generateSecurityCode()});
	logger.info(`[User] SECURITY CODE FOR THIS SESSION : ${getState().securityCode}`);
}

/** This is done because updating avatars generate a new name for the file. So unused avatar files are now cleaned up. */
async function cleanupAvatars() {
	const users = await listUsers();
	const avatars = [];
	for (const user of users) {
		if (!avatars.includes(user.avatar_file)) avatars.push(user.avatar_file);
	}
	const avatarFiles = await asyncReadDir(resolvedPathAvatars());
	for (const file of avatarFiles) {
		const avatar = avatars.find(a => a === file);
		if (!avatar && !file.endsWith('.circle.png') && file !== 'blank.png') {
			const fullFile = resolve(resolvedPathAvatars(), file);
			const fullCircleFile = replaceExt(fullFile, '.circle.png');
			try {
				asyncUnlink(fullFile);
				asyncUnlink(fullCircleFile);
			} catch(err) {
				console.log(err);
				//Non-fatal
			}
		}
	}
	return true;
}

/** Update song quotas for a user */
export async function updateSongsLeft(username: string, playlist_id?: number) {
	const conf = getConfig();
	const user = await findUserByName(username);
	let quotaLeft: number;
	if (!playlist_id) playlist_id = getState().modePlaylistID;
	if (user.type >= 1 && +conf.Karaoke.Quota.Type > 0) {
		switch(+conf.Karaoke.Quota.Type) {
		default:
		case 1:
			const count = await getSongCountForUser(playlist_id, username);
			quotaLeft = +conf.Karaoke.Quota.Songs - count;
			break;
		case 2:
			const time = await getSongTimeSpentForUser(playlist_id,username);
			quotaLeft = +conf.Karaoke.Quota.Time - time;
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

/** Update all user quotas affected by a PLC getting freed/played */
export async function updateUserQuotas(kara: PLC) {
	// If karaokes are present in the public playlist, we're marking them free.
	// First find which KIDs are to be freed. All those before the currently playing kara
	// are to be set free.
	// Then we're updating song quotas for all users involved.
	const state = getState();
	profile('updateUserQuotas');
	await freePLCBeforePos(kara.pos, state.currentPlaylistID);
	// For every KID we check if it exists and add the PLC to a list
	const [publicPlaylist, currentPlaylist] = await Promise.all([
		getPlaylistContentsMini(state.publicPlaylistID),
		getPlaylistContentsMini(state.currentPlaylistID)
	]);
	let freeTasks = [];
	let usersNeedingUpdate = [];
	for (const currentSong of currentPlaylist) {
		publicPlaylist.some((publicSong: PLC) => {
			if (publicSong.kid === currentSong.kid && currentSong.flag_free) {
				freeTasks.push(freePLC(publicSong.playlistcontent_id));
				if (!usersNeedingUpdate.includes(publicSong.username)) usersNeedingUpdate.push(publicSong.username);
				return true;
			}
			return false;
		});
	}
	await Promise.all(freeTasks);
	usersNeedingUpdate.forEach(username => {
		updateSongsLeft(username, state.modePlaylistID);
	});
	profile('updateUserQuotas');
}

/** Check login and authenticates users */
export async function checkLogin(username: string, password: string): Promise<Token> {
	const conf = getConfig();
	let user: User = {};
	let onlineToken: string;
	if (username.includes('@') && +conf.Online.Users) {
		try {
			// If username has a @, check its instance for existence
			// If OnlineUsers is disabled, accounts are connected with
			// their local version if it exists already.
			const instance = username.split('@')[1];
			user = await fetchAndUpdateRemoteUser(username, password);
			onlineToken = user.onlineToken;
			if (onlineToken) {
				upsertRemoteToken(username, onlineToken);
				// Download and add all favorites
				fetchAndAddFavorites(instance, onlineToken, username);
			}
		} catch(err) {
			logger.error(`[RemoteAuth] Failed to authenticate ${username} : ${JSON.stringify(err)}`);
		}
	}

	// User is a local user
	user = await findUserByName(username);
	if (!user) throw false;
	if (!await checkPassword(user, password)) throw false;
	const role = getRole(user);
	updateLastLoginName(username);
	return {
		token: createJwtToken(username, role, conf),
		onlineToken: onlineToken,
		username: username,
		role: role
	};
}

/** Get role depending on user type */
function getRole(user: User): Role {
	if (+user.type === 2) return 'guest';
	if (+user.type === 0) return 'admin';
	if (+user.type === 1) return 'user';
	return 'guest';
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

export function resetSecurityCode() {
	setState({ securityCode: generateSecurityCode()});
	logger.warn(`[Users] SECURITY CODE RESET : ${getState().securityCode}`);
}

function generateSecurityCode(): string {
	return randomstring.generate({
		length: 6,
		charset: 'numeric'
	});
}

