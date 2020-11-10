import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { bools } from '../../lib/utils/constants';
import { check } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { addBlacklistCriteria, addSet, copySet, deleteBlacklistCriteria, editSet, emptyBlacklistCriterias, exportSet, getAllSets, getBlacklist, getBlacklistCriterias, getSet, importSet,removeSet, setSetCurrent } from '../../services/blacklist';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function blacklistController(router: SocketIOApp) {
	router.route('emptyBLCSet', async (socket: Socket, req: APIData) => {
	/**
 * @api {put} Empty list of blacklist criterias
 * @apiName emptyBLCSet
 * @apiVersion 5.0.0
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
		// Empty blacklist criterias
		try {
			await runChecklist(socket, req, 'admin');
			await emptyBlacklistCriterias(req.body.set_id);
			return;
		} catch(err) {
			const code = 'BLC_EMPTY_ERROR';
			errMessage(code, err);
			throw {code: 500, message: APIMessage(code)};
		}
	});
	router.route('getBlacklist', async (socket: Socket, req: APIData) => {
	/**
	 * @api {get} Get blacklist
	 * @apiName getBlacklist
	 * @apiVersion 5.0.0
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
		//Get list of blacklisted karas IF the settings allow public to see it
		await runChecklist(socket, req, 'guest', 'limited');
		if (req.token.role === 'admin') {
			try {
				return await getBlacklist({
					filter: req.body?.filter,
					lang: req.langs,
					from: +req.body?.from || 0,
					size: +req.body?.size || 999999
				});
			} catch(err) {
				const code = 'BL_VIEW_ERROR';
				errMessage(code, err);
				throw {code: 500, message: APIMessage(code)};
			}
		} else {
			throw {code: 403, message: APIMessage('BL_VIEW_FORBIDDEN')};
		}
	});
	router.route('getBLCSet', async (socket: Socket, req: APIData) => {
	/**
	 * @api {get} Get list of blacklist criterias
	 * @apiName getBLCSet
	 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'guest', 'limited');
		if (req.token.role === 'admin') {
			try {
				return await getBlacklistCriterias(req.body.set_id);
			} catch(err) {
				const code = 'BLC_VIEW_ERROR';
				errMessage(code, err);
				throw {code: 500, message: APIMessage(code)};
			}
		} else {
			throw {code: 403, message: APIMessage('BLC_VIEW_FORBIDDEN')};
		}
	});
	router.route('createBLC', async (socket: Socket, req: APIData) => {
	/**
	 * @api {post} Add a blacklist criteria
	 * @apiName createBLC
	 * @apiVersion 5.0.0
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
	 * @apiError BLC_ADD_ERROR Blacklist criteria could not be added
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * "BLC_ADD_ERROR"
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 400 Bad Request
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 404 Not found
	 */
		//Add blacklist criteria
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			blcriteria_type: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 1010}},
			blcriteria_value: {presence: {allowEmpty: false}}
		});
		if (!validationErrors) {
			try {
				await addBlacklistCriteria(req.body.blcriteria_type, req.body.blcriteria_value, req.body.set_id);
				return;
			} catch(err) {
				const code = 'BLC_ADD_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}

	});

	router.route('deleteBLC', async (socket: Socket, req: APIData) => {
	/**
	 * @api {delete} deleteBLC Delete a blacklist criteria
	 * @apiName deleteBLC
	 * @apiVersion 5.0.0
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
	 * @apiError BLC_DELETE_ERROR Unable to delete Blacklist criteria
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * "BLC_DELETE_ERROR"
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 404 Not found
	 */
		await runChecklist(socket, req);
		try {
			await deleteBlacklistCriteria(req.body.blc_id, req.body.set_id);
			return;
		} catch(err) {
			const code = 'BLC_DELETE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getBLCSetInfo', async (socket: Socket, req: APIData) => {
	/**
	 * @api {get} Get BLC Set info
	 * @apiName getBLCSetInfo
	 * @apiVersion 5.0.0
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
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 404 Internal Server Error
	 */
		await runChecklist(socket, req);
		try {
			return await getSet(req.body.set_id);
		} catch(err) {
			const code = 'BLC_SET_GET_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('deleteBLCSet', async (socket: Socket, req: APIData) => {
	/**
	 * @api {delete} deleteBLCSet Delete BLC Set info
	 * @apiName deleteBLCSet
	 * @apiVersion 5.0.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} set_id BLC set ID to delete
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiError BLC_SET_DELETE_ERROR Unable to delete that BLC Set
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 404 Not found
	 */
		await runChecklist(socket, req);
		try {
			await removeSet(req.body.set_id);
			return;
		} catch(err) {
			const code = 'BLC_SET_DELETE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('editBLCSet', async (socket: Socket, req: APIData) => {
	/**
	 * @api {put} Update a BLC Set's information
	 * @apiName editBLCSet
	 * @apiVersion 5.0.0
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
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 404 Not Found
	 */
		// Update playlist info
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			name: {presence: {allowEmpty: false}}
		});
		if (!validationErrors) {
		// No errors detected
			req.body.name = unescape(req.body.name.trim());

			//Now we add playlist
			try {
				await editSet({
					blc_set_id: req.body.set_id,
					...req.body
				});
				return;
			} catch(err) {
				const code = 'BLC_SET_UPDATE_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
		// Errors detected
		// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});
	router.route('getBLCSets', async (socket: Socket, req: APIData) => {
	/**
	 * @api {get} Get all BLC Sets
	 * @apiName getBLCSets
	 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'guest');
		if (req.token.role === 'admin') {
			try {
				return await getAllSets();
			} catch(err) {
				const code = 'BLC_SET_GET_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			throw {code: 403, message: APIMessage('BLC_VIEW_FORBIDDEN')};
		}
	});
	router.route('createBLCSet', async (socket: Socket, req: APIData) => {
	/**
	 * @api {post} Create a BLC Set
	 * @apiName createBLCSet
	 * @apiVersion 5.0.0
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
		// Add playlist
		await runChecklist(socket, req);
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
				return {id: id};
			} catch(err) {
				const code = 'BLC_SET_CREATE_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});
	router.route('setCurrentBLCSet', async (socket: Socket, req: APIData) => {
	/**
 * @api {put} Set BLC Set to current
 * @apiName setCurrentBLCSet
 * @apiVersion 5.0.0
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
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 */
		await runChecklist(socket, req);
		try {
			await setSetCurrent(req.body.set_id);
			return;
		} catch(err) {
			const code = 'BLC_SET_CURRENT_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('copyBLCs', async (socket: Socket, req: APIData) => {
		/**
	 * @api {post} Copy BLCs from one set to the other
	 * @apiName copyBLCs
	 * @apiVersion 5.0.0
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
	 * @apiErrorExample Error-Response:
 	 * HTTP/1.1 404 Not Found
	 */
		await runChecklist(socket, req);
		try {
			await copySet(req.body.fromSet_id, req.body.toSet_id);
			return APIMessage('BLC_COPIED');
		} catch(err) {
			const code = 'BLC_COPY_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('exportBLCSet', async (socket: Socket, req: APIData) => {
	/**
		 * @api {get} Export a BLC Set ID
		 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
		 * @apiName exportBLCSet
		 * @apiVersion 5.0.0
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
		 * @apiErrorExample Error-Response:
 		 * HTTP/1.1 404 Not Found
		 */
		// Returns the BLC Set and its contents in an exportable format (to save on disk)
		await runChecklist(socket, req);
		try {
			return await exportSet(req.body.set_id);
		} catch(err) {
			const code = 'BLC_SET_EXPORT_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('importBLCSet', async (socket: Socket, req: APIData) => {
	/**
		 * @api {post} Import a BLC Set
		 * @apiName importBLCSet
		 * @apiVersion 5.0.0
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
		await runChecklist(socket, req);
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
				return {
					data: response,
					code: 'BLC_SET_IMPORTED',
					args: id
				};
			} catch(err) {
				const code = 'BLC_SET_IMPORT_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});
}