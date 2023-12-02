import i18n from 'i18next';
import { setTimeout as sleep } from 'timers/promises';

import { isShutdownInProgress } from '../components/engine.js';
import Players, { switchToPollScreen } from '../components/mpv.js';
import { updatePlaylistLastEditTime, updatePLCVisible } from '../dao/playlist.js';
import { APIMessage } from '../lib/services/frontend.js';
import { getConfig, setConfig } from '../lib/utils/config.js';
import { ErrorKM } from '../lib/utils/error.js';
import logger, { profile } from '../lib/utils/logger.js';
import { emit, on } from '../lib/utils/pubsub.js';
import { emitWS } from '../lib/utils/ws.js';
import { BackgroundType } from '../types/backgrounds.js';
import { MpvHardwareDecodingOptions } from '../types/mpvIPC.js';
import { PlayerCommand } from '../types/player.js';
import Sentry from '../utils/sentry.js';
import { getPlayerState, getState, setState } from '../utils/state.js';
import { playCurrentSong, playRandomSongAfterPlaylist } from './karaEngine.js';
import { getCurrentSong, getCurrentSongPLCID, getNextSong, getPreviousSong, setPlaying } from './playlist.js';
import { startPoll } from './poll.js';
import { stopGame } from './quiz.js';

const service = 'Player';

export const mpv = new Players();

export function playerComment(msg: string) {
	return mpv.comments.addComment(msg);
}

export function playerMessage(
	msg: string,
	duration: number,
	align = 4,
	type = 'admin',
	destination: 'all' | 'screen' | 'users' = 'screen'
) {
	try {
		if (['all', 'screen'].includes(destination)) {
			return mpv.message(msg, duration, align, type);
		}
		if (['all', 'users'].includes(destination)) {
			emitWS('adminMessage', msg);
		}
	} catch (err) {
		logger.error(`Error sending message : ${err}`, { service });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('MESSAGE_SEND_ERROR');
	}
}

export async function prev() {
	logger.debug('Going to previous song', { service });
	try {
		const kara = await getPreviousSong();
		await setPlaying(kara.plcid, getState().currentPlaid);
	} catch (err) {
		logger.warn('Previous song is not available', { service, obj: err });
	} finally {
		await playPlayer(true);
	}
}

let pauseDate: Date;

export async function next() {
	logger.debug('Going to next song', { service });
	profile('Next');
	const conf = getConfig();
	const currentPlaid = getState().currentPlaid;
	try {
		// Played songs are set visible once played
		const curr = await getCurrentSongPLCID();
		await updatePLCVisible([curr]);
		updatePlaylistLastEditTime(currentPlaid);
		emitWS('playlistInfoUpdated', currentPlaid);
		// Now fetch the next song
		const song = await getNextSong();
		if (song) {
			await setPlaying(song.plcid, currentPlaid);
			if (conf.Karaoke.ClassicMode) {
				await stopPlayer();
			} else if (conf.Karaoke.StreamerMode.Enabled) {
				setState({ currentRequester: null });
				const kara = await getCurrentSong();
				setState({ streamerPause: true });
				await stopPlayer();
				if (conf.Karaoke.StreamerMode.PauseDuration > 0 && conf.Karaoke.Poll.Enabled) {
					switchToPollScreen();
					const poll = await startPoll();
					if (!poll) {
						// False quiz.running means startPoll couldn't start a poll
						mpv.displaySongInfo(kara.infos, -1, true, kara.warnings, !getState().quiz.running);
					}
				} else {
					mpv.displaySongInfo(kara.infos, -1, true, kara.warnings, !getState().quiz.running);
				}
				if (conf.Karaoke.StreamerMode.PauseDuration > 0) {
					// Setting this to make sure the pause hasn't been reset by another pause
					const currentDate = new Date();
					pauseDate = currentDate;
					await sleep(conf.Karaoke.StreamerMode.PauseDuration * 1000);
					if (
						getState().streamerPause &&
						getState().pauseInProgress &&
						getConfig().Karaoke.StreamerMode.Enabled &&
						getState().player.playerStatus === 'stop' &&
						pauseDate === currentDate
					) {
						await playPlayer(true);
					}
					if (pauseDate === currentDate) setState({ streamerPause: false, pauseInProgress: false });
				}
			} else {
				setState({ currentRequester: null });
				if (getState().player.playerStatus !== 'stop') await playPlayer(true);
			}
		} else if (conf.Karaoke.StreamerMode.Enabled && !getState().quiz.running) {
			await stopPlayer(true, true);
			if (conf.Karaoke.Poll.Enabled) {
				try {
					await startPoll();
					on('songPollResult', () => {
						// We're not at the end of playlist anymore!
						getNextSong()
							.then(kara => setPlaying(kara.plcid, currentPlaid))
							.catch(() => {});
					});
				} catch (err) {
					// Non-fatal
				}
			}
			// Next is hit while the player is still playing a song and random is asked at the end of a playlist
		} else if (
			getState().player?.playing === true &&
			['random', 'random_fallback'].includes(conf.Playlist.EndOfPlaylistAction)
		) {
			// Play next random song when hitting the "next" button after a playlist ended
			setState({ currentRequester: null });
			await playRandomSongAfterPlaylist();
		} else if (getState().quiz.running) {
			stopGame(true);
		} else {
			setState({ currentRequester: null });
			await stopPlayer(true, true);
		}
	} catch (err) {
		logger.warn('Next song is not available', { service, obj: err });
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
	await mpv.toggleFullscreen();
}

async function toggleOnTopPlayer() {
	const onTop = await mpv.toggleOnTop();
	onTop ? logger.info('Player staying on top', { service }) : logger.info('Player NOT staying on top', { service });
}

async function toggleBordersPlayer() {
	await mpv.toggleBorders();
}

async function setHwDecPlayer(method: MpvHardwareDecodingOptions) {
	await mpv.setHwDec(method);
}

export async function playPlayer(now?: boolean, username?: string) {
	try {
		profile('Play');
		const state = getState();
		if (username && username !== state.currentRequester) {
			throw new ErrorKM('USER_NOT_ALLOWED_TO_SING', 403, false);
		}
		if (state.player.playerStatus === 'stop' || now) {
			// Reinitializing state if the play button has been pressed
			setState({ singlePlay: false, randomPlaying: false, streamerPause: false });
			await playCurrentSong(now);
			stopAddASongMessage();
		} else {
			await mpv.resume();
		}
		setState({ pauseInProgress: false });
		emit('playerStatusUpdated', 'Playing');
	} catch (err) {
		logger.error(`Unable to play a song : ${err}`, { service });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PLAY_ERROR');
	} finally {
		profile('Play');
	}
}

export async function stopPlayer(now = true, endOfPlaylist = false, force = false) {
	if (now || getState().stopping || getPlayerState().mediaType !== 'song' || getConfig().Karaoke.ClassicMode) {
		logger.info('Karaoke stopping NOW', { service });
		// No need to stop in streamerPause, we're already stopped, but we'll disable the pause anyway.
		let stopType: BackgroundType = 'stop';
		if (
			(getState().streamerPause || getConfig().Karaoke.ClassicMode) &&
			!force &&
			!endOfPlaylist &&
			!getState().stopping
		) {
			stopType = 'pause';
			setState({ pauseInProgress: true });
		} else {
			setState({ pauseInProgress: false });
		}
		await mpv.stop(stopType);
		await mpv.setBlur(false);
		setState({ randomPlaying: false, stopping: false });
		stopAddASongMessage();
		if (!force && !endOfPlaylist && getConfig().Karaoke.ClassicMode && getState().pauseInProgress) {
			await prepareClassicPauseScreen();
		}
		if (getState().quiz.running) {
			mpv.messages.clearMessages();
		}
		emit('playerStatusUpdated', 'Stopped');
	} else if (!getState().stopping) {
		logger.info('Karaoke stopping after current song', { service });
		setState({ stopping: true });
		return APIMessage('STOP_AFTER');
	}
}

/** Display a message on the player screen. Position 1 is bottom left, 9 top right */
export async function displayMessage(message: string, duration: number, position: number, type: string) {
	mpv.messages.clearMessages();
	await mpv.message(message, duration, position, type);
}

export function getPromoMessage(): string {
	const conf = getConfig();
	const state = getState();
	const ci = conf.Player.Display.ConnectionInfo;
	if (!ci.Enabled) {
		return '';
	}
	const text = state.quiz.running
		? getState().quiz.settings.PlayerMessage || i18n.t('GO_TO_QUIZ_MODE')
		: ci.Message || i18n.t('GO_TO');
	return text.replaceAll('$url', state.osURL);
}

export async function prepareClassicPauseScreen() {
	try {
		const kara = await getCurrentSong();
		if (!kara) throw 'No song selected, current playlist must be empty';
		setState({ currentRequester: kara?.username || null });
		mpv.displaySongInfo(kara.infos, -1, true, null, !getState().quiz.running);
	} catch (err) {
		// Failed to get current song, this can happen if the current playlist gets emptied or changed to an empty one inbetween songs. In this case, just display KM infos
		mpv.displayInfo();
		logger.warn('Could not prepare classic pause screen', { service, obj: err });
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_CLASSIC_PAUSE_SCREEN', err));
	}
}

export async function pausePlayer() {
	await mpv.pause();
	logger.info('Karaoke paused', { service });
	emit('playerStatusUpdated', 'Paused');
}

async function mutePlayer() {
	await mpv.setMute(true);
	logger.info('Player muted', { service });
}

async function unmutePlayer() {
	await mpv.setMute(false);
	logger.info('Player unmuted', { service });
}

export async function seekPlayer(delta: number) {
	emit('changePosition', getState().player.timeposition + delta);
	await mpv.seek(delta);
}

export async function goToPlayer(seconds: number) {
	emit('changePosition', seconds);
	await mpv.goTo(seconds);
}

export async function setVolumePlayer(volume: number) {
	await mpv.setVolume(volume);
	// Save the volume in configuration
	setConfig({ Player: { Volume: volume } });
	emit('playerVolumeUpdated', volume);
}

async function setAudioDelay(delayMs = 0) {
	await mpv.setAudioDelay(delayMs);
	setConfig({ Player: { AudioDelay: delayMs } });
}

async function setPitchPlayer(pitch: number) {
	await mpv.setModifiers({ Pitch: pitch });
}

async function setSpeedPlayer(speed: number) {
	await mpv.setModifiers({ Speed: speed });
}

async function setAudioDevicePlayer(device: string) {
	await mpv.setAudioDevice(device);
	setConfig({ Player: { AudioDevice: device } });
}

async function showSubsPlayer() {
	await mpv.setSubs(true);
	logger.info('Showing lyrics on screen', { service });
}

async function hideSubsPlayer() {
	await mpv.setSubs(false);
	logger.info('Hiding lyrics on screen', { service });
}

async function setBlurVideoPlayer(blur: boolean) {
	await mpv.setBlur(blur);
	logger.info(`Set video blur to ${String(blur)}`, { service });
}

export async function playerNeedsRestart() {
	const state = getState();
	if (state.player.playerStatus === 'stop' && !state.playerNeedsRestart && !state.isTest) {
		setState({ playerNeedsRestart: true });
		logger.info('Player will restart in one second', { service });
		emitWS('operatorNotificationInfo', APIMessage('NOTIFICATION.OPERATOR.INFO.PLAYER_RESTARTING'));
		mpv.message(i18n.t('RESTARTING_PLAYER'), 1000);
		await sleep(1000);
		await restartPlayer();
		setState({ playerNeedsRestart: false });
	} else {
		logger.debug('Setting mpv to restart after next song', { service });
		setState({ playerNeedsRestart: true });
	}
}

export async function restartPlayer() {
	profile('restartmpv');
	await mpv.restart();
	logger.info('Player restart complete', { service });
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

let playerCommandLock = false;

export async function sendCommand(command: PlayerCommand, options: any) {
	logger.info(`Received command from API : ${command} (${options})`, { service });
	if (isShutdownInProgress()) return;
	if (playerCommandLock) return;
	playerCommandLock = true;
	try {
		const state = getState();
		if (state.isTest) throw new ErrorKM('PLAYER_DISABLED_IN_TEST_MODE_SORRYMASEN_PLEASE_UNDERSTAND', 500, false);
		if (command === 'play') {
			await playPlayer();
		} else if (command === 'stopNow') {
			setState({
				singlePlay: false,
				randomPlaying: false,
				streamerPause: false,
				pauseInProgress: false,
			});
			await stopPlayer(true, false, true);
		} else if (command === 'pause') {
			await pausePlayer();
		} else if (command === 'stopAfter') {
			setState({ singlePlay: false, randomPlaying: false, streamerPause: false, pauseInProgress: false });
			await stopPlayer(false);
		} else if (command === 'skip') {
			setState({ singlePlay: false, randomPlaying: false });
			await next();
		} else if (command === 'prev') {
			setState({ singlePlay: false, randomPlaying: false });
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
		} else if (command === 'blurVideo') {
			await setBlurVideoPlayer(true);
		} else if (command === 'unblurVideo') {
			await setBlurVideoPlayer(false);
		} else if (command === 'seek') {
			if (isNaN(options)) throw new ErrorKM('INVALID_DATA', 400, false);
			await seekPlayer(options);
		} else if (command === 'goTo') {
			if (isNaN(options)) throw new ErrorKM('INVALID_DATA', 400, false);
			await goToPlayer(options);
		} else if (command === 'setAudioDevice') {
			if (!options) throw new ErrorKM('INVALID_DATA', 400, false);
			await setAudioDevicePlayer(options);
		} else if (command === 'setVolume') {
			if (isNaN(options)) throw new ErrorKM('INVALID_DATA', 400, false);
			await setVolumePlayer(options);
		} else if (command === 'setAudioDelay') {
			if ((options && isNaN(options)) || options > 5000 || options < -5000)
				throw "Command setAudioDelay must have a numeric option value between -5'000 and 5'000";
			await setAudioDelay(options);
		} else if (command === 'setPitch') {
			if (isNaN(options)) throw new ErrorKM('INVALID_DATA', 400, false);
			if (options > 6 || options < -6) throw new ErrorKM('INVALID_DATA', 400, false);
			await setPitchPlayer(options);
		} else if (command === 'setSpeed') {
			if (isNaN(options)) throw new ErrorKM('INVALID_DATA', 400, false);
			if (options > 200 || options < 25) throw new ErrorKM('INVALID_DATA', 400, false);
			await setSpeedPlayer(options);
		} else if (command === 'setModifiers') {
			await mpv.setModifiers(options);
		} else {
			throw new ErrorKM('INVALID_DATA', 400, false);
		}
	} catch (err) {
		logger.error(`Command ${command} failed`, { service, obj: err });
		throw err instanceof ErrorKM ? err : new ErrorKM('COMMAND_SEND_ERROR');
	} finally {
		playerCommandLock = false;
	}
}

export function isPlayerRunning() {
	return mpv.isRunning();
}

export async function displayQRCode() {
	await mpv.displayQRCode();
}

export async function hideQRCode() {
	await mpv.hideQRCode();
}

export async function initPlayer() {
	try {
		profile('initPlayer');
		await mpv.initPlayerSystem();
	} catch (err) {
		logger.error('Failed mpv init', { service, obj: err });
		throw err;
	} finally {
		profile('initPlayer');
	}
}

export function quitmpv() {
	return mpv.quit();
}
