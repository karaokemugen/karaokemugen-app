import { Router } from 'express';

import { getConfig } from '../../lib/utils/config';
import { bools } from '../../lib/utils/constants';
import { check } from '../../lib/utils/validators';
import { emitWS } from '../../lib/utils/ws';
import { addBlacklistCriteria, addSet, copySet, deleteBlacklistCriteria, editSet, emptyBlacklistCriterias, exportSet, getAllSets, getBlacklist, getBlacklistCriterias, getSet, importSet,removeSet, setSetCurrent } from '../../services/blacklist';
import { APIMessage,errMessage } from '../common';
import { requireAdmin,requireAuth, requireValidUser, updateUserLoginTime } from '../middlewares/auth';
import { getLang } from '../middlewares/lang';
import { requireWebappLimited } from '../middlewares/webapp_mode';

export default function blacklistController(router: Router) {
	router.route('/blacklist/set/:set_id([0-9]+)/criterias/empty')
	/**
 * @api {put} /blacklist/set/:set_id/criterias/empty Empty list of blacklist criterias
 * @apiName PutEmptyBlacklist
 * @apiVersion 3.1.0
 * @apiGroup Blacklist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} set_id BLC Set ID
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data `null`
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiError BLC_EMPTY_ERROR Unable to empty list of blacklist criterias
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
		// Empty blacklist criterias
			try {
				await emptyBlacklistCriterias(req.params.set_id);
				emitWS('blacklistUpdated');
				res.status(200).json();
			} catch(err) {
				const code = 'BLC_EMPTY_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/blacklist')
	/**
	 * @api {get} /blacklist Get blacklist
	 * @apiName GetBlacklist
	 * @apiVersion 3.1.0
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
					const code = 'BL_VIEW_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				res.status(403).json(APIMessage('BL_VIEW_FORBIDDEN'));
			}
		});
	router.route('/blacklist/set/:set_id([0-9]+)/criterias')
	/**
	 * @api {get} /blacklist/set/:set_id/criterias Get list of blacklist criterias
	 * @apiName GetBlacklistCriterias
	 * @apiVersion 3.1.0
	 * @apiGroup Blacklist
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} set_id BLC Set ID
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
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			if (getConfig().Frontend.Permissions.AllowViewBlacklistCriterias || req.authToken.role === 'admin') {
				try {
					const blc = await getBlacklistCriterias(req.params.set_id);
					res.json(blc);
				} catch(err) {
					const code = 'BLC_VIEW_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				res.status(403).json(APIMessage('BLC_VIEW_FORBIDDEN'));
			}
		})
	/**
	 * @api {post} /blacklist/set/:set_id/criterias Add a blacklist criteria
	 * @apiName PostBlacklistCriterias
	 * @apiVersion 3.1.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} blcriteria_type Blacklist criteria type (refer to docs)
	 * @apiParam {String} blcriteria_value Blacklist criteria value. Depending on type, can be number or string.
	 * @apiParam {Number} set_id BLC Set ID
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
					await addBlacklistCriteria(req.body.blcriteria_type, req.body.blcriteria_value, req.params.set_id);
					emitWS('blacklistUpdated');
					res.status(201).json(APIMessage('BLC_ADDED'));
				} catch(err) {
					const code = 'BLC_ADD_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}

		});

	router.route('/blacklist/set/:set_id([0-9]+)/criterias/:blc_id([0-9]+)')
	/**
	 * @api {delete} blacklist/set/:set_id/criterias/:blc_id Delete a blacklist criteria
	 * @apiName DeleteBlacklistCriterias
	 * @apiVersion 3.1.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} blc_id Blacklist criteria's ID to delete
	 * @apiParam {Number} set_id BLC set ID to delete from
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
				await deleteBlacklistCriteria(req.params.blc_id, req.params.set_id);
				emitWS('blacklistUpdated');
				res.status(200).json(APIMessage('BLC_DELETED'));
			} catch(err) {
				const code = 'BLC_DELETE_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/blacklist/set/:set_id([0-9]+)')
	/**
	 * @api {get} blacklist/set/:set_id Get BLC Set info
	 * @apiName GetBLCSetInfo
	 * @apiVersion 3.3.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} set_id BLC set ID to delete from
	 * @apiSuccess {String} name Name of BLC Set
	 * @apiSuccess {Date} modified_at Last time it was updated
	 * @apiSuccess {Date} created_at When it was created
	 * @apiSuccess {Boolean} flag_current Is it current or not
	 * @apiSuccess {Number} blc_set_id ID of set in database
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiError BLC_SET_GET_ERROR Unable to get that BLC Set
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			try {
				const set = await getSet(req.params.set_id);
				res.status(200).json(set);
			} catch(err) {
				const code = 'BLC_SET_GET_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
	/**
	 * @api {delete} blacklist/set/:set_id Delete BLC Set info
	 * @apiName DeleteBLCSet
	 * @apiVersion 3.3.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} set_id BLC set ID to delete
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiError BLC_SET_DELETE_ERROR Unable to delete that BLC Set
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			try {
				await removeSet(req.params.set_id);
				emitWS('BLCSetsUpdated');
				res.status(200).json();
			} catch(err) {
				const code = 'BLC_SET_DELETE_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
		/**
	 * @api {put} /blacklist/set/:set_id Update a BLC Set's information
	 * @apiName PutBLCSet
	 * @apiVersion 3.3.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 *
	 * @apiParam {Number} set_id Target Set ID.
	 * @apiParam {String} name Name of playlist to create
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiError BLC_SET_UPDATE_ERROR Unable to update a playlist
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
		// Update playlist info
			const validationErrors = check(req.body, {
				name: {presence: {allowEmpty: false}}
			});
			if (!validationErrors) {
			// No errors detected
				req.body.name = unescape(req.body.name.trim());

				//Now we add playlist
				try {
					await editSet({
						blc_set_id: req.params.set_id,
						...req.body
					});
					emitWS('BLCSetInfoUpdated',req.params.set_id);
					emitWS('BLCSetsUpdated');
					res.status(200).json();
				} catch(err) {
					const code = 'BLC_SET_UPDATE_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
	router.route('/blacklist/set')
	/**
	 * @api {get} blacklist/set Get all BLC Sets
	 * @apiName GetBLCSetsInfo
	 * @apiVersion 3.3.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccess {BLCSet[]} - See individual BLC Set getter
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiError BLC_SET_GET_ERROR Unable to get that BLC Set
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (_req: any, res: any) => {
			try {
				const sets = await getAllSets();
				res.status(200).json(sets);
			} catch(err) {
				const code = 'BLC_SET_GET_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
		/**
	 * @api {post} /blacklist/set Create a BLC Set
	 * @apiName PostBLCSet
	 * @apiVersion 3.3.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 *
	 * @apiParam {String} name Name of BLC set to create
	 * @apiParam {Boolean} flag_current Is the BLC Set to create current? This unsets `flag_current` on the previous BLC Set which had it.
	 * @apiSuccess {Number} id ID Number of BLC Set created
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 201 Created
	 * @apiError BLC_SET_CREATE_ERROR Unable to create a playlist
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			// Add playlist
			const validationErrors = check(req.body, {
				name: {presence: {allowEmpty: false}},
				flag_current: {inclusion: bools}
			});
			if (!validationErrors) {
				// No errors detected
				req.body.name = unescape(req.body.name.trim());

				//Now we add playlist
				try {
					const id = await addSet({
						flag_current: req.body.flag_current,
						name: req.body.name,
						created_at: null,
						modified_at: null,
					});
					emitWS('BLCSetsUpdated');
					res.status(201).json({id: id});
				} catch(err) {
					const code = 'BLC_SET_CREATE_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
	router.route('/blacklist/set/:set_id([0-9]+)/setCurrent')
	/**
 * @api {put} /blacklist/set/:set_id/setCurrent Set BLC Set to current
 * @apiName PutSetCurrentSet
 * @apiVersion 3.3.0
 * @apiGroup Blacklist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} set_id Target Set ID.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiError BLC_SET_CURRENT_ERROR Unable to set this BLC Set to current.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			try {
				await setSetCurrent(req.params.set_id);
				emitWS('BLCSetInfoUpdated',req.params.set_id);
				res.status(200).json();
			} catch(err) {
				const code = 'BLC_SET_CURRENT_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/blacklist/set/criterias/copy')
		/**
	 * @api {post} /blacklist/set/criterias/copy Copy BLCs from one set to the other
	 * @apiName PutCopyBLCs
	 * @apiVersion 3.3.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} fromSet_id Set ID to copy BLCs from
	 * @apiParam {Number} toSet_id Set ID to copy BLCs to
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiError BLC_COPY_ERROR Unable to copy BLCs for some reason
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			try {
				await copySet(req.body.fromSet_id, req.body.toSet_id);
				emitWS('BLCSetInfoUpdated', req.body.toSet_id);
				res.status(200).json('BLC_COPIED');
			} catch(err) {
				const code = 'BLC_COPY_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/blacklist/set/:set_id([0-9]+)/export')
	/**
		 * @api {get} /blacklist/set/:set_id/export Export a BLC Set ID
		 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
		 * @apiName getBLCSetExport
		 * @apiVersion 3.3.0
		 * @apiGroup Blacklist
		 * @apiPermission admin
		 * @apiHeader authorization Auth token received from logging in
		 * @apiParam {Number} set_id BLC Set ID to export
		 * @apiSuccess {Object} BLCSetFile Set in an exported format. See docs for more info.
		 *
		 * @apiSuccessExample Success-Response:
		 * HTTP/1.1 200 OK
		 * {
		 *       "Header": {
		 *           "description": "Karaoke Mugen BLC Set File",
		 *           "version": 1
		 *       },
		 *       "BLCSet": [
		 *           {
		 *               "type": 2
		 *               "value": "b0de301c-5756-49fb-b019-85a99a66586b"
		 *           },
		 * 			...
		 *       ],
		 *       "BLCSetInfo": {
		 *           "created_at": "2019-01-01T02:01:11.000Z",
		 *           "modified_at": "2019-01-01T02:01:11.000Z",
		 *           "name": "Test"
		 *       }
		 * }
		 * @apiError BLC_SET_EXPORT_ERROR Unable to export playlist
		 *
		 * @apiErrorExample Error-Response:
		 * HTTP/1.1 500 Internal Server Error
		 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			// Returns the BLC Set and its contents in an exportable format (to save on disk)
			try {
				const blcset = await exportSet(req.params.set_id);
				res.status(200).json(blcset);
			} catch(err) {
				const code = 'BLC_SET_EXPORT_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/blacklist/set/import')
	/**
		 * @api {post} /blacklist/set/import Import a BLC Set
		 * @apiName postBLCSetImport
		 * @apiVersion 3.3.0
		 * @apiGroup Blacklist
		 * @apiPermission admin
		 * @apiHeader authorization Auth token received from logging in
		 * @apiSuccess {String} playlist BLC Set in JSON form, following Karaoke Mugen's file format. See docs for more info.
		 *
		 * @apiSuccessExample Success-Response:
		 * HTTP/1.1 200 OK
		 * {
		 *   "args": 4,
		 *   "code": "BLC_SET_IMPORTED",
		 *   "data": {
		 *       "message": "Playlist imported",
		 *       "playlist_id": 4,
		 *       "unknownKaras": []
		 *   }
		 * }
		 * @apiError BLC_SET_IMPORT_ERROR Unable to import playlist
		 *
		 * @apiErrorExample Error-Response:
		 * HTTP/1.1 500 Internal Server Error
		 * {
		 *   "code": "BLC_SET_IMPORT_ERROR",
		 *   "message": "No header section"
		 * }
		 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				blcSet: {isJSON: true}
			});
			if (!validationErrors) {
				try {
					const id = await importSet(JSON.parse(req.body.blcSet));
					const response = {
						message: 'BLC Set Imported',
						blc_set_id: id
					};
					emitWS('BLCSetsUpdated');
					res.json({
						data: response,
						code: 'BLC_SET_IMPORTED',
						args: id
					});
				} catch(err) {
					const code = 'BLC_SET_IMPORT_ERROR';
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