import {requireAuth, requireValidUser, requireAdmin} from './middlewares/auth';
import { updateLastLoginName, createJwtToken, decodeJwtToken, checkLogin, updateUserFingerprint, findFingerprint, findUserByName, editUser, resetSecurityCode } from '../services/user';
import { getState } from '../utils/state';

const loginErr = {
	code: 'LOG_ERROR',
	message: 'Incorrect credentials',
	data: {
	}
};

export default function authController(router) {

	router.post('/auth/login', async (req, res) => {
		/**
 * @api {post} /auth/login Login / Sign in
 * @apiName AuthLogin
 * @apiVersion 3.1.0
 * @apiGroup Auth
 * @apiPermission NoAuth
 * @apiHeader {String} Content-type Must be `application/x-www-form-urlencoded`
 * @apiHeader {String} charset Must be `UTF-8`
 * @apiParam {String} username Login name for the user
 * @apiParam {String} password Password for the user. Can be empty if user is a guest.
 * @apiParam {Number} securityCode Security Code to turn a normal user into an admin
 * @apiSuccess {String} onlineToken If username is a remote one, `onlineToken` is defined. You need to pass it via headers along `token` for user to be authentified.
 * @apiSuccess {String} token Identification token for this session
 * @apiSuccess {String} username Username logged in ( contains @host if remote, with host being the instance's host)
 * @apiSuccess {String} role Role of this user (`user` or `admin`)
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpYXQiOjE1MTMxNjAxMTEzMjMsInJvbGUiOiJ1c2VyIn0.UWgsc5XEfFtk34IpUAQid_IEWCj2ffNjQ--FJ9eAYd0",
 *   "username": "Axel",
 *   "role": "admin",
 *   "onlineToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpYXQiOjE1MTMxNjAxMTEzMjMsInJvbGUiOiJ1c2VyIn0.UWgsc5XEfFtk34IpUAQid_IEWCj2ffNjQ--FJ9eAYd0"
 * }
 * @apiError 401 Unauthorized
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 401 Unauthorized
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
			res.status(200).send(token);
		} catch(err) {
			res.status(401).send(loginErr);
		}
	});

	router.post('/auth/login/guest', async (req, res) => {
		/**
 * @api {post} /auth/login/guest Login / Sign in (as guest)
 * @apiName AuthLoginGuest
 * @apiVersion 3.1.0
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
			res.status(401).send(loginErr);
		} else {
			try {
				const guest = await findFingerprint(req.body.fingerprint);
				if (guest) {
					const token = await checkLogin(guest, req.body.fingerprint);
					updateUserFingerprint(guest, req.body.fingerprint);
					updateLastLoginName(guest);
					res.status(200).send(token);
				} else {
					res.status(500).send({
						code: 'NO_MORE_GUESTS_AVAILABLE',
						message: null,
						data: {
						}
					});
				}
			} catch (err) {
				res.status(401).send(loginErr);
			}
		}
	});

	router.get('/auth/checkauth', requireAuth, requireValidUser, (req, res) => {
		res.status(200).send(decodeJwtToken(req.get('authorization')));
	});

}

