import {setState, getState} from '../utils/state';
import {getConfig} from '../lib/utils/config';
import logger from 'winston';
import {profile} from '../lib/utils/logger';
import {playMedia, restartmpv, quitmpv as quit, toggleOnTop, setFullscreen, showSubs, hideSubs, seek, goTo, setVolume, mute, unmute, play, pause, stop, resume, initPlayerSystem, displaySongInfo} from '../player/player';
import {addPlayedKara} from './kara';
import {updateUserQuotas} from './user';
import {startPoll} from './poll';
import {previousSong, nextSong, getCurrentSong} from './playlist';
import {promisify} from 'util';
import { setPLCVisible, updatePlaylistDuration } from '../dao/playlist';
import { getSingleIntro } from './intros';
import { emitWS } from '../lib/utils/ws';

const sleep = promisify(setTimeout);

let commandInProgress = false;

async function playCurrentSong(now: boolean) {
	if (!getState().player.playing || now) {
		profile('playCurrentSong');
		try {
			const kara = await getCurrentSong();
			// Testing if we're on first position, if intro hasn't been played already and if we have at least one intro available
			if (kara.pos === 1 && getSingleIntro() && !getState().introPlayed) {
				try {
					setState({currentlyPlayingKara: -2, introPlayed: true});
					await playMedia('intro');
					return;
				} catch(err) {
					throw err;
				}
			}
			logger.debug('[Player] Karaoke selected : ' + JSON.stringify(kara, null, 2));
			logger.info(`[Player] Playing ${kara.mediafile.substring(0, kara.mediafile.length - 4)}`);
			await play({
				media: kara.mediafile,
				subfile: kara.subfile,
				gain: kara.gain,
				infos: kara.infos,
				avatar: kara.avatar,
				duration: kara.duration
			});
			setState({currentlyPlayingKara: kara.kid});
			addPlayedKara(kara.kid);
			setPLCVisible(kara.playlistcontent_id);
			updatePlaylistDuration(kara.playlist_id),
			updateUserQuotas(kara);
			emitWS('playlistInfoUpdated', kara.playlist_id);
			const conf = getConfig();
			if (conf.Karaoke.Poll.Enabled && !conf.Karaoke.StreamerMode.Enabled) startPoll();
		} catch(err) {
			logger.error(`[Player] Error during song playback : ${JSON.stringify(err)}`);
			if (getState().status !== 'stop') {
				logger.warn('[Player] Skipping playback for this song');
				try {
					await next();
				} catch(err) {
					logger.warn('[Player] Skipping failed');
				}
			} else {
				logger.warn('[Player] Stopping karaoke due to error');
				stopPlayer(true);
			}
		} finally {
			profile('playCurrentSong');
		}
	}
}

/* Current playing song has been changed, stopping playing now and hitting play again to get the new song. */
export async function playingUpdated() {
	const state = getState();
	if (state.status === 'play' && state.player.playing) playPlayer(true);
}

/* This is triggered when player ends its current song */
export async function playerEnding() {
	let state = getState();
	logger.debug('[Player] Player Ending event triggered');
	if (state.playerNeedsRestart) {
		logger.info('[Player] Player restarts, please wait');
		setState({playerNeedsRestart: false});
		await restartPlayer();
	}
	// If we just played an intro, relaunch play.
	if (getState().player.mediaType === 'intro') {
		setState({currentlyPlayingKara: -3});
		await playMedia('sponsor');
		return;
	}
	if (getState().player.mediaType === 'sponsor') {
		await playCurrentSong(true);
		return;
	}
	const conf = getConfig();
	logger.info(`[Jingles] Songs before next jingle: ${conf.Karaoke.JinglesInterval - state.counterToJingle}`);
	if (state.counterToJingle >= conf.Karaoke.JinglesInterval && conf.Karaoke.JinglesInterval > 0) {
		setState({
			currentlyPlayingKara: -1,
			counterToJingle: 0
		});
		try {
			await playMedia('jingle');
		} catch(err) {
			logger.error(`[Jingle] Unable to play jingle file : ${err}`);
		}
	} else {
		try {
			state.counterToJingle++;
			setState({counterToJingle: state.counterToJingle});
			if (state.status !== 'stop') {
				await next();
			} else {
				stopPlayer(true);
			}
		} catch(err) {
			stopPlayer(true);
		}
	}
}

async function prev() {
	logger.debug('[Player] Going to previous song');
	try {
		await previousSong();
	} catch(err) {
		logger.warn(`[Player] Previous song is not available : ${err}`);
	} finally {
		playPlayer(true);
	}
}

async function next() {
	logger.debug('[Player] Going to next song');
	try {
		await nextSong();
		const conf = getConfig();
		if (conf.Karaoke.ClassicMode) {
			await prepareClassicPauseScreen();
			stopPlayer(true);
			if (conf.Karaoke.StreamerMode.Enabled && conf.Karaoke.StreamerMode.PauseDuration > 0) {
				await sleep(conf.Karaoke.StreamerMode.PauseDuration * 1000);
				// Recheck if classic mode is still enabled after the sleep timer. If it's disabled now, do not play song.
				if (getState().status === 'stop' && getConfig().Karaoke.ClassicMode) await playPlayer(true);
			}
		} else if (conf.Karaoke.StreamerMode.Enabled) {
			setState({currentRequester: null});
			const kara = await getCurrentSong();
			await stopPlayer(true);
			if (conf.Karaoke.Poll.Enabled) {
				await startPoll();
			} else {
				displaySongInfo(kara.infos, 10000000, true);
			}
			if (conf.Karaoke.StreamerMode.PauseDuration > 0) {
				await sleep(conf.Karaoke.StreamerMode.PauseDuration * 1000);
				if (getState().status === 'stop') await playPlayer(true);
			}
		} else {
			setState({currentRequester: null});
			playPlayer(true);
		}
	} catch(err) {
		logger.warn(`[Player] Next song is not available : ${err}`);
		throw err;
	}
}

async function toggleFullScreenPlayer() {
	let state = getState();
	state = setState({fullscreen: !state.fullscreen});
	await setFullscreen(state.fullscreen);
	state.fullscreen
		? logger.info('[Player] Player going to full screen')
		: logger.info('[Player] Player going to windowed mode');
}

async function toggleOnTopPlayer() {
	let state = getState();
	state = setState({ontop: await toggleOnTop()});
	state.ontop
		? logger.info('[Player] Player staying on top')
		: logger.info('[Player] Player NOT staying on top');
}


export async function playPlayer(now?: boolean) {
	profile('Play');
	const state = getState();
	if (!state.player.ready) throw '[Player] Player is not ready yet!';
	if (state.status === 'stop' || now) {
		// Switch to playing mode and ask which karaoke to play next
		try {
			await playCurrentSong(now);
		} catch(err) {
			throw err;
		}
		setState({status: 'play'});
	} else {
		await resume();
	}
	profile('Play');
}

async function stopPlayer(now = true) {
	if (now) {
		logger.info('[Player] Karaoke stopping NOW');
		await stop();
		setState({status: 'stop', currentlyPlayingKara: null});
	} else {
		logger.info('[Player] Karaoke stopping after current song');
		setState({status: 'stop'});
	}
	if (getConfig().Karaoke.ClassicMode) await prepareClassicPauseScreen();
}

export async function prepareClassicPauseScreen() {
	const kara = await getCurrentSong();
	setState({currentRequester: kara.username});
	displaySongInfo(kara.infos, 10000000, true);
}

async function pausePlayer() {
	await pause();
	logger.info('[Player] Karaoke paused');
	setState({status: 'pause'});
}

async function mutePlayer() {
	await mute();
	logger.info('[Player] Player muted');
}

async function unmutePlayer() {
	await unmute();
	logger.info('[Player] Player unmuted');
}

async function seekPlayer(delta: number) {
	await seek(delta);
}

async function goToPlayer(seconds: number) {
	await goTo(seconds);
}

async function setVolumePlayer(volume: number) {
	await setVolume(volume);
}

async function showSubsPlayer() {
	await showSubs();
	logger.info('[Player] Showing lyrics on screen');
}

async function hideSubsPlayer() {
	await hideSubs();
	logger.info('[Player] Hiding lyrics on screen');
}


export async function playerNeedsRestart() {
	const state = getState();
	if (state.status === 'stop' && !state.playerNeedsRestart && !state.isDemo && !state.isTest) {
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


export async function sendCommand(command: string, options: any) {
	const state = getState();
	if (!state.player.ready) throw 'Player is not ready yet!';
	if (commandInProgress) throw 'A command is already in progress';
	if (state.isDemo || state.isTest) throw 'Player management is disabled in demo or test modes';
	commandInProgress = true;
	// Automatically set it back to false after 3 seconds
	setTimeout(() => {
		commandInProgress = false;
	}, 3000);
	try {
		if (command === 'play') {
			await playPlayer();
		} else if (command === 'stopNow') {
			stopPlayer(true);
		} else if (command === 'pause') {
			pausePlayer();
		} else if (command === 'stopAfter') {
			stopPlayer(false);
			await nextSong();
		} else if (command === 'skip') {
			await next();
		} else if (command === 'prev') {
			await prev();
		} else if (command === 'toggleFullscreen') {
			toggleFullScreenPlayer();
		} else if (command === 'toggleAlwaysOnTop') {
			toggleOnTopPlayer();
		} else if (command === 'mute') {
			mutePlayer();
		} else if (command === 'unmute') {
			unmutePlayer();
		} else if (command === 'showSubs') {
			showSubsPlayer();
		} else if (command === 'hideSubs') {
			hideSubsPlayer();
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
			if (isNaN(options)) {
				commandInProgress = false;
				throw 'Command setVolume must have a numeric option value';
			}
			await setVolumePlayer(options);
		} else {// Unknown commands are not possible, they're filtered by API's validation.
		}
	} catch(err) {
		logger.error(`[Player] Command ${command} failed : ${err}`);
		throw err;
	} finally {
		commandInProgress = false;
	}
}

export async function initPlayer() {
	return await initPlayerSystem();
}

export async function quitmpv() {
	return await quit();
}
