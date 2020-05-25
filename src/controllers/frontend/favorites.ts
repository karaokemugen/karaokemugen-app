import { Router } from "express";
import { errMessage, APIMessage } from "../common";
import { emitWS } from "../../lib/utils/ws";
import { createAutoMix, getFavorites, addToFavorites, deleteFavorites, exportFavorites, importFavorites } from "../../services/favorites";
import { check } from "../../lib/utils/validators";
import { updateUserLoginTime, requireAdmin, requireValidUser, requireAuth, requireRegularUser } from "../middlewares/auth";
import { getLang } from "../middlewares/lang";
import { requireWebappLimited } from "../middlewares/webapp_mode";

export default function favoritesController(router: Router) {

	router.route('/automix')
	/**
 * @api {post} /automix Generate a automix playlist
 * @apiName PostMix
 * @apiGroup Favorites
 * @apiVersion 3.1.0
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
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "AUTOMIX_ERROR"
 */

		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				users: {presence: {allowEmpty: false}},
				duration: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}}
			});
			if (!validationErrors) {
				// No errors detected
				try {
					await createAutoMix({
						duration: +req.body.duration,
						users: req.body.users
					}, req.authToken.username);
					emitWS('playlistsUpdated');
					res.status(201).json();
				} catch(err) {
					const code = 'AUTOMIX_ERROR';
					errMessage(code, err)
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
	router.route('/favorites')
	/**
 * @api {get} /favorites View own favorites
 * @apiName GetFavorites
 * @apiVersion 3.1.0
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
		.get(getLang, requireAuth, requireWebappLimited,  requireValidUser, requireRegularUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const karas = await getFavorites({
					username: req.authToken.username,
					filter: req.query.filter,
					lang: req.lang,
					from: +req.query.from || 0,
					size: +req.query.size || 9999999
				});
				res.json(karas);
			} catch(err) {
				const code = 'FAVORITES_VIEW_ERROR';
				errMessage(code, err)
				res.status(500).json(APIMessage(code));
			}
		})
	/**
 * @api {post} /favorites Add karaoke to your favorites
 * @apiName PostFavorites
 * @apiVersion 3.1.0
 * @apiGroup Favorites
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid[]} kid kara IDs to add
 * @apiSuccess {String} message Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * "FAVORITES_ADDED"
 * @apiError FAVORITES_ADDED_ERROR Unable to add songs to the playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "FAVORITES_ADDED_ERROR"
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.post(getLang, requireAuth, requireWebappLimited, requireValidUser, requireRegularUser, updateUserLoginTime, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				kid: {uuidArrayValidator: true}
			});
			if (!validationErrors) {
				try {
					await addToFavorites(req.authToken.username, req.body.kid);
					emitWS('favoritesUpdated', req.authToken.username);
					res.status(200).json(APIMessage('FAVORITES_ADDED'));
				} catch(err) {
					const code = 'FAVORITES_ADDED_ERROR';
					errMessage(code, err)
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		})
	/**
 * @api {delete} /favorites Delete karaoke from your favorites
 * @apiName DeleteFavorites
 * @apiVersion 3.1.0
 * @apiGroup Favorites
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid[]} kid kara IDs to add
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * "FAVORITES_DELETED"
 * @apiError FAVORITES_DELETED_ERROR Unable to delete the favorited song
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "FAVORITES_DELETED_ERROR"
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.delete(getLang, requireAuth, requireWebappLimited, requireValidUser, requireRegularUser, updateUserLoginTime, async (req: any, res: any) => {
			// Delete kara from favorites
			// Deletion is through kara ID.
			const validationErrors = check(req.body, {
				kid: {uuidArrayValidator: true}
			});
			if (!validationErrors) {
				try {
					await deleteFavorites(req.authToken.username, req.body.kid );
					emitWS('favoritesUpdated', req.authToken.username);
					res.status(200).json(APIMessage('FAVORITES_DELETED'));
				} catch(err) {
					const code = 'FAVORITES_DELETED_ERROR';
					errMessage(code, err)
					res.status(500).json(APIMessage(code));
				}
			}
		});
	router.route('/favorites/export')
	/**
 * @api {get} /favorites/export Export favorites
 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
 * @apiName getFavoritesExport
 * @apiVersion 3.1.0
 * @apiGroup Favorites
 * @apiPermission public
 * @apiSuccess {String} data Playlist in an exported format. See docs for more info.
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "favorites": {
 * 		<See admin/playlists/[id]/export object>
 *   }
 * }
 * @apiError FAVORITES_EXPORTED_ERROR Unable to export favorites
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "FAVORITES_EXPORTED_ERROR"
 * }
 */
		.get(getLang, requireAuth, requireValidUser, requireRegularUser, updateUserLoginTime, requireWebappLimited, async (req: any, res: any) => {
			// Returns the playlist and its contents in an exportable format (to save on disk)
			try {
				const favorites = await exportFavorites(req.authToken.username);
				res.json(favorites);
			} catch(err) {
				const code = 'FAVORITES_EXPORTED_ERROR';
				errMessage(code, err)
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/favorites/import')
	/**
 * @api {post} /favorites/import Import favorites
 * @apiName postFavoritesImport
 * @apiVersion 3.1.0
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
 * "FAVORITES_IMPORTED_ERROR"
 */
		.post(getLang, requireAuth, requireValidUser, requireRegularUser,updateUserLoginTime, requireWebappLimited, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				favorites: {isJSON: true}
			});
			if (!validationErrors) {
				try {
					await importFavorites(JSON.parse(req.body.favorites), req.authToken.username);
					emitWS('favoritesUpdated', req.authToken.username);
					res.status(200).json(APIMessage('FAVORITES_IMPORTED'));
				} catch(err) {
					const code = 'FAVORITES_IMPORTED_ERROR';
					errMessage(code, err)
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
}