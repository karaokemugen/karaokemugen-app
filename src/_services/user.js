import {getConfig} from '../_utils/config';
import {freePLCBeforePos, getPlaylistContentsMini, freePLC} from '../_services/playlist';
import {convertToRemoteFavorites} from '../_services/favorites';
import {detectFileType, asyncMove, asyncExists, asyncUnlink, asyncReadDir} from '../_utils/files';
import {createHash} from 'crypto';
import {now} from '../_utils/date';
import {resolve} from 'path';
import logger from 'winston';
import uuidV4 from 'uuid/v4';
import {defaultGuestNames} from '../_services/constants';
import randomstring from 'randomstring';
import {on} from '../_utils/pubsub';
import {getSongCountForUser, getSongTimeSpentForUser} from '../_dao/kara';
import {emitWS} from '../_webapp/frontend';
import {profile} from '../_utils/logger';
import {getState} from '../_utils/state';
import got from 'got';
import { getRemoteToken, upsertRemoteToken } from '../_dao/user';
import formData from 'form-data';
import { createReadStream } from 'fs';
import { writeStreamToFile } from '../_utils/files';
import { fetchAndAddFavorites } from '../_services/favorites';
import {encode, decode} from 'jwt-simple';

const db = require('../_dao/user');
let userLoginTimes = {};
let databaseBusy = false;

on('databaseBusy', status => {
	databaseBusy = status;
});

export async function removeRemoteUser(token, password) {
	const instance = token.username.split('@')[1];
	const username = token.username.split('@')[0];
	// Verify that no local user exists with the name we're going to rename it to
	if (await findUserByName(username)) throw 'User already exists locally, delete it first.';
	// Verify that password matches with online before proceeding
	await remoteLogin(token.username, password);
	await got(`http://${instance}/api/users`, {
		method: 'DELETE',
		headers: {
			authorization: token.onlineToken
		}
	});
	// Renaming user locally
	const user = await findUserByName(token.username);
	user.login = username;
	await editUser(token.username, user, null, 'admin', {
		editRemote: false,
		renameUser: false
	});
	return {
		token: createJwtToken(user.login, token.role)
	};
}

async function updateExpiredUsers() {
	// Unflag connected accounts from database if they expired
	try {
		if (!databaseBusy) {
			await db.updateExpiredUsers(now(true) - (getConfig().AuthExpireTime * 60));
			await db.resetGuestsPassword();
		}
	} catch(err) {
		logger.error(`[Users] Expiring users failed (will try again in one minute) : ${err}`);
	}
}

export async function getUserRequests(username) {
	if (!await findUserByName(username)) throw 'User unknown';
	return await db.getUserRequests(username);
}

export async function fetchRemoteAvatar(instance, avatarFile) {
	const conf = getConfig();
	const res = await got(`http://${instance}/avatars/${avatarFile}`, {
		stream: true
	});
	const avatarPath = resolve(conf.appPath, conf.PathTemp, avatarFile);
	await writeStreamToFile(res, avatarPath);
	return avatarPath;
}

export async function fetchAndUpdateRemoteUser(username, password, onlineToken) {
	if (!onlineToken) onlineToken = await remoteLogin(username, password);
	// if OnlineToken is empty, it means we couldn't fetch user data, let's not continue but don't throw an error
	if (onlineToken.token) {
		let remoteUser;
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
				createFavoritePlaylist: true,
				createRemote: false
			});
		}
		// Update user with new data
		let avatar_file = null;
		if (remoteUser.avatar_file !== 'blank.png') {
			avatar_file = {
				path: await fetchRemoteAvatar(username.split('@')[1], remoteUser.avatar_file)
			};
		}
		user = await editUser(username,{
			bio: remoteUser.bio,
			url: remoteUser.url,
			email: remoteUser.email,
			nickname: remoteUser.nickname,
			password: password
		},
		avatar_file,
		'admin',
		{
			editRemote: false
		});
		user.onlineToken = onlineToken.token;
		return user;
	} else {
		//Onlinetoken was not provided : KM Server might be offline
		let user = await findUserByName(username);
		if (!user) throw {code: 'USER_LOGIN_ERROR'};
		return user;
	}
}

function createJwtToken(username, role, config) {
	const conf = config || getConfig();
	const timestamp = new Date().getTime();
	return encode(
		{ username, iat: timestamp, role },
		conf.JwtSecret
	);
}

export function decodeJwtToken(token, config) {
	const conf = config || getConfig();
	return decode(token, conf.JwtSecret);
}

export async function convertToRemoteUser(token, password, instance) {
	if (token.username === 'admin') throw 'Admin user cannot be converted to an online account';
	const user = await findUserByName(token.username);
	if (!user) throw 'User unknown';
	if (!await checkPassword(user, password)) throw 'Wrong password';
	user.login = `${token.username}@${instance}`;
	user.password = password;
	await createRemoteUser(user);
	const remoteUser = await remoteLogin(user.login, password);
	upsertRemoteToken(user.login, remoteUser.token);
	try {
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


export async function updateLastLoginName(login) {
	// To avoid flooding database UPDATEs, only update login time every minute for a user
	if (!userLoginTimes[login]) userLoginTimes[login] = new Date();
	if (userLoginTimes[login] < now(true) - 60) {
		userLoginTimes[login] = new Date();
		return await db.updateUserLastLogin(login);
	}
}

async function editRemoteUser(user) {
	// Fetch remote token
	const remoteToken = getRemoteToken(user.login);
	const instance = user.login.split('@')[1];
	const login = user.login.split('@')[0];
	const form = new formData();
	const conf = getConfig();

	if (user.avatar_file !== 'blank.png') form.append('avatarfile', createReadStream(resolve(conf.appPath, conf.PathAvatars, user.avatar_file)), user.avatar_file);
	form.append('nickname', user.nickname);
	if (user.bio) form.append('bio', user.bio);
	if (user.email) form.append('email', user.email);
	if (user.url) form.append('url', user.url);
	if (user.password) form.append('password', user.password);
	try {
		await got(`http://${instance}/api/users/${login}`, {
			method: 'PUT',
			body: form,
			headers: {
				authorization: remoteToken.token
			}
		});
	} catch(err) {
		throw `Remote update failed : ${err.response.body}`;
	}
}


export async function editUser(username,user,avatar,role, opts = {
	editRemote: false,
	renameUser: false
}) {
	try {
		let currentUser;
		currentUser = await findUserByName(username);
		if (!currentUser) throw 'User unknown';
		if (currentUser.type === 2 && role !== 'admin') throw 'Guests are not allowed to edit their profiles';
		if (!opts.renameUser) user.login = username;
		user.login = username;
		if (!user.bio) user.bio = null;
		if (!user.url) user.url = null;
		if (!user.email) user.email = null;
		if (user.type === 0 && role !== 'admin') throw 'Admin flag permission denied';
		if (!user.type) user.type = currentUser.type;
		if (user.type && +user.type !== currentUser.type && role !== 'admin') throw 'Only admins can change a user\'s type';
		// Check if login already exists.
		if (currentUser.nickname !== user.nickname && await db.checkNicknameExists(user.nickname)) throw 'Nickname already exists';
		if (avatar) {
			// If a new avatar was sent, it is contained in the avatar object
			// Let's move it to the avatar user directory and update avatar info in
			// database
			// If the user is remote, we keep the avatar's original filename since it comes from KM Server.
			user.avatar_file = await replaceAvatar(currentUser.avatar_file,avatar);
		} else {
			user.avatar_file = currentUser.avatar_file;
		}
		await db.editUser(user);
		logger.debug(`[User] ${username} (${user.nickname}) profile updated`);
		if (user.login.includes('@') && opts.editRemote && +getConfig().OnlineUsers) await editRemoteUser(user);
		// Modifying passwords is not allowed in demo mode
		if (user.password && !getConfig().isDemo) {
			user.password = hashPassword(user.password);
			await db.updateUserPassword(user.login,user.password);
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

export async function listGuests() {
	return await db.listGuests();
}

export async function listUsers() {
	return await db.listUsers();
}

async function replaceAvatar(oldImageFile,avatar) {
	try {
		const conf = getConfig();
		const fileType = await detectFileType(avatar.path);
		if (fileType !== 'jpg' &&
				fileType !== 'gif' &&
				fileType !== 'png') {
			throw 'Wrong avatar file type';
		}
		// Construct the name of the new avatar file with its ID and filetype.
		const newAvatarFile = `${uuidV4()}.${fileType}`;
		const newAvatarPath = resolve(conf.PathAvatars,newAvatarFile);
		const oldAvatarPath = resolve(conf.PathAvatars,oldImageFile);
		if (await asyncExists(oldAvatarPath) &&
			oldImageFile !== 'blank.png') await asyncUnlink(oldAvatarPath);
		await asyncMove(avatar.path,newAvatarPath);
		return newAvatarFile;
	} catch (err) {
		throw `Unable to replace avatar ${oldImageFile} with ${avatar.path} : ${err}`;
	}
}

export async function findUserByName(username, opt) {
	//Check if user exists in db
	if (!opt) opt = {};
	const userdata = await db.getUser(username);
	if (userdata) {
		if (!userdata.bio) userdata.bio = null;
		if (!userdata.url) userdata.url = null;
		if (!userdata.email) userdata.email = null;
		if (opt.public) {
			userdata.email = null;
			userdata.password = null;
			userdata.fingerprint = null;
			userdata.email = null;
		}
		return userdata;
	}
	return false;
}

export function hashPassword(password) {
	const hash = createHash('sha256');
	hash.update(password);
	return hash.digest('hex');
}

export async function checkPassword(user,password) {
	const hashedPassword = hashPassword(password);
	// Access is granted only if passwords match OR user type is 2 (guest) and its password in database is empty.
	if (user.password === hashedPassword || (user.type === 2 && !user.password)) {
		// If password was empty for a guest, we set it to the password given on login.
		if (user.type === 2 && !user.password) await db.updateUserPassword(user.login,hashedPassword);
		return true;
	}
	return false;
}

export async function findFingerprint(fingerprint) {
	let guest = await db.findFingerprint(fingerprint);
	if (guest) return guest.pk_login;
	guest = await db.getRandomGuest();
	if (!guest) return false;
	await db.updateUserPassword(guest.pk_login, hashPassword(fingerprint));
	return guest.pk_login;
}

export async function updateUserFingerprint(username, fingerprint) {
	return await db.updateUserFingerprint(username, fingerprint);
}

export async function remoteCheckAuth(instance, token) {
	const res = await got.get(`http://${instance}/api/auth/check`, {
		headers: {
			authorization: token
		}
	});
	if (res.statusCode === 401) return false;
	return res.body;
}

export async function remoteLogin(username, password) {
	const instance = username.split('@')[1];
	try {
		const res = await got(`http://${instance}/api/auth/login`, {
			body: {
				username: username.split('@')[0],
				password: password
			},
			form: true
		});
		return JSON.parse(res.body);
	} catch(err) {
		// Remote login returned 401 so we throw an error
		// For other errors, no error is thrown
		if (err.statusCode === 401) throw 'Unauthorized';
		logger.debug(`[RemoteUser] Got error when connectiong user ${username} : ${err}`);
		return {};
	}
}

async function getAllRemoteUsers(instance) {
	try {
		const users = await got(`http://${instance}/api/users`,
			{
				json: true
			});
		return users.body;
	} catch(err) {
		throw {
			code: 'USER_ONLINE_CHECK_LOGIN_ERROR',
			message: err.response.body
		};
	}
}

async function createRemoteUser(user) {
	const instance = user.login.split('@')[1];
	const login = user.login.split('@')[0];
	const users = await getAllRemoteUsers(instance);
	if (users.filter(u => u.login === user.login).length === 1) throw {
		code: 'USER_ALREADY_EXISTS_ONLINE',
		message: `User already exists on ${instance} or incorrect password`
	};
	try {
		await got(`http://${instance}/api/users`, {
			body: {
				login: login,
				password: user.password
			},
			form: true
		});
	} catch(err) {
		throw {
			code: 'USER_ONLINE_CREATION_ERROR',
			message: err.response.body
		};
	}
};

export async function getRemoteUser(username, token) {
	const instance = username.split('@')[1];
	const login = username.split('@')[0];
	try {
		const res = await got(`http://${instance}/api/users/${login}`, {
			headers: {
				authorization: token
			},
			json: true
		});
		return res.body;
	} catch(err) {
		if (err.statusCode === 401) throw 'Unauthorized';
		throw `Unknown error : ${err.response.body}`;
	}
}

export async function createUser(user, opts) {
	if (!opts) opts = {
		admin: false,
		createRemote: true
	};
	user.type = user.type || 1;
	if (opts.admin) user.type = 0;
	user.nickname = user.nickname || user.login;
	user.last_login_at = new Date();
	user.avatar_file = user.avatar_file || 'blank.png';
	user.flag_online = user.flag_online || false;

	user.bio = user.bio || null;
	user.url = user.url || null;
	user.email = user.email || null;
	if (user.type === 2) user.flag_online = 0;
	await newUserIntegrityChecks(user);
	if (user.login.includes('@')) {
		if (user.login.split('@')[0] === 'admin') throw { code: 'USER_CREATE_ERROR', data: 'Admin accounts are not allowed to be created online' };
		if (!+getConfig().OnlineUsers) throw { code: 'USER_CREATE_ERROR', data: 'Creating online accounts is not allowed on this instance'};
		if (opts.createRemote) try {
			await createRemoteUser(user);
		} catch(err) {
			throw { code: 'USER_CREATE_ERROR', data: err};
		}
	}
	if (user.password) user.password = hashPassword(user.password);
	try {
		await db.addUser(user);
		if (user.type < 2) logger.info(`[User] Created user ${user.login}`);
		logger.debug(`[User] User data : ${JSON.stringify(user, null, 2)}`);
		return true;
	} catch (err) {
		logger.error(`[User] Unable to create user ${user.login} : ${err}`);
		throw { code: 'USER_CREATE_ERROR', data: err};
	}
}

async function newUserIntegrityChecks(user) {
	if (user.type < 2 && !user.password) throw { code: 'USER_EMPTY_PASSWORD'};
	if (user.type === 2 && user.password) throw { code: 'GUEST_WITH_PASSWORD'};

	// Check if login already exists.
	if (await db.getUser(user.login) || await db.checkNicknameExists(user.login)) {
		logger.error(`[User] User/nickname ${user.login} already exists, cannot create it`);
		throw { code: 'USER_ALREADY_EXISTS', data: {username: user.login}};
	}
}

export async function deleteUser(username) {
	try {
		if (username === 'admin') throw {code: 'USER_DELETE_ADMIN_DAMEDESU', message: 'Admin user cannot be deleted as it is used for the Karaoke Instrumentality Project'};
		const user = await findUserByName(username);
		if (!user) throw {code: 'USER_NOT_EXISTS'};
		//Reassign karas and playlists owned by the user to the admin user
		await db.reassignToUser(username,'admin');
		await db.deleteUser(username);
		logger.debug(`[User] Deleted user ${username}`);
		return true;
	} catch (err) {
		logger.error(`[User] Unable to delete user ${username} : ${err}`);
		throw ({code: 'USER_DELETE_ERROR', data: err});
	}
}

async function createDefaultGuests() {
	const guests = await listGuests();
	if (guests.length >= defaultGuestNames.length) return 'No creation of guest account needed';
	let guestsToCreate = [];
	for (const guest of defaultGuestNames) {
		if (!guests.find(g => g.login === guest)) guestsToCreate.push(guest);
	}
	let maxGuests = guestsToCreate.length;
	if (getConfig().isTest) maxGuests = 1;
	logger.debug(`[User] Creating ${maxGuests} new guest accounts`);
	for (let i = 0; i < maxGuests; i++) {
		if (!await findUserByName(guestsToCreate[i])) await createUser({
			login: guestsToCreate[i],
			type: 2
		});
	}
	logger.debug('[User] Default guest accounts created');
}

export async function initUserSystem() {
	// Initializing user auth module
	// Expired guest accounts will be cleared on launch and every minute via repeating action
	updateExpiredUsers();
	setInterval(updateExpiredUsers, 60000);
	// Check if a admin user exists just in case. If not create it with a random password.

	if (!await findUserByName('admin')) await createUser({
		login: 'admin',
		password: randomstring.generate(8)
	}, {
		admin: true
	});

	if (getConfig().isTest) {
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

	createDefaultGuests();
	cleanupAvatars();
}

async function cleanupAvatars() {
	// This is done because updating avatars generate a new name for the file. So unused avatar files are now cleaned up.
	const users = await listUsers();
	const avatars = [];
	for (const user of users) {
		if (!avatars.includes(user.avatar_file)) avatars.push(user.avatar_file);
	}
	const conf = getConfig();
	const avatarFiles = await asyncReadDir(resolve(conf.appPath, conf.PathAvatars));
	for (const file of avatarFiles) {
		if (!avatars.includes(file) && file !== 'blank.png') asyncUnlink(resolve(conf.appPath, conf.PathAvatars, file));
	}
	return true;
}

export async function updateSongsLeft(username,playlist_id) {
	const conf = getConfig();
	const user = await findUserByName(username);
	let quotaLeft;
	if (!playlist_id) playlist_id = getState().modePlaylistID;
	if (user.type >= 1 && +conf.EngineQuotaType > 0) {
		switch(+conf.EngineQuotaType) {
		default:
		case 1:
			const count = await getSongCountForUser(playlist_id,username);
			quotaLeft = +conf.EngineSongsPerUser - count.count;
			break;
		case 2:
			const time = await getSongTimeSpentForUser(playlist_id,username);
			quotaLeft = +conf.EngineTimePerUser - time.timeSpent;
		}
	} else {
		quotaLeft = -1;
	}
	logger.debug(`[User] Updating quota left for ${user.login} : ${quotaLeft}`);
	emitWS('quotaAvailableUpdated', {
		username: user.login,
		quotaLeft: quotaLeft,
		quotaType: +conf.EngineQuotaType
	});
}

export async function updateUserQuotas(kara) {
	//If karaokes are present in the public playlist, we're marking it free.
	//First find which KIDs are to be freed. All those before the currently playing kara
	// are to be set free.
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
		publicPlaylist.some(publicSong => {
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
		updateSongsLeft(username,state.modePlaylistID);
	});
	profile('updateUserQuotas');
}

export async function checkLogin(username, password, admin) {
	const conf = getConfig();
	let user = {};
	if (username.includes('@') && +conf.OnlineUsers) {
		try {
			// If username has a @, check its instance for existence
			// If OnlineUsers is disabled, accounts are connected with
			// their local version if it exists already.
			const instance = username.split('@')[1];
			user = await fetchAndUpdateRemoteUser(username, password);
			upsertRemoteToken(username, user.onlineToken);
			// Download and add all favorites
			fetchAndAddFavorites(instance, user.onlineToken, username, user.nickname);
		} catch(err) {
			logger.error(`[RemoteAuth] Failed to authenticate ${username} : ${JSON.stringify(err)}`);
		}
	} else {
		// User is a local user
		user = await findUserByName(username);
		if (!user) throw false;
		if (!await checkPassword(user, password)) throw false;
	}
	const role = getRole(user);
	updateLastLoginName(username);
	return {
		token: createJwtToken(username, role, conf),
		onlineToken: user.onlineToken,
		username: username,
		role: role
	};
}

function getRole(user) {
	if (+user.type === 2) return 'guest';
	if (+user.type === 0) return 'admin';
	if (+user.type === 1) return 'user';
	return 'guest';
}
