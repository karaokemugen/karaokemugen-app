import {pg as yesql} from 'yesql';

import {db, newDBTask} from '../lib/dao/database';
import { DBUser } from '../lib/types/database/user';
import { User } from '../lib/types/user';
import { DBGuest, RemoteToken } from '../types/database/user';
import { sqlcreateUser, sqldeleteUser, sqleditUser, sqleditUserPassword,sqlfindFingerprint, sqlreassignPlaylistContentToUser, sqlreassignPlaylistToUser, sqlresetGuestsPassword, sqlselectGuests, sqlselectRandomGuestName, sqlselectUserByName, sqlselectUsers, sqltestNickname, sqlupdateExpiredUsers, sqlupdateLastLogin, sqlupdateUserFingerprint } from './sql/user';

export async function getUser(username: string): Promise<DBUser> {
	const res = await db().query(yesql(sqlselectUserByName)({username: username}));
	return res.rows[0];
}

const remoteTokens = [];
// Format:
// {
//   username: ...
//   token: ...
// }

export async function checkNicknameExists(nickname: string): Promise<string> {
	const res = await db().query(yesql(sqltestNickname)({nickname: nickname}));
	if (res.rows[0]) return res.rows[0].login;
	return null;
}

export function deleteUser(username: string) {
	return db().query(sqldeleteUser, [username]);
}

export async function listUsers(): Promise<DBUser[]> {
	const res = await db().query(sqlselectUsers);
	return res.rows;
}

export async function listGuests(): Promise<DBGuest[]> {
	const res = await db().query(sqlselectGuests);
	return res.rows;
}

export function addUser(user: User) {
	return db().query(yesql(sqlcreateUser)({
		type: user.type,
		login: user.login,
		password: user.password,
		nickname: user.nickname,
		last_login_at: user.last_login_at,
		flag_online: user.flag_online,
	}));
}

export function editUser(user: User) {
	if (!user.old_login) user.old_login = user.login;
	return db().query(yesql(sqleditUser)({
		nickname: user.nickname,
		avatar_file: user.avatar_file || 'blank.png',
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

export function reassignToUser(oldUsername: string, username: string) {
	return Promise.all([
		db().query(yesql(sqlreassignPlaylistToUser)({
			username: username,
			old_username: oldUsername
		})),
		db().query(yesql(sqlreassignPlaylistContentToUser)({
			username: username,
			old_username: oldUsername
		}))
	]);
}

export function updateExpiredUsers(expireTime: Date) {
	return db().query(sqlupdateExpiredUsers, [expireTime]);
}

export function updateUserFingerprint(username: string, fingerprint: string) {
	return db().query(yesql(sqlupdateUserFingerprint)({
		username: username,
		fingerprint: fingerprint
	}));
}

export async function getRandomGuest(): Promise<string> {
	const res = await db().query(sqlselectRandomGuestName);
	if (res.rows[0]) return res.rows[0].login;
	return null;
}

export async function findFingerprint(fingerprint: string): Promise<string> {
	const res = await db().query(sqlfindFingerprint, [fingerprint] );
	if (res.rows[0]) return res.rows[0].login;
}

export function resetGuestsPassword() {
	return db().query(sqlresetGuestsPassword);
}

export function updateUserLastLogin(username: string) {
	newDBTask({
		func: updateUserLastLoginTask,
		args: [username],
		name: `updateUserLastLogin-${username}`
	});
}

export async function updateUserLastLoginTask(username: string) {
	await db().query(yesql(sqlupdateLastLogin)({
		username: username,
		now: new Date()
	}));
}

export function updateUserPassword(username: string, password: string) {
	return db().query(yesql(sqleditUserPassword)({
		username: username,
		password: password
	}));
}

export function getRemoteToken(username: string): RemoteToken {
	const index = findRemoteToken(username);
	if (index > -1) return remoteTokens[index];
	return undefined;
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