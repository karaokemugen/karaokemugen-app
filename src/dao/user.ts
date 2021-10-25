import {pg as yesql} from 'yesql';

import {db, newDBTask} from '../lib/dao/database';
import { DBUser } from '../lib/types/database/user';
import { User, UserParams } from '../lib/types/user';
import { now } from '../lib/utils/date';
import { sqlcreateUser, sqldeleteUser, sqleditUser, sqleditUserPassword, sqlLowercaseAllUsers, sqlMergeUserDataPlaylist, sqlMergeUserDataPlaylistContent, sqlMergeUserDataRequested, sqlreassignPlaylistContentToUser, sqlreassignPlaylistToUser, sqlreassignRequestedToUser, sqlSelectAllDupeUsers, sqlselectUsers, sqlupdateLastLogin } from './sql/user';

export function deleteUser(username: string) {
	return db().query(sqldeleteUser, [username]);
}

export async function selectUsers(params: UserParams = {}): Promise<DBUser[]> {
	const res = await db().query(yesql(sqlselectUsers(params))({
		last_login_time_limit: new Date(now() - (15 * 60 * 1000)),
		username: params.singleUser,
		nickname: params.singleNickname
	}));
	return res.rows;
}

export function insertUser(user: User) {
	return db().query(yesql(sqlcreateUser)({
		type: user.type,
		login: user.login,
		password: user.password,
		nickname: user.nickname,
		last_login_at: user.last_login_at,
		flag_tutorial_done: user.flag_tutorial_done || false,
		flag_sendstats: user.flag_sendstats || null,
		language: user.language,
	}));
}

export async function updateUser(user: User): Promise<User> {
	if (!user.old_login) user.old_login = user.login;
	const ret = (await db().query(yesql(sqleditUser)({
		nickname: user.nickname,
		avatar_file: user.avatar_file || 'blank.png',
		login: user.login,
		bio: user.bio,
		url: user.url,
		email: user.email,
		type: user.type,
		old_login: user.old_login,
		main_series_lang: user.main_series_lang,
		fallback_series_lang: user.fallback_series_lang,
		flag_tutorial_done: user.flag_tutorial_done || false,
		flag_sendstats: user.flag_sendstats,
		location: user.location,
		flag_parentsonly: user.flag_parentsonly,
		language: user.language
	}))).rows[0];
	if (!ret) {
		throw new Error('PostgreSQL did not return updated user, the where condition failed.');
	} else {
		return ret;
	}
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
		})),
		db().query(yesql(sqlreassignRequestedToUser)({
			username: username,
			old_username: oldUsername
		}))
	]);
}

export function updateUserLastLogin(username: string) {
	username = username.toLowerCase();
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

export async function selectAllDupeUsers() {
	const result = await db().query(sqlSelectAllDupeUsers);
	return result.rows;
}

export async function lowercaseAllUsers() {
	await db().query(sqlLowercaseAllUsers);
}

export async function mergeUserData(oldUser: string, newUser: string): Promise<any> {
	const query = [
		db().query(sqlMergeUserDataPlaylist, [oldUser, newUser]),
		db().query(sqlMergeUserDataPlaylistContent, [oldUser, newUser]),
		db().query(sqlMergeUserDataRequested, [oldUser, newUser])
	];
	return Promise.all(query);
}
