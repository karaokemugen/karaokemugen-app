import {deletePlaylist} from '../_services/playlist';
import {findFavoritesPlaylist} from '../_services/favorites';
import {detectFileType, asyncMove, asyncExists, asyncUnlink} from '../_common/utils/files';
import {getConfig} from '../_common/utils/config';
import {createPlaylist} from '../_services/playlist';
import {createHash} from 'crypto';
import sampleSize from 'lodash.samplesize';
import deburr from 'lodash.deburr';
import {now} from 'unix-timestamp';
import {resolve} from 'path';
import logger from 'winston';
import uuidV4 from 'uuid/v4';
import {promisify} from 'util';
import {defaultGuestNames} from '../_services/constants';
import randomstring from 'randomstring';

const db = require('../_dao/user');
const sleep = promisify(setTimeout);

async function updateExpiredUsers() {
	// Unflag online accounts from database if they expired
	try {
		await db.updateExpiredUsers(now() - (getConfig().AuthExpireTime * 60));
		await db.resetGuestsPassword();
		//Sleep for one minute.
		await sleep(60000);
	} catch(err) {
		await sleep(60000);
		throw err;
	}	
}

export async function updateLastLoginName(login) {
	const currentUser = await findUserByName(login);
	return await db.updateUserLastLogin(currentUser.id,now());
}

export async function getUserRequests(username) {
	if (!await findUserByName(username)) throw 'User unknown';
	return await db.getUserRequests(username);
}

export async function editUser(username,user,avatar,role) {
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
		user.login = username;
		if (!user.bio) user.bio = null;
		if (!user.url) user.url = null;
		if (!user.email) user.email = null;
		if (user.flag_admin && role !== 'admin') throw 'Admin flag permission denied';
		// Check if login already exists.
		if (await db.checkNicknameExists(user.nickname, user.NORM_nickname) && currentUser.nickname !== user.nickname) throw 'Nickname already exists';
		user.NORM_nickname = deburr(user.nickname);	
		if (user.password) {
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

export async function checkPassword(username,password) {
	const hashedPassword = hashPassword(password);
	const user = await findUserByName(username, {public:false});
	// Access is granted only if passwords match OR user type is 2 (guest) and its password in database is empty.
	if (user.password === hashedPassword || (user.type === 2 && !user.password)) {
		// If password was empty for a guest, we set it to the password given on login.
		if (user.type === 2 && !user.password) await db.updateUserPassword(username,hashedPassword);
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

export async function createUser(user, opts) {

	if (!opts) opts = {
		createFavoritePlaylist: true
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
	if (user.password) user.password = hashPassword(user.password);	
	try {
		await db.addUser(user);
		if (user.type === 1 && opts.createFavoritePlaylist) {
			await createPlaylist(`Faves : ${user.login}`, 0, 0, 0, 1, user.login);
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
	if (user.id) {
		throw ({ code: 'USER_WITH_ID'});
	}
	if (user.type === 1 && !user.password) {
		throw ({ code: 'USER_EMPTY_PASSWORD'});
	}
	if (user.type === 2 && user.password) {
		throw ({ code: 'GUEST_WITH_PASSWORD'});
	}

	// Check if login already exists.
	if (await db.checkUserNameExists(user.login) || await db.checkNicknameExists(user.login, deburr(user.login))) {
		logger.error('[User] User/nickname ' + user.login + ' already exists, cannot create it');
		throw ({ code: 'USER_ALREADY_EXISTS', data: {username: user.login}});
	}
}


export async function checkUserNameExists(username) {
	return await db.checkUserNameExists(username);	
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
		if (user.login === 'admin') throw {code: 'USER_DELETE_ADMIN_DAMEDESU', message: 'Admin user cannot be deleted as it is used for the Human Instrumentality Project'};
		const playlist_id = await findFavoritesPlaylist(user.login);
		if (playlist_id) {
			await deletePlaylist(playlist_id, {force: true});
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
	if (guests.length > 0) return 'No creation of guest account needed';			
	// May be modified later.
	let maxGuests = defaultGuestNames.length;
	if (getConfig().isTest) maxGuests = 3;
	logger.debug(`[User] Creating ${maxGuests} default guest accounts`);
	const guestsToCreate = sampleSize(defaultGuestNames, maxGuests);	
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
	Promise.resolve().then(function resolver() {
		return updateExpiredUsers()
			.then(resolver)
			.catch((err) => {
				logger.error(`[User] Expiring user accounts failed : ${err}`);
				resolver();
			});
	}).catch((err) => {
		logger.error(`[User] Cleanup expiring user accounts system failed entirely. You need to restart Karaoke Mugen : ${err}`);
	});

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
}


