import { Router } from "express";
import { errMessage, OKMessage } from "../../common";
import { getKaraFromPlaylist, getPlaylistContents, getPlaylistInfo, getPlaylists, deleteKaraFromPlaylist } from "../../../services/playlist";
import { updateUserLoginTime, requireValidUser, requireAuth } from "../../middlewares/auth";
import { getLang } from "../../middlewares/lang";
import { requireWebappLimited } from "../../middlewares/webapp_mode";
import { getState } from "../../../utils/state";
import { emitWS } from "../../../lib/utils/ws";
import { vote } from "../../../services/upvote";

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
 * @apiVersion 3.0.0
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
 * 				<See admin/playlists/[id]/karas/[kara_id] object without i18n in tags>
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
 * @apiVersion 3.0.0
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

		.get(requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const kara = await getKaraFromPlaylist(req.params.plc_id, req.authToken);
				res.json(OKMessage(kara));
			} catch(err) {
				res.status(500).json(errMessage('PL_VIEW_CONTENT_ERROR',err.message,err.data));
			}
		});
		router.route('/public/playlists/current/karas')
		/**
	 * @api {get} /public/playlists/current/karas Get list of karaokes in the current playlist
	 * @apiName GetPlaylistKarasCurrent
	 * @apiVersion 3.0.0
	 * @apiGroup Playlists
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
	 *
	 * @apiSuccess {Object[]} data/content/karas Array of `playlistcontent` objects
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
	 *                <See admin/playlists/[id]/karas/[plc_id] object without i18n in tags>
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
	 *           "count": 3,
	 * 			 "from": 0,
	 * 			 "to": 120
	 *       }
	 *   }
	 * }
	 * @apiError PL_VIEW_SONGS_CURRENT_ERROR Unable to fetch list of karaokes of current playlist
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */

			.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
				// Get current Playlist
				try {
					const playlist = await getPlaylistContents(getState().currentPlaylistID, req.authToken, req.query.filter, req.lang, +req.query.from || 0, +req.query.size || 999999);
					res.json(OKMessage(playlist));
				} catch(err) {
					res.statusCode = 500;
					res.json(errMessage('PL_VIEW_SONGS_CURRENT_ERROR',err));
				}
			});

		router.route('/public/playlists/public')
		/**
	 * @api {get} /public/playlists/public Get public playlist information
	 * @apiName GetPlaylistPublic
	 * @apiGroup Playlists
	 * @apiPermission public
	 * @apiVersion 2.5.0
	 * @apiHeader authorization Auth token received from logging in
	 * @apiDescription This route allows to check basic information about the public playlist, no matter which ID it has (and without you having to know it)
	 * @apiSuccess {Object} data Playlist object
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 * 		<See /admin/playlist/[id] object>
	 *   }
	 * }
	 * @apiError PL_VIEW_PUBLIC_ERROR Unable to fetch info from public playlist
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.

	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */

			.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
				// Get public Playlist
				try {
					const playlist = await getPlaylistInfo(getState().publicPlaylistID,req.authToken);
					res.json(OKMessage(playlist));
				} catch(err) {
					res.status(500).json(errMessage('PL_VIEW_PUBLIC_ERROR',err));
				}
			});

		router.route('/public/playlists/public/karas')
		/**
	 * @api {get} /public/playlists/public/karas Get list of karaokes in the public playlist
	 * @apiName GetPlaylistKarasPublic
	 * @apiVersion 3.0.0
	 * @apiGroup Playlists
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
	 *
	 * @apiSuccess {Object[]} data/content Array of `Playlist` objects
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 *       "content": [
	 *           {
	 * 				<See /admin/playlists/[id]/karas/[plc_id] object without i18n in tags>
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
	 * @apiError PL_VIEW_SONGS_PUBLIC_ERROR Unable to fetch list of karaokes of public playlist
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */
			.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
				// Get public Playlist
				try {
					const playlist = await getPlaylistContents(getState().publicPlaylistID, req.authToken, req.query.filter, req.lang, +req.query.from || 0, +req.query.size || 999999);
					res.json(OKMessage(playlist));
				} catch(err) {
					res.status(500).json(errMessage('PL_VIEW_SONGS_CURRENT_ERROR',err));
				}
			});
		router.route('/public/playlists/public/karas/:plc_id([0-9]+)/vote')
		/**
		 * @api {post} /public/playlists/public/karas/:plc_id/vote Up/downvote a song in public playlist
		 * @apiName PostVote
		 * @apiVersion 2.3.0
		 * @apiGroup Playlists
		 * @apiPermission public
		 * @apiHeader authorization Auth token received from logging in
		 * @apiParam {Number} plc_id Target playlist content ID
		 * @apiParam {String} [downvote] If anything is specified in this parameter, it'll be a downvote instead of upvote.
		 * @apiSuccess {String} code Return code
		 * @apiSuccess {String} args Name of song being upvoted
		 * @apiSuccessExample Success-Response:
		 * HTTP/1.1 200 OK
		 * {
		 *   "code": 'UPVOTE_DONE',
		 *   "args": 'Shoujo Kakumei Utena - Rinbu Revolution'
		 * }
		 * @apiError UPVOTE_FAILED Unable to upvote karaoke
		 * @apiError DOWNVOTE_FAILED Unable to downvote karaoke
		 * @apiError UPVOTE_ALREADY_DONE Karaoke has already been upvoted by this user
		 * @apiError DOWNVOTE_ALREADY_DONE Karaoke has already been downvoted by this user
		 * @apiError UPVOTE_NO_SELF User can not upvote own karaoke
		 * @apiError DOWNVOTE_NO_SELF User can not downvote own karaoke
		 * @apiErrorExample Error-Response:
		 * HTTP/1.1 500 Internal Server Error
		 */

			.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
				// Post an upvote
				try {
					const kara = await vote(req.params.plc_id,req.authToken.username,req.body.downvote);
					emitWS('playlistContentsUpdated', kara.playlist_id);
					res.json(OKMessage(null, kara.code, kara));

				} catch(err) {
					res.status(500).json(errMessage(err.code,err.message));
				}
			});
		router.route('/public/playlists/public/karas/:plc_id([0-9]+)')
		/**
		 * @api {delete} /public/playlists/public/karas/:plc_id Delete song from public playlist
		 * @apiName DeletePublicSong
		 * @apiVersion 2.2.0
		 * @apiGroup Playlists
		 * @apiPermission public
		 * @apiHeader authorization Auth token received from logging in
		 * @apiParam {Number} plc_id Target playlist content ID
		 * @apiSuccess {String} args Name of playlist the song was deleted from
		  * @apiSuccess {String} code Message to display
		  *
		  * @apiSuccessExample Success-Response:
		  * HTTP/1.1 200 OK
		  * {
		  *   "args": "Liste de lecture publique",
		  *   "code": "PL_SONG_DELETED",
		  *   "data": null
		  * }
		  * @apiError PL_DELETE_SONG_ERROR Unable to delete the song from the selected playlist
		  *
		  * @apiErrorExample Error-Response:
		  * HTTP/1.1 500 Internal Server Error
		  * {
		  *   "args": "Liste de lecture publique",
		  *   "code": "PL_DELETE_SONG_ERROR",
		  *   "message": "[PLC] GetPLContentInfo : PLCID 4960 unknown"
		  * }
		  */

			.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
				try {
					const data = await deleteKaraFromPlaylist([req.params.plc_id], null, req.authToken);
					emitWS('playlistContentsUpdated', data.pl_id);
					emitWS('playlistInfoUpdated', data.pl_id);
					res.json(OKMessage(null, 'PL_SONG_DELETED', data.pl_name));
				} catch(err) {
					res.status(500).json(errMessage('PL_DELETE_SONG_ERROR',err.message,err.data));
				}
			});
		router.route('/public/playlists/current/karas/:plc_id([0-9]+)')
		/**
		 * @api {delete} /public/playlists/current/karas/:plc_id Delete song from current playlist
		 * @apiName DeleteCurrentSong
		 * @apiVersion 2.2.0
		 * @apiGroup Playlists
		 * @apiPermission public
		 * @apiHeader authorization Auth token received from logging in
		 * @apiParam {Number} plc_id Target playlist content ID
		 * @apiSuccess {String} args Name of playlist the song was deleted from
		  * @apiSuccess {String} code Message to display
		  *
		  * @apiSuccessExample Success-Response:
		  * HTTP/1.1 200 OK
		  * {
		  *   "args": "Liste de lecture publique",
		  *   "code": "PL_SONG_DELETED",
		  *   "data": null
		  * }
		  * @apiError PL_DELETE_SONG_ERROR Unable to delete the song from the selected playlist
		  *
		  * @apiErrorExample Error-Response:
		  * HTTP/1.1 500 Internal Server Error
		  * {
		  *   "args": "Liste de lecture publique",
		  *   "code": "PL_DELETE_SONG_ERROR",
		  *   "message": "[PLC] GetPLContentInfo : PLCID 4960 unknown"
		  * }
		  */

			.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
				try {
					const data = await deleteKaraFromPlaylist([req.params.plc_id], null, req.authToken);
					emitWS('playlistContentsUpdated', data.pl_id);
					emitWS('playlistInfoUpdated', data.pl_id);
					res.json(OKMessage(null, 'PL_SONG_DELETED', data.pl_name));
				} catch(err) {
					res.status(500).json(errMessage('PL_DELETE_SONG_ERROR', err.message, err.data));
				}
			});
	router.route('/public/playlists/current')
		/**
	 * @api {get} /public/playlists/current Get current playlist information
	 * @apiName GetPlaylistCurrent
	 * @apiGroup Playlists
	 * @apiPermission public
	 * @apiVersion 2.5.0
	 * @apiHeader authorization Auth token received from logging in
	 * @apiDescription This route allows to check basic information about the current playlist, no matter which ID it has (and without you having to know it)
	 * @apiSuccess {Object} Playlist object of the current playlist
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 *      <See admin/playlist/[id] object>
	 *   }
	 *}
	 * @apiError PL_VIEW_CURRENT_ERROR Unable to fetch info from current playlist
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */
			.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
				// Get current Playlist
				try {
					const playlist = await getPlaylistInfo(getState().currentPlaylistID, req.authToken);
					res.json(OKMessage(playlist));
				} catch(err) {
					res.status(500).json(errMessage('PL_VIEW_CURRENT_ERROR',err));
				}
			});
			router.route('/public/playlists/current')
			/**
		 * @api {get} /public/playlists/current Get current playlist information
		 * @apiName GetPlaylistCurrent
		 * @apiGroup Playlists
		 * @apiPermission public
		 * @apiVersion 2.5.0
		 * @apiHeader authorization Auth token received from logging in
		 * @apiDescription This route allows to check basic information about the current playlist, no matter which ID it has (and without you having to know it)
		 * @apiSuccess {Object} Playlist object of the current playlist
		 *
		 * @apiSuccessExample Success-Response:
		 * HTTP/1.1 200 OK
		 * {
		 *   "data": {
		 *      <See admin/playlist/[id] object>
		 *   }
		 *}
		 * @apiError PL_VIEW_CURRENT_ERROR Unable to fetch info from current playlist
		 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
		 * @apiErrorExample Error-Response:
		 * HTTP/1.1 500 Internal Server Error
		 * @apiErrorExample Error-Response:
		 * HTTP/1.1 403 Forbidden
		 */
				.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
					// Get current Playlist
					try {
						const playlist = await getPlaylistInfo(getState().currentPlaylistID, req.authToken);
						res.json(OKMessage(playlist));
					} catch(err) {
						res.status(500).json(errMessage('PL_VIEW_CURRENT_ERROR',err));
					}
				});

}