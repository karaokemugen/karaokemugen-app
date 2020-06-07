//Node modules
import { app } from 'electron';
import execa from 'execa';
import i18n from 'i18next';
import readlineSync from 'readline-sync';
import logger from 'winston';

import { generateBlacklist } from '../dao/blacklist';
import {compareKarasChecksum,generateDB, getStats, initDBSystem} from '../dao/database';
import { baseChecksum } from '../dao/dataStore';
import { postMigrationTasks } from '../dao/migrations';
import { applyMenu, handleFile } from '../electron/electron';
import { errorStep,initStep } from '../electron/electronLogger';
import {closeDB, getSettings, saveSetting,vacuum} from '../lib/dao/database';
import { generateDatabase as generateKaraBase } from '../lib/services/generation';
//Utils
import {getConfig, setConfig} from '../lib/utils/config';
import { duration } from '../lib/utils/date';
import { asyncExists } from '../lib/utils/files';
import {enableWSLogging,profile} from '../lib/utils/logger';
import {emit, on} from '../lib/utils/pubsub';
import { sentryError } from '../lib/utils/sentry';
import {initBlacklistSystem} from '../services/blacklist';
import {downloadTestSongs,initDownloader, updateAllBases, updateAllMedias} from '../services/download';
import { buildAllMediasList,updatePlaylistMedias } from '../services/medias';
import {initOnlineURLSystem} from '../services/online';
import {initPlayer, quitmpv} from '../services/player';
import {initPlaylistSystem, testPlaylists} from '../services/playlist';
import { initSession } from '../services/session';
import { initStats } from '../services/stats';
import { initUserSystem } from '../services/user';
import { welcomeToYoukousoKaraokeMugen } from '../services/welcome';
import { initDiscordRPC } from '../utils/discordRPC';
import { checkPG, dumpPG, killPG,restorePG } from '../utils/postgresql';
import { getState, setState } from '../utils/state';
import { getTwitchClient, initTwitch, stopTwitch } from '../utils/twitch';
import { initFrontend } from './frontend';

let shutdownInProgress = false;

export async function initEngine() {
	profile('Init');
	const conf = getConfig();
	const state = getState();
	setState({
		fullscreen: conf.Player.FullScreen,
		ontop: conf.Player.StayOnTop,
		private: conf.Karaoke.Private,
	});
	if (state.opt.validate) {
		try {
			initStep(i18n.t('INIT_VALIDATION'));
			await generateKaraBase({
				validateOnly: true,
				progressBar: true
			});
			await exit(0);
		} catch(err) {
			logger.error(`[Engine] Validation error : ${err}`);
			sentryError(err);
			await exit(1);
		}
	} else if (state.opt.mediaUpdate) {
		try {
			initStep(i18n.t('INIT_UPDATEMEDIAS'));
			await updateAllMedias();
			await exit(0);
		} catch(err) {
			logger.error(`[Engine] Updating medias failed : ${err}`);
			sentryError(err);
			await exit(1);
		}
	} else if (state.opt.dumpDB) {
		try {
			initStep(i18n.t('INIT_DB'));
			await initDBSystem();
			initStep(i18n.t('INIT_DUMPDB'));
			await dumpPG();
			await exit(0);
		} catch(err) {
			sentryError(err);
			await exit(1);
		}
	} else if (state.opt.restoreDB) {
		try {
			initStep(i18n.t('INIT_DB'));
			await initDBSystem();
			initStep(i18n.t('INIT_RESTOREDB'));
			await restorePG();
			await exit(0);
		} catch(err) {
			sentryError(err);
			await exit(1);
		}
	} else if (state.opt.baseUpdate) {
		try {
			initStep(i18n.t('INIT_DB'));
			await initDBSystem();
			initStep(i18n.t('INIT_BASEUPDATE'));
			await updateAllBases();
			logger.info('[Engine] Done updating karaoke base');
			await exit(0);
		} catch (err) {
			logger.error(`[Engine] Update failed : ${err}`);
			sentryError(err);
			await exit(1);
		}
	} else if (state.opt.generateDB) {
		try {
			initStep(i18n.t('INIT_DB'));
			await initDBSystem();
			initStep(i18n.t('INIT_GEN'));
			const checksum = await baseChecksum(false);
			await generateDB();
			await saveSetting('baseChecksum', checksum);
			await exit(0);
		} catch(err) {
			logger.error(`[Engine] Generation failed : ${err}`);
			sentryError(err);
			await exit(1);
		}
	} else {
		initStep(i18n.t('INIT_DB'));
		const migrations = await initDBSystem();
		await preFlightCheck();
		initStep(i18n.t('INIT_USER'));
		await initUserSystem();
		const port = initFrontend();
		if (port !== conf.Frontend.Port) {
			setConfig({Frontend: {Port: port}});
			// Reinit menu since we switched ports.
			if (app) await applyMenu();
		}
		if (conf.Online.URL) try {
			initStep(i18n.t('INIT_ONLINEURL'));
			await initOnlineURLSystem();
		} catch(err) {
			//Non-blocking
			logger.error(`[Engine] Failed to init online system : ${err}`);
			sentryError(err);
		}
		if (conf.Karaoke.StreamerMode.Twitch.Enabled) initTwitch();
		initBlacklistSystem();
		initPlaylistSystem();
		if (!conf.App.FirstRun && !state.isDemo && !state.isTest && !state.opt.noPlayer) initPlayer();
		testPlaylists();
		initDownloader();
		await initSession();
		if (conf.Online.Stats === true) initStats(false);
		try {
			initStep(i18n.t('INIT_LAST'), true);
			enableWSLogging();
			//Easter egg
			const ready = Math.floor(Math.random() * Math.floor(10)) >= 9
				? 'LADY'
				: 'READY';
			logger.info(`[Engine] Karaoke Mugen is ${ready}`);
			if (!state.isTest && !state.electron) welcomeToYoukousoKaraokeMugen();
			setState({ ready: true });
			// This is done later because it's not important.
			initStep(i18n.t('INIT_DONE'), true);
			emit('KMReady');
			if (state.args.length > 0) {
				// Let's try the last argument
				const file = state.args[state.args.length-1];
				if (file && !file.startsWith('--')) {
					try {
						await asyncExists(file);
						await handleFile(file);
					} catch(err) {
						logger.warn(`[Engine] Last argument from args (${file}) does not exist`);
					}
				}
			}
			if (state.isTest) {
				downloadTestSongs();
				on('downloadQueueStatus', (status: string) => {
					if (status.includes('stopped')) runTests();
				});
			}
			if (!state.isTest && !state.isDemo) {
				await updatePlaylistMedias();
				await buildAllMediasList();
			}
			await postMigrationTasks(migrations);
			if (conf.Database.prod.bundledPostgresBinary) await dumpPG();
			initDiscordRPC();
		} catch(err) {
			logger.error(`[Engine] Karaoke Mugen IS NOT READY : ${JSON.stringify(err)}`);
			sentryError(err);
			if (state.isTest) process.exit(1000);
		} finally {
			profile('Init');
		}
	}
}

export async function exit(rc: string | number) {
	if (shutdownInProgress) return;
	logger.info('[Engine] Shutdown in progress');
	shutdownInProgress = true;
	emit('exiting-app');
	try {
		await quitmpv();
	} catch(err) {
		logger.warn(`[Engine] mpv error : ${err}`);
		sentryError(err);
	} finally {
		logger.info('[Engine] Player has shutdown');
	}
	if (getTwitchClient()) await stopTwitch();
	await closeDB();
	const c = getConfig();
	if (getTwitchClient() || (c?.Karaoke?.StreamerMode.Twitch.Enabled)) await stopTwitch();
	//CheckPG returns if postgresql has been started by Karaoke Mugen or not.
	try {
		// Let's try to kill PGSQL anyway, not a problem if it fails.
		if (c?.Database?.prod.bundledPostgresBinary && await checkPG()) {
			try {
				await killPG();
				logger.info('[Engine] PostgreSQL has shutdown');
				mataNe(rc);
			} catch(err) {
				logger.warn(`[Engine] PostgreSQL could not be stopped! : ${JSON.stringify(err)}`);
				sentryError(err);
				mataNe(rc);
			}
		} else {
			mataNe(rc);
		}
	} catch(err) {
		logger.error(`[Engine] Failed to shutdown PostgreSQL : ${err}`);
		sentryError(err);
		mataNe(1);
	}
}

function mataNe(rc: string | number) {
	console.log('\nMata ne !\n');
	//Exiting on Windows will require a keypress from the user to avoid the window immediately closing on an error.
	//On other systems or if terminal is not a TTY we exit immediately.
	// non-TTY terminals have no stdin support.
	if ((process.platform !== 'win32' || !process.stdout.isTTY) && !app) process.exit(+rc);
	if (rc !== 0 && !app) readlineSync.question('Press enter to exit', {hideEchoBack: true});
	if (!app) {
		process.exit(+rc);
	} else {
		app.exit();
	}
}

export function shutdown() {
	logger.info('[Engine] Dropping the mic, shutting down!');
	exit(0);
}

export function getKMStats() {
	return getStats();
}

async function preFlightCheck() {
	const state = getState();
	const conf = getConfig();
	let doGenerate = false;
	if (!state.opt.noBaseCheck && !conf.App.QuickStart) {
		const filesChanged = await compareKarasChecksum();
		if (filesChanged === true) {
			logger.info('[DB] Data files have changed: database generation triggered');
			doGenerate = true;
		}
		// If karasChecksum returns null, it means there were no files to check. We run generation anyway (it'll return an empty database) to avoid making the current startup procedure any more complex.
		if (filesChanged === undefined) doGenerate = true;
	}
	const settings = await getSettings();
	if (!doGenerate && !settings.lastGeneration) {
		setConfig({ App: { FirstRun: true }});
		logger.info('[DB] Unable to tell when last generation occured: database generation triggered');
		doGenerate = true;
	}
	if (doGenerate) try {
		initStep(i18n.t('INIT_GEN'));
		await generateDB();
	} catch(err) {
		logger.error(`[DB] Generation failed : ${err}`);
		errorStep(i18n.t('ERROR_GENERATION'));
		throw 'Generation failure';
	}
	// Run this in the background
	vacuum();
	generateBlacklist();
	const stats = await getStats();
	logger.info(`Songs        : ${stats.karas} (${duration(+stats.duration)})`);
	logger.info(`Playlists    : ${stats.playlists}`);
	logger.info(`Songs played : ${stats.played}`);
}

async function runTests() {
	const options = ['--require', 'ts-node/register', '--timeout',  '20000', 'test/*.ts' ];
	try {
		const ret = await execa('mocha', options, {
			cwd: getState().originalAppPath
		});
		console.log(ret.stdout);
		process.exit(ret.exitCode);
	} catch(err) {
		console.log('TESTS FAILED : ');
		console.log(err.stdout);
		process.exit(1000);
	}

}
