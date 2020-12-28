import { io, Socket } from 'socket.io-client';

import logger from '../lib/utils/logger';
import {deleteUser, listUsers } from '../services/user';

// Map io connections
const ioMap: Map<string, Socket> = new Map();

async function listRemoteUsersByServer() {
	const users = await listUsers();
	const servers: Record<string, string[]> = {};
	for (const user of users) {
		if (user.login.includes('@')) {
			const [login, instance] = user.login.split('@');
			if (typeof servers[instance] === 'undefined') {
				servers[instance] = [];
			}
			servers[instance].push(login);
		}
	}
	return servers;
}

function setupUserWatch(server: string) {
	const socket = io(`https://${server}`, { multiplex: true });
	ioMap.set(server, socket);
	socket.on('user updated', user => {
		const login = `${user}@${server}`;
		logger.debug(`${login} user was updated on remote`, { service: 'RemoteUser' });
		// TODO: refetch user
	});
	socket.on('user deleted', user => {
		const login = `${user}@${server}`;
		logger.debug(`${login} user was DELETED on remote`, { service: 'RemoteUser' });
		// TODO: delete user locally
	});
}

export async function subRemoteUsers() {
	logger.debug('Starting watching users online', { service: 'RemoteUser' });
	const servers = await listRemoteUsersByServer();
	for (const server in servers) {
		if (!ioMap.has(server)) {
			setupUserWatch(server);
		}
		const socket = ioMap.get(server);
		for (const user of servers[server]) {
			socket.emit('subscribe user', { body: user }, res => {
				if (res.err) {
					logger.warn(`Cannot watch user ${user}@${server}`, { service: 'RemoteUser', obj: res });
					return;
				}
				if (res.data === false) {
					const name = `${user}@${server}`;
					try {
						logger.info(`User ${name} doesn't exist on remote, delete local version.`, { service: 'RemoteUser' });
						deleteUser(name);
					} catch (err) {
						logger.warn(`Cannot delete ${name}`, { service: 'RemoteUser' });
					}
				}
			});
		}
	}
}
