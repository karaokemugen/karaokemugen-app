import { Socket } from 'socket.io';

import {selectFavoritesMicro} from '../../dao/favorites';
import { APIData } from '../../lib/types/api';
import { check } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { addToFavorites, createAutoMix, deleteFavorites, exportFavorites, getFavorites, importFavorites } from '../../services/favorites';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function favoritesController(router: SocketIOApp) {

	router.route('createAutomix', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Generate a automix playlist
 * @apiName createAutomix
 * @apiGroup Favorites
 * @apiVersion 5.0.0
 * @apiPermission admin
 *
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} users list of usernames to pick favorites from
 * @apiParam {Number} duration Duration wished for the generatedplaylist in minutes
 * @apiSuccess {String} message Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 OK
 * "AUTOMIX_CREATED"
 * @apiError AUTOMIX_ERROR Unable to create the automix playlist
 * @apiError AUTOMIX_ERROR_NOT_FOUND_FAV_FOR_USERS No favorites found for those users
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 */
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			users: {presence: {allowEmpty: false}},
			duration: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}}
		});
		if (!validationErrors) {
			// No errors detected
			try {
				return await createAutoMix({
					duration: +req.body?.duration,
					users: req.body?.users
				}, req.token.username);
			} catch(err) {
				const code = 'AUTOMIX_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});
	router.route('getFavorites', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} View own favorites
 * @apiName getFavorites
 * @apiVersion 5.0.0
 * @apiGroup Favorites
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} content/karas Array of `kara` objects
 * @apiSuccess {Number} infos/count Number of karaokes in playlist
 * @apiSuccess {Number} infos/from Starting position of listing
 * @apiSuccess {Number} infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *       "content": [
 *           {
 *            <See public/karas/[id] object without i18n in tags>
 *           },
 *           ...
 *       ],
 * 		 "i18n": {
 * 			 "<tag UUID>": {
 * 				"eng": "English version",
 * 				"fre": "Version française"
 * 			 }
 * 			 ...
 * 		 },
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 * }
 * @apiError FAVORITES_VIEW_ERROR Unable to fetch list of karaokes in favorites
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		await runChecklist(socket, req, 'user', 'limited');
		try {
			if (req.body.mini) {
				return await selectFavoritesMicro({
					username: req.token.username,
					from: +req.body?.from || 0,
					size: +req.body?.size || 9999999
				});
			} else {
				return await getFavorites({
					username: req.token.username,
					filter: req.body?.filter,
					lang: req.langs,
					from: +req.body?.from || 0,
					size: +req.body?.size || 9999999
				});
			}
		} catch(err) {
			const code = 'FAVORITES_VIEW_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('addFavorites', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Add karaoke to your favorites
 * @apiName addFavorites
 * @apiVersion 5.0.0
 * @apiGroup Favorites
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid[]} kid kara IDs to add
 * @apiSuccess {String} message Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiError FAVORITES_ADDED_ERROR Unable to add songs to the playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "FAVORITES_ADDED_ERROR"
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		await runChecklist(socket, req, 'user', 'limited');
		const validationErrors = check(req.body, {
			kid: {uuidArrayValidator: true}
		});
		if (!validationErrors) {
			try {
				return await addToFavorites(req.token.username, req.body?.kid);
			} catch(err) {
				const code = 'FAVORITES_ADDED_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});
	router.route('deleteFavorites', async (socket: Socket, req: APIData) => {
	/**
 * @api {delete} Delete karaoke from your favorites
 * @apiName deleteFavorites
 * @apiVersion 5.0.0
 * @apiGroup Favorites
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid[]} kid kara IDs to add
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiError FAVORITES_DELETED_ERROR Unable to delete the favorited song
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "FAVORITES_DELETED_ERROR"
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		await runChecklist(socket, req, 'user', 'limited');
		// Delete kara from favorites
		// Deletion is through kara ID.
		const validationErrors = check(req.body, {
			kid: {uuidArrayValidator: true}
		});
		if (!validationErrors) {
			try {
				return await deleteFavorites(req.token.username, req.body?.kid );
			} catch(err) {
				const code = 'FAVORITES_DELETED_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		}
	});
	router.route('exportFavorites', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Export favorites
 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
 * @apiName exportFavorites
 * @apiVersion 5.0.0
 * @apiGroup Favorites
 * @apiPermission public
 * @apiSuccess {String} data Playlist in an exported format. See docs for more info.
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiError FAVORITES_EXPORTED_ERROR Unable to export favorites
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "FAVORITES_EXPORTED_ERROR"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 */
		await runChecklist(socket, req, 'user', 'limited');
		// Returns the playlist and its contents in an exportable format (to save on disk)
		try {
			return await exportFavorites(req.token.username);
		} catch(err) {
			const code = 'FAVORITES_EXPORTED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('importFavorites', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Import favorites
 * @apiName importFavorites
 * @apiVersion 5.0.0
 * @apiGroup Favorites
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {String} favoritesFile Favorites file in JSON form, following Karaoke Mugen's file format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * "FAVORITES_IMPORTED"
 * @apiError FAVORITES_IMPORTED_ERROR Unable to import playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 400 Bad Request
 */
		await runChecklist(socket, req, 'user', 'limited');
		const validationErrors = check(req.body, {
			favorites: {isJSON: true}
		});
		if (!validationErrors) {
			try {
				await importFavorites(JSON.parse(req.body?.favorites), req.token.username);
				return APIMessage('FAVORITES_IMPORTED');
			} catch(err) {
				const code = 'FAVORITES_IMPORTED_ERROR';
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
