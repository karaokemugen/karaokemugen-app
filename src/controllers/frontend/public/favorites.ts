import { Router } from "express";
import { errMessage, OKMessage } from "../../common";
import { importFavorites, exportFavorites, deleteFavorites, addToFavorites, getFavorites } from "../../../services/favorites";
import { check } from "../../../lib/utils/validators";
import { requireWebappLimited } from "../../middlewares/webapp_mode";
import { updateUserLoginTime, requireAuth, requireValidUser, requireRegularUser } from "../../middlewares/auth";
import { getLang } from "../../middlewares/lang";
import { emitWS } from "../../../lib/utils/ws";

export default function publicFavoritesController(router: Router) {
	router.route('/public/favorites')
	/**
 * @api {get} /public/favorites View own favorites
 * @apiName GetFavorites
 * @apiVersion 3.0.0
 * @apiGroup Favorites
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
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
 *   }
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
				res.json(OKMessage(karas));
			} catch(err) {
				res.status(500).json(errMessage('FAVORITES_VIEW_ERROR',err));
			}
		})
	/**
 * @api {post} /public/favorites Add karaoke to your favorites
 * @apiName PostFavorites
 * @apiVersion 2.5.0
 * @apiGroup Favorites
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} kid kara ID to add
 * @apiSuccess {Number} args/kid ID of kara added
 * @apiSuccess {Number} args/kara Name of kara added
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 * 		 "kara": "Les Nuls - MV - Vous me subirez",
 *       "kid": "uuid"
 *   },
 *   "code": "FAVORITES_ADDED",
 *   "data": null
 * }
 * @apiError FAVORITES_ADD_SONG_ERROR Unable to add songs to the playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": null,
 *   "code": "FAVORITES_ADD_SONG_ERROR",
 *   "message": "Karaoke unknown"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.post(getLang, requireAuth, requireWebappLimited, requireValidUser, requireRegularUser, updateUserLoginTime, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				kid: {uuidArrayValidator: true}
			});
			if (!validationErrors) {
				try {
					const data = await addToFavorites(req.authToken.username, [req.body.kid]);
					emitWS('favoritesUpdated', req.authToken.username);
					res.json(OKMessage(null,'FAVORITES_ADDED',data));
				} catch(err) {
					res.status(500).json(errMessage('FAVORITES_ADD_SONG_ERROR',err.message,err.data));
				}

			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		})


	/**
 * @api {delete} /public/favorites/ Delete karaoke from your favorites
 * @apiName DeleteFavorites
 * @apiVersion 2.5.0
 * @apiGroup Favorites
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} kid Kara ID to delete
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "playlist_id": 1
 *   },
 *   "code": "FAVORITES_DELETED",
 *   "data": null
 * }
 * @apiError FAVORITES_DELETE_ERROR Unable to delete the favorited song
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "FAVORITES_DELETE_ERROR",
 *   "message": "Kara ID unknown"
 * }
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
					const data = await deleteFavorites(req.authToken.username, [req.body.kid] );
					emitWS('favoritesUpdated', req.authToken.username);
					res.json(OKMessage(null, 'FAVORITES_DELETED', data));
				} catch(err) {
					res.status(500).json(errMessage('FAVORITES_DELETE_ERROR', err.message, err.data));
				}
			}

		});
	router.route('/public/favorites/export')
	/**
 * @api {get} /public/favorites/export Export favorites
 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
 * @apiName getFavoritesExport
 * @apiVersion 2.5.0
 * @apiGroup Favorites
 * @apiPermission public
 * @apiSuccess {String} data Playlist in an exported format. See docs for more info.
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 * 		<See admin/playlists/[id]/export object>
 *   }
 * }
 * @apiError FAVORITES_EXPORT_ERROR Unable to export favorites
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "FAVORITES_EXPORT_ERROR"
 * }
 */
		.get(getLang, requireAuth, requireValidUser, requireRegularUser, updateUserLoginTime, requireWebappLimited, async (req: any, res: any) => {
			// Returns the playlist and its contents in an exportable format (to save on disk)
			try {
				const favorites = await exportFavorites(req.authToken.username);
				res.json(OKMessage(favorites));
			} catch(err) {
				res.status(500).json(errMessage('FAVORITES_EXPORT_ERROR',err.message,err.data));
			}
		});
	router.route('/public/favorites/import')
	/**
 * @api {post} /public/favorites/import Import favorites
 * @apiName postFavoritesImport
 * @apiVersion 2.5.0
 * @apiGroup Favorites
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {String} favoritesFile Favorites file in JSON form, following Karaoke Mugen's file format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "FAVORITES_IMPORTED",
 *   "data": {
 *       "message": "Favorites imported",
 *       "unknownKaras": []
 *   }
 * }
 * @apiError FAVORITES_IMPORT_ERROR Unable to import playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "FAVORITES_IMPORT_ERROR",
 *   "message": "No header section"
 * }
 */
		.post(getLang, requireAuth, requireValidUser, requireRegularUser,updateUserLoginTime, requireWebappLimited, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				favorites: {isJSON: true}
			});
			if (!validationErrors) {
				try {
					const data = await importFavorites(JSON.parse(req.body.favorites), req.authToken.username);
					const response = {
						message: 'Favorites imported',
						unknownKaras: undefined
					};
					if (data.karasUnknown && data.karasUnknown.length > 0) response.unknownKaras = data.karasUnknown;
					emitWS('favoritesUpdated', req.authToken.username);
					res.json(OKMessage(response,'FAVORITES_IMPORTED'));
				} catch(err) {
					res.status(500).json(errMessage('FAVORITES_IMPORT_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}

		});

}