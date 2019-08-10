import { Router } from "express";
import { getLang } from "../../middlewares/lang";
import { requireAuth, requireValidUser, requireAdmin, updateUserLoginTime } from "../../middlewares/auth";
import { shutdown } from "../../../services/engine";
import { getConfig } from "../../../lib/utils/config";
import { editSetting } from "../../../utils/config";
import { getDisplays } from "../../../utils/displays";
import { OKMessage, errMessage } from "../../common";
import { checkForUpdates } from "../../../services/appUpdates";


export default function adminMiscController(router: Router) {
	/**
 * @api {post} /admin/shutdown Shutdown the entire application
 * @apiDescription
 * Shutdowns application completely. Kind of a self-destruct button.
 * @apiName PostShutdown
 * @apiGroup Main
 * @apiVersion 2.1.0
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
	router.route('/admin/shutdown')
	.post(getLang, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		// Sends command to shutdown the app.
		try {
			await shutdown();
			res.json('Shutdown in progress');
		} catch(err) {
			res.status(500).json(err);
		}
	});

	router.route('/admin/settings')
	/**
 * @api {get} /admin/settings Get settings
 * @apiName GetSettings
 * @apiVersion 3.0.0
 * @apiGroup Main
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {Object} data Contains all configuration settings. See documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *    "data": {
 *	"config": {
 *	 App: {
 *		FirstRun: true,
 *		InstanceID: 'Change me',
 *		JwtSecret: 'Change me'
 *	},
 *	Database: {
 *		'sql-file': true,
 *		defaultEnv: 'prod',
 *		prod: {
 *			driver: 'pg',
 *			user: 'karaokemugen_app',
 *			password: 'musubi',
 *			host: 'localhost',
 *			port: 6559,
 *			database: 'karaokemugen_app',
 *			schema: 'public',
 *			superuser: 'postgres',
 *			superuserPassword: null,
 *			bundledPostgresBinary: true
 *		}
 *	},
 *	Online: {
 *		Host: 'kara.moe',
 *		Stats: undefined,
 *		URL: true,
 *		Users: true,
 *      Updates: true,
 *      LatestURL: 'http://mugen.karaokes.moe/downloads/latest';
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
 *	System: {
 *		Binaries: {
 *			Player: {
 *				Linux: '/usr/bin/mpv',
 *				OSX: 'app/bin/mpv.app/Contents/MacOS/mpv',
 *				Windows: 'app/bin/mpv.exe'
 *			},
 *			ffmpeg: {
 *				Linux: '/usr/bin/ffmpeg',
 *				OSX: 'app/bin/ffmpeg',
 *				Windows: 'app/bin/ffmpeg.exe'
 *			},
 *			Postgres: {
 *				Windows: 'app/bin/postgres/bin/',
 *				OSX: 'app/bin/postgres/bin/',
 *				Linux: 'app/bin/postgres/bin/',
 *			}
 *		},
 *		Path: {
 *			Avatars: 'app/avatars',
 *			Backgrounds: 'app/backgrounds',
 *			Bin: 'app/bin',
 *			Import: 'app/import',
 *			Jingles: 'app/jingles',
 *			Karas: 'app/data/karas',
 *			Medias: 'app/data/medias',
 *			MediasHTTP: '',
 *			Previews: 'app/previews',
 *			Series: 'app/data/series',
 *			Subs: 'app/data/lyrics',
 *          Tags: 'app/data/tags',
 * 			Temp: 'app/temp',
 *			DB: 'app/db'
 *		}
 *	}
 * },
 * version: {
 * 		number: '3.0.0-next',
 * 		name: 'Leafa Lumineuse'
 * }
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, (_req: any, res: any) => {
			res.json(OKMessage(getConfig()));
		})
	/**
 * @api {put} /admin/settings Update settings
 * @apiName PutSettings
 * @apiVersion 2.5.0
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
				res.json(OKMessage(publicSettings,'SETTINGS_UPDATED'));
			} catch(err) {
				res.status(500).json(errMessage('SETTINGS_UPDATE_ERROR',err));
			}
		});

/**
 * @api {get} /admin/displays get displays
 * @apiName GetDisplays
 * @apiVersion 3.0.0
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiGroup Main
 * @apiSuccess {Object} data contains displays.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
	router.route('/admin/displays')
		.get(getLang, requireAuth, requireValidUser, requireAdmin, async (_req:any, res:any) => {
			const displays = await getDisplays();
			res.json(OKMessage(displays));
		});

/**
 * @api {get} /admin/checkUpdates Get latest KM version
 * @apiName GetLatestVersion
 * @apiVersion 3.0.0
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiGroup Main
 * @apiSuccess {String} data Latest version if there is a newer available. `null` if error or no new version available.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
	router.route('/admin/checkUpdates')
		.get(getLang, requireAuth, requireValidUser, requireAdmin, async (_req:any, res:any) => {
			const version = await checkForUpdates();
			res.json(OKMessage(version));
		});

}