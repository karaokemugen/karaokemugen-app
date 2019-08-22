import { Router } from "express";
import { errMessage, OKMessage } from "../../common";
import { requireAdmin, updateUserLoginTime, requireAuth, requireValidUser } from "../../middlewares/auth";
import { getLang } from "../../middlewares/lang";
import { emitWS } from "../../../lib/utils/ws";
import { deletePlaylist, getPlaylists, editPlaylist, getPlaylistInfo, createPlaylist, emptyPlaylist, editPLC, getKaraFromPlaylist, deleteKaraFromPlaylist, copyKaraToPlaylist, addKaraToPlaylist, getPlaylistContents, setCurrentPlaylist, setPublicPlaylist, shufflePlaylist, importPlaylist, exportPlaylist } from "../../../services/playlist";
import { check } from "../../../lib/utils/validators";
import { bools } from "../../../lib/utils/constants";

export default function adminPlaylistsController(router: Router) {
	router.route('/admin/playlists')
	/**
 * @api {get} /admin/playlists/ Get list of playlists
 * @apiName GetPlaylists
 * @apiGroup Playlists
 * @apiVersion 2.5.0
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiSuccess {Object[]} playlists Playlists information
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *             <see /admin/playlist/[id] route>
 *       }
 *   ]
 * }
 * @apiError PL_LIST_ERROR Unable to fetch a list of playlists
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			// Get list of playlists
			try {
				const playlists = await getPlaylists(req.authToken);
				res.json(OKMessage(playlists));
			} catch(err) {
				res.status(500).json(errMessage('PL_LIST_ERROR',err));
			}
		})
	/**
 * @api {post} /admin/playlists/ Create a playlist
 * @apiName PostPlaylist
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} name Name of playlist to create
 * @apiParam {Boolean} flag_public Is the playlist to create public? This unsets `flag_public` on the previous playlist which had it.
 * @apiParam {Boolean} flag_current Is the playlist to create current? This unsets `flag_current` on the previous playlist which had it.
 * @apiParam {Boolean} flag_visible Is the playlist to create visible to all users? If `false`, only admins can see it.
 *
 * @apiSuccess {String} args Name of playlist created
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of newly created playlist
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 Created
 * {
 *   "args": "lol",
 *   "code": "PL_CREATED",
 *   "data": 4
 * }
 * @apiError PL_CREATE_ERROR Unable to create a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			// Add playlist
			const validationErrors = check(req.body, {
				name: {presence: {allowEmpty: false}},
				flag_visible: {inclusion: bools},
				flag_public: {inclusion: bools},
				flag_current: {inclusion: bools}
			});
			if (!validationErrors) {
				// No errors detected
				req.body.name = unescape(req.body.name.trim());

				//Now we add playlist
				try {
					const new_playlist = await createPlaylist(req.body.name, {
						visible: req.body.flag_visible,
						current: req.body.flag_current,
						public: req.body.flag_public
					}, req.authToken.username);
					emitWS('playlistsUpdated');
					res.status(201).json(OKMessage(new_playlist,'PL_CREATED',req.body.name));
				} catch(err) {
					res.status(500).json(errMessage('PL_CREATE_ERROR',err,req.body.name));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}

		});

	router.route('/admin/playlists/:pl_id([0-9]+)')
	/**
 * @api {get} /admin/playlists/:pl_id Get playlist information
 * @apiName GetPlaylist
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiVersion 2.5.0
 *
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {Number} data/created_at Playlist creation date in `Date()` format
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/duration Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in `Date()` format
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/karacount Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": "2019-01-01T13:34:01.000Z",
 *       "flag_current": true,
 *       "flag_public": false,
 *       "flag_visible": true,
 *       "duration": 0,
 *       "modified_at": "2019-01-01T13:34:01.000Z",
 *       "name": "Liste de lecture courante",
 *       "karacount": 6,
 *       "playlist_id": 1,
 *       "time_left": 0
 *   }
 *}
 * @apiError PL_VIEW_ERROR Unable to fetch info from a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			//Access :pl_id by req.params.pl_id
			// This get route gets infos from a playlist
			try {
				const playlist = await getPlaylistInfo(req.params.pl_id, req.authToken);
				res.json(OKMessage(playlist));
			} catch (err) {

				res.status(500).json(errMessage('PL_VIEW_ERROR',err.message,err.data));

			}
		})
	/**
 * @api {put} /admin/playlists/:pl_id Update a playlist's information
 * @apiName PutPlaylist
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} name Name of playlist to create
 * @apiParam {Boolean} flag_visible Is the playlist to create visible to all users? If `false`, only admins can see it.
 *
 * @apiSuccess {String} args ID of playlist updated
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of playlist updated
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 1,
 *   "code": "PL_UPDATED",
 *   "data": 1
 * }
 * @apiError PL_UPDATE_ERROR Unable to update a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			// Update playlist info
			const validationErrors = check(req.body, {
				name: {presence: {allowEmpty: false}},
				flag_visible: {inclusion: bools},
			});
			if (!validationErrors) {
				// No errors detected
				req.body.name = unescape(req.body.name.trim());

				//Now we add playlist
				try {
					await editPlaylist(req.params.pl_id,req.body);
					emitWS('playlistInfoUpdated',req.params.pl_id);
					res.json(OKMessage(req.params.pl_id,'PL_UPDATED',req.params.pl_id));
				} catch(err) {
					res.status(500).json(errMessage('PL_UPDATE_ERROR',err.message,err.data));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		})

	/**
 * @api {delete} /admin/playlists/:pl_id Delete a playlist
 * @apiName DeletePlaylist
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {String} args ID of playlist deleted
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of playlist deleted
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 3,
 *   "code": "PL_DELETED",
 *   "data": 3
 * }
 * @apiError PL_DELETE_ERROR Unable to delete a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			try {
				await deletePlaylist(req.params.pl_id);
				emitWS('playlistsUpdated');
				res.json(OKMessage(req.params.pl_id,'PL_DELETED',req.params.pl_id));
			} catch(err) {
				res.status(500).json(errMessage('PL_DELETE_ERROR',err.message,err.data));
			}
		});
	router.route('/admin/playlists/:pl_id([0-9]+)/empty')
	/**
 * @api {put} /admin/playlists/:pl_id/empty Empty a playlist
 * @apiName PutEmptyPlaylist
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {String} args ID of playlist emptied
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of playlist emptied
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 1,
 *   "code": "PL_EMPTIED",
 *   "data": 1
 * }
 * @apiError PL_EMPTY_ERROR Unable to empty a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
		// Empty playlist
			try {
				await emptyPlaylist(req.params.pl_id);
				emitWS('playlistContentsUpdated',req.params.pl_id);
				res.json(OKMessage(req.params.pl_id,'PL_EMPTIED',req.params.pl_id));
			} catch(err) {
				res.status(500).json(errMessage('PL_EMPTY_ERROR',err.message,err.data));
				res.json(err);
			}
		});
		router.route('/admin/playlists/:pl_id([0-9]+)/setCurrent')
		/**
	 * @api {put} /admin/playlists/:pl_id/setCurrent Set playlist to current
	 * @apiName PutSetCurrentPlaylist
	 * @apiVersion 2.1.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiSuccess {String} args ID of playlist updated
	 * @apiSuccess {String} code Message to display
	 * @apiSuccess {Number} data `null`
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "args": 1,
	 *   "code": "PL_SET_CURRENT",
	 *   "data": null
	 * }
	 * @apiError PL_SET_CURRENT_ERROR Unable to set this playlist to current. The playlist is a public one and can't be set to current at the same time. First set another playlist as public so this playlist has no flags anymore and can be set current.
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
			.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				// set playlist to current
				try {
					await setCurrentPlaylist(req.params.pl_id);
					emitWS('playlistInfoUpdated',req.params.pl_id);
					res.json(OKMessage(null,'PL_SET_CURRENT',req.params.pl_id));

				} catch(err) {
					res.status(500).json(errMessage(err.message ? 'PL_SET_CURRENT_ERROR' : err,err.message,err.data));
				}
			});
		router.route('/admin/playlists/:pl_id([0-9]+)/setPublic')
		/**
	 * @api {put} /admin/playlists/:pl_id/setPublic Set playlist to public
	 * @apiName PutSetPublicPlaylist
	 * @apiVersion 2.1.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiSuccess {String} args ID of playlist updated
	 * @apiSuccess {String} code Message to display
	 * @apiSuccess {Number} data `null`
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "args": 1,
	 *   "code": "PL_SET_PUBLIC",
	 *   "data": null
	 * }
	 * @apiError PL_SET_PUBLIC_ERROR Unable to set this playlist to public. The playlist is a current one and can't be set to public at the same time. First set another playlist as current so this playlist has no flags anymore and can be set public.
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
			.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				// Empty playlist
				try {
					await setPublicPlaylist(req.params.pl_id);
					emitWS('playlistInfoUpdated',req.params.pl_id);
					res.json(OKMessage(null,'PL_SET_PUBLIC',req.params.pl_id));
				} catch(err) {
					res.status(500).json(errMessage(err.message ? 'PL_SET_PUBLIC_ERROR' : err,err.message,err.data));
				}
			});
		router.route('/admin/playlists/:pl_id([0-9]+)/karas')
		/**
	 * @api {get} /admin/playlists/:pl_id/karas Get list of karaokes in a playlist
	 * @apiName GetPlaylistKaras
	 * @apiVersion 3.0.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
	 * @apiParam {Number} [random=0] Return a [random] number of karaokes from that playlist.
	 *
	 * @apiSuccess {Object[]} data/content/plc Array of `playlistcontent` objects
	 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
	 * @apiSuccess {Number} data/infos/from Starting position of listing
	 * @apiSuccess {Number} data/infos/to End position of listing
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 *       "content": [
	 *           <see admin/playlists/[id]/karas/[plc_id] for example without i18n tag data>
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
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
			.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				try {
					const playlist = await getPlaylistContents(req.params.pl_id,req.authToken, req.query.filter,req.lang, +req.query.from || 0, +req.query.size || 9999999, +req.query.random || 0);
					res.json(OKMessage(playlist));
				} catch(err) {
					res.status(500).json(errMessage('PL_VIEW_SONGS_ERROR',err.message,err.data));
				}
			})
		/**
	 * @api {post} /admin/playlists/:pl_id/karas Add karaokes to playlist
	 * @apiName PatchPlaylistKaras
	 * @apiVersion 2.5.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {uuid[]} kid List of `kid` separated by commas (`,`).
	 * @apiParam {Number} [pos] Position in target playlist where to copy the karaoke to. If not specified, will place karaokes at the end of target playlist. `-1` adds karaokes after the currently playing song in target playlist.
	 * @apiSuccess {String[]} args/plc_ids IDs of playlist contents copied
	 * @apiSuccess {String} args/playlist_id ID of destinaton playlist
	 * @apiSuccess {String} code Message to display
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "args": {
	 *       "playlist": 2,
	 *       "plc_ids": [
	 * 			"4946",
	 * 			"639"
	 * 		 ]
	 *   },
	 *   "code": "PL_SONG_MOVED",
	 *   "data": null
	 * }
	 * @apiError PL_ADD_SONG_ERROR Unable to add songs to the playlist
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "args": "Liste de lecture publique",
	 *   "code": "PL_ADD_SONG_ERROR",
	 *   "message": "No karaoke could be added, all are in destination playlist already (PLID : 2)"
	 * }
	 */
			.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				//add a kara to a playlist
				const validationErrors = check(req.body, {
					kid: {presence: true, uuidArrayValidator: true}
				});
				if (!validationErrors) {
					try {
						const result = await addKaraToPlaylist(req.body.kid, req.authToken.username, req.params.pl_id, +req.body.pos);
						emitWS('playlistInfoUpdated',req.params.pl_id);
						emitWS('playlistContentsUpdated',req.params.pl_id);
						res.statusCode = 201;
						const args = {
							playlist: result.playlist
						};
						res.json(OKMessage(null,'PL_SONG_ADDED',args));
					} catch(err) {
						res.status(500).json(errMessage('PL_ADD_SONG_ERROR',err.message,err.data));
					}
				} else {
					// Errors detected
					// Sending BAD REQUEST HTTP code and error object.
					res.status(400).json(validationErrors);
				}
			})
		/**
	 * @api {patch} /admin/playlists/:pl_id/karas Copy karaokes to another playlist
	 * @apiName PatchPlaylistKaras
	 * @apiVersion 2.1.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {Number[]} plc_id List of `playlistcontent_id` separated by commas (`,`). Example : `1021,2209,44,872`
	 * @apiParam {Number} [pos] Position in target playlist where to copy the karaoke to. If not specified, will place karaokes at the end of target playlist
	 * @apiSuccess {String[]} args/plc_ids IDs of playlist contents copied
	 * @apiSuccess {String} args/playlist_id ID of destinaton playlist
	 * @apiSuccess {String} code Message to display
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "args": {
	 *       "playlist": 2,
	 *       "plc_ids": [
	 * 			"4946",
	 * 			"639"
	 * 		 ]
	 *   },
	 *   "code": "PL_SONG_MOVED",
	 *   "data": null
	 * }
	 * @apiError PL_MOVE_SONG_ERROR Unable to copy karaoke song to the destination playlist
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "args": "Liste de lecture publique",
	 *   "code": "PL_MOVE_SONG_ERROR",
	 *   "message": "Karaoke song 176 is already in playlist 2"
	 * }
	 */
			.patch(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				//add karas from a playlist to another
				const validationErrors = check(req.body, {
					plc_id: {presence: true, numbersArrayValidator: true}
				});
				if (!validationErrors) {
					try {
						let plc_ids = [+req.body.plc_id];
						if (req.body.plc_id.includes(',')) {
							plc_ids = req.body.plc_id.split(',');
							plc_ids.forEach((e: string|number, i) => plc_ids[i] = +e)
						}
						const pl_id = await	copyKaraToPlaylist(plc_ids,req.params.pl_id,+req.body.pos);
						emitWS('playlistContentsUpdated', pl_id);
						res.statusCode = 201;
						const args = {
							plc_ids,
							playlist_id: +req.params.pl_id
						};
						res.json(OKMessage(null,'PL_SONG_MOVED',args));
					} catch(err) {
						res.status(500).json(errMessage('PL_MOVE_SONG_ERROR',err.message,err.data));
					}
				} else {
					// Errors detected
					// Sending BAD REQUEST HTTP code and error object.
					res.status(400).json(validationErrors);
				}

			})

		/**
	 * @api {delete} /admin/playlists/:pl_id/karas Delete karaokes from playlist
	 * @apiName DeletePlaylistKaras
	 * @apiVersion 2.1.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {Number[]} plc_id List of `plc_id` separated by commas (`,`). Example : `1021,2209,44,872`
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
			.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				// Delete kara from playlist
				// Deletion is through playlist content's ID.
				// There is actually no need for a playlist number to be used at this moment.
				const validationErrors = check(req.body, {
					plc_id: {presence: true, numbersArrayValidator: true}
				});
				if (!validationErrors) {
					try {
						let plc_ids = [+req.body.plc_id];
						if (req.body.plc_id.includes(',')) {
							plc_ids = req.body.plc_id.split(',');
							plc_ids.forEach((e: string|number, i) => plc_ids[i] = +e)
						}
						const data = await deleteKaraFromPlaylist(plc_ids,req.params.pl_id,req.authToken);
						emitWS('playlistContentsUpdated',data.pl_id);
						emitWS('playlistInfoUpdated',data.pl_id);
						res.json(OKMessage(null,'PL_SONG_DELETED',data.pl_name));
					} catch(err) {
						res.status(500).json(errMessage('PL_DELETE_SONG_ERROR',err.message,err.data));
					}
				} else {
					// Errors detected
					// Sending BAD REQUEST HTTP code and error object.
					res.status(400).json(validationErrors);
				}
			});

		router.route('/admin/playlists/:pl_id([0-9]+)/karas/:plc_id([0-9]+)')
		/**
	 * @api {get} /admin/playlists/:pl_id/karas/:plc_id Get song info from a playlist item
	 * @apiName GetPlaylistPLC
	 * @apiVersion 3.0.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
	 * @apiParam {Number} plc_id Playlist content ID.
	 * @apiSuccess {Object[]} data Array containing one playlist content object, which consists of a kara object + the following properties
	 * @apiSuccess {Number} data/kara_created_at In `Date()` format
	 * @apiSuccess {Number} data/created_at Karaoke added to playlist, in `Date()` format
	 * @apiSuccess {Number} data/kara_modified_at In `Date()` format
	 * @apiSuccess {Boolean} data/flag_blacklisted Is the song in the blacklist ?
	 * @apiSuccess {Boolean} data/flag_playing Is the song the one currently playing ?
	 * @apiSuccess {Boolean} data/flag_whitelisted Is the song in the whitelist ?
	 * @apiSuccess {Boolean} data/flag_free Wether the song has been marked as free or not
	 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
	 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
	 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
	 * @apiSuccess {String} data/nickname Nickname of user who added/requested the song. this nickname can be changed (`username` cannot) hence why it is displayed here.
	 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
	 * @apiSuccess {String} data/username Username who submitted this karaoke. Can be different from `nickname`.
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": [
	 *       {
	 * 			 <See public/karas/[kara_id] object>,
	 * 	         "created_at": "2019-01-01T10:01:01.000Z"
	 *           "flag_blacklisted": false,
	 *           "flag_free": false,
	 * 			 "flag_playing": true,
	 * 			 "flag_visible": true
	 *           "flag_whitelisted": false,
	 * 	         "kara_created_at": "2019-01-01T10:01:01.000Z"
	 * 	         "kara_modified_at": "2019-01-01T10:01:01.000Z"
	 *           "nickname": "Axel",
	 *           "playlist_id": 2,
	 *           "playlistcontent_id": 24,
	 *           "pos": 2,
	 *           "time_before_play": 134,
	 *           "username": "Axel"
	 *         },
	 *   ]
	 * }
	 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "PL_VIEW_CONTENT_ERROR",
	 *   "message": "PLCID unknown!"
	 * }
	 */
			.get(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				try {
					const kara = await getKaraFromPlaylist(req.params.plc_id,req.authToken);
					res.json(OKMessage(kara));
				} catch(err) {
					res.status(500).json(errMessage('PL_VIEW_CONTENT_ERROR',err));
				}
			})
		/**
	 * @api {put} /admin/playlists/:pl_id([0-9]+)/karas/:plc_id Update song in a playlist
	 * @apiName PutPlaylistKara
	 * @apiVersion 3.0.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Playlist ID. **Note :** Irrelevant since `plc_id` is unique already.
	 * @apiParam {Number} plc_id `playlistcontent_id` of the song to update
	 * @apiParam {Number} [pos] Position in target playlist where to move the song to.
	 * @apiParam {Boolean} [flag_playing] If set to true, the selected song will become the currently playing song.
	 * @apiParam {Boolean} [flag_free] If set to true, the selected song will be marked as free. Setting it to false has no effect.
	 * @apiParam {Boolean} [flag_visible] If set to false, the selected song will be made invisible to users (all entries will be replaced by "mystery song")
	 * @apiSuccess {String} code Message to display
	 * @apiSuccess {String} data PLCID modified
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "code": "PL_CONTENT_MODIFIED",
	 *   "data": "4962"
	 * }
	 * @apiError PL_MODIFY_CONTENT_ERROR Unable to modify content's position or playing status
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "PL_MODIFY_CONTENT_ERROR",
	 *   "message": "PLCID unknown!"
	 * }
	 */
			.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
				//Update playlist's karaoke song
				//Params: position

				const validationErrors = check(req.body, {
					flag_playing: {inclusion: bools},
					flag_free: {inclusion: bools},
					flag_visible: {inclusion: bools}
				});
				if (req.body.flag_playing === 'true') req.body.flag_playing = true;
				if (req.body.flag_free === 'true') req.body.flag_free = true;
				if (!validationErrors) {
					try {
						const data = await editPLC(req.params.plc_id,{
							pos: +req.body.pos,
							flag_playing: req.body.flag_playing,
							flag_free: req.body.flag_free,
							flag_visible: req.body.flag_visible
						},req.authToken);
						emitWS('playlistContentsUpdated',data.pl_id);
						emitWS('playlistInfoUpdated',data.pl_id);
						res.json(OKMessage(req.params.plc_id,'PL_CONTENT_MODIFIED'));
					} catch(err) {
						res.status(500).json(errMessage('PL_MODIFY_CONTENT_ERROR',err));
					}
				} else {
					// Errors detected
					// Sending BAD REQUEST HTTP code and error object.
					res.status(400).json(validationErrors);
				}

			});
	router.route('/admin/playlists/:pl_id([0-9]+)/export')
	/**
 * @api {get} /admin/playlists/:pl_id/export Export a playlist
 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
 * @apiName getPlaylistExport
 * @apiVersion 2.5.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Playlist ID to export
 * @apiSuccess {String} data Playlist in an exported format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "Header": {
 *           "description": "Karaoke Mugen Playlist File",
 *           "version": 4
 *       },
 *       "PlaylistContents": [
 *           {
 *               "flag_playing": true,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b"
 *           },
 *           {
 *               "kid": "6da96a7d-7159-4ea7-a5ee-1d78a6eb44dd"
 *           },
 *           {
 *               "kid": "5af7ba4c-2325-451d-a24f-e7fd7c2d3ba8"
 *           },
 *           {
 *               "kid": "e0206f48-0f51-44e3-bf9a-b651916d0c05"
 *           }
 *       ],
 *       "PlaylistInformation": {
 *           "created_at": "2019-01-01T02:01:11.000Z",
 *           "flag_visible": true,
 *           "modified_at": "2019-01-01T02:01:11.000Z",
 *           "name": "Test",
 *           "time_left": 0
 *       }
 *   }
 * }
 * @apiError PL_EXPORT_ERROR Unable to export playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "5",
 *   "code": "PL_EXPORT_ERROR",
 *   "message": "Playlist 5 unknown"
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			// Returns the playlist and its contents in an exportable format (to save on disk)
			try {
				const playlist = await exportPlaylist(req.params.pl_id);
				// Not sending JSON : we want to send a string containing our text, it's already in stringified JSON format.
				res.json(OKMessage(playlist));
			} catch(err) {
				res.status(500).json(errMessage('PL_EXPORT_ERROR',err.message,err.data));
			}
		});
	router.route('/admin/playlists/import')
	/**
 * @api {post} /admin/playlists/import Import a playlist
 * @apiName postPlaylistImport
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {String} playlist Playlist in JSON form, following Karaoke Mugen's file format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 4,
 *   "code": "PL_IMPORTED",
 *   "data": {
 *       "message": "Playlist imported",
 *       "playlist_id": 4,
 *       "unknownKaras": []
 *   }
 * }
 * @apiError PL_IMPORT_ERROR Unable to import playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_IMPORT_ERROR",
 *   "message": "No header section"
 * }
 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			// Imports a playlist and its contents in an importable format (posted as JSON data)
			const validationErrors = check(req.body, {
				playlist: {isJSON: true}
			});
			if (!validationErrors) {
				try {
					const data = await importPlaylist(JSON.parse(req.body.playlist), req.authToken.username);
					const response = {
						message: 'Playlist imported',
						playlist_id: data.playlist_id,
						unknownKaras: undefined
					};
					if (data.karasUnknown) response.unknownKaras = data.karasUnknown;
					emitWS('playlistsUpdated');
					res.json(OKMessage(response,'PL_IMPORTED',data.playlist_id));
				} catch(err) {
					res.status(500).json(errMessage('PL_IMPORT_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}

		});


	router.route('/admin/playlists/:pl_id([0-9]+)/shuffle')
	/**
 * @api {put} /admin/playlists/:pl_id/shuffle Shuffle a playlist
 * @apiDescription Playlist is shuffled in database. The shuffling only begins after the currently playing song. Songs before that one are unaffected.
 * @apiName putPlaylistShuffle
 * @apiVersion 2.3.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Playlist ID to shuffle
 * @apiParam {Number} smartShuffle Parameter to determine if we use, or not, an advanced algorithm to shuffle
 * @apiSuccess {String} args ID of playlist shuffled
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of playlist shuffled
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "5",
 *   "code": "PL_SHUFFLED",
 *   "data": "5"
 * }
 * @apiError PL_SHUFFLE_ERROR Unable to shuffle playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "10",
 *   "code": "PL_SHUFFLE_ERROR",
 *   "message": "Playlist 10 unknown"
 * }
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			try {
				await shufflePlaylist(req.params.pl_id, req.body.smartShuffle);
				emitWS('playlistContentsUpdated',req.params.pl_id);
				res.json(OKMessage(req.params.pl_id,'PL_SHUFFLED',req.params.pl_id));
			} catch(err) {
				res.status(500).json(errMessage('PL_SHUFFLE_ERROR',err.message,err.data));
			}
		});

}