const db = require('../../_engine/components/db_interface.js');
import {detectFileType, asyncMove, asyncExists, asyncUnlink} from './files.js';
import {getConfig} from './config';
import {createHash} from 'crypto';
import {deburr} from 'lodash';
import {now} from 'unix-timestamp';
import {resolve} from 'path';
import logger from 'winston';
import uuidV4 from 'uuid/v4';

async function cleanGuestUsers() {
	// Cleanup guest accounts from database	
}

export async function updateLastLogin(id) {
	// Update last login time for a user
	return await db.updateLastLogin(id,now());
}

export async function editUser(id,user,avatar) {
	try {
		const currentUser = await findUserByID(id);
		user.id = id;
		if (!user.bio) user.bio = null;
		if (!user.url) user.url = null;
		if (!user.email) user.email = null;
		user.NORM_nickname = deburr(user.nickname);
		if (user.password) {
			user.password = hashPassword(user.password);
			await db.updateUserPassword(id,user.password);
		}
		if (avatar) {
			// If a new avatar was sent, it is contained in the avatar object
			// Let's move it to the avatar user directory and update avatar info in 
			// database
			user.avatar_file = await replaceAvatar(currentUser.avatar_file,avatar);
			console.log(user.avatar_file);
		} else {
			user.avatar_file = currentUser.avatar_file;
		}
		await db.editUser(user);
		logger.info(`[User] ${user.login} (${user.nickname}) profile updated`);
		return user;
	} catch (err) {
		logger.error(`[User] Failed to update ${user.login}'s profile : ${err}`);
		const ret = {
			message: err,
			data: user.nickname
		};
		throw ret;
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
		if (fileType != 'jpg' &&
				fileType != 'gif' &&
				fileType != 'png') {			
			throw 'Wrong avatar file type';			
		}
		// Construct the name of the new avatar file with its ID and filetype.
		const newAvatarFile = uuidV4()+ '.' + fileType;
		const newAvatarPath = resolve(conf.PathAvatars,newAvatarFile);
		const oldAvatarPath = resolve(conf.PathAvatars,oldImageFile);
		if (await asyncExists(oldAvatarPath) &&
			oldImageFile != 'blank.jpg') await asyncUnlink(oldAvatarPath);	
		await asyncMove(avatar.path,newAvatarPath);
		console.log(newAvatarFile);
		return newAvatarFile;
	} catch (err) {
		logger.error(`[User] Unable to replace avatar ${oldImageFile} with ${avatar.path} : ${err}`);
		throw err;
	}
}

export async function findUserByName(username) {
	//Check if user exists in db
	const userdata = await db.getUserByName(username);
	if (userdata) return userdata;
	return false;	
}

export async function findUserByID(id) {
	const userdata = await db.getUserByID(id);
	if (userdata) return userdata;
	return false;
}

export function hashPassword(password) {
	const hash = createHash('sha256');
	hash.update(password);	
	return hash.digest('hex');
}

export async function addUser(user) {
	let ret = {};
	user.nickname = user.login;
	user.password = hashPassword(user.password);
	user.last_login = now();
	user.NORM_nickname = deburr(user.nickname);
	if (!user.type) user.type = 1;
	if (user.type === 1 && user.password === null) {
		ret.code = 'USER_EMPTY_PASSWORD';
		throw ret;
	}
	user.flag_online = 0;
	user.flag_admin = 0;	
	
	// Check if login already exists.
	if (await db.checkUserNameExists(user.login)) {
		ret.code = 'USER_ALREADY_EXISTS';
		logger.error('[User] User '+user.login+' already exists, cannot create it');
		throw ret;
	}
	try {
		await db.createUser(user);
		logger.info(`[User] Created user ${user.login}`);
		logger.debug(`[User] User data : ${JSON.stringify(user)}`);
		return true;
	} catch(err) {
		ret.code = 'USER_CREATION_ERROR';
		ret.data = err;
		logger.error(`[User] Unable to create user ${user.login} : ${err}`);
		throw ret;
	}
}

export async function deleteUser(id) {
	if (!await db.checkUserIDExists(id)) {
		const ret = {
			code: 'USER_NOT_EXISTS',
			args: id
		};
		logger.error(`[User] User ${id} does not exist, unable to delete it`);
		throw ret;
	}
	try {
		await db.deleteUser(id);
		logger.info(`[User] Deleted user ${id}`);
		return true;
	} catch (err) {
		const ret = {
			code: 'USER_DELETE_ERROR',
			data: err
		};
		logger.error(`[User] Unable to delete user ${id} : ${err}`);
		throw ret;
	}
}

export function init() {
	// Initializing user auth module
	// Expired guest accounts will be cleared on launch and every minute via repeating action
}


