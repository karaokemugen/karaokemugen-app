import {db} from '../lib/dao/database';
import {pg as yesql} from 'yesql';
import { User } from '../lib/types/user';
import { DBUser, DBGuest, RemoteToken } from '../types/database/user';
const sql = require('./sql/user');

export async function getUser(username: string): Promise<DBUser> {
	const res = await db().query(yesql(sql.selectUserByName)({username: username}));
	return res.rows[0];
}

const remoteTokens = [];
// Format:
// {
//   username: ...
//   token: ...
// }

export async function checkNicknameExists(nickname: string): Promise<string> {
	const res = await db().query(yesql(sql.testNickname)({nickname: nickname}));
	if (res.rows[0]) return res.rows[0].login;
	return null;
}

export async function deleteUser(username: string) {
	return await db().query(sql.deleteUser, [username]);
}

export async function listUsers(): Promise<DBUser[]> {
	const res = await db().query(sql.selectUsers);
	return res.rows;
}

export async function listGuests(): Promise<DBGuest[]> {
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
		old_login: user.old_login,
		series_lang_mode: user.series_lang_mode,
		main_series_lang: user.main_series_lang,
		fallback_series_lang: user.fallback_series_lang
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

export async function updateExpiredUsers(expireTime: Date) {
	return await db().query(sql.updateExpiredUsers, [expireTime]);
}

export async function updateUserFingerprint(username: string, fingerprint: string) {
	return await db().query(yesql(sql.updateUserFingerprint)({
		username: username,
		fingerprint: fingerprint
	}));
}

export async function getRandomGuest(): Promise<string> {
	const res = await db().query(sql.selectRandomGuestName);
	if (res.rows[0]) return res.rows[0].login;
	return null;
}

export async function findFingerprint(fingerprint: string): Promise<string> {
	const res = await db().query(sql.findFingerprint, [fingerprint] );
	if (res.rows[0]) return res.rows[0].login;
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

export function getRemoteToken(username: string): RemoteToken {
	const index = findRemoteToken(username);
	if (index > -1) return remoteTokens[index];
	return null;
}

function findRemoteToken(username: string): number {
	return remoteTokens.findIndex(rt => rt.username === username);
}

export function upsertRemoteToken(username: string, token: string) {
	const index = findRemoteToken(username);
	index > -1
		? remoteTokens[index] = {username, token}
		: remoteTokens.push({username, token});
}