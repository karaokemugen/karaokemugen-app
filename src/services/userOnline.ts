import FormData from 'form-data';
import { createReadStream } from 'fs-extra';
import { resolve } from 'path';
import { Stream } from 'stream';

import { OldJWTToken, TokenResponseWithRoles, User } from '../lib/types/user.js';
import { resolvedPath } from '../lib/utils/config.js';
import { ErrorKM } from '../lib/utils/error.js';
import { writeStreamToFile } from '../lib/utils/files.js';
import HTTP, { fixedEncodeURIComponent } from '../lib/utils/http.js';
import logger from '../lib/utils/logger.js';
import { emitWS } from '../lib/utils/ws.js';
import { SingleToken, Tokens } from '../types/user.js';
import sentry from '../utils/sentry.js';
import { startSub, stopSub } from '../utils/userPubSub.js';
import { convertToRemoteFavorites } from './favorites.js';
import { checkPassword, createJwtToken, createUser, editUser, getUser } from './user.js';

const service = 'RemoteUser';

/** Check if the online token we have is still valid on KM Server */
export async function remoteCheckAuth(instance: string, token: string) {
	try {
		const res = await HTTP.get(`https://${instance}/api/auth/check`, {
			timeout: 2000,
			headers: {
				authorization: token,
			},
		});
		return res.data;
	} catch (err) {
		if ([403, 401].includes(err.response?.status)) return false;
		logger.debug('Got error when check auth', { service, obj: err });
		throw err;
	}
}

/** Function called when you enter a login/password and login contains an @. We're checking login/password pair against KM Server  */
export async function remoteLogin(username: string, password: string): Promise<string> {
	const [login, instance] = username.split('@');
	try {
		const res = await HTTP.post<TokenResponseWithRoles>(
			`https://${instance}/api/auth/login`,
			{
				username: login,
				password,
			},
			{
				timeout: 2000,
			}
		);
		return res.data.token;
	} catch (err) {
		// Remote login returned 401 so we throw an error
		// For other errors, no error is thrown
		if (err.statusCode === 401) throw 'Unauthorized';
		logger.debug(`Got error when connecting user ${username}`, { service, obj: err });
		return null;
	}
}

export async function resetRemotePassword(user: string) {
	const [username, instance] = user.split('@');
	try {
		await HTTP.post(`https://${instance}/api/users/${username}/resetpassword`);
	} catch (err) {
		logger.error(`Could not trigger reset password for ${user}`, { service, obj: err });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('USER_RESETPASSWORD_ONLINE_ERROR');
	}
}

/** Get a user from KM Server */
async function getARemoteUser(login: string, instance: string): Promise<User> {
	try {
		const user = await HTTP.get(`https://${instance}/api/users/${login}`);
		return user.data as User;
	} catch (err) {
		if ([404].includes(err.response?.status)) return null;
		logger.debug('Got error when trying to get an online user', { service, obj: err });
		throw {
			code: 500,
			msg: 'USER_GET_ERROR_ONLINE',
			message: err,
		};
	}
}

/** Create a user on KM Server */
export async function createRemoteUser(user: User) {
	const [login, instance] = user.login.split('@');
	if (await getARemoteUser(login, instance)) {
		throw {
			code: 409,
			msg: 'USER_ALREADY_EXISTS_ONLINE',
			message: `User already exists on ${instance} or incorrect password`,
		};
	}
	try {
		await HTTP.post(`https://${instance}/api/users`, {
			login,
			password: user.password,
		});
		startSub(login, instance);
	} catch (err) {
		logger.debug(`Got error when create remote user ${login}`, { service, obj: err });
		throw {
			code: 500,
			msg: 'USER_CREATE_ERROR_ONLINE',
			message: err,
		};
	}
}

/** Get user data from KM Server */
export async function getRemoteUser(username: string, token: string): Promise<User> {
	const instance = username.split('@')[1];
	try {
		const res = await HTTP(`https://${instance}/api/myaccount`, {
			headers: {
				authorization: token,
			},
		});
		return res.data as User;
	} catch (err) {
		logger.error(`Got error when get remote user ${username}`, { service, obj: err });
		throw err;
	}
}

/** Edit online user's profile, including avatar. */
export async function editRemoteUser(user: User, token: string, avatar = true) {
	// Fetch remote token
	let [login, instance] = user.login.split('@');
	instance = instance.trim();
	login = login.trim();
	await stopSub(login, instance);

	try {
		if (user.avatar_file !== 'blank.png' && avatar) {
			const form = new FormData();
			form.append(
				'avatarfile',
				createReadStream(resolve(resolvedPath('Avatars'), user.avatar_file)),
				user.avatar_file
			);
			await HTTP.patch(`https://${instance}/api/users/${login}`, form, {
				headers: form.getHeaders({ authorization: token }),
			});
		}
		const res = await HTTP.patch(
			`https://${instance}/api/users/${login}`,
			{
				...user,
				// Removing non-supported properties on App
				avatar_file: undefined,
				banner: undefined,
				pk_login: undefined,
				login: undefined,
				type: undefined,
				roles: undefined,
			},
			{
				headers: { authorization: token },
			}
		);
		return res.data;
	} catch (err) {
		sentry.error(err);
		throw `Remote update failed : ${err}`;
	} finally {
		startSub(login, instance);
	}
}

/** Get remote avatar from KM Server */
export async function fetchRemoteAvatar(instance: string, avatarFile: string): Promise<string> {
	// If this stops working, use got() and a stream: true property again
	const res = await HTTP.get(`https://${instance}/avatars/${avatarFile}`, {
		responseType: 'stream',
	});
	let avatarPath: string;
	try {
		avatarPath = resolve(resolvedPath('Temp'), avatarFile);
		await writeStreamToFile(res.data as Stream, avatarPath);
	} catch (err) {
		logger.warn(`Could not write remote avatar to local file ${avatarFile}`, { service, obj: err });
		throw err;
	}
	return avatarPath;
}

export const usersFetched = new Set();

export function getUsersFetched() {
	return usersFetched;
}

/** Login as online user on KM Server and fetch profile data, avatar, favorites and such and upserts them in local database */
export async function fetchAndUpdateRemoteUser(
	username: string,
	password: string,
	onlineToken?: string,
	force?: boolean,
	newAccountSecurityCode?: number
): Promise<User> {
	// We try to login to KM Server using the provided login password.
	// If login is successful, we get user profile data and create user if it doesn't exist already in our local database.
	// If it exists, we edit the user instead.
	if (!onlineToken) onlineToken = await remoteLogin(username, password);
	// if OnlineToken is empty, it means we couldn't fetch user data, let's not continue but don't throw an error
	if (onlineToken) {
		let remoteUser: User;
		try {
			remoteUser = await getRemoteUser(username, onlineToken);
		} catch (err) {
			if (err.statusCode !== 401 && err.statusCode !== 403) sentry.error(err);
			throw err;
		}
		// Check if user exists. If it does not, create it.
		let user: User = await getUser(username, true, true);
		if (!user) {
			// Remove remoteUser's type
			delete remoteUser.type;
			await createUser(
				{ ...remoteUser, password, login: username, securityCode: newAccountSecurityCode },
				{
					createRemote: false,
					noPasswordCheck: true,
				}
			);
			const [login, instance] = username.split('@');
			startSub(login, instance);
		}
		// Update user with new data
		let avatar_file = null;
		if (remoteUser.avatar_file && remoteUser.avatar_file !== 'blank.png') {
			let avatarPath: string;
			try {
				avatarPath = await fetchRemoteAvatar(username.split('@')[1], remoteUser.avatar_file);
			} catch (err) {
				sentry.error(err);
			}
			if (avatarPath) {
				avatar_file = {
					path: avatarPath,
				};
			}
		}
		// Checking if user has already been fetched during this session or not
		if (force || !usersFetched.has(username)) {
			usersFetched.add(username);
			const response = await editUser(
				username,
				{
					...remoteUser,
					password,
					login: username,
					type: undefined,
				},
				avatar_file,
				'admin',
				{ editRemote: false, noPasswordCheck: true }
			);
			user = response.user;
		}
		user.onlineToken = onlineToken;
		return user;
	}
	// Online token was not provided : KM Server might be offline
	// We'll try to find user in local database. If failure return an error
	const user = await getUser(username, true, true);
	if (!user) throw new ErrorKM('USER_LOGIN_ERROR', 404);
	return user;
}

/** Converts a online user to a local one by removing its online account from KM Server */
export async function removeRemoteUser(token: OldJWTToken, password: string): Promise<SingleToken> {
	try {
		const [username, instance] = token.username.split('@');
		// Verify that no local user exists with the name we're going to rename it to
		const user = await getUser(username, true, true);
		if (user) throw new ErrorKM('USER_ALREADY_EXISTS_LOCALLY', 409, false);
		const onlineUser = await getUser(token.username, true, true);
		// Verify that password matches with online before proceeding
		const onlineToken = await remoteLogin(token.username, password);
		if (!onlineToken) {
			logger.error(`Unable to verify online account identity for ${token.username}`, { service });
			throw new ErrorKM('INVALID_DATA', 400, false);
		}
		// Renaming user locally
		onlineUser.login = username;
		await editUser(token.username, onlineUser, null, 'admin', {
			editRemote: false,
			renameUser: true,
		});
		await HTTP(`https://${instance}/api/users`, {
			method: 'DELETE',
			headers: {
				authorization: onlineToken,
			},
		});
		emitWS('userUpdated', token.username);
		return {
			token: createJwtToken(onlineUser.login, token.role),
		};
	} catch (err) {
		logger.error(`Error converting online user to local : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('USER_DELETE_ERROR_ONLINE');
	}
}

/** Converting a local account to a online one. */
export async function convertToRemoteUser(token: OldJWTToken, password: string, instance: string): Promise<Tokens> {
	try {
		instance = fixedEncodeURIComponent(instance.trim());
		token.username = token.username.toLowerCase();
		if (token.username === 'admin') throw new ErrorKM('ADMIN_CONVERT_ERROR', 400, false);
		const user = await getUser(token.username, true, true);
		if (!user) throw new ErrorKM('UNKNOWN_USER', 404, false);
		if (!(await checkPassword(user, password))) throw new ErrorKM('INVALID_DATA', 400, false);
		user.login = `${token.username}@${instance}`;
		user.password = password;

		await createRemoteUser(user);
		const remoteUserToken = await remoteLogin(user.login, password);
		await editUser(token.username, user, null, token.role, {
			editRemote: false,
			renameUser: true,
		});
		await convertToRemoteFavorites(user.login, remoteUserToken);
		emitWS('userUpdated', user.login);
		return {
			onlineToken: remoteUserToken,
			token: createJwtToken(user.login, token.role),
		};
	} catch (err) {
		logger.error(`Error converting local user to online user ${token.username}@${instance} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('ONLINE_CONVERT_ERROR');
	}
}

export async function refreshAnimeList(username: string, token: string): Promise<void> {
	try {
		const instance = username.split('@')[1];
		await HTTP.post(`https://${instance}/api/myaccount/myanime`, null, {
			headers: {
				authorization: token,
			},
		});
	} catch (err) {
		logger.error(`Unable to refetch animeList for ${username}`, {
			service,
			obj: err,
		});
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REFRESH_ANIME_LIST_ERROR');
	}
}
