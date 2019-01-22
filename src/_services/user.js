import {deletePlaylist} from '../_services/playlist';
import {findFavoritesPlaylist} from '../_services/favorites';
import {detectFileType, asyncMove, asyncExists, asyncUnlink} from '../_utils/files';
import {getConfig} from '../_utils/config';
import {freePLCBeforePos, getPlaylistContentsMini, freePLC, createPlaylist} from '../_services/playlist';
import {createHash} from 'crypto';
import {now} from 'unix-timestamp';
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
	if (!userLoginTimes[login]) userLoginTimes[login] = new Date();
	if (userLoginTimes[login] < new Date((now() * 1000) - 60)) {
		userLoginTimes[login] = new Date();
		return await db.updateUserLastLogin(currentUser.id);
	}
}

export async function getUserRequests(username) {
	if (!await findUserByName(username)) throw 'User unknown';
	return await db.getUserRequests(username);
}

export async function editUser(username,user,avatar,role) {
	try {
		let currentUser;
		currentUser = await findUserByName(username);
		if (!currentUser) throw 'User unknown';
		if (currentUser.type === 2 && role !== 'admin') throw 'Guests are not allowed to edit their profiles';
		user.login = username;
		if (!user.bio) user.bio = null;
		if (!user.url) user.url = null;
		if (!user.email) user.email = null;
		if (user.type === 0 && role !== 'admin') throw 'Admin flag permission denied';
		if (user.type && +user.type !== currentUser.type && role !== 'admin') throw 'Only admins can change a user\'s type';
		// Check if login already exists.
		if (currentUser.nickname !== user.nickname && await db.checkNicknameExists(user.nickname)) throw 'Nickname already exists';
		// Modifying passwords is not allowed in demo mode
		if (user.password && !getConfig().isDemo) {
			user.password = hashPassword(user.password);
			await db.updateUserPassword(user.id,user.password);
		}
		if (avatar) {
			// If a new avatar was sent, it is contained in the avatar object
			// Let's move it to the avatar user directory and update avatar info in
			// database
			user.avatar_file = await replaceAvatar(currentUser.avatar_file,avatar);
		} else {
			user.avatar_file = currentUser.avatar_file;
		}
		await db.editUser(user);
		logger.debug(`[User] ${username} (${user.nickname}) profile updated`);
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
		const newAvatarFile = uuidV4()+ '.' + fileType;
		const newAvatarPath = resolve(conf.PathAvatars,newAvatarFile);
		const oldAvatarPath = resolve(conf.PathAvatars,oldImageFile);
		if (await asyncExists(oldAvatarPath) &&
			oldImageFile !== 'blank.png') await asyncUnlink(oldAvatarPath);
		await asyncMove(avatar.path,newAvatarPath);
		return newAvatarFile;
	} catch (err) {
		logger.error(`[User] Unable to replace avatar ${oldImageFile} with ${avatar.path} : ${err}`);
		throw err;
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
		if (userdata.type <= 1) userdata.favoritesPlaylistID = await findFavoritesPlaylist(username);
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

export async function createUser(user, opts = {
	admin: false
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

	await newUserIntegrityChecks(user);
	if (user.password) user.password = hashPassword(user.password);
	try {
		await db.addUser(user);
		logger.info(`[User] Created user ${user.login}`);
		logger.debug(`[User] User data : ${JSON.stringify(user, null, 2)}`);
		return true;
	} catch (err) {
		logger.error(`[User] Unable to create user ${user.login} : ${err}`);
		throw ({ code: 'USER_CREATION_ERROR', data: err});
	}
}

async function newUserIntegrityChecks(user) {
	if (user.id) throw { code: 'USER_WITH_ID'};
	if (user.type < 2 && !user.password) throw { code: 'USER_EMPTY_PASSWORD'};
	if (user.type === 2 && user.password) throw { code: 'GUEST_WITH_PASSWORD'};

	// Check if login already exists.
	if (await db.getUserByName(user.login) || await db.checkNicknameExists(user.login)) {
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
