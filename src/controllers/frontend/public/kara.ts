import { Router } from "express";
import { errMessage, OKMessage } from "../../common";
import { getKaraLyrics, getKara, getKaras } from "../../../services/kara";
import { updateUserLoginTime, requireAuth, requireValidUser } from "../../middlewares/auth";
import { requireWebappLimited, requireWebappOpen } from "../../middlewares/webapp_mode";
import { getLang } from "../../middlewares/lang";
import { emitWS } from "../../../lib/utils/ws";
import { addKaraToPlaylist, deleteKaraFromPlaylist, getPlaylistContents, getPlaylistInfo } from "../../../services/playlist";
import { vote } from "../../../services/upvote";
import { getState } from "../../../utils/state";
import { getConfig } from "../../../lib/utils/config";
import { PostSuggestionToKaraBase } from "../../../services/gitlab";

export default function publicKaraController(router: Router) {
	router.route('/public/karas/suggest')
	/**
	 * @api {post} /public/karas/suggest Suggest a new song to your karaokebase project
	 * @apiName SuggestKara
	 * @apiVersion 3.0.0
	 * @apiGroup Karaokes
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {String} karaName Name of song + series / artist
	 * @apiSuccess {String} issueURL New issue's URL
	 * @apiSuccessExample Success-Response:
 	 * HTTP/1.1 200 OK
 	 * {
 	 *   "data": {
	 * 		 "issueURL": "https://lab.shelter.moe/xxx/issues/1234"
	 *   }
	 * }
	 * @apiErrorExample Error-Response:
 	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
 	 * HTTP/1.1 403 Forbidden
	 */
	.post(requireAuth, requireValidUser, requireWebappOpen, updateUserLoginTime, async(req: any, res: any) => {
		try {
			if (getConfig().Gitlab.Enabled) {
				const url = await PostSuggestionToKaraBase(req.body.karaName, req.authToken.username);
				res.json(OKMessage({issueURL: url}));
			} else {
				res.status(403).json(null);
			}
		} catch(err) {
			res.status(500).json(err);
		}
	});

	router.route('/public/karas')
	/**
 * @api {get} /public/karas Get complete list of karaokes
 * @apiName GetKaras
 * @apiVersion 2.5.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiParam {String} [searchType] Can be `search`, `kid`, `requested`, `recent` or `played`
 * @apiParam {String} [searchValue] Value to search for. For `kid` it's a UUID, for `search` it's a string comprised of criterias separated by `!`. Criterias are `s:` for series, `y:` for year et `t:` for tag. Example, all songs with tags 53 and 1022 and year 1990 is `t:53,1022!y:1990`
 * @apiParam {Number} [random] If specified, will return a `number` random list of songs
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
 *               <See public/karas/:id object>
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
 * @apiError SONG_LIST_ERROR Unable to fetch list of karaokes
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappOpen, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			// if the query has a &filter=xxx
			// then the playlist returned gets filtered with the text.
			try {
				const karas = await getKaras({
					filter: req.query.filter,
					lang: req.lang,
					from: +req.query.from || 0,
					size: +req.query.size || 9999999,
					mode: req.query.searchType,
					modeValue: req.query.searchValue,
					token: req.authToken,
					random: req.query.random
				});
				res.json(OKMessage(karas));
			} catch(err) {
				res.statusCode = 500;
				res.json(errMessage('SONG_LIST_ERROR',err));
			}
		});
	router.route('/public/karas/:kid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
	/**
 * @api {get} /public/karas/:kid Get song info from database
 * @apiName GetKaraInfo
 * @apiVersion 2.5.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} kid Karaoke ID you want to fetch information from
 * @apiSuccess {Object[]} data/authors Karaoke authors' names
 * @apiSuccess {Number} data/created_at In `Date()` format
 * @apiSuccess {Object[]} data/creators Show's creators names
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (`EngineMaxDejaVuTime` defaults to 60 minutes)
 * @apiSuccess {Number} data/flag_favorites `true` if the song is in the user's favorites, `false`if not.
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {uuid} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {Object[]} data/languages Song's languages in ISO639-2B format
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Date} data/lastplayed_at When the song has been played last, in `Date()` format
 * @apiSuccess {Interval} data/lastplayed_ago When the song has been played last, in hours/minutes/seconds ago
 * @apiSuccess {Object[]} data/misc_tags Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/previewfile Filename of the preview file associated with the karaoke. Can be undefined if the preview hasn't been generated yet by the server.
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {Object[][]} data/serie_i18n array of array of JSON objects with series' names depending on their language.
 * @apiSuccess {String[]} data/serie_altname Alternative name(s) of series/show this song belongs to
 * @apiSuccess {String} data/serie_orig Original name for the series
 * @apiSuccess {Object[]} data/singers Singers' names, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {Object[]} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/mediafile Media's filename
 * @apiSuccess {Number} data/played Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "authors": [
 *               {
 *                   "i18n": {},
 *                   "name": "Nock",
 *                   "pk_id_tag": 144,
 *                   "slug": "nock",
 *                   "tagtype": 6
 *               }
 *           ],
 *           "created_at": "2018-09-12T08:41:38.000Z",
 *           "creators": [
 *               {
 *                   "i18n": {},
 *                   "name": "Toei Animation",
 *                   "pk_id_tag": 55,
 *                   "slug": "toei-animation",
 *                   "tagtype": 4
 *               },
 *               {
 *                   "i18n": {},
 *                   "name": "Saban",
 *                   "pk_id_tag": 226,
 *                   "slug": "saban",
 *                   "tagtype": 4
 *               }
 *           ],
 *           "duration": 29,
 *           "flag_dejavu": false,
 *           "flag_favorites": false,
 *           "gain": 6.34,
 *           "karafile": "ENG - Dokidoki! PreCure - OP - Glitter Force Doki Doki Theme Song.kara",
 *           "kid": "aa252a23-c5b5-43f3-978e-f960b6bb1ef1",
 *           "languages": [
 *               {
 *                   "i18n": {},
 *                   "name": "eng",
 *                   "pk_id_tag": 47,
 *                   "slug": "eng",
 *                   "tagtype": 5
 *               }
 *           ],
 *           "languages_i18n": [
 *               "Anglais"
 *           ],
 *           "lastplayed_at": null,
 *           "lastplayed_ago": null,
 *           "mediafile": "ENG - Dokidoki! PreCure - OP - Glitter Force Doki Doki Theme Song.mp4",
 * 			 "mediasize": 29375831,
 *           "misc_tags": [
 *               {
 *                   "i18n": {
 *                       "en": "Anime",
 *                       "fr": "Anime"
 *                   },
 *                   "name": "TAG_ANIME",
 *                   "pk_id_tag": 3,
 *                   "slug": "tag_anime",
 *                   "tagtype": 7
 *               },
 *               {
 *                   "i18n": {
 *                       "en": "TV Show",
 *                       "fr": "Série TV"
 *                   },
 *                   "name": "TAG_TVSHOW",
 *                   "pk_id_tag": 4,
 *                   "slug": "tag_tvshow",
 *                   "tagtype": 7
 *               },
 *               {
 *                   "i18n": {
 *                       "en": "Magical girl",
 *                       "fr": "Magical girl"
 *                   },
 *                   "name": "TAG_MAGICALGIRL",
 *                   "pk_id_tag": 225,
 *                   "slug": "tag_magicalgirl",
 *                   "tagtype": 7
 *               },
 *               {
 *                   "i18n": {
 *                       "en": "Creditless",
 *                       "fr": "Creditless"
 *                   },
 *                   "name": "TAG_CREDITLESS",
 *                   "pk_id_tag": 14,
 *                   "slug": "tag_creditless",
 *                   "tagtype": 7
 *               }
 *           ],
 *           "modified_at": "2018-11-14T21:31:36.000Z",
 *           "played": "0",
 * 			 "previewfile": "abcdef.1023.mp4"
 *           "requested": "0",
 *           "serie": "Dokidoki! PreCure",
 *           "serie_altname": [
 *               [
 *                   "Glitter Force Doki Doki",
 *                   "precure10"
 *               ]
 *           ],
 *           "serie_i18n": [
 *               [
 *                   {
 *                       "lang": "eng",
 *                       "name": "Dokidoki! PreCure"
 *                   },
 *                   {
 *                       "lang": "kor",
 *                       "name": "????! ????"
 *                   },
 *                   {
 *                       "lang": "jpn",
 *                       "name": "????! ?????"
 *                   }
 *               ]
 *           ],
 *           "serie_id": [
 *               43
 *           ],
 *           "seriefiles": [
 *               "Dokidoki! PreCure.series.json"
 *           ],
 *           "singers": [
 *               {
 *                   "i18n": {},
 *                   "name": "Blush",
 *                   "pk_id_tag": 224,
 *                   "slug": "blush",
 *                   "tagtype": 2
 *               }
 *           ],
 *           "songorder": null,
 *           "songtype": [
 *               {
 *                   "i18n": {
 *                       "en": "Opening",
 *                       "fr": "Opening"
 *                   },
 *                   "name": "TYPE_OP",
 *                   "pk_id_tag": 10,
 *                   "slug": "type_op",
 *                   "tagtype": 3
 *               }
 *           ],
 *           "songwriters": [
 *               {
 *                   "i18n": {},
 *                   "name": "Noam Kaniel",
 *                   "pk_id_tag": 227,
 *                   "slug": "noam-kaniel",
 *                   "tagtype": 8
 *               }
 *           ],
 *           "subfile": "ENG - Dokidoki! PreCure - OP - Glitter Force Doki Doki Theme Song.ass",
 *           "title": "Glitter Force Doki Doki Theme Song",
 *           "year": 2017
 *       }
 *   ]
 * }
 * @apiError SONG_VIEW_ERROR Unable to list songs
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "SONG_VIEW_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const kara = await getKara(req.params.kid,req.authToken,req.lang);
				res.json(OKMessage(kara));
			} catch(err) {
				res.status(500).json(errMessage('SONG_VIEW_ERROR',err));
			}
		})
	/**
 * @api {post} /public/karas/:kid Add karaoke to current/public playlist
 * @apiName PostKaras
 * @apiVersion 2.5.0
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
 * @apiSuccess {String} data See `args` above.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "kara": "Dragon Screamer",
 *       "kid": "kid",
 *       "playlist": "Courante",
 *       "playlist_id": 1
 *   },
 *   "code": "PLAYLIST_MODE_SONG_ADDED",
 *   "data": {
 *       "kara": "Dragon Screamer",
 *       "kid": "kid",
 *       "playlist": "Courante",
 *       "playlist_id": 1
 *   }
 * }
 * @apiError PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED User asked for too many karaokes already.
 * @apiError PLAYLIST_MODE_ADD_SONG_ERROR_ALREADY_ADDED All songs are already present in playlist
 * @apiError PLAYLIST_MODE_ADD_SONG_ERROR_BLACKLISTED Song is blacklisted and cannot be added
 * @apiError PLAYLIST_MODE_ADD_SONG_ERROR General error while adding song
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": {
 *       "kid": "uuid",
 *       "playlist": 1,
 *       "user": "Axel"
 *   },
 *   "code": "PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED",
 *   "message": "User quota reached"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.post(getLang, requireAuth, requireWebappOpen, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			// Add Kara to the playlist currently used depending on mode
			try {
				const data = await addKaraToPlaylist(req.params.kid, req.authToken.username);
				emitWS('playlistContentsUpdated',data.playlist_id);
				emitWS('playlistInfoUpdated',data.playlist_id);
				res.status(201).json(OKMessage(data,'PLAYLIST_MODE_SONG_ADDED',data));
			} catch(err) {
				res.status(500).json(errMessage(err.code,err.message,err.data));
			}

		});

	router.route('/public/karas/:kid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/lyrics')
	/**
 * @api {post} /public/karas/:kid/lyrics Get song lyrics
 * @apiName GetKarasLyrics
 * @apiVersion 2.5.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} kid Karaoke ID to get lyrics from
 * @apiSuccess {String[]} data Array of strings making the song's lyrics
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": "Lyrics for this song are not available"
 * }
 * @apiError LYRICS_VIEW_ERROR Unable to fetch lyrics data
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 * {
 *   "code": "PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED"
 * }
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const kara = await getKaraLyrics(req.params.kid);
				res.json(OKMessage(kara));
			} catch(err) {
				res.status(500).json(errMessage('LYRICS_VIEW_ERROR',err.message,err.data));
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

		router.route('/public/playlists/current/karas')
		/**
	 * @api {get} /public/playlists/current/karas Get list of karaokes in the current playlist
	 * @apiName GetPlaylistKarasCurrent
	 * @apiVersion 2.5.0
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
	 *                <See admin/playlists/[id]/karas/[plc_id] object>
	 *           }
	 *       ],
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
	 * @apiVersion 2.3.1
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
	 * 				<See /admin/playlists/[id]/karas/[plc_id] object>
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
					const data = await deleteKaraFromPlaylist(req.params.plc_id,null,req.authToken);
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
					const data = await deleteKaraFromPlaylist(req.params.plc_id, null, req.authToken);
					emitWS('playlistContentsUpdated', data.pl_id);
					emitWS('playlistInfoUpdated', data.pl_id);
					res.json(OKMessage(null, 'PL_SONG_DELETED', data.pl_name));
				} catch(err) {
					res.status(500).json(errMessage('PL_DELETE_SONG_ERROR', err.message, err.data));
				}
			});

}