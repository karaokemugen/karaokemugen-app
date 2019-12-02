import { Router } from "express";
import { errMessage, OKMessage } from "../../common";
import { removeRemoteUser, convertToRemoteUser, editUser, findUserByName, updateSongsLeft, createUser, listUsers, createAdminUser, resetRemotePassword } from "../../../services/user";
import { emitWS } from "../../../lib/utils/ws";
import { check } from "../../../lib/utils/validators";
import { updateUserLoginTime, requireAuth, requireValidUser } from "../../middlewares/auth";
import { requireWebappLimited, requireWebappLimitedNoAuth } from "../../middlewares/webapp_mode";
import { getLang } from "../../middlewares/lang";
import multer = require('multer');
import { resolvedPathTemp } from "../../../lib/utils/config";
import { deleteUser } from "../../../dao/user";

export default function publicUserController(router: Router) {
	// Middleware for playlist and files import
	let upload = multer({ dest: resolvedPathTemp()});

	router.route('/public/users/:username')
	/**
 * @api {get} /public/users/:username View user details (public)
 * @apiName GetUser
 * @apiVersion 2.5.0
 * @apiGroup Users
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} username Username to check details for.
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (`0` = admin, `1` = user, `2` = guest)
 * @apiSuccess {Number} data/last_login_at Last login time in `Date()` format
 * @apiSuccess {String} data/url User's URL in its profile
 * @apiSuccess {String} data/bio User's bio
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
 * 			 "bio": null,
 *       },
 *   ]
 * }
 * @apiError USER_VIEW_ERROR Unable to view user details
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_VIEW_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const userdata = await findUserByName(req.params.username, {public:true});
				res.json(OKMessage(userdata));
			} catch(err) {
				res.status(500).json(errMessage('USER_VIEW_ERROR',err));
			}
		})
	router.route('/public/users/:username/resetpassword')
		/**
	 * @api {post} /public/users/:username/resetpassword Reset password (online account only)
	 * @apiName PostResetPassword
	 * @apiVersion 3.0.0
	 * @apiGroup Users
	 * @apiPermission noAuth
	 * @apiParam {String} username Username for password reset
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
	 * @apiError USER_RESETPASSWORD_NOTONLINE_ERROR Only online users can have their password automatically reset
	 * @apiError USER_RESETPASSWORD_ERROR Reset password generic error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "USER_RESETPASSWORD_NOTONLINE_ERROR",
	 *   "message": null
	 * }
	  */
			.post(async (req: any, res: any) => {
				try {
					if (!req.params.username.includes('@')) {
						res.status(500).json(errMessage('USER_RESETPASSWORD_NOTONLINE_ERROR',null));
					} else {
						await resetRemotePassword(req.params.username);
						res.status(200).json(OKMessage(null));
					}
				} catch(err) {
					res.status(500).json(errMessage('USER_RESETPASSWORD_ERROR',err));
				}
			})
	router.route('/public/myaccount')
	/**
 * @api {get} /public/myaccount View own user details
 * @apiName GetMyAccount
 * @apiVersion 3.0.0
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
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const userData = await findUserByName(req.authToken.username, {public:false});
				updateSongsLeft(userData.login);
				res.json(OKMessage(userData));
			} catch(err) {
				res.status(500).json(errMessage('USER_VIEW_ERROR',err));
			}
		})
	/**
	 * @api {delete} /public/myaccount Delete your local account
	 * @apiName ConvertToLocal
	 * @apiVersion 2.5.0
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
	 * @apiError USER_DELETED_ERROR Unable to delete your user
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */
		.delete(requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				await deleteUser(req.authToken.username);
				res.json(OKMessage(null,'USER_DELETED'));
			} catch(err) {
				res.status(500).json(errMessage('USER_DELETED_ERROR',err));
			}
		})

	/**
 * @api {put} /public/myaccount Edit your own account
 * @apiName EditMyAccount
 * @apiVersion 3.0.0
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
 * @apiSuccess {String} args Username
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} user data edited
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "lol",
 *   "code": "USER_UPDATED",
 *   "data": {
 *       "bio": "lol2",
 *       "email": "lol3@lol.fr",
 *       "login": "test2",
 *       "nickname": "lol",
 *       "url": "http://lol4"
 *   }
 * }
 * @apiError USER_UPDATE_ERROR Unable to edit user
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
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
				let avatar: Express.Multer.File;
				if (req.file) avatar = req.file;
				//Get username
				try {
					const userdata = await editUser(req.authToken.username,req.body,avatar,req.authToken.role);
					emitWS('userUpdated',req.authToken.username);
					res.json(OKMessage(userdata,'USER_UPDATED',userdata.nickname));
				} catch(err) {
					res.status(500).json(errMessage('USER_UPDATE_ERROR',err.message,err.data));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
	router.route('/public/myaccount/online')
		/**
	 * @api {post} /public/myaccount/online Convert your account to an online one
	 * @apiName ConvertToOnline
	 * @apiVersion 2.5.0
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
					emitWS('userUpdated',req.authToken.username);
					res.json(OKMessage(tokens,'USER_CONVERTED'));
				} catch(err) {
					if (err.code) {
						res.status(500).json(errMessage(err.code,err.message));
					} else {
						res.status(500).json(errMessage('USER_CONVERT_ERROR',err));
					}
				}
			} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
		})
	/**
	 * @api {delete} /public/myaccount/online Delete your online account
	 * @apiName ConvertToLocal
	 * @apiVersion 2.5.0
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
	 */
		.delete(requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				password: {presence: true}
			});
			if (!validationErrors) {
			// No errors detected
				try {
					const newToken = await removeRemoteUser(req.authToken, req.body.password);
					emitWS('userUpdated', req.authToken.username);
					res.json(OKMessage(newToken,'USER_DELETED_ONLINE'));
				} catch(err) {
					res.status(500).json(errMessage('USER_DELETE_ERROR_ONLINE',err));
				}
			} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
		});
		router.route('/public/users')
		/**
	 * @api {get} /public/users List users
	 * @apiName GetUsers
	 * @apiVersion 2.5.0
	 * @apiGroup Users
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccess {Object[]} data User objects
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": [
	 *       {
	 *            <See admin/users/[username] object
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
					res.json(OKMessage(users));
				} catch(err) {
					res.series(500).json(errMessage('USER_LIST_ERROR',err));
				}
			})

		/**
	 * @api {post} /public/users Create new user
	 * @apiName PostUser
	 * @apiVersion 3.0.0
	 * @apiGroup Users
	 * @apiPermission NoAuth
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {String} login Login name for the user
	 * @apiParam {String} password Password for the user
	 * @apiParam {Boolean} admin Is it an admin account creation ?
	 * @apiParam {Number} securityCode Security code if `admin` is set to `true`
	 * @apiSuccess {String} code Message to display
	 * @apiSuccess {Boolean} data Returns `true` if success
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "code": "USER_CREATED",
	 *   "data": true
	 * }
	 * @apiError USER_CREATE_ERROR Unable to create user
	 * @apiError USER_ALREADY_EXISTS This username already exists
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiError USER_ALREADY_EXISTS_ONLINE This username already exists on that online instance
	 * @apiError USER_CREATE_ERROR_ONLINE Unable to create the online user
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "args": "Axel",
	 *   "code": "USER_ALREADY_EXISTS",
	 *   "message": null
	 * }
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */

			.post(requireWebappLimitedNoAuth, async (req: any, res: any) => {
				//Validate form data
				const validationErrors = check(req.body, {
					login: {presence: true},
					password: {presence: true}
				});
				if (!validationErrors) {
					req.body.login = unescape(req.body.login.trim());
					// No errors detected
					try {
						if (req.body.admin) {
							await createAdminUser(req.body);
						} else {
							await createUser(req.body);
						}
						res.json(OKMessage(true,'USER_CREATED'));
					} catch(err) {
						if (err.code) {
							res.status(500).json(errMessage(err.code,err.message));
						} else {
							res.status(500).json(errMessage('USER_CREATE_ERROR_ONLINE', err));
						}
					}
				} else {
					// Errors detected
					// Sending BAD REQUEST HTTP code and error object.
					res.status(400).json(validationErrors);
				}
			});

}