import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { bools } from '../../lib/utils/constants';
import { check } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { addKaraToPlaylist, copyKaraToPlaylist, createPlaylist, deleteKaraFromPlaylist, deletePlaylist, editPlaylist, editPLC, emptyPlaylist, exportPlaylist,findPlaying,getKaraFromPlaylist, getPlaylistContents, getPlaylistInfo, getPlaylists, importPlaylist, shufflePlaylist } from '../../services/playlist';
import { vote } from '../../services/upvote';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function playlistsController(router: SocketIOApp) {
	router.route('getPlaylists', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get list of playlists
 * @apiName getPlaylists
 * @apiGroup Playlists
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'guest', 'limited');
		// Get list of playlists
		try {
			return await getPlaylists(req.token);
		} catch(err) {
			const code = 'PL_LIST_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('createPlaylist', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Create a playlist
 * @apiName createPlaylist
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			name: {presence: {allowEmpty: false}},
			flag_visible: {inclusion: bools},
			flag_public: {inclusion: bools},
			flag_current: {inclusion: bools},
		});
		if (!validationErrors) {
			// No errors detected
			req.body.name = unescape(req.body.name.trim());

			//Now we add playlist
			try {
				return await createPlaylist(req.body.name, {
					visible: req.body.flag_visible,
					current: req.body.flag_current,
					public: req.body.flag_public,
				}, req.token.username);
			} catch(err) {
				const code = 'PL_CREATE_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});
	router.route('getPlaylist', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get playlist information
 * @apiName getPlaylist
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			const playlist = await getPlaylistInfo(req.body?.pl_id, req.token);
			if (!playlist) throw {code: 404};
			return playlist;
		} catch (err) {
			const code = 'PL_VIEW_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('editPlaylist', async (socket: Socket, req: APIData) => {
	/**
 * @api {put} Update a playlist's information
 * @apiName editPlaylist
 * @apiVersion 5.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} name Name of playlist to create
 * @apiParam {Boolean} flag_visible Is the playlist visible to all users? If `false`, only admins can see it.
 * @apiParam {Boolean} flag_current Is the playlist current?
 * @apiParam {Boolean} flag_public Is the playlist public?
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
		await runChecklist(socket, req);
		// No errors detected
		if (req.body.name) req.body.name = unescape(req.body.name?.trim());

		//Now we add playlist
		try {
			return await editPlaylist(req.body?.pl_id,req.body);
		} catch(err) {
			const code = 'PL_UPDATE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('deletePlaylist', async (socket: Socket, req: APIData) => {
	/**
 * @api {delete} Delete a playlist
 * @apiName deletePlaylist
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req);
		try {
			return await deletePlaylist(req.body?.pl_id);
		} catch(err) {
			const code = 'PL_DELETE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('emptyPlaylist', async (socket: Socket, req: APIData) => {
	/**
 * @api {put} Empty a playlist
 * @apiName emptyPlaylist
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req);
		// Empty playlist
		try {
			return await emptyPlaylist(+req.body?.pl_id);
		} catch(err) {
			const code = 'PL_EMPTY_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('findPlayingSongInPlaylist', async (socket: Socket, req: APIData) => {
		/**
	 * @api {get} Find current playing song's index
	 * @apiName findPlayingSongInPlaylist
	 * @apiVersion 5.0.0
	 * @apiGroup Playlists
	 * @apiDescription Returns the song's flag playing's index. Useful when you don't load the whole playlist so you can jump to the correct page to get the currently playing song
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiSuccess {Number} index -1 if no flag_playing found.

	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *  "index": 2190
	 * }
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			const index = await findPlaying(req.body?.pl_id);
			return {index: index};
		} catch(err) {
			throw {code: 500, message: err};
		}
	});
	router.route('getPlaylistContents', async (socket: Socket, req: APIData) => {
		/**
	 * @api {get} Get list of karaokes in a playlist
	 * @apiName getPlaylistContents
	 * @apiVersion 5.0.0
	 * @apiGroup Playlists
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
	 * @apiParam {Number} [random=0] Return a [random] number of karaokes from that playlist.
	 * @apiParam {Boolean} [orderByLikes=false] Returns the playlist ordered by number of likes in descending order
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
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getPlaylistContents(req.body?.pl_id, req.token, req.body?.filter,req.langs, req.body?.from || 0, req.body?.size || 9999999, req.body?.random || 0, req.body?.orderByLikes);
		} catch(err) {
			const code = 'PL_VIEW_SONGS_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('addKaraToPlaylist', async (socket: Socket, req: APIData) => {
		/**
	 * @api {post} Add karaokes to playlist
	 * @apiName addKaraToPlaylist
	 * @apiVersion 5.0.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {uuid[]} kids List of `kid`.
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
		await runChecklist(socket, req, 'guest');
		//add a kara to a playlist
		const validationErrors = check(req.body, {
			kids: {presence: true, uuidArrayValidator: true}
		});
		if (!validationErrors) {
			try {
				return await addKaraToPlaylist(req.body.kids, req.token.username, req.body.pl_id, req.body.pos);
			} catch(err) {
				const code = 'PL_ADD_SONG_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});
	router.route('copyKaraToPlaylist', async (socket: Socket, req: APIData) => {
		/**
	 * @api {patch} Copy karaokes to another playlist
	 * @apiName copyKaraToPlaylist
	 * @apiVersion 5.0.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {Number[]} plc_ids List of `playlistcontent_id` in an array
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
		await runChecklist(socket, req);
		//add karas from a playlist to another
		const validationErrors = check(req.body, {
			plc_ids: {presence: true, numbersArrayValidator: true}
		});
		if (!validationErrors) {
			try {
				return await copyKaraToPlaylist(req.body.plc_ids, req.body.pl_id, req.body.pos);
			} catch(err) {
				const code = 'PL_SONG_COPY_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});
	router.route('deleteKaraFromPlaylist', async (socket: Socket, req: APIData) => {
		/**
	 * @api {delete} Delete karaokes from playlist
	 * @apiName deleteKaraFromPlaylist
	 * @apiVersion 5.0.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {Number[]} plc_ids List of `plc_id` in an array
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
		await runChecklist(socket, req, 'guest');
		const validationErrors = check(req.body, {
			plc_ids: {presence: true, numbersArrayValidator: true}
		});
		if (!validationErrors) {
			try {
				return await deleteKaraFromPlaylist(req.body.plc_ids, req.token);
			} catch(err) {
				const code = 'PL_DELETE_SONG_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}
	});

	router.route('getPLC', async (socket: Socket, req: APIData) => {
		/**
	 * @api {get} Get song info from a playlist item
	 * @apiName getPLC
	 * @apiVersion 5.0.0
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
	 * @apiSuccess {Boolean} flag_refused Wether the song has been refused by operator or not
	 * @apiSuccess {Boolean} flag_accepted Wether the song has been refused by operator or not
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
	 *           "flag_refused": false,
	 *           "flag_accepted": false,
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
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getKaraFromPlaylist(req.body?.plc_id, req.token);
		} catch(err) {
			const code = 'PL_VIEW_CONTENT_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('editPLC', async (socket: Socket, req: APIData) => {
		/**
	 * @api {put} Update song in a playlist
	 * @apiName editPLC
	 * @apiVersion 5.0.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number[]} plc_ids `playlistcontent_id` of the song to update
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
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			plc_ids: {numbersArrayValidator: true},
			flag_playing: {inclusion: bools},
			flag_free: {inclusion: bools},
			flag_visible: {inclusion: bools},
			flag_accepted: {inclusion: bools},
			flag_refused: {inclusion: bools}
		});
		if (!validationErrors) {
			try {
				return await editPLC(req.body.plc_ids, {
					pos: +req.body.pos,
					flag_playing: req.body.flag_playing,
					flag_free: req.body.flag_free,
					flag_visible: req.body.flag_visible,
					flag_accepted: req.body.flag_accepted,
					flag_refused: req.body.flag_refused
				});
			} catch(err) {
				const code = 'PL_MODIFY_CONTENT_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}

	});
	router.route('votePLC', async (socket: Socket, req: APIData) => {
	/**
		 * @api {post} Up/downvote a song in public playlist
		 * @apiName votePLC
		 * @apiVersion 5.0.0
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

		await runChecklist(socket, req, 'guest', 'limited');
		// Post an upvote
		try {
			return await vote(req.body?.plc_id, req.token.username, req.body?.downvote);
		} catch(err) {
			errMessage(err.msg);
			throw {code: err?.code || 500, message: APIMessage(err.msg)};
		}
	});
	router.route('exportPlaylist', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Export a playlist
 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
 * @apiName exportPlaylist
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req);
		try {
			return await exportPlaylist(req.body?.pl_id);
		} catch(err) {
			const code = 'PL_EXPORT_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('importPlaylist', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Import a playlist
 * @apiName importPlaylist
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req);
		// Imports a playlist and its contents in an importable format (posted as JSON data)
		const validationErrors = check(req.body, {
			playlist: {isJSON: true}
		});
		if (!validationErrors) {
			try {
				const data = await importPlaylist(JSON.parse(req.body.playlist), req.token.username);
				const response = {
					playlist_id: data.playlist_id,
					unknownKaras: data.karasUnknown
				};
				return APIMessage('PL_IMPORTED', response);
			} catch(err) {
				const code = 'PL_IMPORT_ERROR';
				errMessage(code, err);
				throw {code: err?.code || 500, message: APIMessage(code)};
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw {code: 400, message: validationErrors};
		}

	});
	router.route('shufflePlaylist', async (socket: Socket, req: APIData) => {

		/**
 * @api {put} Shuffle a playlist
 * @apiDescription Playlist is shuffled in database. The shuffling only begins after the currently playing song. Songs before that one are unaffected.
 * @apiName shufflePlaylist
 * @apiVersion 5.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Playlist ID to shuffle
 * @apiParam {String} method Parameter to determine the shuffle method to use (normal, smart, balanced etc...)
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
		await runChecklist(socket, req);
		try {
			return await shufflePlaylist(req.body?.pl_id, req.body?.method);
		} catch(err) {
			const code = 'PL_SHUFFLE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
}
