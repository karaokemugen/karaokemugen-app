import i18next from 'i18next';
import {promisify} from 'util';

import Players from '../components/mpv';
import { setPLCVisible, updatePlaylistDuration } from '../dao/playlist';
import {getConfig, setConfig} from '../lib/utils/config';
import logger, { profile } from '../lib/utils/logger';
import { emitWS } from '../lib/utils/ws';
import sentry from '../utils/sentry';
import {getState,setState} from '../utils/state';
import {addPlayedKara, getKara, getKaras,getSeriesSingers} from './kara';
import {getCurrentSong, getPlaylistInfo,nextSong, previousSong,setPlaying} from './playlist';
import {startPoll} from './poll';
import {updateUserQuotas} from './user';

const sleep = promisify(setTimeout);

let introSequence = false;
let mpv = new Players();

export function playerMessage(msg: string, duration: number, align: number = 4) {
	return mpv.message(msg, duration, align);
}

export async function playSingleSong(kid?: string) {
	try {
		const kara = await getKara(kid, {username: 'admin', role: 'admin'});
		setState({singlePlay: true, currentSong: kara});
		logger.debug('[Player] Karaoke selected : ' + JSON.stringify(kara, null, 2));
		logger.info(`[Player] Playing ${kara.mediafile.substring(0, kara.mediafile.length - 4)}`);
		if (kara.title) kara.title = ` - ${kara.title}`;
		// If series is empty, pick singer information instead
		const series = getSeriesSingers(kara);

		// If song order is 0, don't display it (we don't want things like OP0, ED0...)
		let songorder = `${kara.songorder}`;
		if (!kara.songorder || kara.songorder === 0) songorder = '';
		// Construct mpv message to display.
		const infos = '{\\bord0.7}{\\fscx70}{\\fscy70}{\\b1}'+series+'{\\b0}\\N{\\i1}' +kara.songtypes.map(s => s.name).join(' ')+songorder+kara.title+'{\\i0}';
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
		logger.error(`[Player] Error during song playback : ${err}`);
		sentry.error(err, 'Warning');
		stopPlayer(true);
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
			mpv.initAddASongMessage();
		} else {
			stopPlayer(true);
			mpv.stopAddASongMessage();
		}
	} catch(err) {
		sentry.error(err);
		logger.error(`[Player] Unable to select random song to play at the end of playlist : ${err}`);
	}
}

async function playCurrentSong(now: boolean) {
	if (!getState().player.playing || now) {
		profile('playCurrentSong');
		try {
			const conf = getConfig();
			const kara = await getCurrentSong();
			setState({currentSong: kara});
			// Testing if we're on first position, if intro hasn't been played already and if we have at least one intro available
			if (conf.Playlist.Medias.Intros.Enabled && kara?.pos === 1 && !getState().introPlayed) {
				setState({currentlyPlayingKara: 'Intros', introPlayed: true});
				await mpv.playMedia('Intros');
				introSequence = true;
				return;
			}
			logger.debug('[Player] Karaoke selected : ' + JSON.stringify(kara, null, 2));
			logger.info(`[Player] Playing ${kara.mediafile.substring(0, kara.mediafile.length - 4)}`);

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
			setState({currentlyPlayingKara: kara.kid});
			addPlayedKara(kara.kid);
			await setPLCVisible(kara.playlistcontent_id);
			await updatePlaylistDuration(kara.playlist_id);
			await updateUserQuotas(kara);
			emitWS('playlistInfoUpdated', kara.playlist_id);
			if (conf.Karaoke.Poll.Enabled && !conf.Karaoke.StreamerMode.Enabled) startPoll();
		} catch(err) {
			logger.error(`[Player] Error during song playback : ${err}`);
			sentry.error(err, 'Warning');
			if (getState().player.playerStatus !== 'stop') {
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
export function playingUpdated() {
	const state = getState();
	if (state.player.playerStatus !== 'stop') playPlayer(true);
}

/* This is triggered when player ends its current song */
export async function playerEnding() {
	const state = getState();
	const conf = getConfig();
	logger.debug('[Player] Player Ending event triggered');
	try {
		if (state.playerNeedsRestart) {
			logger.info('[Player] Player restarts, please wait');
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
					logger.warn(`[Player] Skipping sponsors due to error, playing current song : ${err}`);
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
				// If it's played just after an intro, play next sonc. If not, proceed as usual
				await playCurrentSong(true);
				introSequence = false;
			} catch(err) {
				logger.error(`[Player] Unable to play current song, skipping : ${err}`);
				try {
					await next();
				} catch(err) {
					logger.error(`[Player] Failed going to next song : ${err}`);
				}
			}
			return;
		}
		if (state.player.mediaType === 'Encores') {
			try {
				await next();
				return;
			} catch(err) {
				logger.error(`[Player] Failed going to next song : ${err}`);
			}
		}
		// Testing for position before last to play an encore
		logger.debug(`[Player] CurrentSong Pos : ${state.currentSong?.pos} - Playlist Kara Count : ${pl.karacount} - Playlist name: ${pl.name} - CurrentPlaylistID: ${state.currentPlaylistID} - Playlist ID: ${pl.playlist_id}`);
		if (conf.Playlist.Medias.Encores.Enabled && state.currentSong?.pos === pl.karacount - 1 && !getState().encorePlayed) {
			try {
				await mpv.playMedia('Encores');
				setState({currentlyPlayingKara: 'Encores', encorePlayed: true});
			} catch(err) {
				logger.error(`[Player] Unable to play encore file, going to next song : ${err}`);
				try {
					await next();
				} catch(err) {
					logger.error(`[Player] Failed going to next song : ${err}`);
				}
			}
			return;
		} else {
			setState({encorePlayed: false});
		}
		// Outros code, we're at the end of a playlist.
		// Outros are played after the very last song.
		if (state.currentSong?.pos === pl.karacount && state.player.mediaType !== 'background') {
			setPlaying(0, pl.playlist_id);
			if (conf.Playlist.Medias.Outros.Enabled) {
				try {
					await mpv.playMedia('Outros');
					setState({currentlyPlayingKara: 'Outros'});
				} catch(err) {
					logger.error(`[Player] Unable to play outro file : ${err}`);
					if (conf.Playlist.EndOfPlaylistAction === 'random') {
						await playRandomSongAfterPlaylist();
					} else {
						stopPlayer(true);
					}
				}
			} else if (conf.Playlist.EndOfPlaylistAction === 'random') {
				await playRandomSongAfterPlaylist();
			} else {
				stopPlayer(true);
			}
			return;
		}
		// Jingles and sponsors are played inbetween songs so we need to load the next song
		logger.info(`[Player] Songs before next jingle: ${conf.Playlist.Medias.Jingles.Interval - state.counterToJingle} / before next sponsor: ${conf.Playlist.Medias.Sponsors.Interval - state.counterToSponsor}`);
		if (state.counterToJingle >= conf.Playlist.Medias.Jingles.Interval && conf.Playlist.Medias.Jingles.Enabled) {
			try {
				setState({counterToJingle: 0});
				await mpv.playMedia('Jingles');
				setState({currentlyPlayingKara: 'Jingles'});
			} catch(err) {
				logger.error(`[Player] Unable to play jingle file, going to next song : ${err}`);
				try {
					await next();
				} catch(err) {
					logger.error(`[Player] Failed going to next song : ${err}`);
				}
			}
			return;
		} else if (state.counterToSponsor >= conf.Playlist.Medias.Sponsors.Interval && conf.Playlist.Medias.Sponsors.Enabled) {
			try {
				setState({counterToSponsor: 0});
				await mpv.playMedia('Sponsors');
				setState({currentlyPlayingKara: 'Sponsors'});
			} catch(err) {
				logger.error(`[Player] Unable to play sponsor file, going to next song : ${err}`);
				try {
					await next();
				} catch(err) {
					logger.error(`[Player] Failed going to next song : ${err}`);
				}
			}
			return;
		} else {
			state.counterToJingle++;
			state.counterToSponsor++;
			setState({counterToSponsor: state.counterToSponsor});
			setState({counterToJingle: state.counterToJingle});
			if (state.player.playerStatus !== 'stop') {
				try {
					await next();
					return;
				} catch(err) {
					logger.error(`[Player] Failed going to next song : ${err}`);
				}
			} else {
				stopPlayer(true);
			}
		}
	} catch(err) {
		logger.error(`[Player] Unable to end play properly, stopping. : ${err}`);
		sentry.error(err);
		stopPlayer(true);
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
				if (getState().player.playerStatus === 'stop' && getConfig().Karaoke.ClassicMode) await playPlayer(true);
			}
		} else if (conf.Karaoke.StreamerMode.Enabled) {
			setState({currentRequester: null});
			const kara = await getCurrentSong();
			await stopPlayer(true);
			if (conf.Karaoke.Poll.Enabled) {
				await startPoll();
			} else {
				mpv.displaySongInfo(kara.infos, 10000000, true);
			}
			if (conf.Karaoke.StreamerMode.PauseDuration > 0) {
				await sleep(conf.Karaoke.StreamerMode.PauseDuration * 1000);
				if (conf.Karaoke.StreamerMode.Enabled && getState().player.playerStatus === 'stop') await playPlayer(true);
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
	await mpv.setFullscreen(state.fullscreen);
	state.fullscreen
		? logger.info('[Player] Player going to full screen')
		: logger.info('[Player] Player going to windowed mode');
}

async function toggleOnTopPlayer() {
	let state = getState();
	state = setState({ontop: await mpv.toggleOnTop()});
	state.ontop
		? logger.info('[Player] Player staying on top')
		: logger.info('[Player] Player NOT staying on top');
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
		await playCurrentSong(now);
		setState({status: 'play'});
		mpv.stopAddASongMessage();
	} else {
		await mpv.resume();
	}
	profile('Play');
}

async function stopPlayer(now = true) {
	if (now) {
		logger.info('[Player] Karaoke stopping NOW');
		await mpv.stop();
		setState({status: 'stop', currentlyPlayingKara: null, randomPlaying: false, stopping: false});
		mpv.stopAddASongMessage();
	} else {
		if (getState().player.playerStatus !== 'stop' && !getState().stopping) {
			logger.info('[Player] Karaoke stopping after current song');
			setState({ stopping: true });
		}
	}
	if (getConfig().Karaoke.ClassicMode) await prepareClassicPauseScreen();
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
		logger.warn(`[Player] Could not prepare classic pause screen : ${err}`);
	}
}

async function pausePlayer() {
	await mpv.pause();
	logger.info('[Player] Karaoke paused');
	setState({status: 'pause'});
}

async function mutePlayer() {
	await mpv.setMute(true);
	logger.info('[Player] Player muted');
}

async function unmutePlayer() {
	await mpv.setMute(false);
	logger.info('[Player] Player unmuted');
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
	await setConfig({Player: {Volume: volume}});
}

async function showSubsPlayer() {
	await mpv.setSubs(true);
	logger.info('[Player] Showing lyrics on screen');
}

async function hideSubsPlayer() {
	await mpv.setSubs(false);
	logger.info('[Player] Hiding lyrics on screen');
}


export async function playerNeedsRestart() {
	const state = getState();
	if (state.player.playerStatus === 'stop' && !state.playerNeedsRestart && !state.isDemo && !state.isTest) {
		setState({ playerNeedsRestart: true });
		logger.info('[Player] Player will restart in 5 seconds');
		mpv.message(i18next.t('RESTARTING_PLAYER'), 5000);
		await sleep(5000);
		await restartPlayer();
		setState({ playerNeedsRestart: false });
	} else {
		logger.debug('[Player] Setting mpv to restart after next song');
		setState({ playerNeedsRestart: true });
	}
}

async function restartPlayer() {
	profile('restartmpv');
	await mpv.restart();
	logger.info('[Player] Player restart complete');
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
			setState({singlePlay: false, randomPlaying: false});
			await playPlayer();
		} else if (command === 'stopNow') {
			setState({singlePlay: false, randomPlaying: false});
			await stopPlayer(true);
		} else if (command === 'pause') {
			await pausePlayer();
		} else if (command === 'stopAfter') {
			setState({singlePlay: false, randomPlaying: false});
			await stopPlayer(false);
			try {
				await nextSong();
			} catch(err) {
				// Non-fatal, stopAfter can be triggered on the last song already.
			}
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
		logger.error(`[Player] Command ${command} failed : ${err}`);
		throw err;
	}
}

export function initPlayer() {
	return mpv.initPlayerSystem();
}

export function quitmpv() {
	return mpv.quit();
}
