import { Router } from 'express';
import { getLang } from '../middlewares/lang';
import { requireAuth, requireValidUser, requireAdmin, updateUserLoginTime, optionalAuth } from '../middlewares/auth';
import { shutdown, getKMStats } from '../../services/engine';
import { getConfig } from '../../lib/utils/config';
import { editSetting, getPublicConfig, backupConfig } from '../../utils/config';
import { getDisplays } from '../../utils/displays';
import { errMessage } from '../common';
import { checkForUpdates } from '../../services/appUpdates';
import { getState, getPlayerState, getPublicState } from '../../utils/state';
import { findUserByName, updateSongsLeft } from '../../services/user';
import { requireWebappLimited } from '../middlewares/webapp_mode';
import { getFeeds } from '../../webapp/proxy_feeds';
import { initializationCatchphrases } from '../../utils/constants';
import sample from 'lodash.sample';
import { readLog } from '../../lib/utils/logger';
import { generateDB } from '../../dao/database';
import { dumpPG, restorePG } from '../../utils/postgresql';
import { browseFs } from '../../lib/utils/files';

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
		.post(getLang, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		// Sends command to shutdown the app.
			try {
				shutdown();
				res.status(200).send('Shutdown in progress');
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
 * 		modePlaylistID: 38291
 *   }
 * }
 */
		.get(getLang, optionalAuth, (req: any, res: any) => {
			const response = {
				version: getState().version,
				config: null,
				state: getPublicState(req.user && req.user.type === 0)
			};
			response.config = (req.user && req.user.type === 0) 
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
				errMessage('SETTINGS_UPDATE_ERROR',err);
				res.status(500).send('SETTINGS_UPDATE_ERROR');
			}
		});

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
	router.route('/displays')
		.get(getLang, requireAuth, requireValidUser, requireAdmin, async (_req:any, res:any) => {
			const displays = await getDisplays();
			res.json(displays);
		});

	/**
 * @api {get} /checkUpdates Get latest KM version
 * @apiName GetLatestVersion
 * @apiVersion 3.1.0
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiGroup Main
 * @apiSuccess {String} data Latest version if there is a newer available. `null` if error or no new version available.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
	router.route('/checkUpdates')
		.get(getLang, requireAuth, requireValidUser, requireAdmin, async (_req:any, res:any) => {
			const version = await checkForUpdates();
			res.json(version);
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
				const userData = await findUserByName(req.authToken.username);
				updateSongsLeft(userData.login);
				res.json(stats);
			} catch(err) {
				errMessage('STATS_ERROR',err);
				res.status(500).send('STATS_ERROR');
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
	 * }
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * "PLAYER_STATUS_ERROR"
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (_req: any, res: any) => {
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
				res.status(500).send(err);
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
		.get(getLang, async (_req: any, res: any) => {
			res.json(sample(initializationCatchphrases));
		});

	router.route('/log')
	/**
	 * @api {get} /log Get KM logs
	 * @apiName GetLogs
	 * @apiVersion 3.1.0
	 * @apiGroup Misc
	 * @apiHeader authorization Auth token received from logging in
	 * @apiPermission admin
	 * @apiSuccess {string} The current day's log file. Have fun parsing it :)
	 */
		.get(requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				res.status(200).send(await readLog());
			} catch(err) {
				res.status(500).send(`Unable to read log file : ${err}`);
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
				res.status(200).send('Configuration file backuped to config.yml.backup');
			} catch(err) {
				res.status(500).send(`Error backuping config file: ${err}`);
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
				res.status(200).send('DB successfully regenerated');
			} catch(err) {
				res.status(500).send(`Error while regenerating DB: ${err}`);
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
				res.status(200).send('Database dumped to karaokemugen.sql');
			} catch(err) {
				res.status(500).send(`Error dumping database : ${err}`);
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
				res.status(200).send('Database restored from karaokemugen.sql');
			} catch(err) {
				res.status(500).send(`Error restoring database : ${err}`);
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
	 * @apiSuccess {Object[]} drivers `null` if not under Windows. on Windows contains an object array with drive data. use `name` of each object to get drive letters present in system.
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.post(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				res.status(200).json(await browseFs(req.body.path, req.body.onlyMedias));
			} catch(err) {
				res.status(500).send(`Error browsing filesystem : ${err}`);
			}
		});
}