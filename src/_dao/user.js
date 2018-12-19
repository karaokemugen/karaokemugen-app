import {getUserDb} from './database';
const sql = require('../_common/db/user');


const remoteTokens = [];
// Format:
// {
//   username: ...
//   token: ...
// }

export async function getUserByName(username) {
	return await getUserDb().get(sql.selectUserByName, { $username: username });
}

export async function checkNicknameExists(nickname,NORM_nickname) {
	return await getUserDb().get(sql.testNickname, {
		$nickname: nickname,
		$NORM_nickname: NORM_nickname
	});
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

export async function getUserRequests(username) {
	return await getUserDb().all(sql.getUserRequests, {$username: username});
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
		$email: user.email,
		$flag_admin: user.flag_admin,
		$type: user.type
	});
}

export async function reassignToUser(old_id,id) {
	const updates = [
		getUserDb().run(sql.reassignPlaylistToUser, {
			$id: id,
			$old_id: old_id
		}),
		getUserDb().run(sql.reassignPlaylistContentToUser, {
			$id: id,
			$old_id: old_id
		})
	];
	return await Promise.all(updates);

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

export function getRemoteToken(username) {
	const index = findRemoteToken(username);
	if (index !== null) return remoteTokens[index];
	return null;
}

function findRemoteToken(username) {
	let remoteTokenIndex;
	const remoteTokenFound = remoteTokens.some((rt, index) => {
		remoteTokenIndex = index;
		return rt.username === username;
	});
	if (remoteTokenFound) return remoteTokenIndex;
	return null;
}

export function upsertRemoteToken(username, token) {
	const index = findRemoteToken(username);
	if (index) delete remoteTokens[index];
	remoteTokens.push({
		username: username,
		token: token
	});
}