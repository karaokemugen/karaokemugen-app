import { getConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { SocketIOApp } from '../lib/utils/ws';
import { checkLogin, resetSecurityCode } from '../services/auth';
import { fetchAndAddFavorites } from '../services/favorites';
import { editUser, findAvailableGuest, updateLastLoginName } from '../services/user';
import { fetchAndUpdateRemoteUser, remoteCheckAuth } from '../services/userOnline';
import { getState } from '../utils/state';
import { APIMessage } from './common';
import { runChecklist } from './middlewares';

export default function authController(router: SocketIOApp) {

	router.route('login', async (_, req) => {
		if (req.body.login) req.body.login = unescape(req.body.login.trim());
		if (req.body.password) req.body.password = unescape(req.body.password);
		if (!req.body.password) req.body.password = '';
		try {
			let token = await checkLogin(req.body.username, req.body.password);
			// Check if security code is correct
			if (req.body.securityCode === getState().securityCode) {
				// Reset security code once it's been used
				resetSecurityCode();
				// Edit user and change its type to admin
				await editUser(req.body.username, {
					type: 0
				}, null, 'admin', {
					editRemote: false,
					renameUser: false
				});
				// Redefine the token
				token = await checkLogin(req.body.username, req.body.password);
			}
			return token;
		} catch(err) {
			throw {code: 401, message: APIMessage('LOG_ERROR')};
		}
	});

	router.route('loginGuest', async () => {
		try {
			const guest = await findAvailableGuest();
			if (guest) {
				const token = await checkLogin(guest, null);
				updateLastLoginName(guest);
				return token;
			} else {
				throw {code: 500, message: APIMessage('NO_MORE_GUESTS_AVAILABLE')};
			}
		} catch (err) {
			throw {code: 401, message: APIMessage('LOG_ERROR')};
		}
	});

	router.route('checkAuth', async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed');
		let onlineAvailable;
		if (req.token.username.includes('@') && +getConfig().Online.Users) {
			onlineAvailable = true;
			// Remote token does not exist, we're going to verify it and add it if it does work
			try {
				logger.debug('Checking remote token', {service: 'RemoteUser'});
				if (await remoteCheckAuth(req.token.username.split('@')[1], req.onlineAuthorization)) {
					logger.debug('Fetched remote token', {service: 'RemoteUser'});
					try {
						await fetchAndUpdateRemoteUser(req.token.username, null, req.onlineAuthorization, true);
						await fetchAndAddFavorites(req.token.username, req.onlineAuthorization);
					} catch(err) {
						logger.error('Failed to fetch and update user/favorite from remote', {service: 'RemoteUser', obj: err});
					}
				} else {
					logger.debug('Remote token invalid', {service: 'RemoteUser'});
					// Cancelling remote token.
					throw 'Invalid online token';
				}
			} catch(err) {
				if (err === 'Invalid online token') throw err;
				logger.warn('Failed to check remote auth (user logged in as local only)', {service: 'RemoteUser', obj: err});
				onlineAvailable = false;
			}
		}
		return {...req.token, onlineAvailable};
	});

}

