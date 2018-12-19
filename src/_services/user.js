import {deletePlaylist} from '../_services/playlist';
import {findFavoritesPlaylist, convertToRemoteFavorites} from '../_services/favorites';
import {detectFileType, asyncMove, asyncExists, asyncUnlink, asyncReadDir} from '../_common/utils/files';
import {getConfig} from '../_common/utils/config';
import {freePLCBeforePos, getPlaylistContentsMini, freePLC, createPlaylist} from '../_services/playlist';
import {createHash} from 'crypto';
import deburr from 'lodash.deburr';
import {now} from 'unix-timestamp';
import {resolve} from 'path';
import logger from 'winston';
import uuidV4 from 'uuid/v4';
import {defaultGuestNames} from '../_services/constants';
import randomstring from 'randomstring';
import {on} from '../_common/utils/pubsub';
import {getSongCountForUser, getSongTimeSpentForUser} from '../_dao/kara';
import {emitWS} from '../_webapp/frontend';
import {profile} from '../_common/utils/logger';
import {getState} from '../_common/utils/state';
import got from 'got';
import { getRemoteToken, upsertRemoteToken } from '../_dao/user';
import formData from 'form-data';
import { createReadStream } from 'fs';
import { writeStreamToFile } from '../_common/utils/files';

const db = require('../_dao/user');
let userLoginTimes = {};
let databaseBusy = false;

on('databaseBusy', status => {
	databaseBusy = status;
});

async function updateExpiredUsers() {
	// Unflag online accounts from database if they expired
	try {
		if (!databaseBusy) {
			await db.updateExpiredUsers(now() - (getConfig().AuthExpireTime * 60));
			await db.resetGuestsPassword();
		}
	} catch(err) {
		logger.error(`[Users] Expiring users failed (will try again in one minute) : ${err}`);
	}
}

export async function updateLastLoginName(login) {
	const currentUser = await findUserByName(login);
	// To avoid flooding database UPDATEs, only update login time every minute for a user
	if (!userLoginTimes[login]) userLoginTimes[login] = now();
	if (userLoginTimes[login] < (now() - 60)) {
		userLoginTimes[login] = now();
		return await db.updateUserLastLogin(currentUser.id,now());
	}
}

export async function getUserRequests(username) {
	if (!await findUserByName(username)) throw 'User unknown';
	return await db.getUserRequests(username);
}

export async function fetchRemoteAvatar(instance, avatarFile) {
	const conf = getConfig();
	try {
		const res = await got(`http://${instance}/avatars/${avatarFile}`, {
			stream: true
		});
		const avatarPath = resolve(conf.appPath, conf.PathTemp, avatarFile);
		await writeStreamToFile(res, avatarFile);
		return avatarPath;
	} catch(err) {
		throw err;
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
		throw `Remote update failed : ${err}`;
	}
}

export async function convertToRemoteUser(token, password, instance) {
	const user = await findUserByName(token.username);
	if (!user) throw 'User unknown';
	if (!await checkPassword(user, password)) throw 'Wrong password';
	user.login = `${token.username}@${instance}`;
	user.password = password;
	try {
		await createRemoteUser(user);
	} catch(err) {
		throw `Unable to create remote user : ${err}`;
	}
	const remoteUser = await remoteLogin(user.login, password);
	upsertRemoteToken(user.login, remoteUser.token);
	try {
		await editUser(token.username, user, null, token.role, {
			editRemote: true,
			renameUser: true
		});
		await convertToRemoteFavorites(user.login);
	} catch(err) {
		console.log(err);
	}
}

export async function editUser(username, user, avatar, role, opts = {
	editRemote: true,
	renameUser: false
}) {
	try {
		let currentUser;
		if (user.id) {
			currentUser = await findUserByID(user.id);
		} else {
			currentUser = await findUserByName(username);
		}
		if (!currentUser) throw 'User unknown';
		if (currentUser.type === 2 && role !== 'admin') throw 'Guests are not allowed to edit their profiles';
		user.id = currentUser.id;
		if (!opts.renameUser) user.login = username;
		if (!user.type) user.type = currentUser.type;
		if (!user.bio) user.bio = null;
		if (!user.url) user.url = null;
		if (!user.email) user.email = null;
		if (!user.flag_admin) user.flag_admin = 0;
		if (user.flag_admin && role !== 'admin') throw 'Admin flag permission denied';
		if (user.type !== currentUser.type && role !== 'admin') throw 'Only admins can change a user\'s type';
		// Check if login already exists.
		if (currentUser.nickname !== user.nickname && await db.checkNicknameExists(user.nickname, user.NORM_nickname)) throw 'Nickname already exists';
		user.NORM_nickname = deburr(user.nickname);
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
		if (user.login.includes('@') && opts.editRemote) await editRemoteUser(user);
		// Modifying passwords is not allowed in demo mode
		if (user.password && !getConfig().isDemo) {
			user.password = hashPassword(user.password);
			await db.updateUserPassword(user.id,user.password);
		}
		return user;
	} catch (err) {
		console.log(err);
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
	const userdata = await db.getUserByName(username);
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
		if (userdata.type === 1) userdata.favoritesPlaylistID = await findFavoritesPlaylist(username);
		return userdata;
	}
	return false;
}

export async function findUserByID(id) {
	const userdata = await db.getUserByID(id);
	if (userdata) {
		if (!userdata.bio) userdata.bio = null;
		if (!userdata.url) userdata.url = null;
		if (!userdata.email) userdata.email = null;
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
	if (guest) return guest.login;
	guest = await db.getRandomGuest();
	if (!guest) return false;
	await db.updateUserPassword(guest.id, hashPassword(fingerprint));
	return guest.login;
}

export async function updateUserFingerprint(username, fingerprint) {
	return await db.updateUserFingerprint(username, fingerprint);
}

export async function remoteCheckAuth(instance, token) {
	try {
		const res = await got.get(`http://${instance}/api/auth/check`, {
			headers: {
				authorization: token
			}
		});
		return JSON.parse(res.body);
	} catch(err) {
		throw err;
	}
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
		throw err;
	}
}

async function createRemoteUser(user) {
	const instance = user.login.split('@')[1];
	const login = user.login.split('@')[0];
	try {
		await getRemoteUser(user.login);
		throw `User already exists on ${instance} or incorrect password`;
	} catch(err) {
		// User unknown, we're good to create it
	}
	try {
		await got(`http://${instance}/api/users`, {
			body: {
				login: login,
				password: user.password
			},
			form: true
		});
	} catch(err) {
		throw err;
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
		throw err;
	}
}

export async function createUser(user, opts) {

	if (!opts) opts = {
		createFavoritePlaylist: true,
		createRemote: true
	};
	user.type = user.type || 1;
	user.nickname = user.nickname || user.login;
	user.last_login = now();
	user.NORM_nickname = deburr(user.nickname);
	user.avatar_file = user.avatar_file || 'blank.png';
	user.flag_online = user.flag_online || 1;
	user.flag_admin = user.flag_admin || 0;
	user.bio = user.bio || null;
	user.url = user.url || null;
	user.email = user.email || null;

	await newUserIntegrityChecks(user);
	if (user.login.includes('@') && opts.createRemote) await createRemoteUser(user);
	if (user.password) user.password = hashPassword(user.password);
	try {
		await db.addUser(user);
		if (user.type === 1 && opts.createFavoritePlaylist) {
			await createPlaylist(`Faves : ${user.login}`, {favorites: true} , user.login);
			logger.info(`[User] Created user ${user.login}`);
			logger.debug(`[User] User data : ${JSON.stringify(user)}`);
		}
		return true;
	} catch (err) {
		logger.error(`[User] Unable to create user ${user.login} : ${err}`);
		throw ({ code: 'USER_CREATION_ERROR', data: err});
	}
}

async function newUserIntegrityChecks(user) {
	if (user.id) throw { code: 'USER_WITH_ID'};
	if (user.type === 1 && !user.password) throw { code: 'USER_EMPTY_PASSWORD'};
	if (user.type === 2 && user.password) throw { code: 'GUEST_WITH_PASSWORD'};

	// Check if login already exists.
	if (await db.getUserByName(user.login) || await db.checkNicknameExists(user.login, deburr(user.login))) {
		logger.error(`[User] User/nickname ${user.login} already exists, cannot create it`);
		throw { code: 'USER_ALREADY_EXISTS', data: {username: user.login}};
	}
}

export async function deleteUser(username) {
	const user = await findUserByName(username);
	if (!user) throw {code: 'USER_NOT_EXISTS'};
	return await deleteUserById(user.id);
}

export async function deleteUserById(id) {

	try {
		const user = await findUserByID(id);
		if (!user) throw {code: 'USER_NOT_EXISTS'};
		if (user.login === 'admin') throw {code: 'USER_DELETE_ADMIN_DAMEDESU', message: 'Admin user cannot be deleted as it is used for the Karaoke Instrumentality Project'};
		const playlist_id = await findFavoritesPlaylist(user.login);
		if (playlist_id) {
			await deletePlaylist(playlist_id);
		}
		//Reassign karas and playlists owned by the user to the admin user
		await db.reassignToUser(user.id,1);
		await db.deleteUser(user.id);
		logger.debug(`[User] Deleted user ${user.login} (id ${user.id})`);
		return true;
	} catch (err) {
		logger.error(`[User] Unable to delete user ${id} : ${err}`);
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
	if (getConfig().isTest) maxGuests = 3;
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
	setInterval(updateExpiredUsers, 60000);
	// Check if a admin user exists just in case. If not create it with a random password.

	if (!await findUserByName('admin')) await createUser({
		login: 'admin',
		password: randomstring.generate(8),
		flag_admin: 1
	}, {
		createFavoritePlaylist: false
	});

	if (getConfig().isTest) {
		if (!await findUserByName('adminTest')) {
			await createUser({
				login: 'adminTest',
				password: 'ceciestuntest',
				flag_admin: 1
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

export async function updateSongsLeft(user_id,playlist_id) {
	const conf = getConfig();
	const user = await findUserByID(user_id);
	let quotaLeft;
	if (!playlist_id) playlist_id = getState().modePlaylistID;
	if (user.flag_admin === 0 && +conf.EngineQuotaType > 0) {
		switch(+conf.EngineQuotaType) {
		default:
		case 1:
			const count = await getSongCountForUser(playlist_id,user_id);
			quotaLeft = +conf.EngineSongsPerUser - count.count;
			break;
		case 2:
			const time = await getSongTimeSpentForUser(playlist_id,user_id);
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
	const internalState = getState();
	profile('updateUserQuotas');
	await freePLCBeforePos(kara.pos, internalState.currentPlaylistID);
	// For every KID we check if it exists and add the PLC to a list
	const [publicPlaylist, currentPlaylist] = await Promise.all([
		getPlaylistContentsMini(internalState.publicPlaylistID),
		getPlaylistContentsMini(internalState.currentPlaylistID)
	]);
	let freeTasks = [];
	let usersNeedingUpdate = [];
	for (const currentSong of currentPlaylist) {
		publicPlaylist.some(publicSong => {
			if (publicSong.kid === currentSong.kid && currentSong.flag_free === 1) {
				freeTasks.push(freePLC(publicSong.playlistcontent_id));
				if (!usersNeedingUpdate.includes(publicSong.user_id)) usersNeedingUpdate.push(publicSong.user_id);
				return true;
			}
			return false;
		});
	}
	await Promise.all(freeTasks);
	usersNeedingUpdate.forEach(user_id => {
		updateSongsLeft(user_id,internalState.modePlaylistID);
	});
	profile('updateUserQuotas');
}
