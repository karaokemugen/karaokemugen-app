//Node modules
import { app } from 'electron';
import execa from 'execa';
import i18n from 'i18next';
import internetAvailable from 'internet-available';
import logger from 'winston';

import {compareKarasChecksum,DBReady,generateDB, getStats, initDBSystem} from '../dao/database';
import { baseChecksum } from '../dao/dataStore';
import { postMigrationTasks } from '../dao/migrations';
import { markAllMigrationsFrontendAsDone } from '../dao/migrationsFrontend';
import { applyMenu, closeAllWindows, handleFile, handleProtocol, postInit } from '../electron/electron';
import { errorStep,initStep } from '../electron/electronLogger';
import { registerShortcuts, unregisterShortcuts } from '../electron/electronShortcuts';
import {closeDB, getSettings, saveSetting,vacuum} from '../lib/dao/database';
import { initHooks } from '../lib/dao/hook';
import { generateDatabase as generateKaraBase } from '../lib/services/generation';
//Utils
import {getConfig, setConfig} from '../lib/utils/config';
import { duration } from '../lib/utils/date';
import {enableWSLogging,profile} from '../lib/utils/logger';
import { createImagePreviews } from '../lib/utils/previews';
import {initDownloader, wipeDownloadQueue, wipeDownloads} from '../services/download';
import { updateAllMedias } from '../services/downloadMedias';
import { getKaras, initFetchPopularSongs } from '../services/kara';
import {initPlayer, quitmpv} from '../services/player';
import {initPlaylistSystem} from '../services/playlist';
import { buildAllMediasList,updatePlaylistMedias } from '../services/playlistMedias';
import { initRemote } from '../services/remote';
import { checkDownloadStatus, updateAllRepos } from '../services/repo';
import { initSession } from '../services/session';
import { initStats } from '../services/stats';
import { initUserSystem } from '../services/user';
import { initDiscordRPC } from '../utils/discordRPC';
import { initKMServerCommunication } from '../utils/kmserver';
import { checkPG, dumpPG, restorePG,stopPG } from '../utils/postgresql';
import sentry from '../utils/sentry';
import { getState, setState } from '../utils/state';
import { writeStreamFiles } from '../utils/streamerFiles';
import { getTwitchClient, initTwitch, stopTwitch } from '../utils/twitch';
import { subRemoteUsers } from '../utils/userPubSub';
import { initFrontend } from './frontend';
import { welcomeToYoukousoKaraokeMugen } from './init';

let shutdownInProgress = false;

export async function initEngine() {
	profile('Init');
	const conf = getConfig();
	const state = getState();
	if (conf.Karaoke.Poll.Enabled) setState({songPoll: true});
	const internet = await (async () => {
		try {
			await internetAvailable();
			return true;
		} catch (err) {
			return false;
		}
	})();
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
	} else if (state.opt.mediaUpdateAll) {
		try {
			initStep(i18n.t('INIT_DB'));
			await initDBSystem();
			initStep(i18n.t('INIT_UPDATEMEDIAS'));
			await initDownloader();
			await wipeDownloads();
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
			await updateAllRepos();
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
		if (port !== conf.System.FrontendPort) {
			setConfig({System: {FrontendPort: port}});
			// Reinit menu since we switched ports. Only if first run has already been done.
			if (!conf.App.FirstRun) applyMenu('DEFAULT');
		}
		if (internet) try {
			initStep(i18n.t('INIT_ONLINEURL'));
			await initKMServerCommunication();
			const onlinePromises = [
				// TODO: add config item for this?
				subRemoteUsers()
			];
			if (conf.Online.Remote) onlinePromises.push(initRemote());
			await Promise.all(onlinePromises);
		} catch(err) {
			// Non-blocking
			logger.error('Failed to init online system', {service: 'Engine', obj: err});
			sentry.error(err, 'Warning');
		}
		try {
			if (conf.Player.KeyboardMediaShortcuts) registerShortcuts();
			initStep(i18n.t('INIT_PLAYLIST_AND_PLAYER'));
			const initPromises = [
				initPlaylistSystem(),
				initDownloader(),
				initSession()
			];
			if (conf.Karaoke.StreamerMode.Twitch.Enabled) initPromises.push(initTwitch());
			if (!conf.App.FirstRun && !state.isTest && !state.opt.noPlayer) initPromises.push(initPlayer());
			await Promise.all(initPromises);
			if (conf.Online.Stats === true) initStats(false);
			initStep(i18n.t('INIT_LAST'), true);
			enableWSLogging(state.opt.debug ? 'debug' : 'info');
			//Easter egg
			const ready = Math.floor(Math.random() * 10) >= 9
				? 'LADY'
				: 'READY';
			if (!state.isTest && state.opt.cli) await welcomeToYoukousoKaraokeMugen();
			// This is done later because it's not important.
			postMigrationTasks(migrations, didGeneration);
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
			// If we are testing, we're awaiting updateAllGitRepos
			if (state.isTest) {
				await updateAllRepos();
			}
			if (state.isTest && !state.opt.noAutoTest) {
				runTests();
			}
			if (conf.System.Database.bundledPostgresBinary) dumpPG().catch(() => {});
			if (!state.isTest && getConfig().Online.Discord.DisplayActivity) initDiscordRPC();
			if (!state.isTest) {
				if (internet) {
					updatePlaylistMedias().then(buildAllMediasList).catch(() => {});
				} else {
					buildAllMediasList().catch(() => {});
				}
			}
			// Update everything kara-related
			updateBase(internet);
			// Mark all migrations as done for the first run to avoid the user to have to do all the migrations from start
			if (conf.App.FirstRun) await markAllMigrationsFrontendAsDone();
			setState({ ready: true });
			writeStreamFiles();
			initStep(i18n.t('INIT_DONE'), true);
			postInit();
			initHooks();
			logger.info(`Karaoke Mugen is ${ready}`, {service: 'Engine'});
		} catch(err) {
			logger.error('Karaoke Mugen IS NOT READY', {service: 'Engine', obj: err});
			sentry.error(err);
			if (state.isTest) process.exit(1000);
		} finally {
			profile('Init');
		}
	}
}

export async function updateBase(internet: boolean) {
	const state = getState();
	const conf = getConfig();
	if (!state.isTest && !conf.App.FirstRun && internet) {
		await updateAllRepos();
	}
	initFetchPopularSongs();
	await checkDownloadStatus();
	createImagePreviews(await getKaras({
		q: 'm:downloaded'
	}), 'single');
}

export async function exit(rc = 0, update = false) {
	if (shutdownInProgress) return;
	logger.info('Shutdown in progress', {service: 'Engine'});
	shutdownInProgress = true;
	closeAllWindows();
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
	try {
		if (DBReady	&& getConfig().System.Database.bundledPostgresBinary) await dumpPG();
		await closeDB();
	} catch(err) {
		logger.warn('Shutting down database failed', {service: 'Engine', obj: err});
	}
	const c = getConfig();
	if (getTwitchClient() || (c?.Karaoke?.StreamerMode?.Twitch?.Enabled)) await stopTwitch();
	//CheckPG returns if postgresql has been started by Karaoke Mugen or not.
	try {
		// Let's try to kill PGSQL anyway, not a problem if it fails.
		if (c?.System.Database?.bundledPostgresBinary && await checkPG()) {
			try {
				await stopPG();
				logger.info('PostgreSQL has shutdown', {service: 'Engine'});
			} catch(err) {
				logger.warn('PostgreSQL could not be stopped!', {service: 'Engine', obj: err});
				sentry.error(err);
			} finally {
				if (!update) mataNe(rc);
			}
		} else {
			if (!update) mataNe(rc);
		}
	} catch(err) {
		logger.error('Failed to shutdown PostgreSQL', {service: 'Engine', obj: err});
		sentry.error(err);
		if (!update) mataNe(1);
	}
}

function mataNe(rc: number) {
	console.log('\nMata ne !\n');
	unregisterShortcuts();
	app.exit(rc);
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
	logger.info(`Songs        : ${stats?.karas} (${duration(+stats?.duration)})`, {service: 'DB'});
	logger.info(`Playlists    : ${stats?.playlists}`, {service: 'DB'});
	logger.info(`Songs played : ${stats?.played}`, {service: 'DB'});
	// Run this in the background
	vacuum();
	return doGenerate;
}

async function runTests() {
	const options = ['--require', 'ts-node/register', '--require', 'test/util/hooks.ts', '--timeout',  '60000', 'test/*.ts' ];
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
