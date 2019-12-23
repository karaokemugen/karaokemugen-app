import { getLang } from "../middlewares/lang";
import { requireAuth, requireValidUser, updateUserLoginTime, requireAdmin } from "../middlewares/auth";
import { emitWS } from "../../lib/utils/ws";
import { errMessage } from "../common";
import { getBlacklistCriterias, deleteBlacklistCriteria, emptyBlacklistCriterias, getBlacklist, addBlacklistCriteria } from "../../services/blacklist";
import { Router } from "express";
import { check } from "../../lib/utils/validators";
import { requireWebappLimited } from "../middlewares/webapp_mode";
import { getConfig } from "../../lib/utils/config";

export default function blacklistController(router: Router) {
	router.route('/blacklist/criterias/empty')
	/**
 * @api {put} /blacklist/criterias/empty Empty list of blacklist criterias
 * @apiName PutEmptyBlacklist
 * @apiVersion 2.1.0
 * @apiGroup Blacklist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data `null`
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * "BLC_EMPTIED"
 * @apiError BLC_EMPTY_ERROR Unable to empty list of blacklist criterias
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (_req: any, res: any) => {
		// Empty blacklist criterias
			try {
				await emptyBlacklistCriterias();
				emitWS('blacklistUpdated');
				res.status(200).send('BLC_EMPTIED');
			} catch(err) {
				errMessage('BLC_EMPTY_ERROR',err);
				res.status(500).send('BLC_EMPTY_ERROR');
			}
		});
	router.route('/blacklist')
	/**
	 * @api {get} /blacklist Get blacklist
	 * @apiName GetBlacklist
	 * @apiVersion 3.0.0
	 * @apiGroup Blacklist
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
	 * @apiSuccess {Object[]} content List of karaoke objects
	 * @apiSuccess {Number} infos/count Number of items in whitelist no matter which range was requested
	 * @apiSuccess {Number} infos/from Items listed are from this position
	 * @apiSuccess {Number} infos/size How many items listed.
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *       "content": [
	 *           {
	 * 				<see public/karas/[id] without i18n tag>,
	 * 				"blacklisted_at": "2019-01-01T21:21:00.000Z",
	 * 				"reason": "Your waifu is shit"
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
	 * }
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * "BL_VIEW_ERROR"
	 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
 	 * @apiError BL_VIEW_FORBIDDEN Blacklist view is not allowed for users
 	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 	 * @apiErrorExample Error-Response:
 	 * HTTP/1.1 500 Internal Server Error
 	 * "BL_VIEW_ERROR"
 	 * @apiErrorExample Error-Response:
 	 * HTTP/1.1 403 Forbidden
 	 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
				//Get list of blacklisted karas IF the settings allow public to see it
			if (getConfig().Frontend.Permissions.AllowViewBlacklist || req.authToken.role === 'admin') {
				try {
					const karas = await getBlacklist({
						filter: req.query.filter,
						lang: req.lang,
						from: +req.query.from || 0,
						size: +req.query.size || 999999
					});
					res.json(karas);
				} catch(err) {
					errMessage('BL_VIEW_ERROR', err);
					res.status(500).send('BL_VIEW_ERROR');
				}
			} else {
				res.status(403).send('BL_VIEW_FORBIDDEN');
			}
		});
	router.route('/blacklist/criterias')
	/**
	 * @api {get} /blacklist/criterias Get list of blacklist criterias
	 * @apiName GetBlacklistCriterias
	 * @apiVersion 3.0.0
	 * @apiGroup Blacklist
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccess {Number} blc/blcriteria_id Blacklist criteria's ID.
	 * @apiSuccess {Number} blc/type Blacklist criteria's type. Refer to dev documentation for more info on BLC types.
	 * @apiSuccess {Number} blc/value Value associated to blacklist criteria (what is being blacklisted). For tags or karas it's going to be a UUID for example.
	 * @apiSuccess {String} blc/value_i18n Translated value to display on screen.
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "blc": [
	 *       {
	 *           "blcriteria_id": 2,
	 *           "type": 6,
	 *           "value": "500030d3-8600-4728-b367-79ff029ea7c9",
	 *           "value_i18n": "Jean-Jacques Debout"
	 *       }
	 *   ]
	 * }
	 * @apiError BLC_VIEW_FORBIDDEN Blacklist criterias view is not allowed for users
	 * @apiError BLC_VIEW_ERROR Blacklist criterias could not be listed
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 	 * @apiErrorExample Error-Response:
 	 * HTTP/1.1 403 Forbidden
 	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * "BLC_VIEW_ERROR"
	 */
			.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, requireAdmin, async (_req: any, res: any) => {
				if (getConfig().Frontend.Permissions.AllowViewBlacklistCriterias) {
					try {
						const blc = await getBlacklistCriterias();
						res.json(blc);
					} catch(err) {
						errMessage('BLC_VIEW_ERROR', err);
						res.status(500).send('BLC_VIEW_ERROR');
					}
				} else {
					res.status(403).send('BLC_VIEW_FORBIDDEN');
				}
			})
	/**
	 * @api {post} /blacklist/criterias Add a blacklist criteria
	 * @apiName PostBlacklistCriterias
	 * @apiVersion 2.1.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} blcriteria_type Blacklist criteria type (refer to docs)
	 * @apiParam {String} blcriteria_value Blacklist criteria value. Depending on type, can be number or string.
	 * @apiSuccess {String} message Message to display
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 201 Created
	 * "BLC_ADDED"
	 * @apiError BLC_ADD_ERROR Blacklist criteria could not be added
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * "BLC_ADD_ERROR"
	 */
			.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				//Add blacklist criteria
				const validationErrors = check(req.body, {
					blcriteria_type: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 1010}},
					blcriteria_value: {presence: {allowEmpty: false}}
				});
				if (!validationErrors) {
					try {
						await addBlacklistCriteria(req.body.blcriteria_type, req.body.blcriteria_value);
						emitWS('blacklistUpdated');
						res.status(201).send('BLC_ADDED');
					} catch(err) {
						errMessage('BLC_ADD_ERROR',err);
						res.status(500).send('BLC_ADD_ERROR');
					}
				} else {
					// Errors detected
					// Sending BAD REQUEST HTTP code and error object.
					res.status(400).json(validationErrors);
				}

			});

		router.route('/blacklist/criterias/:blc_id([0-9]+)')
	/**
	 * @api {delete} blacklist/criterias/:blc_id Delete a blacklist criteria
	 * @apiName DeleteBlacklistCriterias
	 * @apiVersion 2.1.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} blc_id Blacklist criteria's ID to delete
	 * @apiSuccess {String} code Message to display
	 * @apiSuccess {String} args arguments for the message
	 * @apiSuccess {String} data Data returned from API
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * "BLC_DELETED"
	 * @apiError BLC_DELETE_ERROR Unable to delete Blacklist criteria
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * "BLC_DELETE_ERROR"
	 */
			.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				try {
					await deleteBlacklistCriteria(req.params.blc_id);
					emitWS('blacklistUpdated');
					res.status(200).send('BLC_DELETED');
				} catch(err) {
					errMessage('BLC_DELETE_ERROR',err)
					res.status(500).send('BLC_DELETE_ERROR');
				}
			});

}