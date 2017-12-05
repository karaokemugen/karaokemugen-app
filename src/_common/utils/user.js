const db = require('../../_engine/components/db_interface.js');
import {createHash} from 'crypto';
import {deburr} from 'lodash';
import {now} from 'unix-timestamp';
import logger from 'winston';

export async function editUser(id,user) {
	// User contains :
	// { 
	//   login: string (can be empty if guest_id > 0)
	//   password: string (can be empty if guest_id > 0. Must be hashed)
	//   nickname: login by default
	//   NORM_nickname: normalized/deburred nickname
	//   bio: Bio text.
	//   url: URL text
	//   email: email
	// }	
	if (await db.editUser(user)) {
		return true;
	} else {
		return 'Error editing user in database';
	}
}

export async function addGuest(guest) {
	// Guest object :
	// { 
    //   name: Name of guest account, like "Mahoro",
	//   avatar_id: id of avatar to use
	// }
}

export async function deleteGuest(id) {

}

export async function editGuest(id,guest) {

}

export async function listGuests() {
	return await db.listGuests();
}

export async function listUsers() {
	return await db.listUsers();
}

export async function addAvatar(avatar) {
    // Avatar object :
	// {
	//   type: 1 - guest, 2 - regular user
    //   imagefile: name of file in app/avatars
	// }
}

export async function deleteAvatar(id) {
    // Check which guest used that avatar, modify the fk_id_avatar in the user table
	// to point to the default avatar instead.
	// Users can't delete their avatars. they have to replace them
}

export async function replaceAvatar(id,imagefile) {
	// Replace avatar by the new uploaded one
}

export async function findUserByName(username) {
	//Check if user exists in db
	const userdata = await db.getUserByName(username);
	if (userdata) return userdata;
	return null;	
}

export async function findUserByID(id) {
	const userdata = await db.getUserByID(id);
	if (userdata) return userdata;
	return null;
}

export function hashPassword(password) {
	const hash = createHash('sha256');
	hash.update(password);	
	return hash.digest('hex');
}

export async function addUser(user) {
	// Validate user data
	// Userdata contains :
	// { 
	//   guest_id: number
	//   login: string (can be empty if guest_id > 0)
	//   password: string (can be empty if guest_id > 0. Must be hashed)
	//   nickname: login by default
	//   NORM_nickname: normalized/deburred nickname
	//   avatar_id: if guest_id > 0 then fetch guest's avatar ID
	//   last_login: date/time when the guest account should be deleted. Set it to now + 1 hour by default. A reconnection resets the counter to then + 1 hour. Guests can be wiped by an admin command	
	//   flag_online: 0 for now
	//   flag_admin: 0 
	// }
	let ret = {};
	if (user.guest_id > 0) {
		const guestInfo = await getGuestInfo(user.guest_id);
		user.avatar_id = guestInfo.avatar_id;
		user.nickname = guestInfo.name;
	} else {
		user.avatar_id = 0;
		user.nickname = user.login;
	}
	user.password = hashPassword(user.password);
	user.last_login = now();
	user.NORM_nickname = deburr(user.nickname);
	// FIXME : Revoir ça parce que ça a pas beaucoup de sens
	// These are only triggered if creating a temporary user via a guest login
	if (user.guest_id > 0 && user.password === null) {
		ret.code = 'USER_EMPTY_PASSWORD';
		throw ret;
	}
	if (user.guest_id > 0 && user.login === null) {
		ret.code = 'USER_EMPTY_LOGIN';
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


