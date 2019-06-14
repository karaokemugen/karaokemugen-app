import { Router } from "express";
import { emitWS } from "../../../lib/utils/ws";
import { OKMessage, errMessage } from "../../common";
import { deleteUser, findUserByName, createUser } from "../../../services/user";
import { requireAdmin, updateUserLoginTime, requireAuth, requireValidUser } from "../../middlewares/auth";
import { getLang } from "../../middlewares/lang";
import { check } from "../../../lib/utils/validators";

export default function adminUserController(router: Router) {
	router.route('/admin/users')
	/**
 * @api {post} /admin/users Create new user (as admin)
 * @apiName PostUserAdmin
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} login Login name for the user
 * @apiParam {String} password Password for the user
 * @apiParam {String} role `admin` or `user`
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
 * @apiError USER_ALREADY_EXISTS_ONLINE This username already exists on that online instance
 * @apiError USER_CREATE_ERROR_ONLINE Unable to create the online user
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
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

		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
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
					await createUser(req.body, {
						admin: req.body.role === 'admin', createRemote: true
					});
					res.json(OKMessage(true,'USER_CREATED'));
				} catch(err) {
					res.status(500).json(errMessage(err.code,err.message));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});

	router.route('/admin/users/:username')
	/**
 * @api {get} /admin/users/:username View user details (admin)
 * @apiName GetUserAdmin
 * @apiVersion 3.0.0
 * @apiGroup Users
 * @apiPermission Admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiparam {String} username Username to get data from
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (0 = admin, 1 = user, 2 = guest)
 * @apiSuccess {Number} data/last_login Last login time in `Date()` format
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
 *       },
 *   ]
 * }
 * @apiError USER_VIEW_ERROR Unable to view user details
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_VIEW_ERROR",
 *   "message": null
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			try {
				const userdata = await findUserByName(req.params.username, {public:false});
				delete userdata.password;
				res.json(OKMessage(userdata));
			} catch(err) {
				res.status(500).json(errMessage('USER_VIEW_ERROR',err));
			}
		})
	/**
 * @api {delete} /admin/users/:username Delete an user
 * @apiName DeleteUser
 * @apiVersion 2.5.0
 * @apiGroup Users
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} username User name to delete
 * @apiSuccess {String} args ID of user deleted
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of user deleted
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 3,
 *   "code": "USER_DELETED",
 *   "data": 3
 * }
 * @apiError USER_DELETE_ERROR Unable to delete a user
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			try {
				await deleteUser(req.params.username);
				emitWS('usersUpdated');
				res.json(OKMessage(req.params.username, 'USER_DELETED', req.params.username));
			} catch(err) {
				res.status(500).json(errMessage('USER_DELETE_ERROR',err.message,err.data));
			}
		});

}