import { Router } from 'express';

import { getConfig } from '../../lib/utils/config';
import { check } from '../../lib/utils/validators';
import { addKaraToWhitelist, deleteKaraFromWhitelist,emptyWhitelist, getWhitelistContents } from '../../services/whitelist';
import { APIMessage,errMessage } from '../common';
import { requireAdmin, requireAuth, requireValidUser, updateUserLoginTime } from '../middlewares/auth';
import { getLang } from '../middlewares/lang';
import { requireWebappLimited } from '../middlewares/webapp_mode';

export default function whitelistController(router: Router) {
	router.route('/whitelist/empty')
	/**
 * @api {put} /whitelist/empty Empty whitelist
 * @apiName PutEmptyWhitelist
 * @apiVersion 3.1.0
 * @apiGroup Whitelist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiError WL_EMPTY_ERROR Unable to empty the whitelist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "WL_EMPTY_ERROR"}
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (_req: any, res: any) => {
		// Empty whitelist
			try {
				await emptyWhitelist();
				res.status(200).json();
			} catch(err) {
				const code = 'WL_EMPTY_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});

	router.route('/whitelist')
	/**
 * @api {get} /whitelist Get whitelist
 * @apiName GetWhitelist
 * @apiVersion 3.1.0
 * @apiGroup Whitelist
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiSuccess {Object[]} content List of karaoke objects
 * @apiSuccess {Object[]} i18n tag translations
 * @apiSuccess {Number} infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} infos/from Items listed are from this position
 * @apiSuccess {Number} infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *       "content": [
 *           {
 * 				<see Kara object without i18n in tags>,
 * 				 "reason": "No reason",
 * 				 "whitelisted_at": "2019-01-01T01:01:01.000Z"
 *           }
 *       ],
 * 		 "i18n": {
 * 			 "<tag UUID>": {
 * 				"eng": "English version",
 * 				"fre": "Version française"
 * 			 }
 * 			 ...
 * 		 },
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError WL_VIEW_ERROR Whitelist could not be viewed
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "WL_VIEW_ERROR"}
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireWebappLimited, async (req: any, res: any) => {
			if (getConfig().Frontend.Permissions.AllowViewWhitelist || req.authToken.role === 'admin') {
				try {
					const karas = await getWhitelistContents({
						filter: req.query.filter,
						lang: req.lang,
						from: +req.query.from,
						size: +req.query.size
					});
					res.json(karas);
				} catch(err) {
					const code = 'WL_VIEW_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			}
		})
	/**
 * @api {post} /whitelist Add song to whitelist
 * @apiName PostWhitelist
 * @apiVersion 3.1.0
 * @apiGroup Whitelist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid[]} kid Karaoke song IDs
 * @apiParam {String} [reason] Reason the song was added
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 Created
 * @apiError WL_ADD_SONG_ERROR Karaoke couldn't be added to whitelist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "WL_ADD_SONG_ERROR"}
 */
		.post(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				kid: {uuidArrayValidator: true}
			});
			if (!validationErrors) {
				try {
					await addKaraToWhitelist(req.body.kid, req.body.reason);
					res.status(201).json();
				} catch(err) {
					const code = 'WL_ADD_SONG_ERROR';
					errMessage(code, err);
					res.status(err?.code || 500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}

		})
	/**
 * @api {delete} /whitelist Delete whitelist item
 * @apiName DeleteWhitelist
 * @apiVersion 2.5.0
 * @apiGroup Whitelist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid[]} kid Kara IDs to delete from whitelist in an array
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiError WL_DELETE_SONG_ERROR Whitelist item could not be deleted.
 *
 */
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			//Delete kara from whitelist
			// Deletion is through whitelist ID.
			const validationErrors = check(req.body, {
				kid: {uuidArrayValidator: true}
			});
			if (!validationErrors) {
				try {
					await deleteKaraFromWhitelist(req.body.kid);
					res.status(200).json();
				} catch(err) {
					const code = 'WL_DELETE_SONG_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}

		});


}