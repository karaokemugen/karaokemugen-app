import { getConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { SocketIOApp } from '../lib/utils/ws';
import { checkLogin, resetSecurityCode } from '../services/auth';
import { fetchAndAddFavorites } from '../services/favorites';
import { editUser, findFingerprint,updateLastLoginName, updateUserFingerprint } from '../services/user';
import { fetchAndUpdateRemoteUser, remoteCheckAuth } from '../services/userOnline';
import { getState } from '../utils/state';
import { APIMessage } from './common';
import { runChecklist } from './middlewares';

export default function authController(router: SocketIOApp) {

	router.route('login', async (_, req) => {
		/**
 * @api {post} Login / Sign in
 * @apiName login
 * @apiVersion 5.0.0
 * @apiGroup Auth
 * @apiPermission NoAuth
 * @apiParam {String} username Login name for the user
 * @apiParam {String} password Password for the user. Can be empty if user is a guest.
 * @apiParam {Number} securityCode Security Code to turn a normal user into an admin
 * @apiSuccess {String} onlineToken If username is a remote one, `onlineToken` is defined. You need to pass it via headers along `token` for user to be authentified.
 * @apiSuccess {String} token Identification token for this session
 * @apiSuccess {String} username Username logged in ( contains @host if remote, with host being the instance's host)
 * @apiSuccess {String} role Role of this user (`user` or `admin`)
 *
 * @apiSuccessExample Success-Response:
 * {
 *   "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpYXQiOjE1MTMxNjAxMTEzMjMsInJvbGUiOiJ1c2VyIn0.UWgsc5XEfFtk34IpUAQid_IEWCj2ffNjQ--FJ9eAYd0",
 *   "username": "Axel",
 *   "role": "admin",
 *   "onlineToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpYXQiOjE1MTMxNjAxMTEzMjMsInJvbGUiOiJ1c2VyIn0.UWgsc5XEfFtk34IpUAQid_IEWCj2ffNjQ--FJ9eAYd0"
 * }
 * @apiError 401 Unauthorized
 *
 */
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

	router.route('loginGuest', async (_, req) => {
		/**
 * @api {post} Login / Sign in (as guest)
 * @apiName loginGuest
 * @apiVersion 5.0.0
 * @apiGroup Auth
 * @apiPermission NoAuth
 * @apiDescription
 * Logins as guest. Uses the fingerprint provided to tell if the user already has a reserved guest account or not. If not, logs in as a random guest account.
 * @apiHeader {String} Content-type Must be `application/x-www-form-urlencoded`
 * @apiHeader {String} charset Must be `UTF-8`
 * @apiParam {String} fingerprint Fingerprint hash. Uses client-side fingerprinting.
 * @apiSuccess {String} token Identification token for this session
 * @apiSuccess {String} username Username logged in ( contains @host if remote, with host being the instance's host)
 * @apiSuccess {String} role Role of this user (`user` or `admin`)
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpYXQiOjE1MTMxNjAxMTEzMjMsInJvbGUiOiJ1c2VyIn0.UWgsc5XEfFtk34IpUAQid_IEWCj2ffNjQ--FJ9eAYd0",
 *   "username": "Axel",
 *   "role": "user"
 * }
 * @apiError 500 Internal Server Error
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "NO_MORE_GUESTS_AVAILABLE",
 *   "message": null
 * }
 */
		if (!req.body.fingerprint || req.body.fingerprint === '') {
			throw {code: 401, message: APIMessage('LOG_ERROR')};
		} else {
			try {
				const guest = await findFingerprint(req.body.fingerprint);
				if (guest) {
					const token = await checkLogin(guest, req.body.fingerprint);
					updateUserFingerprint(guest, req.body.fingerprint);
					updateLastLoginName(guest);
					return token;
				} else {
					throw {code: 500, message: APIMessage('NO_MORE_GUESTS_AVAILABLE')};
				}
			} catch (err) {
				throw {code: 401, message: APIMessage('LOG_ERROR')};
			}
		}
	});

	router.route('checkAuth', async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed');
		if (req.token.username.includes('@') && +getConfig().Online.Users) {
			// Remote token does not exist, we're going to verify it and add it if it does work
			try {
				logger.debug('Checking remote token', {service: 'RemoteUser'});
				if (await remoteCheckAuth(req.token.username.split('@')[1], req.onlineAuthorization)) {
					logger.debug('Fetched remote token', {service: 'RemoteUser'});
					try {
						await fetchAndUpdateRemoteUser(req.token.username, null, req.onlineAuthorization);
						await fetchAndAddFavorites(req.token.username.split('@')[1], req.onlineAuthorization, req.token.username);
					} catch(err) {
						logger.error('Failed to fetch and update user/favorite from remote', {service: 'RemoteUser', obj: err});
					}
				} else {
					logger.debug('Remote token invalid', {service: 'RemoteUser'});
					// Cancelling remote token.
					throw 'Invalid online token';
				}
			} catch(err) {
				logger.warn('Failed to check remote auth (user logged in as local only)', {service: 'RemoteUser', obj: err});
				if (err === 'Invalid online token') throw err;
			}
		}
		return req.token;
	});

}

