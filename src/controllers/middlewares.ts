import merge from 'lodash.merge';
import { Socket } from 'socket.io';

import { APIData } from '../lib/types/api';
import { OldJWTToken, Role, User } from '../lib/types/user';
import { getConfig } from '../lib/utils/config';
import { userTypes } from '../lib/utils/constants';
import logger from '../lib/utils/logger';
import { decodeJwtToken, getUser, updateLastLoginName } from '../services/user';
import { WebappModes } from '../types/frontend';
import { webappModes } from '../utils/constants';
import { APIMessage } from './common';

interface APIChecklistOptions {
	optionalAuth?: boolean;
}

export async function runChecklist(
	socket: Socket,
	data: APIData,
	roleNeeded: Role = 'admin',
	webappModeNeeded: WebappModes = 'open',
	options?: APIChecklistOptions
) {
	// Default role needed is admin and webapp open, this should be the case for a majority of routes.
	const defaultOptions = { optionalAuth: false };

	// Protecc against bad boys who'd like to force token and stuff
	delete data.token;
	delete data.user;

	options ? (options = merge(defaultOptions, options)) : (options = defaultOptions);
	if (socket.handshake.headers['accept-languages']) {
		const langs = socket.handshake.headers['accept-languages'] as string;
		data.langs = langs.split(',')[0].substring(0, 2);
	}
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
	if (+getConfig().Frontend.Mode < webappModes[webappModeNeeded])
		throw { code: 503, message: APIMessage('WEBAPPMODE_CLOSED_API_MESSAGE') };
}

function checkAuthPresence(data: APIData) {
	if (data.authorization) {
		data.token = decodeJwtToken(data.authorization);
	} else {
		throw { code: 401 };
	}
}

export async function checkValidUser(token: OldJWTToken): Promise<User> {
	// If user is remote, see if we have a remote token ready.
	token.username = token.username.toLowerCase();
	const user = await getUser(token.username);
	if (user) {
		if (token.role === 'admin' && user.type > 0) throw APIMessage('ADMIN_PLEASE');
		return user;
	} else {
		throw 'User unknown';
	}
}

function requireUserType(data: APIData, type: Role) {
	if (data.user.type > userTypes[type]) {
		if (data.user.type === 2) throw { code: 403, message: APIMessage('NOT_GUEST') };
		if (data.user.type === 1) throw { code: 403, message: APIMessage('ADMIN_PLEASE') };
	}
}

async function requireValidUser(data: APIData) {
	try {
		data.user = await checkValidUser(data.token);
	} catch (err) {
		logger.error(`Error checking user : ${JSON.stringify(data.token)}`, { service: 'API', obj: err });
		throw err;
	}
}
