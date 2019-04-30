import {db} from './database';
import {pg as yesql} from 'yesql';
import { User } from '../types/user';
const sql = require('./sql/user');

export async function getUser(username: string) {
	const res = await db().query(yesql(sql.selectUserByName)({username: username}));
	return res.rows[0];
}

const remoteTokens = [];
// Format:
// {
//   username: ...
//   token: ...
// }

export async function checkNicknameExists(nickname: string) {
	const res = await db().query(yesql(sql.testNickname)({nickname: nickname}));
	return res.rows[0];
}

export async function deleteUser(username: string) {
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

export async function addUser(user: User) {
	return await db().query(yesql(sql.createUser)({
		type: user.type,
		login: user.login,
		password: user.password,
		nickname: user.nickname,
		last_login_at: user.last_login_at,
		flag_online: user.flag_online,
	}));
}

export async function editUser(user: User) {
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

export async function reassignToUser(oldUsername: string, username: string) {
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

export async function updateExpiredUsers(expireTime: number) {
	return await db().query(sql.updateExpiredUsers, [new Date(expireTime * 1000)]);
}

export async function updateUserFingerprint(username: string, fingerprint: string) {
	return await db().query(yesql(sql.updateUserFingerprint)({
		username: username,
		fingerprint: fingerprint
	}));
}

export async function getRandomGuest() {
	const res = await db().query(sql.selectRandomGuestName);
	return res.rows[0];
}

export async function findFingerprint(fingerprint: string) {
	const res = await db().query(sql.findFingerprint, [fingerprint] );
	return res.rows[0];
}

export async function resetGuestsPassword() {
	return await db().query(sql.resetGuestsPassword);
}

export async function updateUserLastLogin(username: string) {
	return await db().query(yesql(sql.updateLastLogin)({
		username: username,
		now: new Date()
	}));
}

export async function updateUserPassword(username: string, password: string) {
	return await db().query(yesql(sql.editUserPassword)({
		username: username,
		password: password
	}));
}

export function getRemoteToken(username: string) {
	const index = findRemoteToken(username);
	if (index !== null) return remoteTokens[index];
	return null;
}

function findRemoteToken(username: string) {
	let remoteTokenIndex;
	const remoteTokenFound = remoteTokens.some((rt, index) => {
		remoteTokenIndex = index;
		return rt.username === username;
	});
	if (remoteTokenFound) return remoteTokenIndex;
	return null;
}

export function upsertRemoteToken(username: string, token: string) {
	const index = findRemoteToken(username);
	if (index) delete remoteTokens[index];
	remoteTokens.push({
		username: username,
		token: token
	});
}