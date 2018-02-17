import {getUserDb} from './database';
const sql = require('../_common/db/user');

export async function getUserByName(username) {
	return await getUserDb().get(sql.selectUserByName, { $username: username });
}

export async function checkUserNameExists(username) {
	return await getUserDb().get(sql.testUserName, { $login: username });
}

export async function checkNicknameExists(nickname,NORM_nickname) {
	return await getUserDb().get(sql.testNickname, { 
		$nickname: nickname,
		$NORM_nickname: NORM_nickname 
	});
}

export async function checkUserIDExists(id) {
	return await getUserDb().get(sql.testUserID, { $id: id });
}

export async function deleteUser(id) {
	return await getUserDb().run(sql.deleteUser, { $id: id });
}

export async function getUserByID(id) {
	return await getUserDb().get(sql.selectUserByID, { $id: id });
}

export async function listUsers() {
	return await getUserDb().all(sql.selectUsers);
}

export async function listGuests() {
	return await getUserDb().all(sql.selectGuests);
}

export async function addUser(user) {
	return await getUserDb().run(sql.createUser, {
		$type: user.type,
		$login: user.login,
		$password: user.password,
		$nickname: user.nickname,
		$NORM_nickname: user.NORM_nickname,
		$last_login: user.last_login,
		$flag_online: user.flag_online,
		$flag_admin: user.flag_admin
	});
}

export async function editUser(user) {
	return await getUserDb().run(sql.editUser, {
		$id: user.id,
		$nickname: user.nickname,
		$NORM_nickname: user.NORM_nickname,
		$avatar_file: user.avatar_file,
		$login: user.login,
		$bio: user.bio,
		$url: user.url,
		$email: user.email
	});
}

export async function updateExpiredUsers(expireTime) {
	return await getUserDb().run(sql.updateExpiredUsers, { $expire_time: expireTime });
}

export async function updateUserFingerprint(username, fingerprint) {
	return await getUserDb().run(sql.updateUserFingerprint, { 
		$username: username,
		$fingerprint: fingerprint
	});
}

export async function getRandomGuest() {
	return await getUserDb().get(sql.selectRandomGuestName);
}

export async function findFingerprint(fingerprint) {
	return await getUserDb().get(sql.findFingerprint, {$fingerprint: fingerprint });
}

export async function resetGuestsPassword() {
	return await getUserDb().run(sql.resetGuestsPassword);
}

export async function updateUserLastLogin(id,now) {
	return await getUserDb().run(sql.updateLastLogin, {
		$id: id,
		$now: now
	});
}

export async function updateUserPassword(id,password) {
	return await getUserDb().run(sql.editUserPassword, {
		$id: id,
		$password: password
	});
}
	