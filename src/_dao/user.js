import {getUserDb} from './database';
const sql = require('../_common/db/user');

export function getUserByName(username) {
	return getUserDb().get(sql.selectUserByName, { $username: username });
}

export function checkUserNameExists(username) {
	return getUserDb().get(sql.testUserName, { $login: username });
}

export function checkUserIDExists(id) {
	return getUserDb().get(sql.testUserID, { $id: id });
}

export function deleteUser(id) {
	return getUserDb().run(sql.deleteUser, { $id: id });
}

export function getUserByID(id) {
	return getUserDb().get(sql.selectUserByID, { $id: id });
}

export function listUsers() {
	return getUserDb().all(sql.selectUsers);
}

export function listGuests() {
	return getUserDb().all(sql.selectGuests);
}

export function addUser(user) {
	return getUserDb().run(sql.createUser, {
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

export function editUser(user) {
	return getUserDb().run(sql.editUser, {
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

export function cleanGuestUsers(expireTime) {
	return getUserDb().run(sql.deleteExpiredGuests, { $expire_time: expireTime });
}

export async function isAdmin(username) {
	const req = await getUserDb().get(sql.isAdmin, { $username: username });
	return req.flag_admin === 1;
}

export function updateUserLastLogin(id,now) {
	return getUserDb().run(sql.updateLastLogin, {
		$id: id,
		$now: now
	});
}

export function updateUserPassword(id,password) {
	return getUserDb().run(sql.updateUserPassword, {
		$id: id,
		$password: password
	});
}
