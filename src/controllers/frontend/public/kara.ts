import { Router } from "express";
import { errMessage, OKMessage } from "../../common";
import { getKaraLyrics, getKara, getKaras } from "../../../services/kara";
import { updateUserLoginTime, requireAuth, requireValidUser } from "../../middlewares/auth";
import { requireWebappLimited, requireWebappOpen } from "../../middlewares/webapp_mode";
import { getLang } from "../../middlewares/lang";
import { emitWS } from "../../../lib/utils/ws";
import { addKaraToPlaylist } from "../../../services/playlist";
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
 * @apiVersion 3.0.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiParam {String} [searchType] Can be `search`, `kid`, `requested`, `recent` or `played`
 * @apiParam {String} [searchValue] Value to search for. For `kid` it's a UUID, for `search` it's a string comprised of criterias separated by `!`. Criterias are `s:` for series, `y:` for year et `t:` for tag + type. Example, all songs with tags UUIDs a (singer) and b (songwriter) and year 1990 is `t:a~2,b~8!y:1990`. Refer to tag types to find out which number is which type.
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
 * @apiVersion 3.0.0
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
 * @apiSuccess {Date} data/lastplayed_at When the song has been played last, in `Date()` format
 * @apiSuccess {Interval} data/lastplayed_ago When the song has been played last, in hours/minutes/seconds ago
 * @apiSuccess {Object[]} data/misc_tags Internal tag list (`TAG_VIDEOGAME`, etc.)
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
 *           "gain": 6.34,
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
 *           "played": "0",
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
 * @apiError PLAYLIST_MODE_ADD_SONG_ERROR_NO_DUPLICATE_SERIES_SINGERS No duplicate series or singers are allowed
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


}