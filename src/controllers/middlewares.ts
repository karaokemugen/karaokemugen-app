import { Socket } from 'socket.io';

import { getRemoteToken, upsertRemoteToken } from '../dao/user';
import { APIData } from '../lib/types/api';
import {Role, User} from '../lib/types/user';
import {getConfig} from '../lib/utils/config';
import { userTypes } from '../lib/utils/constants';
import logger from '../lib/utils/logger';
import { fetchAndAddFavorites } from '../services/favorites';
import {decodeJwtToken, findUserByName, updateLastLoginName} from '../services/user';
import { fetchAndUpdateRemoteUser, remoteCheckAuth } from '../services/userOnline';
import { WebappModes } from '../types/frontend';
import { webappModes } from '../utils/constants';
import { getState } from '../utils/state';
import { APIMessage } from './common';

const usersFavoritesChecked = new Set();

interface APIChecklistOptions {
	allowInDemo?: boolean
	optionalAuth?: boolean
}

export async function runChecklist(socket: Socket, data: APIData, roleNeeded: Role = 'admin', webappModeNeeded: WebappModes = 'open', options?: APIChecklistOptions) {
	// Default role needed is admin and webapp open, this should be the case for a majority of routes.

	// Protecc against bad boys who'd like to force token and stuff
	delete data.token;
	delete data.user;

	if (!options) options = { allowInDemo: true, optionalAuth: false };
	if (socket.handshake.headers['accept-languages']) data.langs = socket.handshake.headers['accept-languages'].split(',')[0].substring(0,2);
	if (!options.allowInDemo && getState().isDemo) throw {code: 503, message: 'Not allowed in demo mode'};
	if (options.optionalAuth && !data.authorization) {
		checkWebAppMode(data, webappModeNeeded);
		return;
	}
	checkAuthPresence(data);
	await requireValidUser(data);
	requireUserType(data, roleNeeded);
	updateLastLoginName(data.token.username);
	checkWebAppMode(data, webappModeNeeded);
}

function checkWebAppMode(data: APIData, webappModeNeeded: WebappModes) {
	if (data.user?.type === 0) return;
	if (+getConfig().Frontend.Mode < webappModes[webappModeNeeded]) throw {code: 503, message: APIMessage('WEBAPPMODE_CLOSED_API_MESSAGE')};
}

function checkAuthPresence(data: APIData) {
	if (data.authorization) {
		data.token = decodeJwtToken(data.authorization);
	} else {
		throw {code: 401};
	}
}

export async function checkValidUser(token: { username: string, role: string }, onlineToken: string): Promise<User> {
	// If user is remote, see if we have a remote token ready.
	token.username = token.username.toLowerCase();
	const user = await findUserByName(token.username);
	if (user) {
		if (token.role === 'admin' && user.type > 0) throw APIMessage('ADMIN_PLEASE');
		if (token.username.includes('@') && +getConfig().Online.Users) {
			const remoteToken = getRemoteToken(token.username);
			if (remoteToken?.token === onlineToken) {
				// Remote token exists, no problem here
				return user;
			} else {
				// Remote token does not exist, we're going to verify it and add it if it does work
				try {
					// Firing this first to avoid multiple triggers, will get canceled if auth is not OK.
					upsertRemoteToken(token.username, onlineToken);
					logger.debug('Checking remote token', {service: 'RemoteUser'});
					if (await remoteCheckAuth(token.username.split('@')[1], onlineToken)) {
						logger.debug('Fetched remote token', {service: 'RemoteUser'});
						try {
							await fetchAndUpdateRemoteUser(token.username, null, onlineToken);
							if (!usersFavoritesChecked.has(token.username)) {
								await fetchAndAddFavorites(token.username.split('@')[1], onlineToken, token.username);
								usersFavoritesChecked.add(token.username);
							}
						} catch(err) {
							logger.error('Failed to fetch and update user/favorite from remote', {service: 'RemoteUser', obj: err});
						}
						return user;
					} else {
						logger.debug('Remote token invalid', {service: 'RemoteUser'});
						// Cancelling remote token.
						upsertRemoteToken(token.username, null);
						throw 'Invalid online token';
					}
				} catch(err) {
					upsertRemoteToken(token.username, null);
					logger.warn('Failed to check remote auth (user logged in as local only)', {service: 'RemoteUser', obj: err});
					if (err === 'Invalid online token') throw err;
				}
			}
		}
		return user;
	} else {
		throw 'User unknown';
	}
}


function requireUserType(data: APIData, type: Role) {
	if (data.user.type > userTypes[type]) {
		if (data.user.type === 2) throw {code: 403, message: APIMessage('NOT_GUEST')};
		if (data.user.type === 1) throw {code: 403, message: APIMessage('ADMIN_PLEASE')};
	}
}

async function requireValidUser(data: APIData) {
	try {
		data.user = await checkValidUser(data.token, data.onlineAuthorization);
	} catch(err) {
		logger.error(`Error checking user : ${JSON.stringify(data.token)}`, {service: 'API', obj: err});
		throw err;
	}
}
