import { APIMessage } from '../lib/services/frontend.js';
import { DBUserBase } from '../lib/types/database/user.js';
import { getConfig } from '../lib/utils/config.js';
import { ErrorKM } from '../lib/utils/error.js';
import logger from '../lib/utils/logger.js';
import { SocketIOApp } from '../lib/utils/ws.js';
import { checkLogin, resetSecurityCode } from '../services/auth.js';
import { fetchAndAddFavorites } from '../services/favorites.js';
import { createTemporaryGuest, editUser, getAvailableGuest, updateLastLoginName } from '../services/user.js';
import { fetchAndUpdateRemoteUser, remoteCheckAuth } from '../services/userOnline.js';
import { getState } from '../utils/state.js';
import { runChecklist } from './middlewares.js';

const service = 'Auth';

export default function authController(router: SocketIOApp) {
	router.route('login', async (_, req) => {
		try {
			let token = await checkLogin(req.body.username, req.body.password);
			// Check if security code is correct
			if (req.body.securityCode === getState().securityCode) {
				// Reset security code once it's been used
				resetSecurityCode();
				// Edit user and change its type to admin
				await editUser(
					req.body.username,
					{
						login: null,
						type: 0,
					},
					null,
					'admin',
					{
						editRemote: false,
						renameUser: false,
					}
				);
				// Redefine the token
				token = await checkLogin(req.body.username, req.body.password);
			}
			return token;
		} catch (err) {
			throw { code: 401, message: APIMessage('LOG_ERROR') };
		}
	});

	router.route('loginGuest', async (_, req) => {
		const conf = getConfig();
		if (!conf.Frontend.AllowGuestLogin) throw { code: 403, message: APIMessage('GUESTS_NOT_ALLOWED') };
		try {
			let guest: DBUserBase;
			if (req.body?.name && conf.Frontend.AllowCustomTemporaryGuests) {
				guest = await createTemporaryGuest(req.body.name);
			} else {
				guest = await getAvailableGuest();
			}
			if (guest) {
				const token = await checkLogin(guest.login, null);
				updateLastLoginName(guest.login);
				return token;
			}
		} catch (err) {
			throw { code: 401, message: APIMessage('LOG_ERROR') };
		}
		throw { code: 500, message: APIMessage('NO_MORE_GUESTS_AVAILABLE') };
	});

	router.route('checkAuth', async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed');
		let onlineAvailable: boolean;
		if (req.token.username.includes('@') && +getConfig().Online.Users) {
			onlineAvailable = true;
			// Remote token does not exist, we're going to verify it and add it if it does work
			try {
				logger.debug('Checking remote token', { service });
				if (await remoteCheckAuth(req.token.username.split('@')[1], req.onlineAuthorization)) {
					logger.debug('Fetched remote token', { service });
					try {
						await fetchAndUpdateRemoteUser(req.token.username, null, req.onlineAuthorization, true);
						await fetchAndAddFavorites(req.token.username, req.onlineAuthorization);
					} catch (err) {
						logger.error('Failed to fetch and update user/favorite from remote', {
							service,
							obj: err,
						});
					}
				} else {
					logger.debug('Remote token invalid', { service });
					// Cancelling remote token.
					throw new ErrorKM('INVALID_ONLINE_TOKEN', 403);
				}
			} catch (err) {
				if (err.message === 'INVALID_ONLINE_TOKEN') throw err;
				logger.warn('Failed to check remote auth (user logged in as local only)', {
					service,
					obj: err,
				});
				onlineAvailable = false;
			}
		}
		return { ...req.token, onlineAvailable };
	});
}
