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
import { applyMenu, handleFile, handleProtocol } from '../electron/electron';
import { errorStep,initStep } from '../electron/electronLogger';
import { registerShortcuts, unregisterShortcuts } from '../electron/electronShortcuts';
import {closeDB, getSettings, saveSetting,vacuum} from '../lib/dao/database';
import { generateDatabase as generateKaraBase } from '../lib/services/generation';
//Utils
import {getConfig, setConfig} from '../lib/utils/config';
import { duration } from '../lib/utils/date';
import { asyncExists } from '../lib/utils/files';
import {enableWSLogging,profile} from '../lib/utils/logger';
import {emit, on} from '../lib/utils/pubsub';
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
import { checkPG, dumpPG, restorePG,stopPG } from '../utils/postgresql';
import sentry from '../utils/sentry';
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
		ontop: conf.Player.StayOnTop
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
			logger.error('Validation error', {service: 'Engine', obj: err});
			sentry.error(err);
			await exit(1);
		}
	} else if (state.opt.mediaUpdate) {
		try {
			initStep(i18n.t('INIT_UPDATEMEDIAS'));
			await updateAllMedias();
			await exit(0);
		} catch(err) {
			logger.error('Updating medias failed', {service: 'Engine', obj: err});
			sentry.error(err);
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
			sentry.error(err);
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
			sentry.error(err);
			await exit(1);
		}
	} else if (state.opt.baseUpdate) {
		try {
			initStep(i18n.t('INIT_DB'));
			await initDBSystem();
			initStep(i18n.t('INIT_BASEUPDATE'));
			await updateAllBases();
			logger.info('Done updating karaoke base', {service: 'Engine'});
			await exit(0);
		} catch (err) {
			logger.error('Update failed', {service: 'Engine', obj: err});
			sentry.error(err);
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
			logger.error('Generation failed', {service: 'Engine', obj: err});
			sentry.error(err);
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
			if (app) applyMenu();
		}
		if (conf.Online.URL && !state.isDemo) try {
			initStep(i18n.t('INIT_ONLINEURL'));
			await initOnlineURLSystem();
		} catch(err) {
			//Non-blocking
			logger.error('Failed to init online system', {service: 'Engine', obj: err});
			sentry.error(err);
		}
		if (conf.Karaoke.StreamerMode.Twitch.Enabled && !state.isDemo) initTwitch();
		initBlacklistSystem();
		initPlaylistSystem();
		if (!conf.App.FirstRun && !state.isDemo && !state.isTest && !state.opt.noPlayer) initPlayer().then(() => {
			if (app) registerShortcuts();
		});
		testPlaylists();
		initDownloader();
		await initSession();
		if (conf.Online.Stats === true) initStats(false);
		try {
			initStep(i18n.t('INIT_LAST'), true);
			enableWSLogging(state.opt.debug ? 'debug' : 'info');
			//Easter egg
			const ready = Math.floor(Math.random() * Math.floor(10)) >= 9
				? 'LADY'
				: 'READY';
			logger.info(`Karaoke Mugen is ${ready}`, {service: 'Engine'});
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
						logger.warn(`Last argument from args (${file}) does not exist`, {service: 'Engine'});
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
			if (!state.isTest && !state.isDemo) initDiscordRPC();
			if (state.args[0]?.startsWith('km://')) handleProtocol(state.args[0].substr(5).split('/'));
		} catch(err) {
			logger.error('Karaoke Mugen IS NOT READY', {service: 'Engine', obj: err});
			sentry.error(err);
			if (state.isTest) process.exit(1000);
		} finally {
			profile('Init');
		}
	}
}

export async function exit(rc: string | number) {
	if (shutdownInProgress) return;
	logger.info('Shutdown in progress', {service: 'Engine'});
	shutdownInProgress = true;
	emit('exiting-app');
	try {
		if (getState().player?.playerStatus) {
			await quitmpv();
			logger.info('Player has shutdown', {service: 'Engine'});
		}
	} catch(err) {
		logger.warn('mpv error', {service: 'Engine', obj: err});
		sentry.error(err);
	}
	await closeDB();
	const c = getConfig();
	if (getTwitchClient() || (c?.Karaoke?.StreamerMode.Twitch.Enabled)) await stopTwitch();
	//CheckPG returns if postgresql has been started by Karaoke Mugen or not.
	try {
		// Let's try to kill PGSQL anyway, not a problem if it fails.
		if (c?.Database?.prod.bundledPostgresBinary && await checkPG()) {
			try {
				await stopPG();
				logger.info('PostgreSQL has shutdown', {service: 'Engine'});
				mataNe(rc);
			} catch(err) {
				logger.warn('PostgreSQL could not be stopped!', {service: 'Engine', obj: err});
				sentry.error(err);
				mataNe(rc);
			}
		} else {
			mataNe(rc);
		}
	} catch(err) {
		logger.error('Failed to shutdown PostgreSQL', {service: 'Engine', obj: err});
		sentry.error(err);
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
		unregisterShortcuts();
		app.exit();
	}
}

export function shutdown() {
	logger.info('Dropping the mic, shutting down!', {service: 'Engine'});
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
			logger.info('Data files have changed: database generation triggered', {service: 'DB'});
			doGenerate = true;
		}
		// If karasChecksum returns null, it means there were no files to check. We run generation anyway (it'll return an empty database) to avoid making the current startup procedure any more complex.
		if (filesChanged === undefined) doGenerate = true;
	}
	const settings = await getSettings();
	if (!doGenerate && !settings.lastGeneration) {
		setConfig({ App: { FirstRun: true }});
		logger.info('Unable to tell when last generation occured: database generation triggered', {service: 'DB'});
		doGenerate = true;
	}
	if (doGenerate) try {
		initStep(i18n.t('INIT_GEN'));
		await generateDB();
	} catch(err) {
		logger.error('Generation failed', {service: 'DB', obj: err});
		errorStep(i18n.t('ERROR_GENERATION'));
		throw err;
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
