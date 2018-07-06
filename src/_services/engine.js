//Utils
import {setConfig, mergeConfig, getConfig} from '../_common/utils/config';
import {profile} from '../_common/utils/logger';
import readlineSync from 'readline-sync';
import {promisify} from 'util';
import sample from 'lodash.sample';
import logger from 'winston';
import {getState, setState} from '../_common/utils/state';
import {initPlaylistSystem, createPlaylist, buildDummyPlaylist, isACurrentPlaylist, isAPublicPlaylist, previousSong, nextSong, getCurrentSong} from './playlist';

//KM Modules
import {createPreviews} from '../_webapp/previews';
import {initUserSystem, updateUserQuotas} from '../_services/user';
import {initDBSystem, getStats, closeUserDatabase} from '../_dao/database';
import {initFrontend} from '../_webapp/frontend';
import {initializationCatchphrases} from '../_services/constants';
import {initFavoritesSystem} from '../_services/favorites';
import {initOnlineSystem} from '../_webapp/online';
import {initControlPanel} from '../_webapp/control_panel';
import {karaGenerationBatch} from '../_admin/generate_karasfiles';
import {addViewcountKara, validateKaras} from '../_services/kara';
import {displayInfo, playJingle, quitmpv, restartmpv, toggleOnTop, setFullscreen, showSubs, hideSubs, seek, goTo, setVolume, mute, unmute, play, pause, stop, resume, initPlayerSystem} from '../_player/player';
import {startPoll, stopPoll} from '../_services/poll';
import {welcomeToYoukousoKaraokeMugen} from '../_services/welcome';
import {runBaseUpdate} from '../_updater/karabase_updater.js';

const sleep = promisify(setTimeout);

let commandInProgress = false;

export async function playerNeedsRestart() {
	const state = getState();
	if (state.status === 'stop' && !state.playerNeedsRestart && !getConfig().isDemo && !getConfig().isTest) {
		setState({ playerNeedsRestart: true });
		logger.info('[Engine] Player will restart in 5 seconds');
		await sleep(5000);
		await restartPlayer();
		setState({ playerNeedsRestart: false });
	} else {
		setState({ playerNeedsRestart: true });
	}
};

async function restartPlayer() {
	try {
		profile('restartmpv');
		await restartmpv();
		logger.info('[Engine] Player restart complete');
		profile('restartmpv');
	} catch(err) {
		throw err;
	}
}

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
			logger.info('[Updater] Done updating karaoke base');
			setConfig({optGenerateDB: true});
		} else {
			logger.info('[Updater] No updates found, exiting');
			exit(0);
		}
	} catch (err) {
		logger.error(`[Updater] Update failed : ${err}`);
		exit(1);
	}
	//Database system is the foundation of every other system
	await initDBSystem();
	await initUserSystem();
	if (conf.OnlineMode) try {
		await initOnlineSystem();
	} catch(err) {
		logger.error(`[Online] Failed to init online system : ${err}`);
	}
	let inits = [];
	if (conf.EngineCreatePreviews) {
		createPreviews();
	}
	inits.push(initPlaylistSystem());
	if (!conf.isDemo) inits.push(initControlPanel(conf.appAdminPort));
	if (!conf.isDemo && !conf.isTest) inits.push(initPlayerSystem());
	inits.push(initFrontend(conf.appFrontendPort));
	inits.push(initFavoritesSystem());
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
	await Promise.all(inits);

	//Easter egg
	let ready = 'READY';
	if (Math.floor(Math.random() * Math.floor(10)) >= 9) ready = 'LADY';
	logger.info(`[Engine] Karaoke Mugen is ${ready}`);
	console.log(`\n${sample(initializationCatchphrases)}\n`);
	if (!conf.isTest) welcomeToYoukousoKaraokeMugen(conf.appFrontendPort);
	profile('Init');
}

export function exit(rc) {
	logger.info('[Engine] Shutdown in progress');
	//Exiting on Windows will require a keypress from the user to avoid the window immediately closing on an error.
	//On other systems or if terminal is not a TTY we exit immediately.
	// non-TTY terminals have no stdin support.

	if (getState().player.ready) quitmpv();
	logger.info('[Engine] Player has shut down');

	closeUserDatabase().then(() => {
		logger.info('[Engine] Database closed');
		console.log('\nMata ne !\n');
		if (process.platform !== 'win32' || !process.stdout.isTTY) process.exit(rc);
		if (rc !== 0) readlineSync.question('Press enter to exit', {hideEchoBack: true});
		process.exit(rc);
	});
}

async function playPlayer() {
	profile('Play');
	const state = getState();
	if (!state.player.ready) throw '[Player] Player is not ready yet!';
	if (state.status === 'stop') {
		// Switch to playing mode and ask which karaoke to play next
		await getPlayingSong();
		setState({status: 'play'});
	} else {
		resume();
	}
	profile('Play');
}

function stopPlayer(now) {
	if (now) {
		logger.info('[Engine] Karaoke stopping NOW');
		stop();
	} else {
		logger.info('[Engine] Karaoke stopping after current song');
	}
	setState({status: 'stop'});
}

function pausePlayer() {
	pause();
	logger.info('[Engine] Karaoke paused');
	setState({status: 'pause'});
}

function mutePlayer() {
	logger.info('[Engine] Player muted');
	mute();
}

function unmutePlayer() {
	logger.info('[Engine] Player unmuted');
	unmute();
}

function seekPlayer(delta) {
	seek(delta);
}

function goToPlayer(seconds) {
	goTo(seconds);
}

function setVolumePlayer(volume) {
	setVolume(volume);
}

function showSubsPlayer() {
	logger.info('[Engine] Showing lyrics on screen');
	showSubs();
}

function hideSubsPlayer() {
	logger.info('[Engine] Hiding lyrics on screen');
	hideSubs();
}

async function prev() {
	logger.info('[Engine] Going to previous song');
	stopPlayer(true);
	try {
		await previousSong();
		playPlayer();
	} catch(err) {
		logger.warn(`[Engine] Previous song is not available : ${err}`);
		// A failed previous means we restart the current song.
		playPlayer();
	}
}

async function next() {
	logger.info('[Engine] Going to next song');
	stopPlayer(true);
	try {
		await nextSong();
		playPlayer();
	} catch(err) {
		logger.warn(`[Engine] Next song is not available : ${err}`);
	}
}

function setSongPoll(enabled) {
	const state = getState();
	const oldState = state.songPoll;
	setState({songPoll: enabled});
	if (!oldState && enabled) startPoll(state.publicPlaylistID,state.currentPlaylistID);
	if (oldState && !enabled) stopPoll();
}

function toggleFullScreenPlayer() {
	let state = getState();
	state = setState({fullscreen: !state.fullscreen});
	setFullscreen(state.fullscreen);
	if (state.fullscreen) {
		logger.info('[Engine] Player going to full screen');
	} else {
		logger.info('[Engine] Player going to windowed mode');
	}
}

function toggleOnTopPlayer() {
	let state = getState();
	state = setState({ontop: toggleOnTop()});
	if (state.engine.ontop) {
		logger.info('[Engine] Player staying on top');
	} else {
		logger.info('[Engine] Player NOT staying on top');
	}
}


export async function playingUpdated() {
	const state = getState();
	if (state.status === 'play' && state.playing) {
		await stopPlayer(true);
		playPlayer();
	}
}

export async function playerEnding() {
	const state = getState();
	logger.debug( '[Engine] Player Ending event triggered');
	if (state.playerNeedsRestart) {
		logger.info('[Engine] Player restarts, please wait');
		setState({playerNeedsRestart: false});
		await restartPlayer();
	}
	const conf = getConfig();
	logger.debug( '[Jingles] Songs before next jingle : '+ (conf.EngineJinglesInterval - state.counterToJingle));
	if (state.counterToJingle >= conf.EngineJinglesInterval) {
		setState({
			currentlyPlayingKara: -1,
			counterToJingle: 0
		});
		playJingle();
	} else {
		try {
			setState({counterToJingle: state.counterToJingle++});
			displayInfo();
			if (state.status !== 'stop') {
				await next();
				await getPlayingSong();
			}
		} catch(err) {
			displayInfo();
			logger.warn(`[Engine] Next song is not available : ${err}`);
			stopPlayer();
		}
	}
}

async function getPlayingSong() {
	let state = getState();
	if (!state.player.playing) {
		profile('tryToReadKaraInPlaylist');
		try {
			const kara = await getCurrentSong();
			let karaForLogging = { ...kara };
			karaForLogging.subtitle = '[Not logging ASS data]';
			logger.debug( '[PLC] Karaoke selected : ' + JSON.stringify(karaForLogging, null, '\n'));
			let serie = kara.serie;
			let title = kara.title;
			if (!serie) serie = kara.singer;
			if (!title) title = '';
			logger.info(`[Engine] Playing ${serie}${title}`);
			await play({
				media: kara.mediafile,
				subfile: kara.subfile,
				gain: kara.gain,
				infos: kara.infos
			});
			setState({currentlyPlayingKara: kara.kara_id});
			addViewcountKara(kara.kara_id,kara.kid);
			updateUserQuotas(kara);
			if (getConfig().EngineSongPoll) startPoll(state.publicPlaylistID,state.currentPlaylistID);
		} catch(err) {
			logger.error(`[Engine] Error during song playback : ${err}`);
			state = getState();
			if (state.status !== 'stop') {
				logger.warn('[Player] Skipping playback for this kara');
				next();
			} else {
				stopPlayer(true);
			}
		}
		profile('tryToReadKaraInPlaylist');
	}
}

export async function updateSettings(newConfig) {
	const conf = getConfig();
	if (newConfig.EngineSongPoll === 1) {
		setSongPoll(true);
	} else {
		setSongPoll(false);
	}
	return await mergeConfig(conf, newConfig);
}

export function shutdown() {
	logger.info('[Engine] Dropping the mic, shutting down!');
	exit(0);
}

export async function sendCommand(command, options) {
	const state = getState();
	if (!state.player.ready) throw '[Player] Player is not ready yet!';
	if (commandInProgress || getConfig().isDemo || getConfig().isTest) throw '[Engine] A command is already in progress';
	commandInProgress = true;
	if (command === 'play') {
		await playPlayer();
	} else if (command === 'stopNow') {
		await stopPlayer(true);
	} else if (command === 'pause') {
		await pausePlayer();
	} else if (command === 'stopAfter') {
		stopPlayer();
		await next();
	} else if (command === 'skip') {
		await next();
	} else if (command === 'prev') {
		await prev();
	} else if (command === 'toggleFullscreen') {
		await toggleFullScreenPlayer();
	} else if (command === 'toggleAlwaysOnTop') {
		await toggleOnTopPlayer();
	} else if (command === 'mute') {
		await mutePlayer();
	} else if (command === 'unmute') {
		await unmutePlayer();
	} else if (command === 'showSubs') {
		await showSubsPlayer();
	} else if (command === 'hideSubs') {
		await hideSubsPlayer();
	} else if (command === 'seek') {
		if (!options || isNaN(options)) {
			commandInProgress = false;
			throw 'Command seek must have a numeric option value';
		}
		await seekPlayer(options);
	} else if (command === 'goTo') {
		if (!options || isNaN(options)) {
			commandInProgress = false;
			throw 'Command goTo must have a numeric option value';
		}
		await goToPlayer(options);
	} else if (command === 'setVolume') {
		if (!options || isNaN(options)) {
			commandInProgress = false;
			throw 'Command setVolume must have a numeric option value';
		}
		await setVolumePlayer(options);
	} else {// Unknown commands are not possible, they're filtered by API's validation.
	}
	commandInProgress = false;
}

export async function getKMStats() {
	return await getStats();
}
