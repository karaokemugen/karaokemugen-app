import { Router } from "express";
import { errMessage, OKMessage } from "../../common";
import { getKaraFromPlaylist, getPlaylistContents, getPlaylistInfo, getPlaylists } from "../../../services/playlist";
import { updateUserLoginTime, requireValidUser, requireAuth } from "../../middlewares/auth";
import { getLang } from "../../middlewares/lang";
import { requireWebappLimited } from "../../middlewares/webapp_mode";

export default function publicPlaylistsController(router: Router) {
	router.route('/public/playlists')
	/**
 * @api {get} /public/playlists/ Get list of playlists (public)
 * @apiName GetPlaylistsPublic
 * @apiGroup Playlists
 * @apiVersion 2.5.0
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiSuccess {Object[]} playlists Playlists information
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 * {
 *   "data": [
 * 			<See admin/playlists/[id]>
 *   ]
 * }
 * @apiError PL_LIST_ERROR Unable to fetch a list of playlists
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			// Get list of playlists, only return the visible ones
			try {
				const playlists = await getPlaylists(req.authToken);
				res.json(OKMessage(playlists));
			} catch(err) {
				res.status(500).json(errMessage('PL_LIST_ERROR',err));
			}
		});
	router.route('/public/playlists/:pl_id([0-9]+)')
	/**
 * @api {get} /public/playlists/:pl_id Get playlist information (public)
 * @apiName GetPlaylistPublic
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 2.5.0
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `false`.
 * @apiParam {Number} pl_id Target playlist ID.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 * 		<See admin/playlists/[id] object>
 *   }
 * }
 * @apiError PL_VIEW_ERROR Unable to fetch info from a playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			// Get playlist, only if visible
			//Access :pl_id by req.params.pl_id
			// This get route gets infos from a playlist
			try {
				const playlist = await getPlaylistInfo(req.params.pl_id,req.authToken);
				res.json(OKMessage(playlist));
			} catch(err) {
				res.status(500).json(errMessage('PL_VIEW_ERROR',err.message,err.data));
			}
		});
	router.route('/public/playlists/:pl_id([0-9]+)/karas')
	/**
 * @api {get} /public/playlists/:pl_id/karas Get list of karaokes in a playlist (public)
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.5.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `false`.
 * @apiParam {Number} pl_id Target playlist ID.
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
 * 				<See admin/playlists/[id]/karas/[kara_id] object>
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			// Get playlist contents, only if visible
			//Access :pl_id by req.params.pl_id
			try {
				const playlist = await getPlaylistContents(req.params.pl_id,req.authToken, req.query.filter,req.lang,+req.query.from || 0,+req.query.size || 9999999);
				if (!playlist) res.statusCode = 404;
				res.json(OKMessage(playlist));
			} catch(err) {
				res.status(500).json(errMessage('PL_VIEW_SONGS_ERROR',err.message,err.data));
			}
		});

	router.route('/public/playlists/:pl_id([0-9]+)/karas/:plc_id([0-9]+)')
	/**
 * @api {get} /public/playlists/:pl_id/karas/:plc_id Get song info from a playlist (public)
 * @apiName GetPlaylistPLCPublic
 * @apiVersion 2.3.1
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `admin/playlists` path, this one won't return any karaoke info from a playlist the user has no access to.
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiSuccess {Object[]} data Array with one playlist content object
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *            <See admin/playlists/[id]/karas/[plc_id] object>
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const kara = await getKaraFromPlaylist(req.params.plc_id,req.lang,req.authToken);
				res.json(OKMessage(kara));
			} catch(err) {
				res.status(500).json(errMessage('PL_VIEW_CONTENT_ERROR',err.message,err.data));
			}
		});
}