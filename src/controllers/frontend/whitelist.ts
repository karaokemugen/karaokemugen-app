
import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { check } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { addKaraToWhitelist, deleteKaraFromWhitelist,emptyWhitelist, getWhitelistContents } from '../../services/whitelist';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function whitelistController(router: SocketIOApp) {
	router.route('emptyWhitelist', async (socket: Socket, req: APIData) => {
	/**
 * @api {put} Empty whitelist
 * @apiName emptyWhitelist
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req);
		// Empty whitelist
		try {
			return await emptyWhitelist();
		} catch(err) {
			const code = 'WL_EMPTY_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('getWhitelist', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get whitelist
 * @apiName getWhitelist
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'guest', 'limited');
		if (req.token.role === 'admin') {
			try {
				return await getWhitelistContents({
					filter: req.body?.filter,
					lang: req.langs,
					from: +req.body?.from,
					size: +req.body?.size
				});
			} catch(err) {
				const code = 'WL_VIEW_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		}
	});

	router.route('addKaraToWhitelist', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Add song to whitelist
 * @apiName addKaraToWhitelist
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			kid: {uuidArrayValidator: true}
		});
		if (!validationErrors) {
			try {
				return await addKaraToWhitelist(req.body.kid, req.body.reason);
			} catch(err) {
				const code = 'WL_ADD_SONG_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}

	});

	router.route('deleteKaraFromWhitelist', async (socket: Socket, req: APIData) => {
	/**
 * @api {delete} Delete whitelist item
 * @apiName deleteKaraFromWhitelist
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			kid: {uuidArrayValidator: true}
		});
		if (!validationErrors) {
			try {
				return await deleteKaraFromWhitelist(req.body.kid);
			} catch(err) {
				const code = 'WL_DELETE_SONG_ERROR';
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