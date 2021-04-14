import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { isUUID } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { getKara, getKaraLyrics, getKaras} from '../../services/kara';
import { createKara, editKara } from '../../services/kara_creation';
import { batchEditKaras, copyKaraToRepo, deleteKara } from '../../services/karaManagement';
import { playSingleSong } from '../../services/karaokeEngine';
import { addKaraToPlaylist } from '../../services/playlist';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function karaController(router: SocketIOApp) {
	router.route('getKaras', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get complete list of karaokes
 * @apiName getKaras
 * @apiVersion 5.0.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiParam {String} [order] Can be `favorited`, `sessionRequested`, `sessionPlayed`, `requested`, `recent` or `played`
 * @apiParam {String} [search] String comprised of criterias separated by `!`. Criterias are `y:` for year, `r:` for repository and `t:` for tag + type. Example, all songs with tags UUIDs a (singer) and b (songwriter) and year 1990 is `t:a~2,b~8!y:1990`. Refer to tag types to find out which number is which type.
 * @apiParam {Number} [random] If specified, will return a `number` random list of songs
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
 *               <See public/karas/:id object without i18n in tags>
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
 * @apiError SONG_LIST_ERROR Unable to fetch list of karaokes
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		await runChecklist(socket, req, 'guest', 'open');
		try {
			return await getKaras({
				filter: req.body?.filter,
				lang: req.langs,
				from: +req.body?.from || 0,
				size: +req.body?.size || 9999999,
				order: req.body?.order,
				q: req.body?.q,
				token: req.token,
				random: req.body?.random,
			});
		} catch(err) {
			const code = 'SONG_LIST_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('createKara', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Create karaoke data
 * @apiName createKara
 * @apiVersion 5.0.0
 * @apiGroup Karaokes
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} kid Karaoke ID to edit
 * @apiParam {string} mediafile Current media file name
 * @apiParam {string} [mediafile_orig] Name of new media file. If `mediafile_orig` exists, `mediafile` is the internal name returned from the importfile route.
 * @apiParam {string} [subfile] Current lyrics file name. Can be empty if hardsub or no lyrics file needed
 * @apiParam {string} [subfile_orig] Name of new lyrics file. If `subfile_orig` exists, `subfile` is the internal name returned from the importfile route.
 * @apiParam {string} title Song title
 * @apiParam {number} [year] Song year
 * @apiParam {number} [order] Song order (which ED, OP, etc.)
 * @apiParam {Object[]} [series] Object : tid (optional), name. Series is mandatory if there's no singer
 * @apiParam {Object[]} [singers] Object : tid (optional), name. Singers is mandatory if there's no series
 * @apiParam {Object[]} [misc] Object : tid (optional), name.
 * @apiParam {Object[]} [groups] Object : tid (optional), name.
 * @apiParam {Object[]} [songwriters] Object : tid (optional), name.
 * @apiParam {Object[]} [misc] Object : tid (optional), name.
 * @apiParam {Object[]} [creators] Object : tid (optional), name.
 * @apiParam {Object[]} [authors] Object : tid (optional), name.
 * @apiParam {Object[]} [langs] Object : tid (optional), name.
 * @apiParam {Object[]} [songtypes] Object : tid (optional), name.
 * @apiParam {Object[]} [families] Object : tid (optional), name.
 * @apiParam {Object[]} [genres] Object : tid (optional), name.
 * @apiParam {Object[]} [platforms] Object : tid (optional), name.
 * @apiParam {Object[]} [origins] Object : tid (optional), name.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: 'KARA_CREATED'}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: 'KARA_CREATED_ERROR'}
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await createKara(req.body);
			return APIMessage('KARA_CREATED');
		} catch(err) {
			const code = 'KARA_CREATED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getKara', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get song info from database
 * @apiName getKara
 * @apiVersion 5.0.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} kid Karaoke ID you want to fetch information from
 * @apiSuccess {Object[]} authors Karaoke authors' names
 * @apiSuccess {Number} created_at In `Date()` format
 * @apiSuccess {Object[]} creators Show's creators names
 * @apiSuccess {Number} duration Song duration in seconds
 * @apiSuccess {Boolean} flag_dejavu Has the song been played in the last hour ? (`EngineMaxDejaVuTime` defaults to 60 minutes)
 * @apiSuccess {Boolean} flag_favorites `true` if the song is in the user's favorites, `false`if not.
 * @apiSuccess {Number[]} my_public_plc_id Array of PLC IDs. Empty array if the song hasn't been added by you in the public playlist
 * @apiSuccess {Number[]} public_plc_id Array of PLC IDs. Empty array if the song hasn't been added in the public playlist
 * @apiSuccess {Number} gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {uuid} kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {Object[]} languages Song's languages in ISO639-2B format
 * @apiSuccess {Date} lastplayed_at When the song has been played last, in `Date()` format
 * @apiSuccess {Interval} lastplayed_ago When the song has been played last, in hours/minutes/seconds ago
 * @apiSuccess {Object[]} misc_tags Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} requested Number of times the song has been requested.
 * @apiSuccess {Object[]} series Series, if known.
 * @apiSuccess {Object[]} singers Singers' names, if known.
 * @apiSuccess {Number} songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {Object[]} songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} title Song's title
 * @apiSuccess {String} mediafile Media's filename
 * @apiSuccess {Number} played Counts how many times the song has been played
 * @apiSuccess {String} year Song's creation year. Empty string is returned if no year is known.
 * HTTP/1.1 200 OK
 * {
 *           "authors": [
 *               {
 *                   "i18n": {},
 *                   "name": "Nock",
 *                   "tid": "500030d3-8600-4728-b367-79ff029ea7c9",
 *                   "types": [6]
 *               }
 *           ],
 *           "created_at": "2018-09-12T08:41:38.000Z",
 *           "creators": [
 *               {
 *                   "i18n": {},
 *                   "name": "Toei Animation",
 *                   "tid": "500030d3-8600-4728-b367-79ff029ea7c9",
 *                   "types": [5]
 *               },
 *               {
 *                   "i18n": {},
 *                   "name": "Saban",
 *                   "tid": "500030d3-8600-4728-b367-79ff029ea7c9",
 *                   "types": [4]
 *               }
 *           ],
 *           "duration": 29,
 *           "flag_dejavu": false,
 *           "flag_favorites": false,
 *           "flag_upvoted": false,
 *           "gain": 6.34,
 *           "loudnorm": "-9.48,-0.29,15.10,-20.44,-0.66"
 *           "karafile": "ENG - Dokidoki! PreCure - OP - Glitter Force Doki Doki Theme Song.kara",
 *           "kid": "aa252a23-c5b5-43f3-978e-f960b6bb1ef1",
 *           "languages": [
 *               {
 *                   "i18n": {
 * 						...
 * 						"eng": "English"
 * 					 },
 *                   "name": "eng",
 *                   "tid": "500030d3-8600-4728-b367-79ff029ea7c9",
 *                   "types": [5]
 *               }
 *           ],
 *           "lastplayed_at": null,
 *           "lastplayed_ago": null,
 *           "mediafile": "ENG - Dokidoki! PreCure - OP - Glitter Force Doki Doki Theme Song.mp4",
 * 			 "mediasize": 29375831,
 *           "misc_tags": [
 *               {
 *                   "i18n": {
 *                       "eng": "Anime",
 *                       "fre": "Anime"
 *                   },
 *                   "name": "Anime",
 *                   "tid": "500030d3-8600-4728-b367-79ff029ea7c9",
 * 				     "short": "ANI"
 *                   "types": [8]
 *               },
 *               {
 *                   "i18n": {
 *                       "eng": "TV Show",
 *                       "fre": "Série TV"
 *                   },
 *                   "name": "TV Show",
 *                   "tid": "500030d3-8600-4728-b367-79ff029ea7c9",
 * 					 "short": "TV"
 *                   "types": [7]
 *               },
 *               {
 *                   "i18n": {
 *                       "eng": "Magical girl",
 *                       "fre": "Magical girl"
 *                   },
 *                   "name": "Magical Girl",
 *                   "tid": "500030d3-8600-4728-b367-79ff029ea7c9",
 * 					 "short": "MAG"
 *                   "types": [7]
 *               },
 *               {
 *                   "i18n": {
 *                       "eng": "Creditless",
 *                       "fre": "Creditless"
 *                   },
 *                   "name": "Creditless",
 *                   "tid": "500030d3-8600-4728-b367-79ff029ea7c9",
 * 					 "short": "CRE"
 *                   "types": [7]
 *               }
 *           ],
 *           "modified_at": "2018-11-14T21:31:36.000Z",
 *           "my_public_plc_id": [
 * 				17892
 * 			 ],
 *           "public_plc_id": [
 * 				17892
 * 			 ],
 *           "played": "0",
 *           "requested": "0",
 *           "series": [
 * 				{
 * 				 "tid": "abcdef..."
 * 				 "name": "Doki doki Precure"
 *               "aliases": [
 *                   "Glitter Force Doki Doki",
 *                   "precure10"
 *               ],
 *               "i18n": [
 *               [
 *                   "eng": "Dokidoki! PreCure"
 *                   "kor": "????! ????"
 *                   "jpn": "????! ?????"
 *               ],
 * 				 "types": [1]
 *     			}
 *           ],
 *           "singers": [
 *               {
 *                   "i18n": {},
 *                   "name": "Blush",
 *                   "tid": "500030d3-8600-4728-b367-79ff029ea7c9",
 *                   "types": [2]
 *               }
 *           ],
 *           "songorder": null,
 *           "songtype": [
 *               {
 *                   "i18n": {
 *                       "eng": "Opening",
 *                       "fre": "Opening"
 *                   },
 *                   "name": "OP",
 *                   "tid": "500030d3-8600-4728-b367-79ff029ea7c9",
 *                   "types": [3]
 *               }
 *           ],
 *           "songwriters": [
 *               {
 *                   "i18n": {},
 *                   "name": "Noam Kaniel",
 *                   "tid": "500030d3-8600-4728-b367-79ff029ea7c9",
 *                   "types": [8]
 *               }
 *           ],
 *           "subfile": "ENG - Dokidoki! PreCure - OP - Glitter Force Doki Doki Theme Song.ass",
 *           "title": "Glitter Force Doki Doki Theme Song",
 *           "year": 2017
 * }
 * @apiError SONG_VIEW_ERROR Unable to view a song
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "SONG_VIEW_ERROR"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 */
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			if (!isUUID(req.body.kid)) throw {code: 400};
			return await getKara(req.body?.kid, req.token);
		} catch(err) {
			const code = 'SONG_VIEW_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('deleteKara', async (socket: Socket, req: APIData) => {
	/**
 * @api {delete} Delete kara
 * @apiName deleteKara
 * @apiVersion 5.0.0
 * @apiGroup Karaokes
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} kid Karaoke ID to delete
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "KARA_DELETED"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "KARA_DELETED_ERROR"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		if (!isUUID(req.body.kid)) throw {code: 400};
		try {
			await deleteKara(req.body.kid);
			return APIMessage('KARA_DELETED');
		} catch(err) {
			const code = 'KARA_DELETED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('addKaraToPublicPlaylist', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Add karaoke to public playlist
 * @apiName addKaraToPublicPlaylist
 * @apiVersion 5.0.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the admin route, this adds a single karaoke song to either current or public playlist depending on private/public mode selected by admin in configuration.
 * @apiParam {uuid} kid Karaoke ID to add to current/public playlist
 * @apiSuccess {String} args/kara Karaoke title added
 * @apiSuccess {uuid} args/kid Karaoke ID added.
 * @apiSuccess {String} args/playlist Name of playlist the song was added to
 * @apiSuccess {Number} args/playlist_id Playlist ID the song was added to
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "kara": "Dragon Screamer",
 *       "kid": "kid",
 *       "playlist": "Courante",
 *       "playlist_id": 1
 * 		 "plc": <See Playlist Contents in this doc>
 *   },
 *   "code": "PL_SONG_ADDED",
 *   "data": {
 *       "kara": "Dragon Screamer",
 *       "kid": "kid",
 *       "playlist": "Courante",
 *       "playlist_id": 1,
 * 		 "plc": <See Playlist Contents in this doc>
 *   }
 * }
 * @apiError PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED User asked for too many karaokes already.
 * @apiError PLAYLIST_MODE_ADD_SONG_ERROR_ALREADY_ADDED All songs are already present in playlist
 * @apiError PLAYLIST_MODE_ADD_SONG_ERROR_NO_DUPLICATE_SERIES_SINGERS No duplicate series or singers are allowed
 * @apiError PLAYLIST_MODE_ADD_SONG_ERROR_BLACKLISTED Song is blacklisted and cannot be added
 * @apiError PLAYLIST_MODE_ADD_SONG_ERROR General error while adding song
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 * @apiErrorExample Error-Response:
 * HTTP/1.1 451 Unavailable for legal reasons
 * @apiErrorExample Error-Response:
 * HTTP/1.1 429 Too Many Requests
 * @apiErrorExample Error-Response:
 * HTTP/1.1 409 Conflict
 * @apiErrorExample Error-Response:
 * HTTP/1.1 406 Not Acceptable
 */
		await runChecklist(socket, req, 'guest', 'limited');
		// Add Kara to the playlist currently used depending on mode
		if (!isUUID(req.body.kid)) throw {code: 400};
		try {
			return {
				data: await addKaraToPlaylist(req.body.kid, req.token.username),
				code: 'PL_SONG_ADDED',
			};
		} catch(err) {
			errMessage(err?.code, err?.message);
			throw {code: err?.code || 500, message: APIMessage(err.message, err.msg)};
		}
	});
	router.route('editKara', async (socket: Socket, req: APIData) => {
	/**
 * @api {put} Edit karaoke data
 * @apiName editKara
 * @apiVersion 5.0.0
 * @apiGroup Karaokes
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} kid Karaoke ID to edit
 * @apiParam {string} mediafile Current media file name
 * @apiParam {string} [mediafile_orig] Name of new media file. If `mediafile_orig` exists, `mediafile` is the internal name returned from the importfile route.
 * @apiParam {string} [subfile] Current lyrics file name. Can be empty if hardsub or no lyrics file needed
 * @apiParam {string} [subfile_orig] Name of new lyrics file. If `subfile_orig` exists, `subfile` is the internal name returned from the importfile route.
 * @apiParam {string} title Song title
 * @apiParam {number} [year] Song year
 * @apiParam {number} [order] Song order (which ED, OP, etc.)
 * @apiParam {Object[]} [series] Object : tid (optional), name. Series is mandatory if there's no singer
 * @apiParam {Object[]} [singers] Object : tid (optional), name. Singers is mandatory if there's no series
 * @apiParam {Object[]} [misc] Object : tid (optional), name.
 * @apiParam {Object[]} [groups] Object : tid (optional), name.
 * @apiParam {Object[]} [songwriters] Object : tid (optional), name.
 * @apiParam {Object[]} [misc] Object : tid (optional), name.
 * @apiParam {Object[]} [creators] Object : tid (optional), name.
 * @apiParam {Object[]} [authors] Object : tid (optional), name.
 * @apiParam {Object[]} [langs] Object : tid (optional), name.
 * @apiParam {Object[]} [songtypes] Object : tid (optional), name.
 * @apiParam {Object[]} [families] Object : tid (optional), name.
 * @apiParam {Object[]} [genres] Object : tid (optional), name.
 * @apiParam {Object[]} [platforms] Object : tid (optional), name.
 * @apiParam {Object[]} [origins] Object : tid (optional), name.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: 'KARA_EDITED'}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: 'KARA_EDITED_ERROR'}
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await editKara(req.body);
			return {code: 200, message: APIMessage('KARA_EDITED')};
		} catch(err) {
			const code = 'KARA_EDITED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(err?.msg || code)};
		}
	});
	router.route('getKaraLyrics', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Get song lyrics
 * @apiName getKaraLyrics
 * @apiVersion 5.0.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} kid Karaoke ID to get lyrics from
 * @apiSuccess {String[]} data Array of strings making the song's lyrics
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "lyrics": [
 * 		"Lyrics for this song are not available"
 * 	 ]
 * }
 * @apiError LYRICS_VIEW_ERROR Unable to fetch lyrics data
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 * {code:"PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED"}
 */
		await runChecklist(socket, req, 'guest', 'limited');
		if (!isUUID(req.body.kid)) throw {code: 400};
		try {
			return await getKaraLyrics(req.body.kid);
		} catch(err) {
			const code = 'LYRICS_VIEW_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('copyKaraToRepo', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Move song to another repository
 * @apiName copyKaraToRepo
 * @apiVersion 5.0.0
 * @apiGroup Repositories
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} kid Karaoke ID to copy
 * @apiParam {string} repo Repo to copy song to
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "SONG_COPIED"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "SONG_COPIED_ERROR"}
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		if (!isUUID(req.body.kid)) throw {code: 400};
		try {
			await copyKaraToRepo(req.body.kid, req.body.repo);
			return APIMessage('SONG_COPIED');
		} catch(err) {
			const code = 'SONG_COPIED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('playKara', async (socket: Socket, req: APIData) => {
		/**
	 * @api {post} Play a single song
	 * @apiName playKara
	 * @apiVersion 5.0.0
	 * @apiGroup Player
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {uuid} kid Karaoke ID to copy
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {code: "SONG_PLAY_ERROR"}
	 */
		await runChecklist(socket, req);
		try {
			return await playSingleSong(req.body.kid);
		} catch(err) {
			const code = 'SONG_PLAY_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('editKaras', async (socket: Socket, req: APIData) => {
		/**
	 * @api {put} Edit a batch of songs
	 * @apiName editKaras
	 * @apiVersion 5.0.0
	 * @apiGroup Karas
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {number} playlist_id Playlist ID to fetch songs from
	 * @apiParam {string} action `add` or `remove`
	 * @apiParam {string} tid Tag to add or remove
	 * @apiParam {number} type Tag type in kara to change
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			batchEditKaras(req.body.playlist_id, req.body.action, req.body.tid, req.body.type);
			return;
		} catch {
			throw {code: 500};
		}
	});
}
