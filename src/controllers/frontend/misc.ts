import sample from 'lodash.sample';
import { Socket } from 'socket.io';

import { getKMStats,shutdown } from '../../components/engine';
import { generateDB } from '../../dao/database';
import {getSettings, saveSetting} from '../../lib/dao/database';
import { generateDatabase } from '../../lib/services/generation';
import { APIData } from '../../lib/types/api';
import { getConfig } from '../../lib/utils/config';
import { browseFs } from '../../lib/utils/files';
import { enableWSLogging, readLog } from '../../lib/utils/logger';
import { SocketIOApp } from '../../lib/utils/ws';
import { getFeeds } from '../../services/proxyFeeds';
import { destroyRemote, initRemote } from '../../services/remote';
import { updateSongsLeft } from '../../services/user';
import { backupConfig,editSetting, getPublicConfig } from '../../utils/config';
import { initializationCatchphrases } from '../../utils/constants';
import { getDisplays } from '../../utils/displays';
import { dumpPG, restorePG } from '../../utils/postgresql';
import { getPlayerState, getPublicState,getState } from '../../utils/state';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function miscController(router: SocketIOApp) {
	router.route('getRemoteData', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', { allowInDemo: false, optionalAuth: false });
		try {
			const state = getState();
			if (state.remoteAccess) {
				const settings = await getSettings();
				return { active: true, info: state.remoteAccess, token: settings.remoteToken };
			} else {
				return { active: false };
			}
		} catch (err) {
			throw { code: 500 };
		}
	});
	router.route('resetRemoteToken', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', { allowInDemo: false, optionalAuth: false });
		try {
			await destroyRemote();
			await saveSetting('remoteToken', '');
			await initRemote();
		} catch (err) {
			throw { code: 500 };
		}
	});
	/**
 * @api {post} Shutdown the entire application
 * @apiDescription
 * Shutdowns application completely. Kind of a self-destruct button.
 * @apiName shutdown
 * @apiGroup Main
 * @apiVersion 5.0.0
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
	router.route('shutdown', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			shutdown();
			return;
		} catch(err) {
			throw {code: 500};
		}
	});

	router.route('getSettings', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get settings
 * @apiName getSettings
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'guest', 'closed', {optionalAuth: true});
		return {
			version: getState().version,
			config: req.user?.type === 0
				? getConfig()
				: getPublicConfig(),
			state: getPublicState(req.user?.type === 0)
		};
	});
	router.route('updateSettings', async (socket: Socket, req: APIData) => {
	/**
 * @api {put} Update settings
 * @apiName updateSettings
 * @apiVersion 5.0.0
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiGroup Main
 * @apiDescription **Note :** Contrary to previous versions of Karaoke Mugen, you only need to send the setting you want to modify.
 * @apiParam {Object} setting Object containing one or more settings to be merged into the new config. Check configuration documentation for more information.
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
		await runChecklist(socket, req);
		try {
			return await editSetting(req.body.setting);
		} catch(err) {
			const code = 'SETTINGS_UPDATE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getDisplays', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} get displays
 * @apiName getDisplays
 * @apiVersion 5.0.0
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiGroup Main
 * @apiSuccess {Object} data contains displays.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
		await runChecklist(socket, req);
		return getDisplays();
	});

	router.route('getStats', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get statistics
 * @apiName getStats
 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			return await getKMStats();
		} catch(err) {
			const code = 'STATS_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('refreshUserQuotas', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'user', 'limited');
		updateSongsLeft(req.token.username);
	});

	router.route('getPlayerStatus', async (socket: Socket, req: APIData) => {
	/**
	 * @api {get} Get player status
	 * @apiName getPlayerStatus
	 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'guest', 'limited');
		return getPlayerState();
	});

	router.route('getNewsFeed', async () => {
		/**
	 * @api {get} Get latest KM news
	 * @apiName getNewsFeed
	 * @apiVersion 5.0.0
	 * @apiGroup Misc
	 * @apiHeader authorization Auth token received from logging in
	 * @apiPermission NoAuth
	 * @apiSuccess {Array} Array of news objects (`name` as string, and `body` as RSS turned into JSON) `body` is `null` if RSS feed could not be obtained.
	 */
		try {
			return await getFeeds();
		} catch(err) {
			throw {code: 500};
		}
	});

	router.route('getCatchphrase', async (_socket: Socket, _req: APIData) => {
		/**
	 * @api {get} Get a random Catchphrase
	 * @apiName getCatchphrase
	 * @apiVersion 5.0.0
	 * @apiGroup Misc
	 * @apiHeader authorization Auth token received from logging in
	 * @apiPermission NoAuth
	 * @apiSuccess a random catchphrase
	 */
		return sample(initializationCatchphrases);
	});

	router.route('getLogs', async (socket: Socket, req: APIData) => {
	/**
	 * @api {get} Get KM logs
	 * @apiParam {string} level debug, info, warn, error...
	 * @apiName getLogs
	 * @apiVersion 5.0.0
	 * @apiGroup Misc
	 * @apiHeader authorization Auth token received from logging in
	 * @apiPermission admin
	 * @apiSuccess {object[]} The current day's log file.
	 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			// Align socket
			enableWSLogging(req.body.level);
			socket.join('logs');
			return await readLog(req.body.level);
		} catch(err) {
			throw {code: 500, message: APIMessage('ERROR_READING_LOGS')};
		}
	});

	router.route('backupSettings', async (socket: Socket, req: APIData) => {
	/**
	 * @api {post} Create backup of your config file
	 * @apiName backupSettings
	 * @apiVersion 5.0.0
	 * @apiGroup Misc
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		await runChecklist(socket, req);
		try {
			await backupConfig();
			return APIMessage('CONFIG_BACKUPED');
		} catch(err) {
			throw {code: 500, message: APIMessage('CONFIG_BACKUPED_ERROR')};
		}
	});

	router.route('generateDatabase', async (socket: Socket, req: APIData) => {
	/**
	 * @api {post} Trigger manual DB generation
	 * @apiName generateDatabase
	 * @apiVersion 5.0.0
	 * @apiGroup Misc
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await generateDB();
			return APIMessage('DATABASE_GENERATED');
		} catch(err) {
			const code = 'DATABASE_GENERATED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('validateDatabase', async (socket: Socket, req: APIData) => {
		/**
		 * @api {post} Trigger manual file validation process
		 * @apiName validateDatabase
		 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await generateDatabase({
				validateOnly: true
			});
			return APIMessage('FILES_VALIDATED');
		} catch(err) {
			const code = 'FILES_VALIDATED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('dumpDatabase', async (socket: Socket, req: APIData) => {
	/**
	 * @api {get} Dump database to a file
	 * @apiName dumpDatabase
	 * @apiVersion 5.0.0
	 * @apiGroup Misc
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await dumpPG();
			return APIMessage('DATABASE_DUMPED');
		} catch(err) {
			throw {code: 500, message: APIMessage('DATABASE_DUMPED_ERROR')};
		}
	});

	router.route('restoreDatabase', async (socket: Socket, req: APIData) => {
	/**
	 * @api {post} Restore database from file
	 * @apiName restoreDatabase
	 * @apiVersion 5.0.0
	 * @apiGroup Misc
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await restorePG();
			return APIMessage('DATABASE_RESTORED');
		} catch(err) {
			throw {code: 500, message: APIMessage('DATABASE_RESTORED_ERROR')};
		}
	});
	router.route('getFS', async (socket: Socket, req: APIData) => {
	/**
	 * @api {post} Get filesystem contents
	 * @apiName getFS
	 * @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await browseFs(req.body.path, req.body.onlyMedias);
		} catch(err) {
			const code = 'FS_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
}
