// Node modules
import { app, shell } from 'electron';
import { execa } from 'execa';
import i18next from 'i18next';
import internetAvailable from 'internet-available';

import { compareKarasChecksum, generateDB, getStats, initDBSystem } from '../dao/database.js';
import { baseChecksum } from '../dao/dataStore.js';
import { postMigrationTasks } from '../dao/migrations.js';
import { markAllMigrationsFrontendAsDone } from '../dao/migrationsFrontend.js';
import { applyMenu, closeAllWindows, handleFile, handleProtocol, postInit } from '../electron/electron.js';
import { initAutoUpdate } from '../electron/electronAutoUpdate.js';
import { errorStep, initStep } from '../electron/electronLogger.js';
import { registerShortcuts, unregisterShortcuts } from '../electron/electronShortcuts.js';
import { closeDB, getSettings, saveSetting, vacuum } from '../lib/dao/database.js';
import { initHooks } from '../lib/dao/hook.js';
import { generateDatabase as generateKaraBase } from '../lib/services/generation.js';
// Utils
import { getConfig, setConfig } from '../lib/utils/config.js';
import { duration } from '../lib/utils/date.js';
import logger, { archiveOldLogs, enableWSLogging, profile } from '../lib/utils/logger.js';
import { createImagePreviews } from '../lib/utils/previews.js';
import { initDownloader, wipeDownloadQueue, wipeDownloads } from '../services/download.js';
import { updateAllMedias } from '../services/downloadMedias.js';
import { getKaras, initFetchPopularSongs } from '../services/kara.js';
import { initPlayer, quitmpv } from '../services/player.js';
import { initPlaylistSystem } from '../services/playlist.js';
import { buildAllMediasList, updatePlaylistMedias } from '../services/playlistMedias.js';
import { stopGame } from '../services/quiz.js';
import { initRemote } from '../services/remote.js';
import { checkDownloadStatus, updateAllRepos } from '../services/repo.js';
import { initSession } from '../services/session.js';
import { initStats } from '../services/stats.js';
import { generateAdminPassword, initUserSystem } from '../services/user.js';
import { initDiscordRPC } from '../utils/discordRPC.js';
import { initKMServerCommunication } from '../utils/kmserver.js';
import { checkPG, dumpPG, restorePG, stopPG } from '../utils/postgresql.js';
import sentry from '../utils/sentry.js';
import { getState, setState } from '../utils/state.js';
import { writeStreamFiles } from '../utils/streamerFiles.js';
import { getTwitchClient, initTwitch, stopTwitch } from '../utils/twitch.js';
import { subRemoteUsers } from '../utils/userPubSub.js';
import initFrontend from './frontend.js';

let shutdownInProgress = false;
let usageTime = 0;
let usageTimeInterval;

const service = 'Engine';

export function isShutdownInProgress() {
	return shutdownInProgress;
}

export async function initEngine() {
	profile('InitEngine');
	const conf = getConfig();
	const state = getState();
	if (conf.Karaoke.Poll.Enabled) setState({ songPoll: true });
	const internet = await (async () => {
		try {
			profile('InternetCheck');
			await internetAvailable();
			return true;
		} catch (err) {
			return false;
		} finally {
			profile('InternetCheck');
		}
	})();
	if (state.opt.validate) {
		try {
			initStep(i18next.t('INIT_VALIDATION'));
			await generateKaraBase({
				validateOnly: true,
			});
			await exit(0);
		} catch (err) {
			logger.error('Validation error', { service, obj: err });
			sentry.error(err);
			await exit(1);
		}
	} else if (state.opt.mediaUpdateAll) {
		try {
			initStep(i18next.t('INIT_DB'));
			await initDBSystem();
			initStep(i18next.t('INIT_UPDATEMEDIAS'));
			await initDownloader();
			await wipeDownloads();
			await updateAllMedias();
			await exit(0);
		} catch (err) {
			logger.error('Updating medias failed', { service, obj: err });
			sentry.error(err);
			await exit(1);
		}
	} else if (state.opt.dumpDB) {
		try {
			initStep(i18next.t('INIT_DB'));
			await initDBSystem();
			initStep(i18next.t('INIT_DUMPDB'));
			await dumpPG();
			await exit(0);
		} catch (err) {
			sentry.error(err);
			await exit(1);
		}
	} else if (state.opt.restoreDB) {
		try {
			initStep(i18next.t('INIT_DB'));
			await initDBSystem();
			initStep(i18next.t('INIT_RESTOREDB'));
			await restorePG();
			await exit(0);
		} catch (err) {
			sentry.error(err);
			await exit(1);
		}
	} else if (state.opt.baseUpdate) {
		try {
			initStep(i18next.t('INIT_DB'));
			await initDBSystem();
			initStep(i18next.t('INIT_BASEUPDATE'));
			await updateAllRepos();
			logger.info('Done updating karaoke base', { service });
			await exit(0);
		} catch (err) {
			logger.error('Update failed', { service, obj: err });
			sentry.error(err);
			await exit(1);
		}
	} else if (state.opt.generateDB) {
		try {
			initStep(i18next.t('INIT_DB'));
			await initDBSystem();
			initStep(i18next.t('INIT_GEN'));
			const checksum = await baseChecksum();
			await generateDB();
			await saveSetting('baseChecksum', checksum);
			await exit(0);
		} catch (err) {
			logger.error('Generation failed', { service, obj: err });
			sentry.error(err);
			await exit(1);
		}
	} else {
		initStep(i18next.t('INIT_DB'));
		const migrations = await initDBSystem();
		const didGeneration = await preFlightCheck();
		checkIfAppHasBeenUpdated();
		initStep(i18next.t('INIT_USER'));
		await initUserSystem();
		const port = initFrontend();
		if (port !== conf.System.FrontendPort) {
			setConfig({ System: { FrontendPort: port } });
			// Reinit menu since we switched ports. Only if first run has already been done.
			if (!conf.App.FirstRun) applyMenu('DEFAULT');
		}
		if (internet) {
			try {
				initStep(i18next.t('INIT_ONLINEURL'));
				await initKMServerCommunication();
				const onlinePromises = [
					// TODO: add config item for this?
					subRemoteUsers(),
				];
				if (conf.Online.Remote) onlinePromises.push(initRemote());
				await Promise.all(onlinePromises);
			} catch (err) {
				// Non-blocking
				logger.error('Failed to init online system', { service, obj: err });
				sentry.error(err, 'warning');
			}
		}
		try {
			if (conf.Player.KeyboardMediaShortcuts) registerShortcuts();
			initPlaylistSystem();
			initDownloader();
			initSession();
			if (conf.Karaoke.StreamerMode.Twitch.Enabled) initTwitch();
			if (!conf.App.FirstRun && !state.isTest && !state.opt.noPlayer) {
				initPlayer();
			}
			if (conf.Online.Stats === true) initStats(false);
			initStep(i18next.t('INIT_LAST'), true);
			enableWSLogging(state.opt.debug ? 'debug' : 'info');
			// Easter egg
			const ready = Math.floor(Math.random() * 10) >= 9 ? 'LADY' : 'READY';
			if (!state.isTest && state.opt.cli) await welcomeToYoukousoKaraokeMugen();
			await postMigrationTasks(migrations, didGeneration);
			if (state.args.length > 0) {
				// Let's try the last argument
				const file = state.args[state.args.length - 1];
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
					updatePlaylistMedias()
						.then(buildAllMediasList)
						.catch(() => {});
				} else {
					buildAllMediasList().catch(() => {});
				}
			}
			// Update everything kara-related
			updateBase(internet);
			// Mark all migrations as done for the first run to
			// avoid the user to have to do all the migrations from start
			if (conf.App.FirstRun) await markAllMigrationsFrontendAsDone();
			setState({ ready: true });
			writeStreamFiles();
			initStep(i18next.t('INIT_DONE'), true);
			postInit();
			initHooks();
			archiveOldLogs();
			initUsageTimer();
			logger.info(`Karaoke Mugen is ${ready}`, { service });
		} catch (err) {
			logger.error('Karaoke Mugen IS NOT READY', { service, obj: err });
			sentry.error(err);
			if (state.isTest) process.exit(1000);
		} finally {
			profile('InitEngine');
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
	if (!state.forceDisableAppUpdate) initAutoUpdate();
	createImagePreviews(
		await getKaras({
			q: 'm:downloaded',
			ignoreCollections: true,
		}),
		'single'
	).catch(() => {}); // Non-fatal
}

export async function exit(rc = 0, update = false) {
	if (shutdownInProgress) return;
	logger.info('Shutdown in progress', { service });
	shutdownInProgress = true;
	clearInterval(usageTimeInterval);
	closeAllWindows();
	wipeDownloadQueue();
	stopGame();
	try {
		if (getState().player?.playerStatus) {
			await quitmpv();
			logger.info('Player has shutdown', { service });
		}
	} catch (err) {
		logger.warn('mpv error', { service, obj: err });
		// Non fatal.
	}
	if (
		getState().DBReady &&
		getConfig().System.Database.bundledPostgresBinary &&
		!getState().opt.dumpDB &&
		!getState().opt.restoreDB
	)
		await dumpPG().catch(() => {});
	try {
		await closeDB();
	} catch (err) {
		logger.warn('Shutting down database failed', { service, obj: err });
	}
	const c = getConfig();
	if (getTwitchClient() || c?.Karaoke?.StreamerMode?.Twitch?.Enabled) await stopTwitch();
	// CheckPG returns if postgresql has been started by Karaoke Mugen or not.
	try {
		// Let's try to kill PGSQL anyway, not a problem if it fails.
		if (c?.System.Database?.bundledPostgresBinary && (await checkPG())) {
			try {
				await stopPG();
				logger.info('PostgreSQL has shutdown', { service });
			} catch (err) {
				logger.warn('PostgreSQL could not be stopped!', { service, obj: err });
				sentry.error(err);
			} finally {
				if (!update) mataNe(rc);
			}
		} else if (!update) mataNe(rc);
	} catch (err) {
		logger.error('Failed to shutdown PostgreSQL', { service, obj: err });
		sentry.error(err);
		if (!update) mataNe(1);
	}
}

function mataNe(rc: number) {
	logger.info('Closing', { service });
	console.log('\nMata ne !\n');
	unregisterShortcuts();
	app.exit(rc);
}

export function shutdown() {
	logger.info('Dropping the mic, shutting down!', { service });
	exit(0);
}

async function preFlightCheck(): Promise<boolean> {
	const state = getState();
	profile('preFlightCheck');
	let doGenerate = false;
	if (!state.opt.noBaseCheck) {
		const filesChanged = await compareKarasChecksum();
		if (filesChanged === true) {
			logger.info('Data files have changed: database generation triggered', { service });
			doGenerate = true;
		}
		// If karasChecksum returns null, it means there were no files to check. We run generation anyway (it'll return an empty database) to avoid making the current startup procedure any more complex.
		if (filesChanged === undefined) doGenerate = true;
	}
	const settings = await getSettings();
	if (!doGenerate && !settings.lastGeneration) {
		logger.info('Unable to tell when last generation occured: database generation triggered', { service });
		doGenerate = true;
	}
	if (doGenerate) {
		try {
			initStep(i18next.t('INIT_GEN'));
			await generateDB();
		} catch (err) {
			logger.error('Generation failed', { service, obj: err });
			errorStep(i18next.t('ERROR_GENERATION'));
			throw err;
		}
	}
	const stats = await getStats();
	logger.info(`Songs        : ${stats?.karas} (${duration(+stats?.duration || 0)})`, { service });
	logger.info(`Playlists    : ${stats?.playlists}`, { service });
	logger.info(`Songs played : ${stats?.played}`, { service });
	// Run this in the background
	vacuum();
	profile('preFlightCheck');
	return doGenerate;
}

async function runTests() {
	try {
		const ret = await execa('mocha', {
			cwd: getState().appPath,
		});
		console.log(ret.stdout);
		process.exit(ret.exitCode);
	} catch (err) {
		console.log('TESTS FAILED : ');
		console.log(err.stdout);
		console.error(err.stderr);
		process.exit(1000);
	}
}

async function checkIfAppHasBeenUpdated() {
	profile('updateCheck');
	const settings = await getSettings();
	if (settings.appVersion !== getState().version.number) {
		// We check if appVersion exists so we don't trigger the appHasBeenUpdated new state if it didn't exist before (new installs, or migration from when this function didn't exist)
		await saveSetting('appVersion', getState().version.number);
		if (settings.appVersion) setState({ appHasBeenUpdated: true });
	}
	profile('updateCheck');
}

/** Set admin password on first run, and open browser on welcome page.
 * One, two, three /
 * Welcome to youkoso japari paaku /
 * Kyou mo dottan battan oosawagi /
 * Sugata katachi mo juunin toiro dakara hikareau no /
 */
export async function welcomeToYoukousoKaraokeMugen(): Promise<string> {
	profile('welcome');
	const conf = getConfig();
	const state = getState();
	let url = `http://localhost:${state.frontendPort}/welcome`;
	if (conf.App.FirstRun) {
		const adminPassword = await generateAdminPassword();
		url = `http://localhost:${conf.System.FrontendPort}/setup?admpwd=${adminPassword}`;
	}
	if (!state.opt.noBrowser && !state.isTest && state.opt.cli) shell.openExternal(url);
	profile('welcome');
	return url;
}

async function initUsageTimer() {
	const settings = await getSettings();
	usageTime = +settings.usageTime || 0;
	usageTimeInterval = setInterval(updateUsageTimer, 60000);
	updateUsageTimer();
}

/** This is called every minute */
async function updateUsageTimer() {
	usageTime += 60;
	await saveSetting('usageTime', `${usageTime}`);
}
