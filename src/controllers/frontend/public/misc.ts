import { Router } from "express";
import { OKMessage, errMessage } from "../../common";
import { getPublicConfig } from "../../../utils/config";
import { getState, getPublicState } from "../../../utils/state";
import { getLang } from "../../middlewares/lang";
import { requireAuth, requireValidUser, updateUserLoginTime } from "../../middlewares/auth";
import { getKMStats } from "../../../services/engine";
import { findUserByName, updateSongsLeft } from "../../../services/user";
import { requireWebappLimited } from "../../middlewares/webapp_mode";
import { getSeries } from "../../../services/series";
import { getYears } from "../../../services/kara";
import { getTags } from "../../../services/tag";
import { getFeeds } from "../../../webapp/proxy_feeds";
import { initializationCatchphrases } from '../../../utils/constants';
import sample from 'lodash.sample';
import { playPlayer } from "../../../services/player";

export default function publicMiscController(router: Router) {
	router.route('/public/settings')
	/**
 * @api {get} /public/settings Get settings (public)
 * @apiName GetSettingsPublic
 * @apiVersion 2.5.0
 * @apiGroup Main
 * @apiPermission public
 * @apiHeader none
 * @apiDescription Contrary to `admin/settings` path, this one doesn't return things like paths, binaries and other internal settings.
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *    "data": {
 *	"config": {
 *	 App: {
 *		FirstRun: true
 *	},
 *	Online: {
 *		Host: 'kara.moe',
 *		Stats: undefined,
 *		URL: true,
 *		Users: true
 *	},
 *	Frontend: {
 *		Port: 1337,
 *		AuthExpireTime: 15,
 *		Mode: 2,
 *		SeriesLanguageMode: 3,
 *		Permissions: {
 *			AllowViewBlacklist: true,
 *			AllowViewBlackListCriterias: true,
 *			AllowViewWhiteList: true,
 *		}
 *	},
 *	Karaoke: {
 *		Autoplay: false,
 *		CreatePreviews: false,
 *		JinglesInterval: 20,
 *		Private: true,
 *		RepeatPlaylist: false,
 *		SmartInsert: false,
 *		Display: {
 *			Nickname: false,
 *			ConnectionInfo: false,
 *			ConnectionInfoQRCode: false,
 *			ConnectionInfoMessage: '',
 *			ConnectionInfoHost: false
 *		},
 *		Poll: {
 *			Choices: 4,
 *			Enabled: false,
 *			Timeout: 30
 *		},
 *		Quota: {
 *			FreeAutoTime: 60,
 *			FreeUpVote: true,
 *			FreeUpVoteRequiredMin: 3,
 *			FreeUpVoteRequiredPercent: 33,
 *			Songs: 10000,
 *			Time: 10000,
 *			Type: 0,
 *		}
 *	},
 *	Player: {
 *		mpvVideoOutput: '',
 *		Background: '',
 *		FullScreen: false,
 *		Monitor: false,
 *		NoBar: true,
 *		NoHud: true,
 *		Screen: 0,
 *		StayOnTop: true,
 *		PIP: {
 *			Enabled: true,
 *			PositionX: 'Right',
 *			PositionY: 'Bottom',
 *			Size: 30,
 *		}
 *	},
 *	Playlist: {
 *		AllowDuplicates: false,
 *		MaxDejaVuTime: 60,
 *		RemovePublicOnPlay: false
 *	},
 * },
 * version: {
 * 		number: '2.5-next',
 * 		name: 'Konata Karaokiste'
 * }
 * }
 */
		.get(async (_req: any, res: any) => {
			//We don't want to return all settings.
			res.json(OKMessage({
				config: getPublicConfig(),
				version: getState().version
			}));
		});
	router.route('/public/stats')
	/**
 * @api {get} /public/stats Get statistics
 * @apiName GetStats
 * @apiVersion 2.1.0
 * @apiGroup Main
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Returns various stats on the current Karaoke Mugen instance
 * @apiSuccess {Number} totalartists Total number of artists in database
 * @apiSuccess {Number} totalcount Total number of karaokes in database
 * @apiSuccess {Number} totalduration Sum of all karaoke durations in seconds.
 * @apiSuccess {Number} totallanguages Total number of different languages in database
 * @apiSuccess {Number} totalplaylists Total number of playlists in database
 * @apiSuccess {Number} totalseries Total number of series in database
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *    "data": {
 *        "totalartists": 542,
 *        "totalcount": 4924,
 *        "totalduration": 0,
 *        "totallanguages": 16,
 *        "totalplaylists": 5,
 *        "totalseries": 2525
 *    }
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const stats = await getKMStats();
				const userData = await findUserByName(req.authToken.username);
				updateSongsLeft(userData.login);
				res.json(OKMessage(stats));
			} catch(err) {
				res.status(500).json(errMessage('STATS_ERROR',err));
			}
		});

	router.route('/public/player')
		/**
	 * @api {get} /public/player Get player status
	 * @apiName GetPlayer
	 * @apiVersion 2.5.0
	 * @apiGroup Player
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiDescription Player info is updated very frequently. You can poll it to get precise information from player and engine altogether.
	 * @apiSuccess {String} data/currentlyPlaying Karaoke ID of song being played
	 * @apiSuccess {Number} data/duration Current's song duration in seconds
	 * @apiSuccess {Boolean} data/fullscreen Player's fullscreen status
	 * @apiSuccess {Boolean} data/muteStatus Player's volume mute status
	 * @apiSuccess {Boolean} data/onTop Player's Always-on-top status
	 * @apiSuccess {String=pause,stop,play} data/playerStatus Player's status (not to mistake with engine's status, see below). Player status is `pause` if displaying a background.
	 * @apiSuccess {Boolean} data/private Engine's public/private status
	 * @apiSuccess {Boolean} data/showSubs Player's showing subtitles or not
	 * @apiSuccess {String=pause,play,stop} data/status Engine's status
	 * @apiSuccess {Boolean} data/onTop Player's Always-on-top status
	 * @apiSuccess {String} data/subText Text/lyrics being displayed on screen
	 * @apiSuccess {Number} data/timePosition Player's current position in the song.
	 * @apiSuccess {Number} data/volume Volume (from `0` to `100`)
	 * Example Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 *       "currentlyPlaying": "<Karaoke UUID>",
	 *       "duration": 0,
	 *       "fullscreen": false,
	 *       "muteStatus": false,
	 *       "onTop": true,
	 *       "playerStatus": "pause",
	 *       "private": true,
	 *       "showSubs": true,
	 *       "status": "stop",
	 *       "subText": null,
	 *       "timePosition": 0,
	 *       "volume": 100
	 *   }
	 * }
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "PLAYER_STATUS_ERROR"
	 * }
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (_req: any, res: any) => {
			// Get player status
			// What's playing, time in seconds, duration of song
			res.json(OKMessage(getPublicState()));
		});
	router.route('/public/player/play')
	/**
	 * @api {post} /public/player/play Start a song (classic mode)
	 * @apiName PlayPlayer
	 * @apiVersion 3.0.0
	 * @apiGroup Player
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiDescription User hits play when its his/her turn to sing when classic mode is enabled
	 * Example Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "USER_NOT_ALLOWED_TO_SING"
	 * }
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */
		.post(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			if (req.authToken.username === getState().currentRequester) {
				await playPlayer(true);
				res.status(200).json();
			} else {
				res.status(500).json(errMessage('USER_NOT_ALLOWED_TO_SING'))
			}
		});
	router.route('/public/tags')
	/**
	* @api {get} /public/tags Get tag list
	* @apiName GetTags
	* @apiVersion 3.0.0
	* @apiGroup Tags
	* @apiPermission public
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {Number} [type] Type of tag to filter
	* @apiParam {String} [filter] Tag name to filter results
	* @apiParam {Number} [from] Where to start listing from
	* @apiParam {Number} [size] How many records to get.
	* @apiSuccess {String} data/name Name of tag
	* @apiSuccess {Number} data/tid Tag ID (UUID)
	* @apiSuccess {Number} data/types Tag types numbers in an array
	* @apiSuccess {String} data/short Short version of the tag, max 3 chracters. Used to display next to a song item
	* @apiSuccess {Object} data/i18n Translations in case of misc, languages and song type tags
	*
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*     "data": {
	*		content: [
	*        {
	*            "i18n": {
	* 				"eng": "TV Show",
	*				"fre": "Série TV"
	*			 },
	*            "name": "TV Show",
	*            "short": "TV"
	*            "tid": "13cb4509-6cb4-43e4-a1ad-417d6ffb75d0",
	*            "types": [2]
	*        },
	*		 ...
	*   	],
	*       "infos": {
	*           "count": 1000,
	* 			"from": 0,
	* 			"to": 120
	*       }
	* }
	* @apiError TAGS_LIST_ERROR Unable to get list of tags
	* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* @apiErrorExample Error-Response:
	* HTTP/1.1 403 Forbidden
	*/
		.get(requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const tags = await getTags({
					filter: req.query.filter,
					type: req.query.type,
					from: +req.query.from || 0,
					size: +req.query.size || 99999
				});
				res.json(OKMessage(tags));
			} catch(err) {
				res.status(500).json(errMessage('TAGS_LIST_ERROR',err));
			}
		});
	router.route('/public/years')
	/**
	* @api {get} /public/years Get year list
	* @apiName GetYears
	* @apiVersion 2.3.0
	* @apiGroup Karaokes
	* @apiPermission public
	* @apiHeader authorization Auth token received from logging in
	* @apiSuccess {String[]} data Array of years
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*     "data": [
	*       {
	*			"year": "1969"
	*		},
	*		 ...
	*   ]
	* }
	* @apiError YEARS_LIST_ERROR Unable to get list of years
	* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* @apiErrorExample Error-Response:
	* HTTP/1.1 403 Forbidden
	*/
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (_req: any, res: any) => {
				try {
					const years = await getYears();
					res.json(OKMessage(years));
				} catch(err) {
					res.statusCode = 500;
					res.json(errMessage('YEARS_LIST_ERROR',err));
				}
			});
	router.route('/public/series')
	/**
	* @api {get} /public/series Get series list
	* @apiName GetSeries
	* @apiVersion 2.5.0
	* @apiGroup Karaokes
	* @apiPermission public
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {String} [filter] Text filter to search series for
	* @apiParam {Number} [from] Where to start listing from
	* @apiParam {Number} [size] How many records to get.
	* @apiSuccess {Array} data Array of series
	* @apiSuccess {Number} data/serie_id Serie ID in the database
	* @apiSuccess {String} data/name Serie's original name
	* @apiSuccess {String} data/i18n_name Serie's name in the provided language (fallback to English)
	* @apiSuccess {Number} data/karacount Number of karaokes for that series
	* @apiSuccess {String} data/sid UUID of series
	* @apiSuccess {String} data/seriefile Name of `series.json` file
	* @apiSuccess {Object[]} data/i18n Array of i18n objects
	* @apiSuccess {String} data/i18n/lang ISO639-2B Language code for the series' name
	* @apiSuccess {String} data/i18n/name name Series' name in that language
	* @apiSuccess {String[]} data/aliases Array of aliases
	* @apiSuccess {Object} data/i18n JSON object for the series translations
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*     "data": {
	*        "contents": [
	*        {
	*        "aliases": [
	*            "Tenshi no Nichou Kenjuu: Angelos Armas"
	*        ],
	*        "i18n": [
	*            {
	*                "lang": "eng",
	*                "name": "Angelos Armas"
	*            },
	*            {
	*                "lang": "jpn",
	*                "name": "??????? -Angelos Armas-"
	*            }
	*        ],
	*        "i18n_name": "Angelos Armas",
	*        "karacount": 3,
	*        "name": "Tenshi no Nichô Kenjû: Angelos Armas",
	*        "seriefile": "Tenshi no Nichou Kenjuu Angelos Armas.series.json",
	*		 "sid": "c87a7f7b-20cf-4d7d-98fb-722910f4eec6"
	*		},
	*		...
	*		],
	*       "infos": {
	*           "count": 1000,
	* 			"from": 0,
	* 			"to": 120
	*       }
	* }
	* @apiError SERIES_LIST_ERROR Unable to get series list
	* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* @apiErrorExample Error-Response:
	* HTTP/1.1 403 Forbidden
	*/
	.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const series = await getSeries({
					filter: req.query.filter,
					lang: req.lang,
					from: +req.query.from || 0,
					size: +req.query.size || 999999
				});
				res.json(OKMessage(series));
			} catch(err) {
				res.status(500).json(errMessage('YEARS_LIST_ERROR',err));
			}
		});
	router.route('/public/newsfeed')
		/**
	 * @api {get} /public/newsfeed Get latest KM news
	 * @apiName GetNews
	 * @apiVersion 2.4.0
	 * @apiGroup Misc
	 * @apiPermission NoAuth
	 * @apiSuccess {Array} Array of news objects (`name` as string, and `body` as RSS turned into JSON) `body` is `null` if RSS feed could not be obtained.
	 */
		.get(getLang, async (_req: any, res: any) => {
				try {
					const result = await getFeeds();
					res.json(result);
				} catch(err) {
					res.status(500).send(err);
				}
			});

	router.route('/public/catchphrase')
		/**
	 * @api {get} /public/catchphrase Get a random Catchphrase
	 * @apiName GetCatchPhrase
	 * @apiVersion 3.0.0
	 * @apiGroup Misc
	 * @apiPermission NoAuth
	 * @apiSuccess a random catchphrase
	 */
		.get(getLang, async (_req: any, res: any) => {
				res.json(sample(initializationCatchphrases));
		});
}