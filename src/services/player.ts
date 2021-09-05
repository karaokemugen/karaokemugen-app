import i18next from 'i18next';
import {promisify} from 'util';

import Players, { switchToPauseScreen } from '../components/mpv';
import { APIMessage } from '../controllers/common';
import { APIMessageType } from '../lib/types/frontend';
import {getConfig, setConfig} from '../lib/utils/config';
import logger, { profile } from '../lib/utils/logger';
import { on } from '../lib/utils/pubsub';
import { emitWS } from '../lib/utils/ws';
import { MpvHardwareDecodingOptions } from '../types/mpvIPC';
import {getState,setState} from '../utils/state';
import { playCurrentSong } from './karaokeEngine';
import {getCurrentSong, nextSong, previousSong, setPlaying} from './playlist';
import {startPoll} from './poll';

const sleep = promisify(setTimeout);
export const mpv = new Players();

export function playerMessage(msg: string, duration: number, align = 4, type = 'admin') {
	return mpv.message(msg, duration, align, type);
}

/* Current playing song has been changed, stopping playing now and hitting play again to get the new song. */
export function playingUpdated() {
	if (getState().player.playerStatus !== 'stop') playPlayer(true);
}

export async function prev() {
	logger.debug('Going to previous song', {service: 'Player'});
	try {
		await previousSong();
	} catch(err) {
		logger.warn('Previous song is not available', {service: 'Player', obj: err});
	} finally {
		playPlayer(true);
	}
}

export async function next() {
	logger.debug('Going to next song', {service: 'Player'});
	profile('Next');
	const conf = getConfig();
	try {
		const song = await nextSong();
		if (song) {
			await setPlaying(song.plcid, getState().currentPlaid);
			if (conf.Karaoke.ClassicMode) {
				await stopPlayer(true);
				if (conf.Karaoke.StreamerMode.Enabled && conf.Karaoke.StreamerMode.PauseDuration > 0) {
					setState({ streamerPause: true });
					await sleep(conf.Karaoke.StreamerMode.PauseDuration * 1000);
					// Recheck if classic mode is still enabled after the sleep timer. If it's disabled now, do not play song.
					if (getState().streamerPause && getState().player.playerStatus === 'stop' && getConfig().Karaoke.ClassicMode) await playPlayer(true);
					setState({ streamerPause: false });
				}
			} else if (conf.Karaoke.StreamerMode.Enabled) {
				setState({currentRequester: null});
				const kara = await getCurrentSong();
				await stopPlayer(true);
				if (conf.Karaoke.StreamerMode.PauseDuration > 0) setState({ streamerPause: true });
				if (conf.Karaoke.Poll.Enabled) {
					switchToPauseScreen();
					const poll = await startPoll();
					if (!poll) {
						// False returned means startPoll couldn't start a poll
						mpv.displaySongInfo(kara.infos, -1, true);
					}
				} else {
					mpv.displaySongInfo(kara.infos, -1, true);
				}
				if (conf.Karaoke.StreamerMode.PauseDuration > 0) {
					await sleep(conf.Karaoke.StreamerMode.PauseDuration * 1000);
					if (getState().streamerPause && getConfig().Karaoke.StreamerMode.Enabled && getState().player.playerStatus === 'stop') await playPlayer(true);
					setState({ streamerPause: false });
				}
			} else {
				setState({currentRequester: null});
				if (getState().player.playerStatus !== 'stop') playPlayer(true);
			}
		} else {
			// End of playlist, let's see what to do with our different modes.
			if (conf.Karaoke.StreamerMode.Enabled) {
				await stopPlayer(true, true);
				if (conf.Karaoke.Poll.Enabled) {
					try {
						await startPoll();
						on('songPollResult', () => {
							// We're not at the end of playlist anymore!
							nextSong()
								.then(kara => setPlaying(kara.plcid, getState().currentPlaid))
								.catch(() => {});
						});
					} catch(err) {
						// Non-fatal
					}
					if (conf.Karaoke.StreamerMode.PauseDuration > 0) {
						await sleep(conf.Karaoke.StreamerMode.PauseDuration * 1000);
						if (getConfig().Karaoke.StreamerMode.Enabled && getState().player.playerStatus === 'stop') await playPlayer(true);
					}
				}
			} else {
				setState({currentRequester: null});
				stopPlayer(true, true);
			}
		}
	} catch(err) {
		logger.warn('Next song is not available', {service: 'Player', obj: err});
		// Display KM info banner just to be sure
		mpv.displayInfo();
		if (err === 'Playlist is empty!') {
			stopPlayer(true, true);
			return;
		}
		throw err;
	} finally {
		profile('Next');
	}
}

async function toggleFullScreenPlayer() {
	const fsState = await mpv.toggleFullscreen();
	fsState
		? logger.info('Player going to full screen', {service: 'Player'})
		: logger.info('Player going to windowed mode', {service: 'Player'});
}

async function toggleOnTopPlayer() {
	const onTop = await mpv.toggleOnTop();
	onTop
		? logger.info('Player staying on top', {service: 'Player'})
		: logger.info('Player NOT staying on top', {service: 'Player'});
}

async function toggleBordersPlayer() {
	await mpv.toggleBorders();
}

async function setHwDecPlayer(method: MpvHardwareDecodingOptions) {
	await mpv.setHwDec(method);
}

export async function playPlayer(now?: boolean) {
	profile('Play');
	const state = getState();
	if (state.player.playerStatus === 'stop' || now) {
		setState({singlePlay: false, randomPlaying: false, streamerPause: false});
		await playCurrentSong(now);
		stopAddASongMessage();
	} else {
		await mpv.resume();
	}
	profile('Play');
}

export async function stopPlayer(now = true, endOfPlaylist = false) {
	if (now || getState().stopping || getState().streamerPause) {
		logger.info('Karaoke stopping NOW', {service: 'Player'});
		// No need to stop in streamerPause, we're already stopped, but we'll disable the pause anyway.
		if (!getState().streamerPause) await mpv.stop();
		setState({ streamerPause: false, randomPlaying: false, stopping: false });
		stopAddASongMessage();
		if (!endOfPlaylist && getConfig().Karaoke.ClassicMode) {
			await prepareClassicPauseScreen();
		}
	} else {
		if (!getState().stopping) {
			logger.info('Karaoke stopping after current song', {service: 'Player'});
			setState({ stopping: true });
		}
	}
}

export async function prepareClassicPauseScreen() {
	try {
		const kara = await getCurrentSong();
		if (!kara) throw 'No song selected, current playlist must be empty';
		setState({currentRequester: kara?.username || null});
		mpv.displaySongInfo(kara.infos, -1, true);
	} catch(err) {
		// Failed to get current song, this can happen if the current playlist gets emptied or changed to an empty one inbetween songs. In this case, just display KM infos
		mpv.displayInfo();
		logger.warn('Could not prepare classic pause screen', {service: 'Player', obj: err});
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_CLASSIC_PAUSE_SCREEN', err));
	}
}

export async function pausePlayer() {
	await mpv.pause();
	logger.info('Karaoke paused', {service: 'Player'});
}

async function mutePlayer() {
	await mpv.setMute(true);
	logger.info('Player muted', {service: 'Player'});
}

async function unmutePlayer() {
	await mpv.setMute(false);
	logger.info('Player unmuted', {service: 'Player'});
}

async function seekPlayer(delta: number) {
	await mpv.seek(delta);
}

async function goToPlayer(seconds: number) {
	await mpv.goTo(seconds);
}

async function setVolumePlayer(volume: number) {
	await mpv.setVolume(volume);
	// Save the volume in configuration
	setConfig({Player: {Volume: volume}});
}

async function setAudioDevicePlayer(device: string) {
	await mpv.setAudioDevice(device);
	setConfig({Player: {AudioDevice: device}});
}

async function showSubsPlayer() {
	await mpv.setSubs(true);
	logger.info('Showing lyrics on screen', {service: 'Player'});
}

async function hideSubsPlayer() {
	await mpv.setSubs(false);
	logger.info('Hiding lyrics on screen', {service: 'Player'});
}


export async function playerNeedsRestart() {
	const state = getState();
	if (state.player.playerStatus === 'stop' && !state.playerNeedsRestart && !state.isTest) {
		setState({ playerNeedsRestart: true });
		logger.info('Player will restart in 5 seconds', {service: 'Player'});
		emitWS('operatorNotificationInfo', APIMessage('NOTIFICATION.OPERATOR.INFO.PLAYER_RESTARTING'));
		mpv.message(i18next.t('RESTARTING_PLAYER'), 5000);
		await sleep(5000);
		await restartPlayer();
		setState({ playerNeedsRestart: false });
	} else {
		logger.debug('Setting mpv to restart after next song', {service: 'Player'});
		setState({ playerNeedsRestart: true });
	}
}

export async function restartPlayer() {
	profile('restartmpv');
	await mpv.restart();
	logger.info('Player restart complete', {service: 'Player'});
	profile('restartmpv');
}

export function initAddASongMessage() {
	return mpv.initAddASongMessage();
}

export function stopAddASongMessage() {
	return mpv.stopAddASongMessage();
}

export function displayInfo() {
	return mpv.displayInfo();
}

export async function sendCommand(command: string, options: any): Promise<APIMessageType> {
	// Resetting singlePlay to false everytime we use a command.
	const state = getState();
	if (state.isTest) throw 'Player management is disabled in test mode';
	try {
		if (command === 'play') {
			await playPlayer();
		} else if (command === 'stopNow') {
			setState({singlePlay: false, randomPlaying: false});
			await stopPlayer(true);
		} else if (command === 'pause') {
			await pausePlayer();
		} else if (command === 'stopAfter') {
			setState({singlePlay: false, randomPlaying: false});
			await stopPlayer(false);
			return APIMessage('STOP_AFTER');
		} else if (command === 'skip') {
			setState({singlePlay: false, randomPlaying: false});
			await next();
		} else if (command === 'prev') {
			setState({singlePlay: false, randomPlaying: false});
			await prev();
		} else if (command === 'toggleFullscreen') {
			await toggleFullScreenPlayer();
		} else if (command === 'toggleAlwaysOnTop') {
			await toggleOnTopPlayer();
		} else if (command === 'toggleBorders') {
			await toggleBordersPlayer();
		} else if (command === 'setHwDec') {
			await setHwDecPlayer(options);
		} else if (command === 'mute') {
			await mutePlayer();
		} else if (command === 'unmute') {
			await unmutePlayer();
		} else if (command === 'showSubs') {
			await showSubsPlayer();
		} else if (command === 'hideSubs') {
			await hideSubsPlayer();
		} else if (command === 'seek') {
			if (isNaN(options)) throw 'Command seek must have a numeric option value';
			await seekPlayer(options);
		} else if (command === 'goTo') {
			if (isNaN(options)) throw 'Command goTo must have a numeric option value';
			await goToPlayer(options);
		} else if (command === 'setAudioDevice') {
			if (!options) throw 'Command setAudioDevice must have an option value';
			await setAudioDevicePlayer(options);
		} else if (command === 'setVolume') {
			if (isNaN(options)) throw 'Command setVolume must have a numeric option value';
			await setVolumePlayer(options);
		} else {
			throw `Unknown command ${command}`;
		}
	} catch(err) {
		logger.error(`Command ${command} failed`, {service: 'Player', obj: err});
		throw err;
	}
}

export function isPlayerRunning() {
	return mpv.isRunning();
}

export async function initPlayer() {
	try {
		profile('initPlayer');
		await mpv.initPlayerSystem();
	} catch(err) {
		logger.error('Failed mpv init', {service: 'Player', obj: err});
		throw err;
	} finally {
		profile('initPlayer');
	}
}

export function quitmpv() {
	return mpv.quit();
}
