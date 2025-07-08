import { debounce } from 'lodash';
import { io, Socket } from 'socket.io-client';

import { DBUser } from '../lib/types/database/user.js';
import { getConfig } from '../lib/utils/config.js';
import logger, { profile } from '../lib/utils/logger.js';
import { importFavorites } from '../services/favorites.js';
import { editUser, getUser, getUsers, removeUser } from '../services/user.js';
import { Favorite } from '../types/stats.js';

const service = 'RemoteUser';

// Map io connections
const ioMap: Map<string, Socket> = new Map();
// Map debouncers
const debounceMap: Map<string, (login: string, payload: any) => Promise<void>> = new Map();

async function listRemoteUsers() {
	const users = await getUsers();
	return users.filter(u => u.login.includes('@')).map(u => u.login);
}

async function updateUser(login: string, payload: any) {
	const userRemote: DBUser = payload.user;
	let user: DBUser = await getUser(login);
	if (user) {
		const favorites: Favorite[] = payload.favorites;
		user = {
			...userRemote,
			password: undefined,
			avatar_file: undefined,
			login: user.login,
			type: user.type,
		};
		logger.debug(`${login} user was updated on remote`, { service });
		Promise.all([
			editUser(login, user, null, 'admin'),
			importFavorites(
				{
					Header: { version: 1, description: 'Karaoke Mugen Favorites List File' },
					Favorites: favorites,
				},
				login,
				undefined,
				true,
				false
			),
		]).catch(err => {
			logger.warn(`Cannot update remote user ${login}`, { service, obj: err });
		});
	} else {
		const [username, instance] = login.split('@');
		stopSub(username, instance);
	}
}

function userDebounceFactory(user) {
	if (!debounceMap.has(user)) {
		debounceMap.set(user, debounce(updateUser, 2500, { leading: true, trailing: true }));
	}
	return debounceMap.get(user);
}

function setupUserWatch(server: string, secure: boolean) {
	const socket = io(`${secure ? 'https' : 'http'}://${server}`, { multiplex: true });
	ioMap.set(server, socket);
	socket.on('user updated', async payload => {
		const login = `${payload.user.login}@${server}`;
		userDebounceFactory(login)(login, payload);
	});
	socket.on('user deleted', user => {
		const login = `${user}@${server}`;
		try {
			logger.info(`${login} user was DELETED on remote, delete local account`, { service });
			removeUser(login).catch(err => {
				logger.warn(`Cannot remove remote user ${login}`, { service, obj: err });
			});
		} catch (err) {
			logger.warn(`Cannot delete ${login}`, { service });
		}
	});
	// in case of reconnections, resub to all users
	socket.on('connect', subRemoteUsers);
}

export function startSub(user: string, server: string) {
	const conf = getConfig().Online;
	if (!ioMap.has(server)) {
		setupUserWatch(server, conf.RemoteUsers.Secure);
	}
	const socket = ioMap.get(server);
	socket.emit('subscribe user', { body: user }, res => {
		if (res.err) {
			logger.warn(`Cannot watch user ${user}@${server}`, { service, obj: res });
			return;
		}
		if (res.data === false) {
			const name = `${user}@${server}`;
			try {
				logger.info(`User ${name} doesn't exist anymore on remote, delete local version.`, {
					service,
				});
				// It's okay if the local version is already deleted.
				removeUser(name).catch(() => {});
			} catch (err) {
				logger.warn(`Cannot delete ${name}`, { service });
			}
		}
	});
}

export function stopSub(user: string, server: string) {
	if (!ioMap.has(server)) {
		return;
	}
	const socket = ioMap.get(server);
	return new Promise((resolve, reject) => {
		try {
			socket.emit('unsubscribe user', user, resolve);
		} catch (err) {
			reject(err);
		}
	});
}

export async function subRemoteUsers() {
	logger.debug('Starting watching users online', { service });
	profile('initSubRemoteUsers');
	const users = await listRemoteUsers();
	for (const user of users) {
		if (user) {
			const [login, instance] = user.split('@');
			startSub(login, instance);
		}
	}
	profile('initSubRemoteUsers');
}
