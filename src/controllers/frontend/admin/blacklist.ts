import { getLang } from "../../middlewares/lang";
import { requireAuth, requireValidUser, updateUserLoginTime, requireAdmin } from "../../middlewares/auth";
import { emitWS } from "../../../lib/utils/ws";
import { OKMessage, errMessage } from "../../common";
import { getBlacklistCriterias, deleteBlacklistCriteria, emptyBlacklistCriterias, getBlacklist, addBlacklistCriteria } from "../../../services/blacklist";
import { Router } from "express";
import { check } from "../../../lib/utils/validators";

export default function adminBlacklistController(router: Router) {
	router.route('/admin/blacklist/criterias/empty')
	/**
 * @api {put} /admin/blacklist/criterias/empty Empty list of blacklist criterias
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
 * {
 *   "code": "BLC_EMPTIED",
 *   "data": null
 * }
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
				res.json(OKMessage(null,'BLC_EMPTIED'));
			} catch(err) {
				res.status(500).json(errMessage('BLC_EMPTY_ERROR',err));
			}
		});
		router.route('/admin/blacklist')
		/**
	 * @api {get} /admin/blacklist Get blacklist
	 * @apiName GetBlacklist
	 * @apiVersion 3.0.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
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
	 *   }
	 * }
	 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "BL_VIEW_ERROR"
	 * }
	 */
			.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				try {
					const karas = await getBlacklist({
						filter:	req.query.filter,
						lang: req.lang,
						from: +req.query.from || 0,
						size: +req.query.size || 99999999
					});
					res.json(OKMessage(karas));
				} catch(err) {
					res.status(500).json(errMessage('BL_VIEW_ERROR',err));
				}
			});
		router.route('/admin/blacklist/criterias')
		/**
	 * @api {get} /admin/blacklist/criterias Get list of blacklist criterias
	 * @apiName GetBlacklistCriterias
	 * @apiVersion 3.0.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccess {Number} data/blcriteria_id Blacklist criteria's ID.
	 * @apiSuccess {Number} data/type Blacklist criteria's type. Refer to dev documentation for more info on BLC types.
	 * @apiSuccess {Number} data/value Value associated to blacklist criteria (what is being blacklisted). For tags or karas it's going to be a UUID for example.
	 * @apiSuccess {String} data/value_i18n Translated value to display on screen.
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": [
	 *       {
	 *           "blcriteria_id": 2,
	 *           "type": 6,
	 *           "value": "500030d3-8600-4728-b367-79ff029ea7c9",
	 *           "value_i18n": "Jean-Jacques Debout"
	 *       }
	 *   ]
	 * }
	 * @apiError BLC_VIEW_ERROR Blacklist criterias could not be listed
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "BLC_VIEW_ERROR"
	 * }
	 */
			.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (_req: any, res: any) => {
				//Get list of blacklist criterias
				try {
					const blc = await getBlacklistCriterias();
					res.json(OKMessage(blc));
				} catch(err) {
					res.status(500).json(errMessage('BLC_VIEW_ERROR',err));
				}
			})
		/**
	 * @api {post} /admin/blacklist/criterias Add a blacklist criteria
	 * @apiName PostBlacklistCriterias
	 * @apiVersion 2.1.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} blcriteria_type Blacklist criteria type (refer to docs)
	 * @apiParam {String} blcriteria_value Blacklist criteria value. Depending on type, can be number or string.
	 * @apiSuccess {String} code Message to display
	 * @apiSuccess {String} args arguments for the message
	 * @apiSuccess {String} data Data returned from API
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 201 Created
	 * {
	 *   "args": {
	 *       "blcriteria_type": "1000",
	 *       "blcriteria_value": "lol"
	 *   },
	 *   "code": "BLC_ADDED",
	 *   "data": {
	 *       "blcriteria_type": "1000",
	 *       "blcriteria_value": "lol"
	 *   }
	 * }
	 * @apiError BLC_ADD_ERROR Blacklist criteria could not be added
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "BLC_ADD_ERROR",
	 *   "message": {
	 *       "code": "SQLITE_ERROR",
	 *       "errno": 1
	 *   }
	 * }
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
						res.status(201).json(OKMessage(req.body,'BLC_ADDED',req.body));

					} catch(err) {
						res.status(500).json(errMessage('BLC_ADD_ERROR',err));
					}
				} else {
					// Errors detected
					// Sending BAD REQUEST HTTP code and error object.
					res.status(400).json(validationErrors);
				}

			});

		router.route('/admin/blacklist/criterias/:blc_id([0-9]+)')
		/**
	 * @api {delete} /admin/blacklist/criterias/:blc_id Delete a blacklist criteria
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
	 * {
	 *   "args": "5",
	 *   "code": "BLC_DELETED",
	 *   "data": "5"
	 * }
	 * @apiError BLC_DELETE_ERROR Unable to delete Blacklist criteria
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "BLC_DELETE_ERROR",
	 *   "message": "BLCID 5 unknown"
	 * }
	 */
			.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				try {
					await deleteBlacklistCriteria(req.params.blc_id);
					emitWS('blacklistUpdated');
					res.json(OKMessage(req.params.blc_id,'BLC_DELETED',req.params.blc_id));
				} catch(err) {
					res.status(500).json(errMessage('BLC_DELETE_ERROR',err));
				}
			});

}