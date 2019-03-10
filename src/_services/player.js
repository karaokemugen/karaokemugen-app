import {setState, getState} from '../_utils/state';
import {getConfig} from '../_utils/config';
import logger from 'winston';
import {profile} from '../_utils/logger';
import {promisify} from 'util';
import {loadBackground, displayInfo, playJingle, restartmpv, quitmpv as quit, toggleOnTop, setFullscreen, showSubs, hideSubs, seek, goTo, setVolume, mute, unmute, play, pause, stop, resume, initPlayerSystem} from '../_player/player';
import {addPlayedKara} from './kara';
import {updateUserQuotas} from './user';
import {startPoll} from './poll';
import {previousSong, nextSong, getCurrentSong} from './playlist';

const sleep = promisify(setTimeout);

let commandInProgress = false;

async function getPlayingSong(now) {
	if (!getState().player.playing || now) {
		profile('getPlayingSong');
		try {
			const kara = await getCurrentSong();
			logger.debug('[Player] Karaoke selected : ' + JSON.stringify(kara, null, 2));
			logger.info(`[Player] Playing ${kara.mediafile.substring(0, kara.mediafile.length-4)}`);
			await play({
				media: kara.mediafile,
				subfile: kara.subfile,
				gain: kara.gain,
				infos: kara.infos
			});
			setState({currentlyPlayingKara: kara.kid});
			addPlayedKara(kara.kid);
			updateUserQuotas(kara);
			if (+getConfig().EngineSongPoll) startPoll();
		} catch(err) {
			logger.error(`[Player] Error during song playback : ${err}`);
			if (getState().status !== 'stop') {
				logger.warn('[Player] Skipping playback for this song');
				next();
			} else {
				stopPlayer(true);
			}
		} finally {
			profile('getPlayingSong');
		}
	}
}


export async function playingUpdated() {
	// Current playing song has been changed, stopping playing now and
	// hitting play again to get the new song.
	const state = getState();
	if (state.status === 'play' && state.player.playing) {
		playPlayer(true);
	}
}

export async function playerEnding() {
	// This is triggered when player ends its current song.
	let state = getState();
	logger.debug('[Player] Player Ending event triggered');
	if (state.playerNeedsRestart) {
		logger.info('[Player] Player restarts, please wait');
		setState({playerNeedsRestart: false});
		await restartPlayer();
	}
	const conf = getConfig();
	logger.debug(`[Jingles] Songs before next jingle: ${conf.EngineJinglesInterval - state.counterToJingle}`);
	if (state.counterToJingle >= conf.EngineJinglesInterval && conf.EngineJinglesInterval > 0) {
		setState({
			currentlyPlayingKara: -1,
			counterToJingle: 0
		});
		await playJingle();
	} else {
		try {
			state.counterToJingle++;
			setState({counterToJingle: state.counterToJingle});
			if (state.status !== 'stop') {
				await next();
			}
		} catch(err) {
			loadBackground();
			displayInfo();
			stopPlayer();
		}
	}
}

async function prev() {
	logger.info('[Player] Going to previous song');
	try {
		await previousSong();
	} catch(err) {
		logger.warn(`[Player] Previous song is not available : ${err}`);
		// A failed previous means we restart the current song.
	} finally {
		playPlayer(true);
	}
}

async function next() {
	logger.info('[Player] Going to next song');
	try {
		await nextSong();
		playPlayer(true);
	} catch(err) {
		logger.warn(`[Player] Next song is not available : ${err}`);
		throw err;
	}
}

function toggleFullScreenPlayer() {
	let state = getState();
	state = setState({fullscreen: !state.fullscreen});
	setFullscreen(state.fullscreen);
	state.fullscreen
		? logger.info('[Player] Player going to full screen')
		: logger.info('[Player] Player going to windowed mode');
}

function toggleOnTopPlayer() {
	let state = getState();
	state = setState({ontop: toggleOnTop()});
	state.engine.ontop
		? logger.info('[Player] Player staying on top')
		: logger.info('[Player] Player NOT staying on top');
}


export async function playPlayer(now) {
	profile('Play');
	const state = getState();
	if (!state.player.ready) throw '[Player] Player is not ready yet!';
	if (state.status === 'stop' || now) {
		// Switch to playing mode and ask which karaoke to play next
		await getPlayingSong(now);
		setState({status: 'play'});
	} else {
		resume();
	}
	profile('Play');
}

function stopPlayer(now) {
	if (now) {
		logger.info('[Player] Karaoke stopping NOW');
		stop();
	} else {
		logger.info('[Player] Karaoke stopping after current song');
	}
	setState({status: 'stop', currentlyPlayingKara: null});
}

function pausePlayer() {
	pause();
	logger.info('[Player] Karaoke paused');
	setState({status: 'pause'});
}

function mutePlayer() {
	mute();
	logger.info('[Player] Player muted');
}

function unmutePlayer() {
	unmute();
	logger.info('[Player] Player unmuted');
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
	showSubs();
	logger.info('[Player] Showing lyrics on screen');
}

function hideSubsPlayer() {
	hideSubs();
	logger.info('[Player] Hiding lyrics on screen');
}


export async function playerNeedsRestart() {
	const state = getState();
	if (state.status === 'stop' && !state.playerNeedsRestart && !getConfig().isDemo && !getConfig().isTest) {
		setState({ playerNeedsRestart: true });
		logger.info('[Player] Player will restart in 5 seconds');
		await sleep(5000);
		await restartPlayer();
		setState({ playerNeedsRestart: false });
	} else {
		setState({ playerNeedsRestart: true });
	}
};

async function restartPlayer() {
	profile('restartmpv');
	await restartmpv();
	logger.info('[Player] Player restart complete');
	profile('restartmpv');
}


export async function sendCommand(command, options) {
	const state = getState();
	if (!state.player.ready) throw 'Player is not ready yet!';
	if (commandInProgress) throw 'A command is already in progress';
	if (getConfig().isDemo || getConfig().isTest) throw 'Player management is disabled in demo or test modes';
	commandInProgress = true;
	// Automatically set it back to false after 3 seconds
	setTimeout(function () {
		commandInProgress = false;
	}, 3000);
	if (command === 'play') {
		await playPlayer();
	} else if (command === 'stopNow') {
		await stopPlayer(true);
	} else if (command === 'pause') {
		await pausePlayer();
	} else if (command === 'stopAfter') {
		stopPlayer();
		await nextSong();
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

export async function initPlayer() {
	return await initPlayerSystem();
}

export async function quitmpv() {
	return await quit();
}