import { Router } from "express";
import { OKMessage, errMessage } from "../../common";
import { emitWS } from "../../../lib/utils/ws";
import { getWhitelistContents, emptyWhitelist, addKaraToWhitelist, deleteKaraFromWhitelist } from "../../../services/whitelist";
import { requireAdmin, requireAuth, requireValidUser, updateUserLoginTime } from "../../middlewares/auth";
import { getLang } from "../../middlewares/lang";
import { check } from "../../../lib/utils/validators";

export default function adminWhitelistController(router: Router) {
	router.route('/admin/whitelist/empty')
	/**
 * @api {put} /admin/whitelist/empty Empty whitelist
 * @apiName PutEmptyWhitelist
 * @apiVersion 2.1.0
 * @apiGroup Whitelist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "WL_EMPTIED"
 * }
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
				res.json(OKMessage(null,'WL_EMPTIED'));

			} catch(err) {
				res.status(500).json(errMessage('WL_EMPTY_ERROR',err));
			}
		});

	router.route('/admin/whitelist')
	/**
 * @api {get} /admin/whitelist Get whitelist
 * @apiName GetWhitelist
 * @apiVersion 3.0.0
 * @apiGroup Whitelist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
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
 * {
 *   "code": "WL_VIEW_ERROR"
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			try {
				const karas = await getWhitelistContents({
					filter: req.query.filter,
					lang: req.lang,
					from: +req.query.from || 0,
					size: +req.query.size || 99999999
				});
				res.json(OKMessage(karas));
			} catch(err) {
				res.status(500).json(errMessage('WL_VIEW_ERROR',err));
			}
		})
	/**
 * @api {post} /admin/whitelist Add song to whitelist
 * @apiName PostWhitelist
 * @apiVersion 2.5.0
 * @apiGroup Whitelist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid[]} kid Karaoke song IDs, separated by commas
 * @apiParam {String} [reason] Reason the song was added
 * @apiSuccess {Number} args Arguments associated with message
 * @apiSuccess {Number} code Message to display
 * @apiSuccess {uuid[]} data/kid List of karaoke IDs separated by commas
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 Created
 * {
 *   "args": "2",
 *   "code": "WL_SONG_ADDED",
 *   "data": {
 *       "kid": "uuid"
 *   }
 * }
 * @apiError WL_ADD_SONG_ERROR Karaoke couldn't be added to whitelist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": [
 *       "2"
 *   ],
 *   "code": "WL_ADD_SONG_ERROR",
 *   "message": "No karaoke could be added, all are in whitelist already"
 * }
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
					res.status(201).json(OKMessage(req.body,'WL_SONG_ADDED',req.body.kid));
				} catch(err) {
					res.status(500).json(errMessage('WL_ADD_SONG_ERROR',err.message,err.data));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}

		})
	/**
 * @api {delete} /admin/whitelist Delete whitelist item
 * @apiName DeleteWhitelist
 * @apiVersion 2.5.0
 * @apiGroup Whitelist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid[]} kid Kara IDs to delete from whitelist, separated by commas
 * @apiSuccess {Number} args Arguments associated with message
 * @apiSuccess {Number} code Message to display
 * @apiSuccess {String[]} data List of KIDs
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "1",
 *   "code": "WL_SONG_DELETED",
 *   "data": "1"
 * }
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
					emitWS('whitelistUpdated');
					emitWS('blacklistUpdated');
					res.json(OKMessage(req.body.kid, 'WL_SONG_DELETED', req.body.kid));
				} catch(err) {
					res.status(500).json(errMessage('WL_DELETE_SONG_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}

		});


}