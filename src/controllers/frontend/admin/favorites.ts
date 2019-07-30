import { Router } from "express";
import { errMessage, OKMessage } from "../../common";
import { emitWS } from "../../../lib/utils/ws";
import { createAutoMix, deleteFavorites, addToFavorites, getFavorites } from "../../../services/favorites";
import { check } from "../../../lib/utils/validators";
import { updateUserLoginTime, requireAdmin, requireValidUser, requireAuth } from "../../middlewares/auth";
import { getLang } from "../../middlewares/lang";

export default function adminFavoritesController(router: Router) {

	router.route('/admin/automix')
	/**
 * @api {post} /admin/automix Generate a automix playlist
 * @apiName PostMix
 * @apiGroup Favorites
 * @apiVersion 2.1.0
 * @apiPermission admin
 *
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} users Comma-separated list of usernames to pick favorites from
 * @apiParam {Number} duration Duration wished for the generatedplaylist in minutes
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data/playlist_id ID of playlist created
 * @apiSuccess {String} data/playlist_name Name of playlist created
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 201 OK
 * {
 *   "code": "AUTOMIX_CREATED",
 *   "data": {
 *           "playlist_id": 12,
 *           "playlist_name": 'Soirée Kara 07/10/2018'
 *   }
 * }
 * @apiError AUTOMIX_ERROR Unable to create the automix playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "AUTOMIX_ERROR",
 *   "message": "User axel does not exist."
 * }
 */

		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				users: {presence: {allowEmpty: false}},
				duration: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}}
			});
			if (!validationErrors) {
				// No errors detected
				try {
					const new_playlist = await createAutoMix({
						duration: +req.body.duration,
						users: req.body.users.split(',')
					}, req.authToken.username);
					emitWS('playlistsUpdated');
					res.status(201).json(OKMessage(new_playlist,'AUTOMIX_CREATED',null));
				} catch(err) {
					res.status(500).json(errMessage('AUTOMIX_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
		router.route('/admin/favorites/:username')
		/**
	 * @api {get} /admin/favorites Get favorites of any user (as admin)
	 * @apiName GetFavoritesAdmin
	 * @apiVersion 3.0.0
	 * @apiGroup Favorites
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 *
	 * @apiParam {String} username Username favorites
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
	 * @apiSuccess {String} code Message to display
	 * @apiSuccess {Object[]} data/content List of karaoke objects
	 * @apiSuccess {Number} data/infos/count Number of items in favorites no matter which range was requested
	 * @apiSuccess {Number} data/infos/from Items listed are from this position
	 * @apiSuccess {Number} data/infos/size How many items listed.
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 *       "content": [
	 *           {
	 * 				<see Kara object without i18n in tags>,
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
	 * @apiError FAV_VIEW_ERROR Favorites could not be viewed
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "FAV_VIEW_ERROR"
	 * }
	 */
			.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				try {
					const karas = await getFavorites({
						username: req.params.username,
						filter: req.query.filter,
						lang: req.lang,
						from: +req.query.from || 0,
						size: req.query.size || 99999999
					});
					res.json(OKMessage(karas));
				} catch(err) {
					res.status(500).json(errMessage('WL_VIEW_ERROR', err));
				}
			})
		/**
	* @api {post} /admin/favorites/:username Add song to a user's favorites (as admin)
	* @apiName PostFavoritesAdmin
	* @apiVersion 2.5.0
	* @apiGroup Favorites
	* @apiPermission admin
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {String} username Username to add favorites to
	* @apiParam {uuid[]} kid Karaoke song IDs, separated by commas
	* @apiParam {String} [reason] Reason the song was added
	* @apiSuccess {Number} args Arguments associated with message
	* @apiSuccess {Number} code Message to display
	* @apiSuccess {uuid[]} data/kid List of karaoke IDs separated by commas
	*
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 201 Created
	* {
	*   "args": "2",
	*   "code": "FAV_SONG_ADDED",
	*   "data": [
	*       "kid"
	*   ]
	* }
	* @apiError FAV_ADD_SONG_ERROR Karaoke couldn't be added to favorites
	*
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* {
	*   "args": [
	*       "2"
	*   ],
	*   "code": "FAV_ADD_SONG_ERROR",
	*   "message": null
	* }
	*/
			.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				const validationErrors = check(req.body, {
					kid: {uuidArrayValidator: true}
				});
				if (!validationErrors) {
					try {
						await addToFavorites(req.params.username, req.body.kid.split(','));
						emitWS('favoritesUpdated', req.params.username);
						res.status(201).json(OKMessage(req.body, 'FAV_SONG_ADDED', req.body.kid));
					} catch(err) {
						res.status(500).json(errMessage('FAV_ADD_SONG_ERROR', err.message, err.data));
					}
				} else {
					// Errors detected
					// Sending BAD REQUEST HTTP code and error object.
					res.status(400).json(validationErrors);
				}
			})
		/**
	* @api {delete} /admin/favorites/:username Delete favorite items (as admin)
	* @apiName DeleteFavoritesAdmin
	* @apiVersion 3.0.0
	* @apiGroup Favorites
	* @apiPermission admin
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {uuid[]} kid Karaoke IDs to delete from favorites, separated by commas
	* @apiSuccess {Number} args Arguments associated with message
	* @apiSuccess {Number} code Message to display
	* @apiSuccess {uuid[]} data List of favorites KIDs separated by commas
	*
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*   "args": "1",
	*   "code": "FAV_SONG_DELETED",
	*   "data": "uuid"
	* }
	* @apiError FAV_SONG_DELETE_ERROR Favorites item could not be deleted.
	*
	*/
			.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			//Delete kara from whitelist
			// Deletion is through whitelist ID.
				const validationErrors = check(req.body, {
					kid: {uuidArrayValidator: true}
				});
				if (!validationErrors) {
					try {
						await deleteFavorites(req.params.username,  req.body.kid.split(','));
						emitWS('favoritesUpdated', req.params.username);
						res.json(OKMessage(req.body.kid,'FAV_SONG_DELETED',req.body.kid));
					} catch(err) {
						res.status(500).json(errMessage('FAV_SONG_DELETE_ERROR',err));
					}
				} else {
					// Errors detected
					// Sending BAD REQUEST HTTP code and error object.
					res.status(400).json(validationErrors);
				}
			});
}