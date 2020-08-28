import {decode} from 'jwt-simple';
import passport from 'passport';

import { getRemoteToken, upsertRemoteToken } from '../../dao/user';
import {Token,User} from '../../lib/types/user';
import {getConfig} from '../../lib/utils/config';
import logger from '../../lib/utils/logger';
import { fetchAndAddFavorites } from '../../services/favorites';
import {fetchAndUpdateRemoteUser,findUserByName, remoteCheckAuth, updateLastLoginName} from '../../services/user';
import { APIMessage } from '../common';

const usersFavoritesChecked = new Set();

export function requireAuth() {
	return passport.authenticate('jwt', { session: false });
}

export function updateUserLoginTime(req: any, _res: any, next: any) {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	updateLastLoginName(token.username);
	next();
}

export async function checkValidUser(token: { username: string, role: string }, onlineToken: Token): Promise<User> {
	// If user is remote, see if we have a remote token ready.
	const user = await findUserByName(token.username);
	if (user) {
		if (token.role === 'admin' && user.type > 0) throw APIMessage('ADMIN_PLEASE');
		if (token.username.includes('@') && +getConfig().Online.Users) {
			const remoteToken = getRemoteToken(token.username);
			if (remoteToken?.token === onlineToken.token) {
				// Remote token exists, no problem here
				return user;
			} else {
				// Remote token does not exist, we're going to verify it and add it if it does work
				try {
					// Firing this first to avoid multiple triggers, will get canceled if auth is not OK.
					upsertRemoteToken(token.username, onlineToken.token);
					if (await remoteCheckAuth(token.username.split('@')[1], onlineToken.token)){
						try {
							await fetchAndUpdateRemoteUser(token.username, null, onlineToken);
							if (!usersFavoritesChecked.has(token.username)) {
								await fetchAndAddFavorites(token.username.split('@')[1], onlineToken.token, token.username);
								usersFavoritesChecked.add(token.username);
							}
						} catch(err) {
							logger.error('Failed to fetch and update user/favorite from remote', {service: 'RemoteUser', obj: err});
						}
						return user;
					} else {
						// Cancelling remote token.
						upsertRemoteToken(token.username, null);
					}
				} catch(err) {
					upsertRemoteToken(token.username, null);
					logger.warn('Failed to check remote auth (user logged in as local only)', {service: 'RemoteUser', obj: err});
					throw err;
				}
			}
		}
		return user;
	} else {
		throw 'User unknown';
	}
}

export function requireRegularUser(req: any, res: any, next: any) {
	req.user.type === 2
		? res.status(401).json(APIMessage('NOT_GUEST'))
		: next();
}

export function optionalAuth(req: any, res: any, next: any) {
	try {
		const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
		req.authToken = token;
		const onlineToken = req.get('onlineAuthorization');
		checkValidUser(token, {
			username: null,
			token: onlineToken,
			role: 'user'
		})
			.then((user: User) => {
				req.user = user;
				next();
			})
			.catch(err => {
				logger.error(`Error checking user : ${JSON.stringify(token)}`, {service: 'API', obj: err});
				res.status(403).json(APIMessage('USER_UNKNOWN'));
			});
	} catch(err) {
		// request has no authToken, continuing
		next();
	}
}

export function requireValidUser(req: any, res: any, next: any) {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	const onlineToken = req.get('onlineAuthorization');
	req.authToken = token;
	checkValidUser(token, {
		username: null,
		token: onlineToken,
		role: 'user'
	})
		.then((user: User) => {
			req.user = user;
			next();
		})
		.catch(err => {
			logger.error(`Error checking user : ${JSON.stringify(token)}`, {service: 'API', obj: err});
			res.status(403).json(APIMessage('USER_UNKNOWN'));
		});
}

export function requireAdmin(req: any, res: any, next: any) {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	token.role === 'admin'
		? next()
		: res.status(403).json(APIMessage('ADMIN_PLEASE'));
}


