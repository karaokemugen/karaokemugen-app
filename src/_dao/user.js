import {db} from './database';
import {pg as yesql} from 'yesql';
import {selectAllKaras} from './kara';
const sql = require('./sql/user');

export async function getUserByName(username) {
	const res = await db().query(yesql(sql.selectUserByName)({username: username}));
	return res.rows[0];
}

export async function checkNicknameExists(nickname) {
	const res = await db().query(yesql(sql.testNickname)({nickname: nickname}));
	return res.rows[0];
}

export async function deleteUser(id) {
	return await db().query(sql.deleteUser, [id]);
}

export async function getUserByID(id) {
	const res = await db().query(sql.selectUserByID, [id]);
	return res.rows[0];
}

export async function listUsers() {
	const res = await db().query(sql.selectUsers);
	return res.rows;
}

export async function listGuests() {
	const res = await db().query(sql.selectGuests);
	return res.rows;
}

export async function getUserRequests(username, lang, from, size) {
	const res = await selectAllKaras('admin', null, lang, 'requests', username, from, size);
	return res.rows;
}

export async function addUser(user) {
	return await db().query(yesql(sql.createUser)({
		type: user.type,
		login: user.login,
		password: user.password,
		nickname: user.nickname,
		last_login_at: user.last_login_at,
		flag_online: user.flag_online,
	}));
}

export async function editUser(user) {
	return await db().query(yesql(sql.editUser)({
		id: user.id,
		nickname: user.nickname,
		avatar_file: user.avatar_file,
		login: user.login,
		bio: user.bio,
		url: user.url,
		email: user.email,
		type: user.type
	}));
}

export async function reassignToUser(old_id,id) {
	const updates = [
		db().query(yesql(sql.reassignPlaylistToUser)({
			id: id,
			old_id: old_id
		})),
		db().query(yesql(sql.reassignPlaylistContentToUser)({
			id: id,
			old_id: old_id
		}))
	];
	return await Promise.all(updates);

}

export async function updateExpiredUsers(expireTime) {
	return await db().query(sql.updateExpiredUsers, [expireTime]);
}

export async function updateUserFingerprint(username, fingerprint) {
	return await db().query(yesql(sql.updateUserFingerprint)({
		username: username,
		fingerprint: fingerprint
	}));
}

export async function getRandomGuest() {
	const res = await db().query(sql.selectRandomGuestName);
	return res.rows[0];
}

export async function findFingerprint(fingerprint) {
	const res = await db().query(sql.findFingerprint, [fingerprint] );
	return res.rows[0];
}

export async function resetGuestsPassword() {
	return await db().query(sql.resetGuestsPassword);
}

export async function updateUserLastLogin(id) {
	return await db().query(yesql(sql.updateLastLogin)({
		id: id,
		now: new Date()
	}));
}

export async function updateUserPassword(id,password) {
	return await db().query(yesql(sql.editUserPassword)({
		id: id,
		password: password
	}));
}
