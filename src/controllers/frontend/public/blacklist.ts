import { Router } from "express";
import { getLang } from "../../middlewares/lang";
import { requireAuth, requireValidUser, updateUserLoginTime } from "../../middlewares/auth";
import { requireWebappLimited } from "../../middlewares/webapp_mode";
import { getConfig } from "../../../lib/utils/config";
import { getBlacklist, getBlacklistCriterias } from "../../../services/blacklist";
import { OKMessage, errMessage } from "../../common";

export default function publicBlacklistController(router: Router) {
	router.route('/public/blacklist')
	/**
 * @api {get} /public/blacklist Get blacklist (public)
 * @apiName GetBlacklistPublic
 * @apiVersion 2.5.0
 * @apiGroup Blacklist
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription If `EngineAllowViewBlacklist` is set to `0` in configuration, then returns an error message (see below)
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
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
 *              <See admin/blacklist object>
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
 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
 * @apiError BL_VIEW_FORBIDDEN Blacklist view is not allowed for users
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BL_VIEW_FORBIDDEN"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			//Get list of blacklisted karas IF the settings allow public to see it
			if (getConfig().Frontend.Permissions.AllowViewBlacklist) {
				try {
					const karas = await getBlacklist({
						filter: req.query.filter,
						lang: req.lang,
						from: +req.query.from || 0,
						size: +req.query.size || 999999
					});
					res.json(OKMessage(karas));
				} catch(err) {
					res.status(500).json(errMessage('BL_VIEW_ERROR',err));
				}
			} else {
				res.status(403).json(errMessage('BL_VIEW_FORBIDDEN'));
			}
		});

	router.route('/public/blacklist/criterias')
	/**
 * @api {get} /public/blacklist/criterias Get list of blacklist criterias (public)
 * @apiName GetBlacklistCriteriasPublic
 * @apiVersion 2.1.0
 * @apiGroup Blacklist
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {Number} data/blcriteria_id Blacklist criteria's ID.
 * @apiSuccess {Number} data/type Blacklist criteria's type. Refer to dev documentation for more info on BLC types.
 * @apiSuccess {Number} data/value Value associated to balcklist criteria (what is being blacklisted)
 * @apiSuccess {String} data/value_i18n Translated value to display on screen.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "blcriteria_id": 2,
 *           "type": 6,
 *           "value": "241",
 *           "value_i18n": "Jean-Jacques Debout"
 *       }
 *   ]
 * }
 * @apiError BLC_VIEW_ERROR Blacklist criterias could not be listed
 * @apiError BLC_VIEW_FORBIDDEN Blacklist criterias are not viewable by users.
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BLC_VIEW_FORBIDDEN"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (_req: any, res: any) => {
			//Get list of blacklist criterias IF the settings allow public to see it			);
			if (getConfig().Frontend.Permissions.AllowViewBlacklistCriterias) {
				try {
					const blc = await getBlacklistCriterias();
					res.json(OKMessage(blc));
				} catch(err) {
					res.status(500).json(errMessage('BLC_VIEW_ERROR',err));
				}
			} else {
				res.status(403).json(errMessage('BLC_VIEW_FORBIDDEN'));
			}
		});

}