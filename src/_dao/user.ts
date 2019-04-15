import {db} from './database';
import {pg as yesql} from 'yesql';
const sql = require('./sql/user');

export async function getUser(username) {
	const res = await db().query(yesql(sql.selectUserByName)({username: username}));
	return res.rows[0];
}

const remoteTokens = [];
// Format:
// {
//   username: ...
//   token: ...
// }

export async function checkNicknameExists(nickname) {
	const res = await db().query(yesql(sql.testNickname)({nickname: nickname}));
	return res.rows[0];
}

export async function deleteUser(username) {
	return await db().query(sql.deleteUser, [username]);
}

export async function listUsers() {
	const res = await db().query(sql.selectUsers);
	return res.rows;
}

export async function listGuests() {
	const res = await db().query(sql.selectGuests);
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
	if (!user.old_login) user.old_login = user.login;
	return await db().query(yesql(sql.editUser)({
		nickname: user.nickname,
		avatar_file: user.avatar_file,
		login: user.login,
		bio: user.bio,
		url: user.url,
		email: user.email,
		type: user.type,
		old_login: user.old_login
	}));
}

export async function reassignToUser(oldUsername,username) {
	return Promise.all([
		db().query(yesql(sql.reassignPlaylistToUser)({
			username: username,
			old_username: oldUsername
		})),
		db().query(yesql(sql.reassignPlaylistContentToUser)({
			username: username,
			old_username: oldUsername
		}))
	]);
}

export async function updateExpiredUsers(expireTime) {
	return await db().query(sql.updateExpiredUsers, [new Date(expireTime * 1000)]);
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

export async function updateUserLastLogin(username) {
	return await db().query(yesql(sql.updateLastLogin)({
		username: username,
		now: new Date()
	}));
}

export async function updateUserPassword(username,password) {
	return await db().query(yesql(sql.editUserPassword)({
		username: username,
		password: password
	}));
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