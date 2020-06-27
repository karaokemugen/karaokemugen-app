import { Router } from 'express';

import { bools } from '../../lib/utils/constants';
import { check } from '../../lib/utils/validators';
import { emitWS } from '../../lib/utils/ws';
import { addKaraToPlaylist, copyKaraToPlaylist, createPlaylist, deleteKaraFromPlaylist, deletePlaylist, editPlaylist, editPLC, emptyPlaylist, exportPlaylist,getKaraFromPlaylist, getPlaylistContents, getPlaylistInfo, getPlaylists, importPlaylist, setCurrentPlaylist, setPublicPlaylist, shufflePlaylist } from '../../services/playlist';
import { vote } from '../../services/upvote';
import { APIMessage,errMessage } from '../common';
import { requireAdmin, requireAuth, requireValidUser,updateUserLoginTime } from '../middlewares/auth';
import { getLang } from '../middlewares/lang';
import { requireWebappLimited, requireWebappOpen } from '../middlewares/webapp_mode';

export default function playlistsController(router: Router) {
	router.route('/playlists')
	/**
 * @api {get} /playlists Get list of playlists
 * @apiName GetPlaylists
 * @apiGroup Playlists
 * @apiVersion 4.0.0
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiSuccess {Object[]} playlists Playlists information
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 * {
 *   "playlists": [
 *       {
 *             <see /playlists/[id] route>
 *       }
 *   ]
 * }
 * @apiError PL_LIST_ERROR Unable to fetch a list of playlists
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

		.get(getLang, requireAuth, requireValidUser, requireWebappLimited, updateUserLoginTime, async (req: any, res: any) => {
			// Get list of playlists
			try {
				const playlists = await getPlaylists(req.authToken);
				res.json(playlists);
			} catch(err) {
				const code = 'PL_LIST_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
	/**
 * @api {post} /playlists Create a playlist
 * @apiName PostPlaylist
 * @apiVersion 3.1.0
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
					res.status(201).json(new_playlist);
				} catch(err) {
					const code = 'PL_CREATE_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
	router.route('/playlists/:pl_id([0-9]+)')
	/**
 * @api {get} /playlists/:pl_id Get playlist information
 * @apiName GetPlaylist
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 4.0.0
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
 * @apiSuccess {Number} data/plcontent_id_playing ID of PLC currently labelled as playing in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {"data":
 *       "created_at": "2019-01-01T13:34:01.000Z",
 *       "flag_current": true,
 *       "flag_public": false,
 *       "flag_visible": true,
 *       "duration": 0,
 *       "modified_at": "2019-01-01T13:34:01.000Z",
 *       "name": "Liste de lecture courante",
 *       "karacount": 6,
 *       "playlist_id": 1,
 *       "plcontent_id_playing": 6292
 *       "time_left": 0
 * }
 * @apiError PL_VIEW_ERROR Unable to fetch info from a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			//Access :pl_id by req.params.pl_id
			// This get route gets infos from a playlist
			try {
				const playlist = await getPlaylistInfo(req.params.pl_id, req.authToken);
				res.json(playlist);
			} catch (err) {
				const code = 'PL_VIEW_ERROR';
				errMessage(code, err);
				res.status(500).send(APIMessage(code));
			}
		})
	/**
 * @api {put} /playlists/:pl_id Update a playlist's information
 * @apiName PutPlaylist
 * @apiVersion 3.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} name Name of playlist to create
 * @apiParam {Boolean} flag_visible Is the playlist to create visible to all users? If `false`, only admins can see it.
 *
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
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
					emitWS('playlistsUpdated');
					res.status(200).json();
				} catch(err) {
					const code = 'PL_UPDATE_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		})

	/**
 * @api {delete} /playlists/:pl_id Delete a playlist
 * @apiName DeletePlaylist
 * @apiVersion 3.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiError PL_DELETE_ERROR Unable to delete a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			try {
				await deletePlaylist(+req.params.pl_id);
				emitWS('playlistsUpdated');
				res.status(200).json();
			} catch(err) {
				const code = 'PL_DELETE_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/playlists/:pl_id([0-9]+)/empty')
	/**
 * @api {put} /playlists/:pl_id/empty Empty a playlist
 * @apiName PutEmptyPlaylist
 * @apiVersion 3.1.0
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
 * @apiError PL_EMPTY_ERROR Unable to empty a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
		// Empty playlist
			try {
				await emptyPlaylist(+req.params.pl_id);
				res.status(200).json();
			} catch(err) {
				const code = 'PL_EMPTY_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/playlists/:pl_id([0-9]+)/setCurrent')
		/**
	 * @api {put} /playlists/:pl_id/setCurrent Set playlist to current
	 * @apiName PutSetCurrentPlaylist
	 * @apiVersion 3.1.0
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
	 * @apiError PL_SET_CURRENT_ERROR Unable to set this playlist to current. The playlist is a public one and can't be set to current at the same time. First set another playlist as public so this playlist has no flags anymore and can be set current.
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			// set playlist to current
			try {
				await setCurrentPlaylist(+req.params.pl_id);
				emitWS('playlistInfoUpdated',+req.params.pl_id);
				res.status(200).json();
			} catch(err) {
				const code = 'PL_SET_CURRENT_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/playlists/:pl_id([0-9]+)/setPublic')
		/**
	 * @api {put} /playlists/:pl_id/setPublic Set playlist to public
	 * @apiName PutSetPublicPlaylist
	 * @apiVersion 3.1.0
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
	 * @apiError PL_SET_PUBLIC_ERROR Unable to set this playlist to public. The playlist is a current one and can't be set to public at the same time. First set another playlist as current so this playlist has no flags anymore and can be set public.
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			// Empty playlist
			try {
				await setPublicPlaylist(+req.params.pl_id);
				emitWS('playlistInfoUpdated',+req.params.pl_id);
				res.status(200).json();
			} catch(err) {
				const code = 'PL_SET_PUBLIC_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/playlists/:pl_id([0-9]+)/karas')
		/**
	 * @api {get} /playlists/:pl_id/karas Get list of karaokes in a playlist
	 * @apiName GetPlaylistKaras
	 * @apiVersion 3.1.0
	 * @apiGroup Playlists
	 * @apiPermission public
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
	 * }
	 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.get(getLang, requireAuth, requireValidUser, requireWebappLimited, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const playlist = await getPlaylistContents(req.params.pl_id, req.authToken, req.query.filter,req.lang, +req.query.from || 0, +req.query.size || 9999999, +req.query.random || 0);
				res.json(playlist);
			} catch(err) {
				const code = 'PL_VIEW_SONGS_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
		/**
	 * @api {post} /playlists/:pl_id/karas Add karaokes to playlist
	 * @apiName PostPlaylistKaras
	 * @apiVersion 3.1.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {uuid[]} kid List of `kid`.
	 * @apiParam {Number} [pos] Position in target playlist where to add the karaoke to. If not specified, will place karaokes at the end of target playlist. `-1` adds karaokes after the currently playing song in target playlist.
	 * @apiSuccess {String} args/kara Karaoke title added
	 * @apiSuccess {uuid} args/kid Karaoke ID added.
	 * @apiSuccess {String} args/playlist Name of playlist the song was added to
	 * @apiSuccess {Number} args/playlist_id Playlist ID the song was added to
	 * @apiSuccess {String} code Message to display
	 * @apiSuccess {String} data See `args` above.
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiError PL_ADD_SONG_ERROR Unable to add songs to the playlist
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireWebappOpen, async (req: any, res: any) => {
			//add a kara to a playlist
			const validationErrors = check(req.body, {
				kid: {presence: true, uuidArrayValidator: true}
			});
			if (!validationErrors) {
				try {
					await addKaraToPlaylist(req.body.kid, req.authToken.username, req.params.pl_id, +req.body.pos);
					emitWS('playlistInfoUpdated',req.params.pl_id);
					emitWS('playlistContentsUpdated',req.params.pl_id);
					res.status(201).json();
				} catch(err) {
					const code = 'PL_ADD_SONG_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		})
		/**
	 * @api {patch} /playlists/:pl_id/karas Copy karaokes to another playlist
	 * @apiName PatchPlaylistKaras
	 * @apiVersion 3.1.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {Number[]} plc_id List of `playlistcontent_id` in an array
	 * @apiParam {Number} [pos] Position in target playlist where to copy the karaoke to. If not specified, will place karaokes at the end of target playlist
	 * @apiSuccess {String[]} args/plc_ids IDs of playlist contents copied
	 * @apiSuccess {String} args/playlist_id ID of destinaton playlist
	 * @apiSuccess {String} code Message to display
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiError PL_COPY_SONG_ERROR Unable to copy karaoke song to the destination playlist
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {code: "PL_COPY_SONG_ERROR"}
	 */
		.patch(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			//add karas from a playlist to another
			const validationErrors = check(req.body, {
				plc_id: {presence: true, numbersArrayValidator: true}
			});
			if (!validationErrors) {
				try {
					const pl_id = await	copyKaraToPlaylist(req.body.plc_id,+req.params.pl_id,+req.body.pos);
					emitWS('playlistContentsUpdated', pl_id);
					res.status(201).json();
				} catch(err) {
					const code = 'PL_SONG_COPY_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}

		})

		/**
	 * @api {delete} /playlists/:pl_id/karas Delete karaokes from playlist
	 * @apiName DeletePlaylistKaras
	 * @apiVersion 3.1.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {Number[]} plc_id List of `plc_id` in an array
	 * @apiSuccess {String} args Name of playlist the song was deleted from
	 * @apiSuccess {String} code Message to display
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiError PL_DELETE_SONG_ERROR Unable to delete the song from the selected playlist
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {code: "PL_DELETE_SONG_ERROR"}
	 */
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			// Delete kara from playlist
			// Deletion is through playlist content's ID.
			// There is actually no need for a playlist number to be used at this moment.
			const validationErrors = check(req.body, {
				plc_id: {presence: true, numbersArrayValidator: true}
			});
			if (!validationErrors) {
				try {
					const data = await deleteKaraFromPlaylist(req.body.plc_id,req.params.pl_id, req.authToken);
					emitWS('playlistContentsUpdated', data.pl_id);
					emitWS('playlistInfoUpdated', data.pl_id);
					res.status(200).json();
				} catch(err) {
					const code = 'PL_DELETE_SONG_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});

	router.route('/playlists/:pl_id([0-9]+)/karas/:plc_id([0-9]+)')
		/**
	 * @api {get} /playlists/:pl_id/karas/:plc_id Get song info from a playlist item
	 * @apiName GetPlaylistPLC
	 * @apiVersion 3.1.0
	 * @apiGroup Playlists
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
	 * @apiParam {Number} plc_id Playlist content ID.
	 * @apiSuccess {Object[]} kara Contains one playlist content object, which consists of a kara object + the following properties
	 * @apiSuccess {Number} kara_created_at In `Date()` format
	 * @apiSuccess {Number} created_at Karaoke added to playlist, in `Date()` format
	 * @apiSuccess {Number} kara_modified_at In `Date()` format
	 * @apiSuccess {Boolean} flag_blacklisted Is the song in the blacklist ?
	 * @apiSuccess {Boolean} flag_whitelisted Is the song in the whitelist ?
	 * @apiSuccess {Boolean} flag_free Wether the song has been marked as free or not
	 * @apiSuccess {Number} playlist_id ID of playlist this song belongs to
	 * @apiSuccess {Number} playlistcontent_ID PLC ID of this song.
	 * @apiSuccess {Number} pos Position in the playlist. First song has a position of `1`
	 * @apiSuccess {String} nickname Nickname of user who added/requested the song. this nickname can be changed (`username` cannot) hence why it is displayed here.
	 * @apiSuccess {Number} time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
	 * @apiSuccess {String} username Username who submitted this karaoke. Can be different from `nickname`.
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 *       {
	 * 			 <See karas/[kara_id] object>,
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
	 *         }
	 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {code: "PL_VIEW_CONTENT_ERROR"}
	 */
		.get(requireAuth, requireValidUser, updateUserLoginTime, requireWebappLimited, async (req: any, res: any) => {
			try {
				const kara = await getKaraFromPlaylist(req.params.plc_id, req.authToken);
				res.status(200).json(kara);
			} catch(err) {
				const code = 'PL_VIEW_CONTENT_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
		/**
	 * @api {put} /playlists/:pl_id([0-9]+)/karas/:plc_id Update song in a playlist
	 * @apiName PutPlaylistKara
	 * @apiVersion 3.1.0
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
	 * @apiError PL_MODIFY_CONTENT_ERROR Unable to modify content's position or playing status
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {code: "PL_MODIFY_CONTENT_ERROR"}
	 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			const validationErrors = check(req.body, {
				flag_playing: {inclusion: bools},
				flag_free: {inclusion: bools},
				flag_visible: {inclusion: bools}
			});
			if (!validationErrors) {
				try {
					const data = await editPLC(req.params.plc_id,{
						pos: +req.body.pos,
						flag_playing: req.body.flag_playing,
						flag_free: req.body.flag_free,
						flag_visible: req.body.flag_visible
					});
					emitWS('playlistContentsUpdated',data.pl_id);
					emitWS('playlistInfoUpdated',data.pl_id);
					res.status(200).json();
				} catch(err) {
					const code = 'PL_MODIFY_CONTENT_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}

		});
	router.route('/playlists/:pl_id([0-9]+)/karas/:plc_id([0-9]+)/vote')
	/**
		 * @api {post} /playlists/:pl_id/karas/:plc_id/vote Up/downvote a song in public playlist
		 * @apiName PostVote
		 * @apiVersion 3.1.0
		 * @apiGroup Playlists
		 * @apiPermission public
		 * @apiHeader authorization Auth token received from logging in
		 * @apiParam {Number} pl_id Target playlist
		 * @apiParam {Number} plc_id Target playlist content ID
		 * @apiParam {String} [downvote] If anything is specified in this parameter, it'll be a downvote instead of upvote.
		 * @apiSuccess {String} code Return code
		 * @apiSuccess {String} args Name of song being upvoted
		 * @apiSuccessExample Success-Response:
		 * HTTP/1.1 200 OK
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
				await vote(req.params.plc_id,req.authToken.username, req.body.downvote);
				res.status(200).json();
			} catch(err) {
				errMessage(err.code, err.message);
				res.status(500).json(APIMessage(err.code));
			}
		});
	router.route('/playlists/:pl_id([0-9]+)/export')
	/**
 * @api {get} /playlists/:pl_id/export Export a playlist
 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
 * @apiName getPlaylistExport
 * @apiVersion 3.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Playlist ID to export
 * @apiSuccess {String} data Playlist in an exported format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
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
 * }
 * @apiError PL_EXPORT_ERROR Unable to export playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "PL_EXPORT_ERROR"}
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			// Returns the playlist and its contents in an exportable format (to save on disk)
			try {
				const playlist = await exportPlaylist(req.params.pl_id);
				// Not sending JSON : we want to send a string containing our text, it's already in stringified JSON format.
				res.status(200).json(playlist);
			} catch(err) {
				const code = 'PL_EXPORT_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/playlists/import')
	/**
 * @api {post} /playlists/import Import a playlist
 * @apiName postPlaylistImport
 * @apiVersion 3.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {String} playlist Playlist in JSON form, following Karaoke Mugen's file format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "PL_IMPORTED",
 *   "data": {
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
						playlist_id: data.playlist_id,
						unknownKaras: data.karasUnknown
					};
					emitWS('playlistsUpdated');
					res.status(200).json(APIMessage('PL_IMPORTED', response));
				} catch(err) {
					const code = 'PL_IMPORT_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}

		});
	router.route('/playlists/:pl_id([0-9]+)/shuffle')
	/**
 * @api {put} /playlists/:pl_id/shuffle Shuffle a playlist
 * @apiDescription Playlist is shuffled in database. The shuffling only begins after the currently playing song. Songs before that one are unaffected.
 * @apiName putPlaylistShuffle
 * @apiVersion 3.1.0
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
 * @apiError PL_SHUFFLE_ERROR Unable to shuffle playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "PL_SHUFFLE_ERROR"}
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			try {
				await shufflePlaylist(req.params.pl_id, req.body.smartShuffle);
				emitWS('playlistContentsUpdated', req.params.pl_id);
				res.status(200).json();
			} catch(err) {
				const code = 'PL_SHUFFLE_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});

}
