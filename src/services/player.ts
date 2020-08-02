import i18next from 'i18next';
import merge from 'lodash.merge';
import {promisify} from 'util';

import Players from '../components/mpv';
import { APIMessage } from '../controllers/common';
import { setPLCVisible, updatePlaylistDuration } from '../dao/playlist';
import {getConfig, setConfig} from '../lib/utils/config';
import logger, { profile } from '../lib/utils/logger';
import { on } from '../lib/utils/pubsub';
import { emitWS } from '../lib/utils/ws';
import {CurrentSong} from '../types/playlist';
import sentry from '../utils/sentry';
import {getState,setState} from '../utils/state';
import {addPlayedKara, getKara, getKaras,getSeriesSingers} from './kara';
import {getCurrentSong, getPlaylistInfo,nextSong, previousSong, setPlaying} from './playlist';
import {startPoll} from './poll';
import {updateUserQuotas} from './user';

const sleep = promisify(setTimeout);

let introSequence = false;
const mpv = new Players();

export function playerMessage(msg: string, duration: number, align = 4) {
	return mpv.message(msg, duration, align);
}

export async function playSingleSong(kid?: string) {
	try {
		const kara = await getKara(kid, {username: 'admin', role: 'admin'});
		if (!kara) throw {code: 404, msg: 'KID not found'};
		const current: CurrentSong = merge(kara, {nickname: 'Admin', flag_playing: true, pos: 1, flag_free: false, flag_visible: false, username: 'admin', repo: kara.repository, playlistcontent_id: -1, playlist_id: -1});
		setState({singlePlay: true, currentSong: current, randomPlaying: false});
		stopAddASongMessage();
		logger.debug('Karaoke selected', {service: 'Player', obj: kara});
		logger.info(`Playing ${kara.mediafile.substring(0, kara.mediafile.length - 4)}`, {service: 'Player'});
		// If series is empty, pick singer information instead
		const series = getSeriesSingers(kara);

		// If song order is 0, don't display it (we don't want things like OP0, ED0...)
		let songorder = `${kara.songorder}`;
		if (!kara.songorder || kara.songorder === 0) songorder = '';
		// Construct mpv message to display.
		const infos = '{\\bord0.7}{\\fscx70}{\\fscy70}{\\b1}'+series+'{\\b0}\\N{\\i1}' +kara.songtypes.map(s => s.name).join(' ')+songorder+' - '+kara.title+'{\\i0}';
		await mpv.play({
			media: kara.mediafile,
			subfile: kara.subfile,
			gain: kara.gain,
			infos: infos,
			currentSong: kara,
			avatar: null,
			duration: kara.duration,
			repo: kara.repository,
			spoiler: kara.misc && kara.misc.some(t => t.name === 'Spoiler')
		});
		setState({currentlyPlayingKara: kara.kid});
	} catch(err) {
		logger.error('Error during song playback', {service: 'Player', obj: err});
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLAY', err));
		sentry.error(err, 'Warning');
		stopPlayer(true);
		throw err;
	}
}

export async function playRandomSongAfterPlaylist() {
	try {
		const karas = await getKaras({
			token: {username: 'admin', role: 'admin'},
			random: 1,
			blacklist: true
		});
		const kara = karas.content[0];
		if (kara) {
			setState({ randomPlaying: true });
			await playSingleSong(kara.kid);
			initAddASongMessage();
		} else {
			stopPlayer(true);
			stopAddASongMessage();
		}
	} catch(err) {
		sentry.error(err);
		logger.error('Unable to select random song to play at the end of playlist', {service: 'Player', obj: err});
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_RANDOM_SONG_AFTER_PLAYLIST', err));
	}
}

async function playCurrentSong(now: boolean) {
	if (!getState().player.playing || now) {
		profile('playCurrentSong');
		try {
			const conf = getConfig();
			const kara = await getCurrentSong();
			// No song to play, silently return
			if (!kara) return;
			setState({currentSong: kara});
			// Testing if we're on first position, if intro hasn't been played already and if we have at least one intro available
			if (conf.Playlist.Medias.Intros.Enabled && kara?.pos === 1 && !getState().introPlayed) {
				setState({currentlyPlayingKara: 'Intros', introPlayed: true});
				await mpv.playMedia('Intros');
				introSequence = true;
				return;
			}
			logger.debug('Karaoke selected', {service: 'Player', obj: kara});
			logger.info(`Playing ${kara.mediafile.substring(0, kara.mediafile.length - 4)}`, {service: 'Player'});

			await mpv.play({
				media: kara.mediafile,
				subfile: kara.subfile,
				gain: kara.gain,
				infos: kara.infos,
				avatar: kara.avatar,
				currentSong: kara,
				duration: kara.duration,
				repo: kara.repo,
				spoiler: kara.misc && kara.misc.some(t => t.name === 'Spoiler')
			});
			setState({currentlyPlayingKara: kara.kid, randomPlaying: false});
			addPlayedKara(kara.kid);
			await setPLCVisible(kara.playlistcontent_id);
			await updatePlaylistDuration(kara.playlist_id);
			await updateUserQuotas(kara);
			emitWS('playlistInfoUpdated', kara.playlist_id);
			if (conf.Karaoke.Poll.Enabled && !conf.Karaoke.StreamerMode.Enabled) startPoll();
		} catch(err) {
			logger.error('Error during song playback', {service: 'Player', obj: err});
			sentry.error(err, 'Warning');
			emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLAY', err));
			if (getState().player.playerStatus !== 'stop') {
				logger.warn('Skipping playback for this song', {service: 'Player'});
				try {
					await next();
				} catch(err) {
					logger.warn('Skipping failed', {service: 'Player'});
				}
			} else {
				logger.warn('Stopping karaoke due to error', {service: 'Player'});
				stopPlayer(true);
			}
		} finally {
			profile('playCurrentSong');
		}
	}
}

/* Current playing song has been changed, stopping playing now and hitting play again to get the new song. */
export function playingUpdated() {
	const state = getState();
	if (state.player.playerStatus !== 'stop') playPlayer(true);
}

/* This is triggered when player ends its current song */
export async function playerEnding() {
	const state = getState();
	const conf = getConfig();
	logger.debug('Player Ending event triggered', {service: 'Player'});
	try {
		if (state.playerNeedsRestart) {
			logger.info('Player restarts, please wait', {service: 'Player'});
			setState({playerNeedsRestart: false});
			await restartPlayer();
		}
		// Stopping after current song, no need for all the code below.
		if (state.stopping) {
			stopPlayer(true);
			setState({stopping: false});
			return;
		}
		// When random karas are being played
		if (state.randomPlaying) {
			await playRandomSongAfterPlaylist();
			return;
		}
		// If we just played an intro, play a sponsor.
		if (state.player.mediaType === 'Intros') {
			if (conf.Playlist.Medias.Sponsors.Enabled) {
				try {
					await mpv.playMedia('Sponsors');
					setState({currentlyPlayingKara: 'Sponsors'});
				} catch(err) {
					logger.warn('Skipping sponsors due to error, playing current song', {service: 'Player', obj: err});
					emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
					await playCurrentSong(true);
				}
			} else {
				await playCurrentSong(true);
			}
			return;
		}
		const pl = await getPlaylistInfo(state.currentPlaylistID, {username: 'admin', role: 'admin'});
		// If Outro, load the background.
		if (state.player.mediaType === 'Outros' && state.currentSong?.pos === pl.karacount) {
			if (getConfig().Playlist.EndOfPlaylistAction === 'random') {
				await playRandomSongAfterPlaylist();
			} else {
				stopPlayer(true);
			}
			return;
		}
		// If Sponsor, just play currently selected song.
		if (state.player.mediaType === 'Sponsors' && introSequence) {
			try {
				// If it's played just after an intro, play next song. If not, proceed as usual
				introSequence = false;
				await playCurrentSong(true);
			} catch(err) {
				logger.error('Unable to play current song, skipping', {service: 'Player', obj: err});
				try {
					await next();
				} catch(err) {
					logger.error('Failed going to next song', {service: 'Player', obj: err});
				}
			}
			return;
		}
		if (state.player.mediaType === 'Encores') {
			try {
				await next();
			} catch(err) {
				logger.error('Failed going to next song', {service: 'Player', obj: err});
			}
			return;
		}
		// Testing for position before last to play an encore
		logger.debug(`CurrentSong Pos : ${state.currentSong?.pos} - Playlist Kara Count : ${pl.karacount} - Playlist name: ${pl.name} - CurrentPlaylistID: ${state.currentPlaylistID} - Playlist ID: ${pl.playlist_id}`, {service: 'Player'});
		if (conf.Playlist.Medias.Encores.Enabled && state.currentSong?.pos === pl.karacount - 1 && !getState().encorePlayed) {
			try {
				await mpv.playMedia('Encores');
				setState({currentlyPlayingKara: 'Encores', encorePlayed: true});
			} catch(err) {
				logger.error('Unable to play encore file, going to next song', {service: 'Player', obj: err});
				emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
				try {
					await next();
				} catch(err) {
					logger.error('Failed going to next song', {service: 'Player', obj: err});
				}
			}
			return;
		} else {
			setState({encorePlayed: false});
		}
		// Outros code, we're at the end of a playlist.
		// Outros are played after the very last song.
		if (state.currentSong?.pos === pl.karacount && state.player.mediaType !== 'background') {
			if (conf.Playlist.Medias.Outros.Enabled) {
				try {
					await mpv.playMedia('Outros');
					setState({currentlyPlayingKara: 'Outros'});
				} catch(err) {
					logger.error('Unable to play outro file', {service: 'Player', obj: err});
					emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
					if (conf.Playlist.EndOfPlaylistAction === 'random') {
						await playRandomSongAfterPlaylist();
					} else {
						stopPlayer(true);
					}
				}
			} else if (conf.Playlist.EndOfPlaylistAction === 'random') {
				await playRandomSongAfterPlaylist();
			} else {
				await next();
			}
			return;
		}
		// Jingles and sponsors are played inbetween songs so we need to load the next song
		logger.info(`Songs before next jingle: ${conf.Playlist.Medias.Jingles.Interval - state.counterToJingle} / before next sponsor: ${conf.Playlist.Medias.Sponsors.Interval - state.counterToSponsor}`, {service: 'Player'});
		if (!state.singlePlay && state.counterToJingle >= conf.Playlist.Medias.Jingles.Interval && conf.Playlist.Medias.Jingles.Enabled) {
			try {
				setState({counterToJingle: 0});
				await mpv.playMedia('Jingles');
				setState({currentlyPlayingKara: 'Jingles'});
			} catch(err) {
				logger.error('Unable to play jingle file, going to next song', {service: 'Player', obj: err});
				emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
				try {
					await next();
				} catch(err) {
					logger.error('Failed going to next song', {service: 'Player', obj: err});
				}
			}
			return;
		} else if (state.counterToSponsor >= conf.Playlist.Medias.Sponsors.Interval && conf.Playlist.Medias.Sponsors.Enabled) {
			try {
				setState({counterToSponsor: 0});
				await mpv.playMedia('Sponsors');
				setState({currentlyPlayingKara: 'Sponsors'});
			} catch(err) {
				logger.error('Unable to play sponsor file, going to next song', {service: 'Player', obj: err});
				emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
				try {
					await next();
				} catch(err) {
					logger.error('Failed going to next song', {service: 'Player', obj: err});
				}
			}
			return;
		} else {
			if (!state.singlePlay) {
				state.counterToJingle++;
				state.counterToSponsor++;
				setState({counterToSponsor: state.counterToSponsor, counterToJingle: state.counterToJingle});
			} else {
				setState({singlePlay: false});
			}
			if (state.player.playerStatus !== 'stop') {
				try {
					await next();
					return;
				} catch(err) {
					logger.error('Failed going to next song', {service: 'Player', obj: err});
				}
			} else {
				stopPlayer(true);
			}
		}
	} catch(err) {
		logger.error('Unable to end play properly, stopping.', {service: 'Player', obj: err});
		sentry.error(err);
		stopPlayer(true);
	}
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
	const conf = getConfig();
	try {
		const song = await nextSong();
		if (song) {
			await setPlaying(song.playlistcontent_id, getState().currentPlaylistID);
			if (conf.Karaoke.ClassicMode) {
				stopPlayer(true);
				if (conf.Karaoke.StreamerMode.Enabled && conf.Karaoke.StreamerMode.PauseDuration > 0) {
					await sleep(conf.Karaoke.StreamerMode.PauseDuration * 1000);
					// Recheck if classic mode is still enabled after the sleep timer. If it's disabled now, do not play song.
					if (getState().player.playerStatus === 'stop' && getConfig().Karaoke.ClassicMode) await playPlayer(true);
				}
			} else if (conf.Karaoke.StreamerMode.Enabled) {
				setState({currentRequester: null});
				const kara = await getCurrentSong();
				await stopPlayer(true);
				if (conf.Karaoke.Poll.Enabled) {
					const poll = await startPoll();
					if (!poll) {
						// False returned means startPoll couldn't start a poll
						mpv.displaySongInfo(kara.infos, 10000000, true);
					}
				} else {
					mpv.displaySongInfo(kara.infos, 10000000, true);
				}
				if (conf.Karaoke.StreamerMode.PauseDuration > 0) {
					await sleep(conf.Karaoke.StreamerMode.PauseDuration * 1000);
					if (getConfig().Karaoke.StreamerMode.Enabled && getState().player.playerStatus === 'stop') await playPlayer(true);
				}
			} else {
				setState({currentRequester: null});
				playPlayer(true);
			}
		} else {
			// End of playlist, let's see what to do with our different modes.
			if (conf.Karaoke.StreamerMode.Enabled) {
				await stopPlayer(true, true);
				if (conf.Karaoke.Poll.Enabled) {
					await startPoll();
					on('songPollResult', () => {
						// We're not at the end of playlsit anymore!
						nextSong().then(kara => setPlaying(kara.playlistcontent_id, getState().currentPlaylistID));
					});
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
		throw err;
	}
}

async function toggleFullScreenPlayer() {
	let state = getState();
	state = setState({fullscreen: !state.fullscreen});
	await mpv.setFullscreen(state.fullscreen);
	state.fullscreen
		? logger.info('Player going to full screen', {service: 'Player'})
		: logger.info('Player going to windowed mode', {service: 'Player'});
}

async function toggleOnTopPlayer() {
	const state = setState({ontop: await mpv.toggleOnTop()});
	state.ontop
		? logger.info('Player staying on top', {service: 'Player'})
		: logger.info('Player NOT staying on top', {service: 'Player'});
}

async function setPiPSizePlayer(nb: number) {
	await mpv.setPiPSize(nb);
}

async function setHwDecPlayer(method: string) {
	await mpv.setHwDec(method);
}

export async function playPlayer(now?: boolean) {
	profile('Play');
	const state = getState();
	if (state.player.playerStatus === 'stop' || now) {
		setState({singlePlay: false, randomPlaying: false});
		await playCurrentSong(now);
		stopAddASongMessage();
	} else {
		await mpv.resume();
	}
	profile('Play');
}

export async function stopPlayer(now = true, endOfPlaylist = false) {
	if (now || getState().stopping) {
		logger.info('Karaoke stopping NOW', {service: 'Player'});
		await mpv.stop();
		setState({currentlyPlayingKara: null, randomPlaying: false, stopping: false});
		stopAddASongMessage();
		if (!endOfPlaylist && getConfig().Karaoke.ClassicMode) {
			await prepareClassicPauseScreen();
		}
	} else {
		if (getState().player.playerStatus !== 'stop' && !getState().stopping) {
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
		mpv.displaySongInfo(kara.infos, 10000000, true);
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
	if (state.player.playerStatus === 'stop' && !state.playerNeedsRestart && !state.isDemo && !state.isTest) {
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

async function restartPlayer() {
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

export async function sendCommand(command: string, options: any): Promise<string|undefined> {
	// Resetting singlePlay to false everytime we use a command.
	const state = getState();
	if (state.isDemo || state.isTest) throw 'Player management is disabled in demo or test modes';
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
			return 'STOP_AFTER';
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
		} else if (command === 'setPiPSize') {
			if (isNaN(options)) throw 'Command setPiPSize must have a numeric option value';
			await setPiPSizePlayer(options);
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
		} else if (command === 'setVolume') {
			if (isNaN(options)) throw 'Command setVolume must have a numeric option value';
			await setVolumePlayer(options);
		} else {// Unknown commands are not possible, they're filtered by API's validation.
		}
	} catch(err) {
		logger.error(`Command ${command} failed`, {service: 'Player', obj: err});
		throw err;
	}
}

export function isPlayerRunning() {
	return mpv.isRunning();
}

export function initPlayer() {
	return mpv.initPlayerSystem();
}

export function quitmpv() {
	return mpv.quit();
}
