import {getUserByName, getUserByID} from '../../_engine/components/db_interface.js';
import {createHash} from 'crypto';

export async function findUserByName(username) {
	//Check if user/password exists in db here
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
	var hash = createHash('sha256');
	hash.update(password);	
	return hash.digest('hex');
}

