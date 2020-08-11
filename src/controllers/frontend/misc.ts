import { Router } from 'express';
import sample from 'lodash.sample';

import { getKMStats,shutdown } from '../../components/engine';
import { generateDB } from '../../dao/database';
import { generateDatabase } from '../../lib/services/generation';
import { getConfig } from '../../lib/utils/config';
import { browseFs } from '../../lib/utils/files';
import {enableWSLogging, readLog} from '../../lib/utils/logger';
import { getFeeds } from '../../services/proxyFeeds';
import { updateSongsLeft } from '../../services/user';
import { backupConfig,editSetting, getPublicConfig } from '../../utils/config';
import { initializationCatchphrases } from '../../utils/constants';
import { getDisplays } from '../../utils/displays';
import { dumpPG, restorePG } from '../../utils/postgresql';
import { getPlayerState, getPublicState,getState } from '../../utils/state';
import { APIMessage,errMessage } from '../common';
import { optionalAuth,requireAdmin, requireAuth, requireValidUser, updateUserLoginTime } from '../middlewares/auth';
import { getLang } from '../middlewares/lang';
import { requireWebappLimited } from '../middlewares/webapp_mode';

export default function miscController(router: Router) {
	/**
 * @api {post} /shutdown Shutdown the entire application
 * @apiDescription
 * Shutdowns application completely. Kind of a self-destruct button.
 * @apiName PostShutdown
 * @apiGroup Main
 * @apiVersion 3.1.0
 *
 * @apiHeader authorization Auth token received from logging in
 * @apiPermission admin
 * @apiSuccess {String} Shutdown in progress.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * "Shutdown in progress."
 *
 */
	router.route('/shutdown')
		.post(getLang, requireAuth, requireValidUser, requireAdmin, (_req: any, res: any) => {
		// Sends command to shutdown the app.
			try {
				shutdown();
				res.status(200).json();
			} catch(err) {
				res.status(500).json(err);
			}
		});

	router.route('/settings')
	/**
 * @api {get} /settings Get settings
 * @apiName GetSettings
 * @apiVersion 3.1.0
 * @apiGroup Main
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {Object} data Contains all configuration settings. See documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   config: <See Config object>,
 *   version: {
 * 			name: "Axel Acrobate"
 * 			number: "26.1.1"
 * 			image: "AxelAcrobate.jpg"
 * 		},
 *   state: {
 * 		publicPlaylistID: 38291
 *   }
 * }
 */
		.get(getLang, optionalAuth, (req: any, res: any) => {
			const response = {
				version: getState().version,
				config: null,
				state: getPublicState(req.user?.type === 0)
			};
			response.config = (req.user?.type === 0)
				? getConfig()
				: getPublicConfig();
			res.json(response);
		})
	/**
 * @api {put} /settings Update settings
 * @apiName PutSettings
 * @apiVersion 3.1.0
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiGroup Main
 * @apiDescription **Note :** Contrary to previous versions of Karaoke Mugen, you only need to send the setting you want to modify.
 * @apiParam {Object} setting Object containing one or more settings to be merged into the new config. For example, if you want to disable the view blacklist permission, send `{Frontend: {Permissions: { AllowViewBlacklist: false}}}`. Check configuration documentation for more information.
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			//Update settings
			try {
				const setting = typeof req.body.setting === 'string'
					? JSON.parse(req.body.setting)
					: req.body.setting;
				const publicSettings = await editSetting(setting);
				res.json(publicSettings);
			} catch(err) {
				const code = 'SETTINGS_UPDATE_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/displays')
	/**
 * @api {get} /displays get displays
 * @apiName GetDisplays
 * @apiVersion 3.1.0
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiGroup Main
 * @apiSuccess {Object} data contains displays.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
		.get(getLang, requireAuth, requireValidUser, requireAdmin, async (_req:any, res:any) => {
			const displays = await getDisplays();
			res.json(displays);
		});
	router.route('/stats')
	/**
 * @api {get} /stats Get statistics
 * @apiName GetStats
 * @apiVersion 3.1.0
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
 *        "totalartists": 542,
 *        "totalcount": 4924,
 *        "totalduration": 0,
 *        "totallanguages": 16,
 *        "totalplaylists": 5,
 *        "totalseries": 2525
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const stats = await getKMStats();
				updateSongsLeft(req.authToken.username);
				res.json(stats);
			} catch(err) {
				const code = 'STATS_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});

	router.route('/player')
	/**
	 * @api {get} /player Get player status
	 * @apiName GetPlayer
	 * @apiVersion 3.1.0
	 * @apiGroup Player
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiDescription Player info is updated very frequently. You can poll it to get precise information from player and engine altogether.
	 * @apiSuccess {String} data/currentlyPlaying Karaoke ID of song being played
	 * @apiSuccess {Number} data/duration Current's song duration in seconds
	 * @apiSuccess {Boolean} data/fullscreen Player's fullscreen status
	 * @apiSuccess {Boolean} data/mute Player's volume mute status
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
	 *       "currentlyPlaying": "<Karaoke UUID>",
	 *       "duration": 0,
	 *       "fullscreen": false,
	 *       "mute": false,
	 *       "onTop": true,
	 *       "playerStatus": "pause",
	 *       "private": true,
	 *       "showSubs": true,
	 *       "status": "stop",
	 *       "subText": null,
	 *       "timePosition": 0,
	 *       "volume": 100
	 * }
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * "PLAYER_STATUS_ERROR"
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, (_req: any, res: any) => {
			// Get player status
			// What's playing, time in seconds, duration of song
			res.json(getPlayerState());
		});

	router.route('/newsfeed')
		/**
	 * @api {get} /newsfeed Get latest KM news
	 * @apiName GetNews
	 * @apiVersion 3.1.0
	 * @apiGroup Misc
	 * @apiHeader authorization Auth token received from logging in
	 * @apiPermission NoAuth
	 * @apiSuccess {Array} Array of news objects (`name` as string, and `body` as RSS turned into JSON) `body` is `null` if RSS feed could not be obtained.
	 */
		.get(getLang, async (_req: any, res: any) => {
			try {
				res.json(await getFeeds());
			} catch(err) {
				res.status(500).json();
			}
		});

	router.route('/catchphrase')
		/**
	 * @api {get} /catchphrase Get a random Catchphrase
	 * @apiName GetCatchPhrase
	 * @apiVersion 3.1.0
	 * @apiGroup Misc
	 * @apiHeader authorization Auth token received from logging in
	 * @apiPermission NoAuth
	 * @apiSuccess a random catchphrase
	 */
		.get(getLang, (_req: any, res: any) => {
			res.json(sample(initializationCatchphrases));
		});

	router.route('/log/:level')
	/**
	 * @api {get} /log/:level Get KM logs
	 * @apiParam {string} level
	 * @apiName GetLogs
	 * @apiVersion 3.1.0
	 * @apiGroup Misc
	 * @apiHeader authorization Auth token received from logging in
	 * @apiPermission admin
	 * @apiSuccess {object[]} The current day's log file.
	 */
		.get(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				// Align socket
				enableWSLogging(req.params.level);
				res.status(200).json(await readLog(req.params.level));
			} catch(err) {
				res.status(500).json(APIMessage('ERROR_READING_LOGS'));
			}
		});

	router.route('/settings/backup')
	/**
	 * @api {post} /settings/backup Create backup of your config file
	 * @apiName BackupConfig
	 * @apiVersion 3.1.0
	 * @apiGroup Misc
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.post(requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				await backupConfig();
				res.status(200).json(APIMessage('CONFIG_BACKUPED'));
			} catch(err) {
				res.status(500).json(APIMessage('CONFIG_BACKUPED_ERROR'));
			}
		});

	router.route('/db/generate')
	/**
	 * @api {post} /db/generate Trigger manual DB generation
	 * @apiName PostGenerate
	 * @apiVersion 3.1.0
	 * @apiGroup Misc
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.post(requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				await generateDB();
				res.status(200).json(APIMessage('DATABASE_GENERATED'));
			} catch(err) {
				const code = 'DATABASE_GENERATED_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/db/validate')
		/**
		 * @api {post} /db/validate Trigger manual file validation process
		 * @apiName PostGenerate
		 * @apiVersion 3.3.0
		 * @apiGroup Misc
		 * @apiPermission admin
		 * @apiHeader authorization Auth token received from logging in
		 * @apiSuccessExample Success-Response:
		 * HTTP/1.1 200 OK
		 * {code: 'FILES_VALIDATED'}
		 * @apiErrorExample Error-Response:
		 * HTTP/1.1 500 Internal Server Error
		 * {code: 'FILES_VALIDATED_ERROR'}
		 */
		.post(requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				await generateDatabase({
					validateOnly: true
				});
				res.status(200).json(APIMessage('FILES_VALIDATED'));
			} catch(err) {
				const code = 'FILES_VALIDATED_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/db')
	/**
	 * @api {get} /db Dump database to a file
	 * @apiName GetDB
	 * @apiVersion 3.1.0
	 * @apiGroup Misc
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.get(requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				await dumpPG();
				res.status(200).json(APIMessage('DATABASE_DUMPED'));
			} catch(err) {
				res.status(500).json(APIMessage('DATABASE_DUMPED_ERROR'));
			}
		})
	/**
	 * @api {post} /db Restore database from file
	 * @apiName PostDB
	 * @apiVersion 3.1.0
	 * @apiGroup Misc
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.post(requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				await restorePG();
				res.status(200).json(APIMessage('DATABASE_RESTORED'));
			} catch(err) {
				res.status(500).json(APIMessage('DATABASE_RESTORED_ERROR'));
			}
		});
	router.route('/fs')
	/**
	 * @api {post} /fs Get filesystem contents
	 * @apiName PostFS
	 * @apiVersion 3.1.0
	 * @apiGroup Misc
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {string} path Path to browse
	 * @apiParam {boolean} [onlyMedias=false] Only display media files
	 * @apiSuccess {Object[]} contents Directory contents
	 * @apiSuccess {string} contents/name File/directory name
	 * @apiSuccess {boolean} contents/isDirectory is it a directory?
	 * @apiSuccess {Object[]} drives `null` if not under Windows. on Windows contains an object array with drive data. use `name` of each object to get drive letters present in system.
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.post(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				res.status(200).json(await browseFs(req.body.path, req.body.onlyMedias));
			} catch(err) {
				const code = 'FS_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
}
