//Utils
import {setConfig, getConfig} from '../_common/utils/config';
import {profile} from '../_common/utils/logger';
import readlineSync from 'readline-sync';
import logger from 'winston';
import {getState, setState} from '../_common/utils/state';

//KM Modules
import {createPreviews} from '../_webapp/previews';
import {initUserSystem} from './user';
import {initDBSystem, getStats, closeUserDatabase} from '../_dao/database';
import {initFrontend} from '../_webapp/frontend';
import {initFavoritesSystem} from './favorites';
import {initOnlineSystem} from '../_webapp/online';
import {initControlPanel} from '../_webapp/control_panel';
import {initPlayer, quitmpv} from './player';
import {initStats, sendPayload} from './stats';
import {karaGenerationBatch} from '../_admin/generate_karasfiles';
import {validateKaras} from './kara';
import {welcomeToYoukousoKaraokeMugen} from '../_services/welcome';
import {runBaseUpdate} from '../_updater/karabase_updater.js';
import {initPlaylistSystem, createPlaylist, buildDummyPlaylist, isACurrentPlaylist, isAPublicPlaylist} from './playlist';

export async function initEngine() {
	profile('Init');
	const conf = getConfig();
	setState({
		frontendPort: conf.appFrontendPort,
		fullscreen: conf.PlayerFullScreen,
		ontop: conf.PlayerStayOnTop,
		private: conf.EnginePrivateMode,
	});
	if (conf.optKaragen) try {
		await karaGenerationBatch();
		exit(0);
	} catch (err) {
		logger.error(`[Engine] Karaoke import failed : ${err}`);
		exit(1);
	}
	if (conf.optValidateKaras) try {
		logger.info('[Engine] Starting validation process, please wait...');
		await validateKaras();
		logger.info('[Engine] Validation completed successfully. Yayifications!');
		exit(0);
	} catch (err) {
		logger.error(`[Engine] Validation failed : ${err}`);
		exit(1);
	}
	if (conf.optBaseUpdate) try {
		if (await runBaseUpdate()) {
			logger.info('[Engine] Done updating karaoke base');
			setConfig({optGenerateDB: true});
		} else {
			logger.info('[Engine] No updates found, exiting');
			exit(0);
		}
	} catch (err) {
		logger.error(`[Engine] Update failed : ${err}`);
		exit(1);
	}
	//Database system is the foundation of every other system
	await initDBSystem();
	await initUserSystem();
	if (+conf.OnlineMode) try {
		await initOnlineSystem();
	} catch(err) {
		logger.error(`[Engine] Failed to init online system : ${err}`);
	}
	let inits = [];
	if (+conf.EngineCreatePreviews) {
		createPreviews();
	}
	inits.push(initPlaylistSystem());
	if (!conf.isDemo) inits.push(initControlPanel(conf.appAdminPort));
	if (!conf.isDemo && !conf.isTest) inits.push(initPlayer());
	inits.push(initFrontend(conf.appFrontendPort));
	inits.push(initFavoritesSystem());
	if (+conf.OnlineStats === 1) inits.push(initStats());
	//Initialize engine
	// Test if current/public playlists exist
	const currentPL_id = await isACurrentPlaylist();
	if (currentPL_id) {
		setState({currentPlaylistID: currentPL_id});
	} else {
		setState({currentPlaylistID: await createPlaylist(__('CURRENT_PLAYLIST'),{
			visible: true,
			current: true
		},'admin')
		});
		logger.info('[Engine] Initial current playlist created');
		if (!conf.isTest) {
			inits.push(buildDummyPlaylist(getState().currentPlaylistID));
		}
	}
	const publicPL_id = await isAPublicPlaylist();
	if (publicPL_id) {
		setState({ publicPlaylistID: publicPL_id });
	} else {
		setState({ publicPlaylistID: await createPlaylist(__('PUBLIC_PLAYLIST'),{
			visible: true,
			public: true
		},'admin')
		});
		logger.info('[Engine] Initial public playlist created');
	}
	try {
		await Promise.all(inits);
		//Easter egg
		let ready = 'READY';
		if (Math.floor(Math.random() * Math.floor(10)) >= 9) ready = 'LADY';
		logger.info(`[Engine] Karaoke Mugen is ${ready}`);
		if (!conf.isTest) welcomeToYoukousoKaraokeMugen(conf.appFrontendPort);
		setState({ ready: true });
	} catch(err) {
		logger.error(`[Engine] Karaoke Mugen IS NOT READY : ${JSON.stringify(err)}`);
	} finally {
		profile('Init');
	}

}

export function exit(rc) {
	logger.info('[Engine] Shutdown in progress');
	//Exiting on Windows will require a keypress from the user to avoid the window immediately closing on an error.
	//On other systems or if terminal is not a TTY we exit immediately.
	// non-TTY terminals have no stdin support.

	if (getState().player.ready) {
		quitmpv();
		logger.info('[Engine] Player has shut down');
	}

	closeUserDatabase().then(() => {
		logger.info('[Engine] Database closed');
		console.log('\nMata ne !\n');
		if (process.platform !== 'win32' || !process.stdout.isTTY) process.exit(rc);
		if (rc !== 0) readlineSync.question('Press enter to exit', {hideEchoBack: true});
		process.exit(rc);
	});
}

export function shutdown() {
	logger.info('[Engine] Dropping the mic, shutting down!');
	exit(0);
}

export async function getKMStats() {
	return await getStats();
}
