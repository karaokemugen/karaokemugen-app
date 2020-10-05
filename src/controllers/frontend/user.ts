import { Router } from 'express';

import { check } from '../../lib/utils/validators';
import { createAdminUser, createUser, deleteUser, editUser, findUserByName, listUsers, updateSongsLeft } from '../../services/user';
import { APIMessage,errMessage } from '../common';
import { optionalAuth,requireAdmin, requireAuth, requireValidUser, updateUserLoginTime } from '../middlewares/auth';
import { getLang } from '../middlewares/lang';
import multer = require('multer');
import { resolvedPathTemp } from '../../lib/utils/config';
import { resetSecurityCode } from '../../services/auth';
import { convertToRemoteUser, removeRemoteUser, resetRemotePassword } from '../../services/userOnline';
import { getState } from '../../utils/state';
import { requireWebappLimited, requireWebappLimitedNoAuth } from '../middlewares/webapp_mode';

export default function userController(router: Router) {
	// Middleware for playlist and files import
	const upload = multer({ dest: resolvedPathTemp()});

	router.route('/users')
	/**
	 * @api {get} /users List users
	 * @apiName GetUsers
	 * @apiVersion 3.1.0
	 * @apiGroup Users
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccess {Object[]} data User objects
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "users": [
	 *       {
	 *            <See users/[username] object
	 *       },
	 * 		...
	 *   ]
	 * }
	 * @apiError USER_LIST_ERROR Unable to list users
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "USER_LIST_ERROR",
	 *   "message": null
	 * }
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (_req: any, res: any) => {
			try {
				const users = await	listUsers();
				res.json(users);
			} catch(err) {
				const code = 'USER_LIST_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})

	/**
 * @api {post} /users Create new user
 * @apiName PostUser
 * @apiVersion 3.1.0
 * @apiGroup Users
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} login Login name for the user
 * @apiParam {String} password Password for the user
 * @apiParam {String} role `admin` or `user`.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * "USER_CREATED"
 * @apiError USER_CREATE_ERROR Unable to create user
 * @apiError USER_ALREADY_EXISTS This username already exists
 * @apiError USER_ALREADY_EXISTS_ONLINE This username already exists on that online instance
 * @apiError USER_CREATE_ERROR_ONLINE Unable to create the online user
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "USER_ALREADY_EXISTS"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 * @apiErrorExample Error-Response:
 * HTTP/1.1 411 Length
 */

		.post(getLang, optionalAuth, requireWebappLimitedNoAuth, async (req: any, res) => {
			//Validate form data
			const validationErrors = check(req.body, {
				login: {presence: {allowEmpty: false}},
				password: {presence: {allowEmpty: false}},
				role: {inclusion: ['user', 'admin']}
			});
			if (!validationErrors) {
				// No errors detected
				if (req.body.login) req.body.login = unescape(req.body.login.trim());
				if (req.body.role) req.body.role = unescape(req.body.role);
				if (req.body.password) req.body.password = unescape(req.body.password);
				try {
					if (req.body.role === 'admin' && req.user) {
						await createAdminUser(req.body, req.body.login.includes('@'), req.user);
					} else {
						await createUser(req.body, {createRemote: req.body.login.includes('@')});
					}
					res.status(200).json(APIMessage('USER_CREATED'));
				} catch(err) {
					errMessage(err.msg, err.details);
					res.status(err?.code || 500).json(APIMessage(err.msg));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});

	router.route('/users/:username')
	/**
 * @api {get} /users/:username View user details
 * @apiName GetUser
 * @apiVersion 3.1.0
 * @apiGroup Users
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiparam {String} username Username to get data from
 * @apiSuccess {String} login User's login
 * @apiSuccess {String} nickname User's nickname
 * @apiSuccess {String} [avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} flag_online Is the user an online account ?
 * @apiSuccess {Number} type Type of account (0 = admin, 1 = user, 2 = guest)
 * @apiSuccess {Number} last_login Last login time in `Date()` format
 * @apiSuccess {Number} user_id User's ID in the database
 * @apiSuccess {String} url User's URL in its profile
 * @apiSuccess {String} fingerprint User's fingerprint
 * @apiSuccess {String} bio User's bio
 * @apiSuccess {String} email User's email
 * @apiSuccess {Number} series_lang_mode Mode (0-4) for series' names display : -1 = Let KM settings decide, 0 = Original/internal name, 1 = Depending on song's language, 2 = Depending on KM's language, 3 = Depending on user browser's language (default), 4 = Force languages with `main_series_lang` and `fallback_series_lang`
 * @apiSuccess {String} main_series_lang ISO639-2B code for language to use as main language for series names (in case of mode 4).
 * @apiSuccess {String} fallback_series_lang ISO639-2B code for language to use as fallback language for series names (in case of mode 4).
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *           "avatar_file": "",
 *           "flag_online": false,
 *           "type": 0,
 *           "last_login": "2019-01-01T13:34:00.000Z",
 *           "login": "admin",
 *           "nickname": "Administrator",
 *           "user_id": 1,
 * 			 "url": null,
 * 			 "email": null,
 * 			 "bio": null,
 * 			 "fingerprint": null,
 * 			 "series_lang_mode": 4,
 * 			 "main_series_lang": "fre",
 * 			 "fallback_series_lang": "eng"
 * }
 * @apiError USER_VIEW_ERROR Unable to view user details
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "USER_VIEW_ERROR"
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireWebappLimited, async (req: any,res) => {
			try {
				const userdata = await findUserByName(req.params.username, {public: req.authToken.role !== 'admin'});
				delete userdata.password;
				if (!userdata) res.status(404);
				res.json(userdata);
			} catch(err) {
				const code = 'USER_VIEW_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
	/**
 * @api {delete} /users/:username Delete an user
 * @apiName DeleteUser
 * @apiVersion 3.1.0
 * @apiGroup Users
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} username User name to delete
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "USER_DELETED"}
 * @apiError USER_DELETE_ERROR Unable to delete a user
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 * @apiErrorExample Error-Response:
 * HTTP/1.1 406 Not acceptable
 */
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			try {
				await deleteUser(req.params.username);
				res.status(200).json(APIMessage('USER_DELETED'));
			} catch(err) {
				errMessage(err.msg, err.details);
				res.status(err?.code || 500).json(APIMessage(err.msg, err.details));
			}
		})
		.put(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				//If we're modifying a online user (@) only editing its type is permitted, so we'll filter that out.
				const user = req.params.username.includes('@')
					? { type: req.body.type	}
					: req.body;
				const avatar = req.params.username.includes('@')
					? null
					: req.body.avatar;
				await editUser(req.params.username, user, avatar, req.authToken.role, {editRemote: false});
				res.status(200).json(APIMessage('USER_EDITED'));
			} catch(err) {
				const code = 'USER_EDIT_ERROR';
				errMessage(code, err);
				res.status(err?.code || 500).json(APIMessage(err.msg, err.details));
			}
		});
	router.route('/users/:username/resetpassword')
		/**
	 * @api {post} /users/:username/resetpassword Reset password
	 * @apiName PostResetPassword
	 * @apiVersion 3.1.0
	 * @apiGroup Users
	 * @apiPermission noAuth
	 * @apiParam {String} username Username for password reset
	 * @apiParam {String} password New password (for local users only)
	 * @apiParam {String} securityCode Security code in case you want to change your local password (for local users only)
	 * @apiSuccess {String} data/login User's login
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": [
	 *       {
	 *           "login": "admin@kara.moe",
	 *       },
	 *   ]
	 * }
	 * @apiError USER_RESETPASSWORD_ERROR Reset password generic error
	 * @apiError USER_RESETPASSWORD_WRONGSECURITYCODE Wrong security code for local user password change
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "USER_RESETPASSWORD_WRONGSECURITYCODE",
	 *   "message": null
	 * }
	  */
		.post(async (req: any, res: any) => {
			if (!req.params.username.includes('@')) {
				if (+req.body.securityCode === getState().securityCode) {
					try {
						await editUser(req.params.username, {
							password: req.body.password
						}, null, 'admin');
						resetSecurityCode();
						res.status(200).json();
					} catch (err) {
						const code = 'USER_RESETPASSWORD_ERROR';
						errMessage(code, err);
						res.status(err?.code || 500).json(APIMessage(code));
					}
				} else {
					res.status(403).json(APIMessage('USER_RESETPASSWORD_WRONGSECURITYCODE'));
				}
			} else {
				try {
					await resetRemotePassword(req.params.username);
					res.status(200).json(APIMessage('USER_RESETPASSWORD_ONLINE'));
				} catch (err) {
					const code = 'USER_RESETPASSWORD_ONLINE_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			}
		});
	router.route('/myaccount')
	/**
 * @api {get} /myaccount View own user details
 * @apiName GetMyAccount
 * @apiVersion 3.1.0
 * @apiGroup Users
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (`0` = admin, `1` = user, `2` = guest)
 * @apiSuccess {Number} data/last_login_at Last login time in UNIX timestamp.
 * @apiSuccess {Number} data/user_id User's ID in the database
 * @apiSuccess {String} data/url User's URL in its profile
 * @apiSuccess {String} data/fingerprint User's fingerprint
 * @apiSuccess {String} data/bio User's bio
 * @apiSuccess {String} data/email User's email
 * @apiSuccess {Number} data/series_lang_mode Mode (0-4) for series' names display : -1 = Let KM settings decide, 0 = Original/internal name, 1 = Depending on song's language, 2 = Depending on KM's language, 3 = Depending on user browser's language (default), 4 = Force languages with `main_series_lang` and `fallback_series_lang`
 * @apiSuccess {String} data/main_series_lang ISO639-2B code for language to use as main language for series names (in case of mode 4).
 * @apiSuccess {String} data/fallback_series_lang ISO639-2B code for language to use as fallback language for series names (in case of mode 4).
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "avatar_file": "",
 *           "flag_online": false,
 *           "type": 0,
 *           "last_login_at": null,
 *           "login": "admin",
 *           "nickname": "Administrator",
 * 			 "url": null,
 * 			 "email": null,
 * 			 "bio": null,
 * 			 "fingerprint": null,
 * 			 "series_lang_mode": 4,
 * 			 "main_series_lang": "fre",
 * 			 "fallback_series_lang": "eng"
 *       },
 *   ]
 * }
 * @apiError USER_VIEW_ERROR Unable to view user details
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_VIEW_ERROR",
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const userData = await findUserByName(req.authToken.username, {public:false});
				updateSongsLeft(userData.login);
				res.json(userData);
			} catch(err) {
				const code = 'USER_VIEW_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
	/**
	 * @api {delete} /myaccount Delete your local account
	 * @apiName deleteLocal
	 * @apiVersion 3.1.0
	 * @apiGroup Users
	 * @apiPermission own
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccess {String} code Message to display
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "code": "USER_DELETED"
	 * }
	 * @apiError USER_DELETE_ERROR Unable to delete your user
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 406 Not acceptable
	 */
		.delete(requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				await deleteUser(req.authToken.username);
				res.status(200).json(APIMessage('USER_DELETED'));
			} catch(err) {
				const code = 'USER_DELETE_ERROR';
				errMessage(code, err);
				res.status(err?.code || 500).json(APIMessage(code));
			}
		})

	/**
 * @api {put} /myaccount Edit your own account
 * @apiName EditMyAccount
 * @apiVersion 3.1.0
 * @apiGroup Users
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} nickname New nickname for user
 * @apiParam {String} [password] New password. Can be empty (password won't be changed then)
 * @apiParam {String} [bio] User's bio info. Can be empty.
 * @apiParam {String} [email] User's mail. Can be empty.
 * @apiParam {String} [url] User's URL. Can be empty.
 * @apiParam {ImageFile} [avatarfile] New avatar
 * @apiParam {Number} [series_lang_mode] Mode (0-4) for series' names display : -1 = Let KM settings decide, 0 = Original/internal name, 1 = Depending on song's language, 2 = Depending on KM's language, 3 = Depending on user browser's language (default), 4 = Force languages with `main_series_lang` and `fallback_series_lang`
 * @apiParam {String} [main_series_lang] ISO639-2B code for language to use as main language for series names (in case of mode 4).
 * @apiParam {String} [fallback_series_lang] ISO639-2B code for language to use as fallback language for series names (in case of mode 4).
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "USER_EDITED"}
 * @apiError USER_UPDATE_ERROR Unable to edit user
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 400 Bad request
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.put(upload.single('avatarfile'), getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				nickname: {presence: true}
			});
			if (!validationErrors) {
				// No errors detected
				if (req.body.bio) req.body.bio = unescape(req.body.bio.trim());
				if (req.body.email) req.body.email = unescape(req.body.email.trim());
				if (req.body.url) req.body.url = unescape(req.body.url.trim());
				if (req.body.nickname) req.body.nickname = unescape(req.body.nickname.trim());
				//Now we edit user
				const avatar: Express.Multer.File = req.file || null;
				//Get username
				try {
					const response = await editUser(req.authToken.username, req.body, avatar , req.authToken.role);
					res.status(200).json(APIMessage('USER_EDITED', { onlineToken: response.onlineToken }));
				} catch(err) {
					errMessage(err.msg, err);
					res.status(err.code || 500).json(APIMessage(err.msg));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
	router.route('/myaccount/online')
		/**
	 * @api {post} /myaccount/online Convert your account to an online one
	 * @apiName ConvertToOnline
	 * @apiVersion 3.1.0
	 * @apiGroup Users
	 * @apiPermission own
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {String} instance Instance host name
	 * @apiParam {String} password Password to confirm conversion (also needed to create online account)
	 * @apiSuccess {String} data Object containing `token` and `onlineToken` properties. Use these to auth the new, converted user.
	 * @apiSuccess {String} code Message to display
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "code": "USER_CONVERTED",
	 *   "data": {
	 * 		"token": "<local token>"
	 * 		"onlineToken": "<online token>"
	 * 	 }
	 * }
	 * @apiError USER_CONVERT_ERROR Unable to convert user to remote
	 * @apiError ADMIN_CONVERT_ERROR Admin user cannot be converted to an online account
	 * @apiError UNKNOW_CONVERT_ERROR User unknown
	 * @apiError PASSWORD_CONVERT_ERROR Wrong password
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */
		.post(requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				instance: {presence: true},
				password: {presence: true}
			});
			if (!validationErrors) {
			// No errors detected
				req.body.instance = unescape(req.body.instance.trim());
				try {
					const tokens = await convertToRemoteUser(req.authToken, req.body.password, req.body.instance);
					res.json(APIMessage('USER_CONVERTED', tokens));
				} catch(err) {
					errMessage(err.msg, err);
					res.status(err?.code || 500).json(APIMessage(err.msg));
				}
			} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		})
	/**
	 * @api {delete} /myaccount/online Delete your online account
	 * @apiName ConvertToLocal
	 * @apiVersion 3.1.0
	 * @apiGroup Users
	 * @apiPermission own
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {String} password Password to confirm deletion
	 * @apiSuccess {String} data Object containing `token` and `onlineToken` properties. Use these to auth the new, converted user.
	 * @apiSuccess {String} code Message to display
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "code": "USER_DELETED_ONLINE",
	 * 	 "data": { token: abcdef... }
	 * }
	 * @apiError USER_DELETE_ERROR_ONLINE Unable to convert user to local
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 409 Conflict
	 */
		.delete(requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				password: {presence: true}
			});
			if (!validationErrors) {
			// No errors detected
				try {
					const newToken = await removeRemoteUser(req.authToken, req.body.password);
					res.json(APIMessage('USER_DELETED_ONLINE', newToken));
				} catch(err) {
					const code = 'USER_DELETE_ERROR_ONLINE';
					errMessage(code, err);
					res.status(err?.code || 500).json(APIMessage(code));
				}
			} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
				res.status(500).json(validationErrors);
			}
		});
}