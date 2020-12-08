//Node modules
import { app } from 'electron';
import execa from 'execa';
import i18n from 'i18next';
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
import {enableWSLogging,profile} from '../lib/utils/logger';
import { createImagePreviews } from '../lib/utils/previews';
import {emit, on} from '../lib/utils/pubsub';
import {initBlacklistSystem} from '../services/blacklist';
import {initDownloader, wipeDownloadQueue} from '../services/download';
import { downloadTestSongs, updateAllBases, updateAllMedias } from '../services/downloadUpdater';
import { getAllKaras } from '../services/kara';
import { buildAllMediasList,updatePlaylistMedias } from '../services/medias';
import {initOnlineURLSystem} from '../services/online';
import {initPlayer, quitmpv} from '../services/player';
import {initPlaylistSystem} from '../services/playlist';
import { initRemote } from '../services/remote';
import { initSession } from '../services/session';
import { initStats } from '../services/stats';
import { initUserSystem } from '../services/user';
import { welcomeToYoukousoKaraokeMugen } from '../services/welcome';
import { initDiscordRPC } from '../utils/discordRPC';
import { initKMServerCommunication } from '../utils/kmserver';
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
				validateOnly: true
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
			const checksum = await baseChecksum();
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
		const didGeneration = await preFlightCheck();
		checkIfAppHasBeenUpdated();
		initStep(i18n.t('INIT_USER'));
		await initUserSystem();
		const port = initFrontend();
		if (port !== conf.Frontend.Port) {
			setConfig({Frontend: {Port: port}});
			// Reinit menu since we switched ports.
			if (app) applyMenu();
		}
		if ((conf.Online.URL || conf.Online.Remote) && !state.isDemo) try {
			initStep(i18n.t('INIT_ONLINEURL'));
			await initKMServerCommunication();
			if (conf.Online.URL) await initOnlineURLSystem();
			if (conf.Online.Remote) await initRemote();
		} catch(err) {
			//Non-blocking
			logger.error('Failed to init online system', {service: 'Engine', obj: err});
			sentry.error(err, 'Warning');
		}
		if (conf.Karaoke.StreamerMode.Twitch.Enabled && !state.isDemo) await initTwitch();
		await initBlacklistSystem();
		await initPlaylistSystem();
		if (!conf.App.FirstRun && !state.isDemo && !state.isTest && !state.opt.noPlayer) await initPlayer();
		if (app) registerShortcuts();
		await initDownloader();
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
			if (!state.isTest && !state.electron) await welcomeToYoukousoKaraokeMugen();
			// This is done later because it's not important.
			await postMigrationTasks(migrations, didGeneration);
			if (state.args.length > 0) {
				// Let's try the last argument
				const file = state.args[state.args.length-1];
				if (file && !file.startsWith('--') && !file.startsWith('km://')) {
					// Non fatal
					handleFile(file).catch(() => {});
				} else if (file && file.startsWith('km://')) {
					handleProtocol(state.args[0].substr(5).split('/')).catch(() => {});
				}
			}
			if (state.isTest) {
				if (state.opt.noTestDownloads && !state.opt.noAutoTest) {
					runTests();
				} else {
					downloadTestSongs();
					on('downloadQueueStatus', (status: string[]) => {
						if (status.includes('stopped') && !state.opt.noAutoTest) runTests();
					});
				}
			}
			if (conf.System.Database.bundledPostgresBinary) dumpPG().catch(() => {});
			if (!state.isTest && !state.isDemo && getConfig().Online.Discord.DisplayActivity) initDiscordRPC();
			if (!state.isTest && !state.isDemo) {
				try {
					await updatePlaylistMedias();
					await buildAllMediasList();
				} catch(err) {
					//Non fatal
				}
			}
			if (conf.Frontend.GeneratePreviews) createImagePreviews(await getAllKaras(), 'single');
			setState({ ready: true });
			initStep(i18n.t('INIT_DONE'), true);
			emit('KMReady');
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
	if (!rc) rc = 0;
	if (shutdownInProgress) return;
	logger.info('Shutdown in progress', {service: 'Engine'});
	shutdownInProgress = true;
	wipeDownloadQueue();
	try {
		if (getState().player?.playerStatus) {
			await quitmpv();
			logger.info('Player has shutdown', {service: 'Engine'});
		}
	} catch(err) {
		logger.warn('mpv error', {service: 'Engine', obj: err});
		// Non fatal.
	}
	await closeDB();
	const c = getConfig();
	if (getTwitchClient() || (c?.Karaoke?.StreamerMode?.Twitch?.Enabled)) await stopTwitch();
	//CheckPG returns if postgresql has been started by Karaoke Mugen or not.
	try {
		// Let's try to kill PGSQL anyway, not a problem if it fails.
		if (c?.System.Database?.bundledPostgresBinary && await checkPG()) {
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

async function preFlightCheck(): Promise<boolean> {
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
	const stats = await getStats();
	logger.info(`Songs        : ${stats.karas} (${duration(+stats.duration)})`, {service: 'DB'});
	logger.info(`Playlists    : ${stats.playlists}`, {service: 'DB'});
	logger.info(`Songs played : ${stats.played}`, {service: 'DB'});
	// Run this in the background
	vacuum();
	generateBlacklist();
	return doGenerate;
}

async function runTests() {
	const options = ['--require', 'ts-node/register', '--require', 'test/util/hooks.ts', '--timeout',  '20000', 'test/*.ts' ];
	try {
		const ret = await execa('mocha', options, {
			cwd: getState().appPath
		});
		console.log(ret.stdout);
		process.exit(ret.exitCode);
	} catch(err) {
		console.log('TESTS FAILED : ');
		console.log(err.stdout);
		process.exit(1000);
	}

}

async function checkIfAppHasBeenUpdated() {
	const settings = await getSettings();
	if (settings.appVersion !== getState().version.number) {
		// We check if appVersion exists so we don't trigger the appHasBeenUpdated new state if it didn't exist before (new installs, or migration from when this function didn't exist)
		await saveSetting('appVersion', getState().version.number );
		if (settings.appVersion) setState({appHasBeenUpdated: true});
	}
}
