import { Router } from "express";
import { errMessage } from "../common";
import { emitWS } from "../../lib/utils/ws";
import { getWhitelistContents, emptyWhitelist, addKaraToWhitelist, deleteKaraFromWhitelist } from "../../services/whitelist";
import { requireAdmin, requireAuth, requireValidUser, updateUserLoginTime } from "../middlewares/auth";
import { getLang } from "../middlewares/lang";
import { check } from "../../lib/utils/validators";
import { requireWebappLimited } from "../middlewares/webapp_mode";
import { getConfig } from "../../lib/utils/config";

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
 * "WL_EMPTIED"
 * @apiError WL_EMPTY_ERROR Unable to empty the whitelist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (_req: any, res: any) => {
		// Empty whitelist
			try {
				await emptyWhitelist();
				emitWS('blacklistUpdated');
				emitWS('whitelistUpdated');
				res.status(200).send('WL_EMPTIED');

			} catch(err) {
				errMessage('WL_EMPTY_ERROR',err);
				res.status(500).send('WL_EMPTY_ERROR');
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
 * "WL_VIEW_ERROR"
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
					errMessage('WL_VIEW_ERROR',err)
					res.status(500).send('WL_VIEW_ERROR');
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
 * @apiParam {uuid[]} kid Karaoke song IDs, separated by commas
 * @apiParam {String} [reason] Reason the song was added
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 Created
 * "WL_SONG_ADDED"
 * @apiError WL_ADD_SONG_ERROR Karaoke couldn't be added to whitelist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "WL_ADD_SONG_ERROR"
 */
		.post(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				kid: {uuidArrayValidator: true}
			});
			if (!validationErrors) {
				try {
					await addKaraToWhitelist(req.body.kid.split(','), req.body.reason);
					emitWS('whitelistUpdated');
					emitWS('blacklistUpdated');
					res.status(201).send('WL_SONG_ADDED');
				} catch(err) {
					errMessage('WL_ADD_SONG_ERROR', err.message);
					res.status(500).send('WL_ADD_SONG_ERROR');
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
 * @apiParam {uuid[]} kid Kara IDs to delete from whitelist, separated by commas
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * "WL_SONG_DELETED"
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
					await deleteKaraFromWhitelist(req.body.kid.split(','));
					emitWS('whitelistUpdated');
					emitWS('blacklistUpdated');
					res.status(200).send('WL_SONG_DELETED');
				} catch(err) {
					errMessage('WL_DELETE_SONG_ERROR', err);
					res.status(500).send('WL_DELETE_SONG_ERROR');
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}

		});


}