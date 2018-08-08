import {setState, getState} from '../_common/utils/state';
import {getConfig} from '../_common/utils/config';
import logger from 'winston';
import {profile} from '../_common/utils/logger';
import {promisify} from 'util';
import {displayInfo, playJingle, restartmpv, quitmpv as quit, toggleOnTop, setFullscreen, showSubs, hideSubs, seek, goTo, setVolume, mute, unmute, play, pause, stop, resume, initPlayerSystem} from '../_player/player';
import {addViewcountKara} from './kara';
import {updateUserQuotas} from './user';
import {startPoll} from './poll';
import {previousSong, nextSong, getCurrentSong} from './playlist';

const sleep = promisify(setTimeout);

let commandInProgress = false;

async function getPlayingSong() {
	let state = getState();
	if (!state.player.playing) {
		profile('tryToReadKaraInPlaylist');
		try {
			const kara = await getCurrentSong();
			let karaForLogging = { ...kara };
			karaForLogging.subtitle = '[Not logging ASS data]';
			logger.debug('[Player] Karaoke selected : ' + JSON.stringify(karaForLogging, null, '\n'));
			let serie = kara.serie;
			let title = kara.title;
			if (!serie) serie = kara.singer;
			if (!title) title = '';
			logger.info(`[Player] Playing ${serie}${title}`);
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
			logger.error(`[Player] Error during song playback : ${err}`);
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


export async function playingUpdated() {
	const state = getState();
	if (state.status === 'play' && state.player.playing) {
		await stopPlayer(true);
		playPlayer();
	}
}

export async function playerEnding() {
	const state = getState();
	logger.debug('[Player] Player Ending event triggered');
	if (state.playerNeedsRestart) {
		logger.info('[Player] Player restarts, please wait');
		setState({playerNeedsRestart: false});
		await restartPlayer();
	}
	const conf = getConfig();
	logger.debug('[Jingles] Songs before next jingle : '+ (conf.EngineJinglesInterval - state.counterToJingle));
	if (state.counterToJingle >= conf.EngineJinglesInterval) {
		setState({
			currentlyPlayingKara: -1,
			counterToJingle: 0
		});
		await playJingle();
	} else {
		try {
			setState({counterToJingle: state.counterToJingle++});
			displayInfo();
			if (state.status !== 'stop') {
				await nextSong();
				await getPlayingSong();
			}
		} catch(err) {
			displayInfo();
			logger.warn(`[Player] Next song is not available : ${err}`);
			stopPlayer();
		}
	}
}

async function prev() {
	logger.info('[Player] Going to previous song');
	stopPlayer(true);
	try {
		await previousSong();
		playPlayer();
	} catch(err) {
		logger.warn(`[Player] Previous song is not available : ${err}`);
		// A failed previous means we restart the current song.
		playPlayer();
	}
}

async function next() {
	logger.info('[Player] Going to next song');
	stopPlayer(true);
	try {
		await nextSong();
		playPlayer();
	} catch(err) {
		logger.warn(`[Player] Next song is not available : ${err}`);
	}
}

function toggleFullScreenPlayer() {
	let state = getState();
	state = setState({fullscreen: !state.fullscreen});
	setFullscreen(state.fullscreen);
	if (state.fullscreen) {
		logger.info('[Player] Player going to full screen');
	} else {
		logger.info('[Player] Player going to windowed mode');
	}
}

function toggleOnTopPlayer() {
	let state = getState();
	state = setState({ontop: toggleOnTop()});
	if (state.engine.ontop) {
		logger.info('[Player] Player staying on top');
	} else {
		logger.info('[Player] Player NOT staying on top');
	}
}


export async function playPlayer() {
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
		logger.info('[Player] Karaoke stopping NOW');
		stop();
	} else {
		logger.info('[Player] Karaoke stopping after current song');
	}
	setState({status: 'stop'});
}

function pausePlayer() {
	pause();
	logger.info('[Player] Karaoke paused');
	setState({status: 'pause'});
}

function mutePlayer() {
	logger.info('[Player] Player muted');
	mute();
}

function unmutePlayer() {
	logger.info('[Player] Player unmuted');
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
	logger.info('[Player] Showing lyrics on screen');
	showSubs();
}

function hideSubsPlayer() {
	logger.info('[Player] Hiding lyrics on screen');
	hideSubs();
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
	try {
		profile('restartmpv');
		await restartmpv();
		logger.info('[Player] Player restart complete');
		profile('restartmpv');
	} catch(err) {
		throw err;
	}
}


export async function sendCommand(command, options) {
	const state = getState();
	if (!state.player.ready) throw '[Player] Player is not ready yet!';
	if (commandInProgress || getConfig().isDemo || getConfig().isTest) throw '[Player] A command is already in progress';
	commandInProgress = true;
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