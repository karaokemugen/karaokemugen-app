import { Router } from "express";
import { getLang } from "../../middlewares/lang";
import { requireAuth, requireValidUser, updateUserLoginTime } from "../../middlewares/auth";
import { requireWebappLimited } from "../../middlewares/webapp_mode";
import { getConfig } from "../../../lib/utils/config";
import { getWhitelistContents } from "../../../services/whitelist";
import { OKMessage, errMessage } from "../../common";

export default function publicWhitelistController(router: Router) {

	router.route('/public/whitelist')
	/**
 * @api {get} /public/whitelist Get whitelist (public)
 * @apiName GetWhitelistPublic
 * @apiVersion 3.0.0
 * @apiGroup Whitelist
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription If `EngineAllowViewWhitelist` is set to `0` in configuration, then returns an error message (see below)
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/to Items listed end at this position
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 * 				 <See admin/whitelist object>
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
 * @apiError WL_VIEW_FORBIDDEN Whitelist view is not allowed for users
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "WL_VIEW_FORBIDDEN"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			//Returns whitelist IF the settings allow public to see it
			if (getConfig().Frontend.Permissions.AllowViewWhitelist) {
				try {
					const karas = await	getWhitelistContents({
						filter: req.query.filter,
						lang: req.lang,
						from: +req.query.from || 0,
						size: +req.query.size || 99999999
					});
					res.json(OKMessage(karas));
				} catch(err) {
					res.status(500).json(errMessage('WL_VIEW_ERROR',err));
				}
			} else {
				res.status(403).json(errMessage('WL_VIEW_FORBIDDEN'));
			}
		});

}