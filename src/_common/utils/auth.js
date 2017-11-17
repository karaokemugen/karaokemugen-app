import {getUserByName, getUserByID, getGuestInfo, createNewUser} from '../../_engine/components/db_interface.js';
import {createHash} from 'crypto';
import {deburr} from 'lodash';

export async function findUserByName(username) {
	//Check if user exists in db
	const userdata = await getUserByName(username);
	if (userdata) return userdata;
	return null;	
}

export async function findUserByID(id) {
	const userdata = await getUserByID(id);
	if (userdata) return userdata;
	return null;
}

export function hashPassword(password) {
	const hash = createHash('sha256');
	hash.update(password);	
	return hash.digest('hex');
}

export async function createUser(user) {
	// Validate user data
	// Userdata contains :
	// { 
	//   guest_id: number
	//   login: string (can be empty if guest_id > 0)
	//   password: string (can be empty if guest_id > 0. Must be hashed)
	//   nickname: login by default
	//   NORM_nickname: normalized/deburred nickname
	//   avatar_id: if guest_id > 0 then fetch guest's avatar ID
	//   guest_expires: date/time when the guest account should be deleted. Set it to now + 1 hour by default. A reconnection resets the counter to then + 1 hour. Guests can be wiped by an admin command	
	//   flag_online: 0 for now
	//   flag_admin: 0 
	// }
	if (user.guest_id > 0) {
		const guestInfo = await getGuestInfo(user.guest_id);
		user.avatar_id = guestInfo.avatar_id;
		user.nickname = guestInfo.name;
		user.guest_expires = 1
	} else {
		user.avatar_id = 0;
		user.nickname = user.login;
		user.guest_expires = 0;
	}
	user.NORM_nickname = deburr(user.nickname);
	if (user.guest_id > 0 && user.password === null) return 'Password is empty';
	if (user.guest_id > 0 && user.login === null) return 'Login is empty';
	user.flag_online = 0;
	
	if (await createNewUser(user)) {
		return true;
	} else {
		return 'Error creating user in database';
	}
}