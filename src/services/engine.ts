//Utils
import {getConfig} from '../lib/utils/config';
import {profile} from '../lib/utils/logger';
import readlineSync from 'readline-sync';
import logger from 'winston';
import {getState, setState} from '../utils/state';
import {checkPG, killPG} from '../utils/postgresql';

//KM Modules
import {initUserSystem} from './user';
import {initDBSystem, getStats} from '../dao/database';
import {closeDB} from '../lib/dao/database';
import {initFrontend} from '../webapp/frontend';
import {initOnlineURLSystem} from '../webapp/online';
import {initPlayer, quitmpv} from './player';
import {initDownloader, updateBase, updateMedias} from './download';
import {initStats} from './stats';
import {welcomeToYoukousoKaraokeMugen} from './welcome';
import {initPlaylistSystem, testPlaylists} from './playlist';
import { generateDatabase } from '../lib/services/generation';
import {validateV3} from '../lib/dao/karafile';
import { initTwitch, stopTwitch, getTwitchClient } from '../utils/twitch';
import { initSession } from './session';
import { updateJingles, buildJinglesList } from './jingles';
import { updateIntros, buildIntrosList } from './intros';

export async function initEngine() {
	profile('Init');
	const conf = getConfig();
	const state = getState();
	setState({
		fullscreen: conf.Player.FullScreen,
		ontop: conf.Player.StayOnTop,
		private: conf.Karaoke.Private,
	});
	if (state.opt.validateV3) try {
		logger.info('[Engine] V3 Validation in progress...');
		await validateV3(state.appPath);
		logger.info('[Engine] V3 Validation OK');
		await exit(0);
	} catch(err) {
		logger.error(`[Engine] V3 Validation error : ${err}`);
		await exit(1);
	}
	if (state.opt.validate) try {
		await generateDatabase(true, true);
		await exit(0);
	} catch(err) {
		logger.error(`[Engine] Validation error : ${err}`);
		await exit(1);
	}
	if (state.opt.mediaUpdate) try {
		await updateMedias(conf.Online.Host);
		await exit(0)
	} catch(err) {
		logger.error(`[Engine] Updating medias failed : ${err}`);
		await exit(1)
	}
	//Database system is the foundation of every other system
	await initDBSystem();
	if (state.opt.baseUpdate) try {
		await updateBase(conf.Online.Host);
		logger.info('[Engine] Done updating karaoke base');
		await exit(0);
	} catch (err) {
		logger.error(`[Engine] Update failed : ${err}`);
		await exit(1);
	}
	await initUserSystem();
	if (conf.Online.URL) try {
		await initOnlineURLSystem();
	} catch(err) {
		//Non-blocking
		logger.error(`[Engine] Failed to init online system : ${err}`);
	}
	let inits = [];
	if (conf.Karaoke.StreamerMode.Twitch.Enabled) initTwitch();
	inits.push(initPlaylistSystem());
	if (!state.isDemo && !state.isTest) inits.push(initPlayer());
	inits.push(initFrontend());
	inits.push(initSession());
	testPlaylists();
	initDownloader();
	if (conf.Online.Stats === true) inits.push(initStats(false));
	try {
		await Promise.all(inits);
		//Easter egg
		let ready = 'READY';
		if (Math.floor(Math.random() * Math.floor(10)) >= 9) ready = 'LADY';
		logger.info(`[Engine] Karaoke Mugen is ${ready}`);
		if (!state.isTest) welcomeToYoukousoKaraokeMugen(conf.Frontend.Port);
		setState({ ready: true });
	} catch(err) {
		logger.error(`[Engine] Karaoke Mugen IS NOT READY : ${JSON.stringify(err)}`);
	} finally {
		profile('Init');
	}
	// This is done later because it's not important.
	if (conf.Online.IntrosUpdate && !state.isTest && !state.isDemo) try {
		await updateIntros();
	} catch(err) {
		// Non-fatal
	}
	buildIntrosList();
	if (conf.Online.JinglesUpdate && !state.isTest && !state.isDemo) try {
		await updateJingles();
	} catch(err) {
		// Non-fatal
	}
	buildJinglesList();
}

export async function exit(rc: any) {
	logger.info('[Engine] Shutdown in progress');
	//Exiting on Windows will require a keypress from the user to avoid the window immediately closing on an error.
	//On other systems or if terminal is not a TTY we exit immediately.
	// non-TTY terminals have no stdin support.

	if (getState().player.ready) {
		quitmpv();
		logger.info('[Engine] Player has shutdown');
	}
	if (getTwitchClient()) await stopTwitch();

	closeDB();
	//CheckPG returns if postgresql has been started by Karaoke Mugen or not.
	if (getConfig() && getConfig().Karaoke.StreamerMode.Twitch.Enabled) await stopTwitch();
	try {
		if (await checkPG()) {
			try {
				await killPG();
				logger.info('[Engine] PostgreSQL has shutdown');
				mataNe(rc);
			} catch(err) {
				logger.error('[Engine] PostgreSQL could not be stopped!');
				mataNe(rc);
			}
		} else {
			mataNe(rc);
		}
	} catch(err) {
		logger.error(`[Engine] Failed to shutdown PostgreSQL : ${err}`);
		mataNe(1);
	}
}

function mataNe(rc: any) {
	console.log('\nMata ne !\n');
	if (process.platform !== 'win32' || !process.stdout.isTTY) process.exit(rc);
	if (rc !== 0) readlineSync.question('Press enter to exit', {hideEchoBack: true});
	process.exit(rc);
}

export function shutdown() {
	logger.info('[Engine] Dropping the mic, shutting down!');
	exit(0);
}

export async function getKMStats() {
	return await getStats();
}
