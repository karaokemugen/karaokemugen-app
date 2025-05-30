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
import { readAllRepoManifests } from '../lib/services/repo.js';
// Utils
import { getConfig, setConfig } from '../lib/utils/config.js';
import { duration } from '../lib/utils/date.js';
import logger, { archiveOldLogs, enableWSLogging, profile } from '../lib/utils/logger.js';
import { createImagePreviews } from '../lib/utils/previews.js';
import { initDownloader, wipeDownloadQueue, wipeDownloads } from '../services/download.js';
import { updateAllMedias } from '../services/downloadMedias.js';
import { initFonts } from '../services/fonts.js';
import { getKaras, initFetchPopularSongs, stopFetchPopularSongs } from '../services/kara.js';
import { initPlayer, quitmpv } from '../services/player.js';
import { initPlaylistSystem, stopPlaylistSystem } from '../services/playlist.js';
import { buildAllMediasList, updatePlaylistMedias } from '../services/playlistMedias.js';
import { stopGame } from '../services/quiz.js';
import { checkDownloadStatus, statsEnabledRepositories, updateAllRepos } from '../services/repo.js';
import { initSession, stopSessionSystem } from '../services/session.js';
import { initStats, stopStatsSystem } from '../services/stats.js';
import { generateAdminPassword, initUserSystem } from '../services/user.js';
import { initDiscordRPC, stopDiscordRPC } from '../utils/discordRPC.js';
import { initKMServerCommunication } from '../utils/kmserver.js';
import { checkPG, dumpPG, restorePG, stopPG } from '../utils/postgresql.js';
import sentry from '../utils/sentry.js';
import { getState, setState } from '../utils/state.js';
import { writeStreamFiles } from '../utils/streamerFiles.js';
import { getTwitchClient, initTwitch, stopTwitch } from '../utils/twitch.js';
import initFrontend from './frontend.js';

let usageTime = 0;
let usageTimeInterval: NodeJS.Timeout;

const service = 'Engine';

export function isShutdownInProgress() {
	return getState().shutdownInProgress;
}

export async function initEngine() {
	profile('InitEngine');
	const conf = getConfig();
	const state = getState();
	if (conf.Karaoke.Poll.Enabled) setState({ songPoll: true });
	if (state.opt.validate) {
		try {
			initStep(i18next.t('INIT_VALIDATION'));
			await readAllRepoManifests();
			initHooks();
			await generateKaraBase({
				validateOnly: true,
			});
			await exit(0);
		} catch (err) {
			logger.error('Validation error', { service, obj: err });
			sentry.error(err);
			await exit(1);
		}
	} else if (state.opt.mediaUpdateAll || state.opt.mediaUpdate) {
		try {
			initStep(i18next.t('INIT_DB'));
			await initDBSystem();
			initStep(i18next.t('INIT_UPDATEMEDIAS'));
			await initDownloader();
			await wipeDownloads();
			await updateAllMedias(state.opt.mediaUpdate);
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
			await initKaraBase();
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
			initHooks();
			await readAllRepoManifests();
			await initDBSystem();
			await initKaraBase();
			await exit(0);
		} catch (err) {
			logger.error('Generation failed', { service, obj: err });
			sentry.error(err);
			await exit(1);
		}
	} else {
		initStep(i18next.t('INIT_DB'));
		const migrations = await initDBSystem();
		checkIfAppHasBeenUpdated();
		initStep(i18next.t('INIT_USER'));
		await initUserSystem();
		const port = initFrontend();
		if (port !== conf.System.FrontendPort) {
			setConfig({ System: { FrontendPort: port } });
			// Reinit menu since we switched ports. Only if first run has already been done.
			if (!conf.App.FirstRun) applyMenu('DEFAULT');
		}
		try {
			await initPlaylistSystem();
			initDownloader();
			initSession();
			if (conf.Karaoke.StreamerMode.Twitch.Enabled) initTwitch();
			if (statsEnabledRepositories.length > 0) initStats(false);
			initStep(i18next.t('INIT_LAST'), true);
			enableWSLogging(state.opt.debug ? 'debug' : 'info');
			// Easter egg
			const ready = Math.floor(Math.random() * 10) >= 9 ? 'LADY' : 'READY';
			if (!state.isTest && state.opt.cli) welcomeToYoukousoKaraokeMugen();
			const didGeneration = await preFlightCheck();
			await postMigrationTasks(migrations, didGeneration);
			if (state.args.length > 0) {
				// Let's try the last argument
				const file = state.args[state.args.length - 1];
				if (file && !file.startsWith('--') && !file.startsWith('km://')) {
					// Non fatal
					handleFile(file).catch(() => {});
				} else if (file && file.startsWith('km://')) {
					handleProtocol(state.args[0].substring(5)).catch(() => {});
				}
			}
			// Mark all migrations as done for the first run to
			// avoid the user to have to do all the migrations from start
			if (conf.App.FirstRun) await markAllMigrationsFrontendAsDone();
			await readAllRepoManifests();
			if (state.isTest) {
				await updateAllRepos();
			}
			setState({ ready: true });

			// Beyond that point everything can be async.
			if (conf.System.Database.bundledPostgresBinary) dumpPG().catch(() => {});
			if (!state.isTest && getConfig().Online.Discord.DisplayActivity) initDiscordRPC();
			writeStreamFiles();
			initStep(i18next.t('INIT_DONE'), true);
			postInit();
			initHooks();
			initFonts();
			archiveOldLogs();
			initUsageTimer();
			if (!conf.App.FirstRun && !state.isTest && !state.opt.noPlayer) {
				initPlayer();
			}
			if (conf.Player.KeyboardMediaShortcuts) registerShortcuts();
			internetCheck().then(internet => {
				if (internet) {
					initStep(i18next.t('INIT_ONLINEURL'));
					initKMServerCommunication();
				}
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
				// If we are testing, we're awaiting updateAllGitRepos
				updateBase(internet).catch();
			});
			if (state.isTest && !state.opt.noAutoTest) {
				runTests();
			}
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

async function internetCheck(): Promise<boolean> {
	try {
		profile('InternetCheck');
		await internetAvailable();
		return true;
	} catch (err) {
		return false;
	} finally {
		profile('InternetCheck');
	}
}

/** Updates KM's app base as a whole. It adds checks and other inits to updateAllRepos() that are not needed when doing tests. */
export async function updateBase(internet: boolean) {
	const state = getState();
	const conf = getConfig();
	if (!state.isTest && !conf.App.FirstRun && internet) {
		await updateAllRepos();
	}
	initFetchPopularSongs();
	await checkDownloadStatus();
	if (!state.forceDisableAppUpdate) initAutoUpdate();
	if (!state.isTest)
		createImagePreviews(
			await getKaras({
				q: 'm:downloaded',
				ignoreCollections: true,
			}),
			'single'
		).catch(() => {}); // Non-fatal
}

export async function exit(rc = 0, update = false) {
	// App Update need the app to be alive, so we're not shutting ti down completely if an update is requested
	const c = getConfig();
	const s = getState();
	if (s.shutdownInProgress) return;
	logger.info('Shutdown in progress', { service });
	setState({ shutdownInProgress: true });
	closeAllWindows();
	wipeDownloadQueue();
	clearInterval(usageTimeInterval);
	stopFetchPopularSongs();
	stopPlaylistSystem();
	stopSessionSystem();
	stopStatsSystem();
	stopDiscordRPC();
	const promises = [];
	if (getState().player?.playerStatus) promises.push(quitmpv());
	await stopGame(false);
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
		logger.warn('Disconnecting from database failed', { service, obj: err });
	}
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
	} finally {
		await Promise.all(promises);
	}
}

function mataNe(rc: number) {
	logger.info('Closing', { service });
	console.log('\nMata ne !\n');
	unregisterShortcuts();
	app.exit(rc);
}

export async function shutdown() {
	logger.info('Dropping the mic, shutting down!', { service });
	exit(0);
}

/** Checks if files have changed and if so triggers a generation with progressbar and such for the user */
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

/* Generates database and writes base checksum to DB */
export async function initKaraBase() {
	initStep(i18next.t('INIT_GEN'));
	const checksum = await baseChecksum();
	await generateDB();
	await saveSetting('baseChecksum', checksum);
}
