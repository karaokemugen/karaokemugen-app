import {compare, genSalt, hash} from 'bcryptjs';
import {createHash} from 'crypto';
import formData from 'form-data';
import { createReadStream } from 'fs';
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
	getRemoteToken, 	getUser as DBGetUser,
	listGuests as DBListGuests,
	listUsers as DBListUsers,
	reassignToUser as DBReassignToUser,
	resetGuestsPassword as DBResetGuestsPassword,
	updateExpiredUsers as DBUpdateExpiredUsers,
	updateUserFingerprint as DBUpdateUserFingerprint,
	updateUserLastLogin as DBUpdateUserLastLogin,
	updateUserPassword as DBUpdateUserPassword,upsertRemoteToken} from '../dao/user';
import {Role, Token, User} from '../lib/types/user';
import {getConfig, resolvedPathAvatars,resolvedPathTemp, setConfig} from '../lib/utils/config';
import {imageFileTypes} from '../lib/utils/constants';
import {asyncCopy, asyncCopyAlt, asyncExists, asyncReadDir, asyncStat, asyncUnlink, detectFileType, replaceExt,writeStreamToFile} from '../lib/utils/files';
import HTTP from '../lib/utils/http';
import {profile} from '../lib/utils/logger';
import {emitWS} from '../lib/utils/ws';
import {Config} from '../types/config';
import { PLC } from '../types/playlist';
import {SingleToken,Tokens, UserOpts} from '../types/user';
import {defaultGuestNames} from '../utils/constants';
import { createCircleAvatar } from '../utils/imageProcessing';
import sentry from '../utils/sentry';
import {getState, setState} from '../utils/state';
import { convertToRemoteFavorites, fetchAndAddFavorites } from './favorites';
import {freePLC,freePLCBeforePos, getPlaylistContentsMini} from './playlist';

const userLoginTimes = new Map();
const usersFetched = new Set();

/** Converts a online user to a local one by removing its online account from KM Server */
export async function removeRemoteUser(token: Token, password: string): Promise<SingleToken> {
	const instance = token.username.split('@')[1];
	const username = token.username.split('@')[0];
	// Verify that no local user exists with the name we're going to rename it to
	if (await findUserByName(username)) throw {code: 409, msg: 'User already exists locally, delete it first.'};
	// Verify that password matches with online before proceeding
	const onlineToken = await remoteLogin(token.username, password);
	await HTTP(`https://${instance}/api/users`, {
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
	emitWS('userUpdated', token.username);
	return {
		token: createJwtToken(user.login, token.role)
	};
}

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

/** Get remote avatar from KM Server */
export async function fetchRemoteAvatar(instance: string, avatarFile: string): Promise<string> {
	// If this stops working, use got() and a stream: true property again
	const res = HTTP.stream(`https://${instance}/avatars/${avatarFile}`);
	const avatarPath = resolve(resolvedPathTemp(), avatarFile);
	try {
		await writeStreamToFile(res, avatarPath);
	} catch(err) {
		logger.warn(`Could not write remote avatar to local file ${avatarFile}`, {service: 'User', obj: err});
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
			const error = new Error(err);
			sentry.error(error);
			throw error;
		}
		// Check if user exists. If it does not, create it.
		let user = await findUserByName(username);
		if (!user) {
			await createUser({
				login: username,
				password: password
			}, {
				createRemote: false,
				noPasswordCheck: true
			});
		}
		// Update user with new data
		let avatar_file = null;
		if (remoteUser.avatar_file !== 'blank.png') {
			let avatarPath = '';
			try {
				avatarPath = await fetchRemoteAvatar(username.split('@')[1], remoteUser.avatar_file);
			} catch(err) {
				const error = new Error(err);
				sentry.error(error);
				throw error;
			}
			avatar_file = {
				path: avatarPath
			};
		}
		// Checking if user has already been fetched during this session or not
		if (!usersFetched.has(username)) {
			usersFetched.add(username);
			const response = await editUser(
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
				{ editRemote: false, noPasswordCheck: true	}
			);
			user = response.user;
		}
		user.onlineToken = onlineToken.token;
		return user;
	} else {
		//Onlinetoken was not provided : KM Server might be offline
		//We'll try to find user in local database. If failure return an error
		const user = await findUserByName(username);
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
	if (token.username === 'admin') throw {code: 'ADMIN_CONVERT_ERROR'};
	const user = await findUserByName(token.username);
	if (!user) throw {msg: 'UNKNOW_CONVERT_ERROR'};
	if (!await checkPassword(user, password)) throw {msg: 'PASSWORD_CONVERT_ERROR'};
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
		emitWS('userUpdated', user.login);
		return {
			onlineToken: remoteUser.token,
			token: createJwtToken(user.login, token.role)
		};
	} catch(err) {
		sentry.error(new Error(err));
		throw {msg: err.msg || 'USER_CONVERT_ERROR', details: err};
	}
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
		const res = await HTTP.put(`https://${instance}/api/users/${login}`, {
			body: form,
			headers: {
				authorization: remoteToken.token || null
			}
		});
		return JSON.parse(res.body);
	} catch(err) {
		sentry.error(err);
		throw `Remote update failed : ${err}`;
	}
}

/** Edit local user profile */
export async function editUser(username: string, user: User, avatar: Express.Multer.File, role: string, opts: UserOpts = {
	editRemote: true,
	renameUser: false,
	noPasswordCheck: false
}) {
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
		if (avatar?.path) {
			// If a new avatar was sent, it is contained in the avatar object
			// Let's move it to the avatar user directory and update avatar info in database
			// If the user is remote, we keep the avatar's original filename since it comes from KM Server.
			try {
				user.avatar_file = await replaceAvatar(currentUser.avatar_file, avatar);
				createCircleAvatar(resolve(resolvedPathAvatars(), user.avatar_file));
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
		if (user.login.includes('@') && opts.editRemote && +getConfig().Online.Users) KMServerResponse = await editRemoteUser(user);
		// Modifying passwords is not allowed in demo mode
		if (user.password && !opts.noPasswordCheck && !getState().isDemo) {
			if (user.password.length < 8) throw {code: 400, msg: 'PASSWORD_TOO_SHORT'};
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
export function listGuests(): Promise<User[]> {
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
			const oldAvatarCirclePath = replaceExt(oldAvatarPath, '.circle.png');
			try {
				if (await asyncExists(oldAvatarCirclePath)) await asyncUnlink(oldAvatarCirclePath);
			} catch(err) {
				logger.warn(`Unable to unlink old avatar circle path ${oldAvatarCirclePath}`, {service: 'User', obj: err});
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

/** Check if the online token we have is still valid on KM Server */
export async function remoteCheckAuth(instance: string, token: string) {
	try {
		const res = await HTTP.get(`https://${instance}/api/auth/check`, {
			headers: {
				authorization: token
			}
		});
		return res.body;
	} catch(err) {
		logger.debug('Got error when check auth', {service: 'RemoteUser', obj: err});
		return false;
	}
}

/** Function called when you enter a login/password and login contains an @. We're checking login/password pair against KM Server  */
export async function remoteLogin(username: string, password: string): Promise<Token> {
	const [login, instance] = username.split('@');
	try {
		const res = await HTTP.post(`https://${instance}/api/auth/login`, {
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
		logger.debug(`Got error when connectiong user ${username}`, {service: 'RemoteUser', obj: err});
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
		await HTTP.post(`https://${instance}/api/users/${username}/resetpassword`);
	} catch (err) {
		logger.error(`Could not trigger reset password for ${user}`, {service: 'RemoteUser', obj: err});
		throw err;
	}
}

/** Get all users from KM Server */
async function getAllRemoteUsers(instance: string): Promise<User[]> {
	try {
		const users = await HTTP(`https://${instance}/api/users`,
			{
				responseType: 'json'
			});
		return users.body as User[];
	} catch(err) {
		logger.debug('Got error when get all remote users', {service: 'RemoteUser', obj: err});
		throw {
			code: 'USER_CREATE_ERROR_ONLINE',
			message: err
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
		await HTTP.post(`https://${instance}/api/users`, {
			form: {
				login: login,
				password: user.password
			}
		});
	} catch(err) {
		logger.debug(`Got error when create remote user ${login}`, {service: 'RemoteUser', obj: err});
		throw {
			code: 'USER_CREATE_ERROR_ONLINE',
			message: err
		};
	}
}

/** Get user data from KM Server */
export async function getRemoteUser(username: string, token: string): Promise<User> {
	const [login, instance] = username.split('@');
	try {
		const res = await HTTP(`https://${instance}/api/users/${login}`, {
			headers: {
				authorization: token
			},
			responseType: 'json'
		});
		return res.body;
	} catch(err) {
		sentry.error(err);
		if (err.statusCode === 401) throw 'Unauthorized';
		throw `[RemoteUser] Got error when get remote user ${username} : ${err}`;
	}
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
	try {
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
	if (user.type < 2 && !user.password) throw { code: 'USER_EMPTY_PASSWORD'};
	if (user.type === 2 && user.password) throw { code: 'GUEST_WITH_PASSWORD'};

	// Check if login already exists.
	if (await DBGetUser(user.login) || await DBCheckNicknameExists(user.login)) {
		logger.error(`User/nickname ${user.login} already exists, cannot create it`, {service: 'User'});
		throw { code: 'USER_ALREADY_EXISTS', data: {username: user.login}};
	}
}

/** Remove a user from database */
export async function deleteUser(username: string) {
	try {
		if (username === 'admin') throw {code: 406, msg:  'USER_DELETE_ADMIN_DAMEDESU', details: 'Admin user cannot be deleted as it is necessary for the Karaoke Instrumentality Project'};
		const user = await findUserByName(username);
		if (!user) throw {code: 404, msg: 'USER_NOT_EXISTS'};
		//Reassign karas and playlists owned by the user to the admin user
		await DBReassignToUser(username, 'admin');
		await DBDeleteUser(username);
		if (usersFetched.has(username)) usersFetched.delete(username);
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
async function updateGuestAvatar(user: User) {
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
		if (!guests.find(g => g.login === guest)) guestsToCreate.push(guest);
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
	} else {
		if (await findUserByName('adminTest')) await deleteUser('adminTest');
	}

	userChecks();
	if (getState().opt.forceAdminPassword) await generateAdminPassword();
	setState({securityCode: generateSecurityCode()});
	logger.info(`SECURITY CODE FOR THIS SESSION : ${getState().securityCode}`, {service: 'Users'});
	// Find admin users.
	const users = await listUsers();
	const adminUsers = users.filter(u => u.type === 0 && u.login !== 'admin');
	logger.debug('Admin users', {service: 'User', obj: JSON.stringify(adminUsers)});
	sentry.setUser(adminUsers[0]?.login || 'admin', adminUsers[0]?.email || undefined);
}

/** Performs defaults checks and creations for avatars/guests. This is done synchronously here because these are linked, but userChecks is called asynchronously to speed up init process */
async function userChecks() {
	await createDefaultGuests();
	await checkGuestAvatars();
	await checkUserAvatars();
	await checkCircledAvatars();
	await cleanupAvatars();
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

/** Verifies if all avatars have a circled version available */
async function checkCircledAvatars() {
	logger.debug('Checking if all avatars have circled versions', {service: 'User'});
	const users = await listUsers();
	for (const user of users) {
		try {
			const file = resolve(resolvedPathAvatars(), user.avatar_file);
			if (await asyncExists(file) && !await asyncExists(replaceExt(file, '.circle.png'))) {
				await createCircleAvatar(file);
			}
		} catch(err) {
			logger.error(`Unable to create circled avatar for ${user.login} with ${user.avatar_file}`, {service: 'Users', obj: err});
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
		if (!avatar && !file.endsWith('.circle.png') && file !== 'blank.png') {
			const fullFile = resolve(resolvedPathAvatars(), file);
			const fullCircleFile = replaceExt(fullFile, '.circle.png');
			try {
				logger.debug(`Deleting old file ${fullFile} and ${fullCircleFile}`, {service: 'Users'});
				await asyncUnlink(fullFile);
				if (await asyncExists(fullCircleFile)) await asyncUnlink(fullCircleFile);
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
	if (!playlist_id) playlist_id = getState().publicPlaylistID;
	if (user.type >= 1 && +conf.Karaoke.Quota.Type > 0) {
		switch(+conf.Karaoke.Quota.Type) {
		case 2:
			const time = await getSongTimeSpentForUser(playlist_id,username);
			quotaLeft = +conf.Karaoke.Quota.Time - time;
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
	const freeTasks = [];
	const usersNeedingUpdate = [];
	for (const currentSong of currentPlaylist) {
		for (const publicSong of publicPlaylist) {
			if (publicSong.kid === currentSong.kid && currentSong.flag_free) {
				freeTasks.push(freePLC(publicSong.playlistcontent_id));
				if (!usersNeedingUpdate.includes(publicSong.username)) usersNeedingUpdate.push(publicSong.username);
			}
		}
	}
	await Promise.all(freeTasks);
	usersNeedingUpdate.forEach(username => {
		updateSongsLeft(username, state.publicPlaylistID);
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
			logger.error(`Failed to authenticate ${username}`, {service: 'RemoteAuth', obj: err});
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
	logger.warn(`SECURITY CODE RESET : ${getState().securityCode}`, {service: 'Users'});
}

function generateSecurityCode(): string {
	return randomstring.generate({
		length: 6,
		charset: 'numeric'
	});
}

