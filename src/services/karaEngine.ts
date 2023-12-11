import i18next from 'i18next';
import { sample } from 'lodash';
import { resolve } from 'path';

import { selectPlaylistContentsMicro, updatePlaylistDuration, updatePlaylistLastEditTime } from '../dao/playlist.js';
import { selectUpvotesByPLC } from '../dao/upvote.js';
import { APIMessage } from '../lib/services/frontend.js';
import { getSongSeriesSingers, getSongTitle, getSongVersion } from '../lib/services/kara.js';
import { DBKara } from '../lib/types/database/kara.js';
import { DBPLC } from '../lib/types/database/playlist.js';
import { getConfig, resolvedPath } from '../lib/utils/config.js';
import { fileExists } from '../lib/utils/files.js';
import logger, { profile } from '../lib/utils/logger.js';
import { emit } from '../lib/utils/pubsub.js';
import { emitWS } from '../lib/utils/ws.js';
import { CurrentSong } from '../types/playlist.js';
import { adminToken } from '../utils/constants.js';
import sentry from '../utils/sentry.js';
import { getState, setState } from '../utils/state.js';
import { writeStreamFiles } from '../utils/streamerFiles.js';
import { addPlayedKara, getKara, getKaras } from './kara.js';
import { initAddASongMessage, mpv, next, restartPlayer, stopAddASongMessage, stopPlayer } from './player.js';
import {
	editPlaylist,
	getCurrentSong,
	getPlaylistContentsMini,
	getPlaylistInfo,
	shufflePlaylist,
	updateUserQuotas,
} from './playlist.js';
import { startPoll } from './poll.js';
import { setQuizModifier, startQuizRound } from './quiz.js';
import { getUser } from './user.js';

const service = 'KaraEngine';

/** Play a song from the library, different from when playing the current song in the playlist */
export async function playSingleSong(kid?: string, randomPlaying = false) {
	try {
		const kara = await getKara(kid, adminToken);
		if (!kara) throw { code: 404, msg: 'KID not found' };

		if (!randomPlaying) {
			stopAddASongMessage();
		} else if (randomPlaying && getConfig().Playlist.RandomSongsAfterEndMessage) {
			initAddASongMessage();
		}
		logger.debug('Karaoke selected', { service, obj: kara });
		logger.info(`Playing ${kara.mediafile}`, { service });
		const songInfos = await getSongInfosForPlayer(kara);
		const current: CurrentSong = {
			...kara,
			nickname: 'Dummy Plug System',
			flag_playing: true,
			pos: 1,
			flag_free: false,
			flag_refused: false,
			flag_accepted: false,
			flag_visible: true,
			username: 'admin',
			login: 'admin',
			user_type: 0,
			plcid: -1,
			plaid: null,
			avatar: null,
			added_at: null,
			...songInfos,
		};
		await mpv.play(current);
		writeStreamFiles('song_name');
		writeStreamFiles('requester');
		setState({ singlePlay: !randomPlaying, randomPlaying });
		emit('newSong', current);
	} catch (err) {
		logger.error('Error during song playback', { service, obj: err });
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLAY', err));
		// Not sending to sentry when media source couldn't be found
		if (!err.message.includes('No media source')) sentry.error(err, 'warning');
		stopPlayer();
		throw err;
	}
}

export async function getSongInfosForPlayer(kara: DBKara | DBPLC): Promise<{ infos: string; avatar: string }> {
	const lang = getConfig().Player.Display.SongInfoLanguage;
	// If series is empty, pick singer information instead
	const series = getSongSeriesSingers(kara, lang);
	// Get song versions for display
	const versions = getSongVersion(kara, lang);

	let requestedBy = '';
	let avatarfile = null;
	if (!getState().quiz.running && getConfig().Player.Display.Nickname && 'nickname' in kara) {
		const upvoters = await selectUpvotesByPLC(kara.plcid);
		// Escaping {} because it'll be interpreted as ASS tags below.
		kara.nickname = kara.nickname.replace(/[{}]/g, '');
		requestedBy = `\\N{\\fscx50}{\\fscy50}${i18next.t('REQUESTED_BY', { name: kara.nickname })}`;
		if (upvoters.length > 0) {
			// Add each upvoter's nickname until the string is too long
			// 80 is the max length of the line, but we set 100 for the escaping to not count
			// We subtract the length of the initial requester and the (with ...) words (different for each language)
			const target = 100 - requestedBy.length - i18next.t('REQUESTED_WITH', { names: '' }).length;
			let str = '';
			let people = upvoters.length;
			for (const upvoter of upvoters) {
				const staging = `${upvoter.nickname}, `;
				if (str.length + staging.length < target) {
					str += staging;
					people -= 1;
				} else {
					str = `${str.slice(0, -2)} ${i18next.t('REQUESTED_AND', { count: people })}`;
					break;
				}
			}
			requestedBy += ` ${i18next.t('REQUESTED_WITH', { names: str.endsWith(', ') ? str.slice(0, -2) : str })}`;
		}
		// Get user avatar
		let user = await getUser(kara.username);
		if (!user) {
			// User does not exist anymore, replacing it with admin
			user = await getUser('admin');
		}
		avatarfile = resolve(resolvedPath('Avatars'), user.avatar_file);
		if (!(await fileExists(avatarfile))) avatarfile = resolve(resolvedPath('Avatars'), 'blank.png');
	}
	// Construct mpv message to display.
	// If song order is 0, don't display it (we don't want things like OP0, ED0...)
	let infos = `{\\bord2}{\\fscx70}{\\fscy70}{\\b1}${series}{\\b0}\\N{\\i1}${kara.songtypes
		.map(s => s.name)
		.join(' ')}${kara.songorder || ''} - ${getSongTitle(kara, lang)}${versions}{\\i0}${requestedBy}`;
	if ('flag_visible' in kara && kara.flag_visible === false && !getState().quiz.running) {
		// We're on a PLC with a flag_visible set to false, let's hide stuff!
		// But we don't hide it if we're in quiz mode. Because you know.
		const invisibleSong = sample(getConfig().Playlist.MysterySongs.Labels);
		infos = `{\\bord2}{\\fscx70}{\\fscy70}{\\b1}${invisibleSong}{\\b0}${requestedBy}`;
	}
	return {
		infos,
		avatar: avatarfile,
	};
}

export async function playRandomSongAfterPlaylist() {
	try {
		let kara: DBKara | DBPLC;

		if (getConfig().Playlist.EndOfPlaylistAction === 'random_fallback') {
			const fallbackPlaylistId = getState().fallbackPlaid;
			if (fallbackPlaylistId) {
				const playlistContent = await getPlaylistContentsMini(fallbackPlaylistId);
				const notPlayedKaras = playlistContent.filter(plKara => !plKara.flag_dejavu);
				// If all karas in fallback playlist have been played, ignore the dejavu flag and pick a random played one
				// (Instead, we could also stop the player here or take a random kara from the library)
				const karaPool = notPlayedKaras.length > 0 ? notPlayedKaras : playlistContent;
				kara =
					karaPool.length > 0 &&
					(await getKara(karaPool[Math.floor(Math.random() * karaPool.length)].kid, adminToken));
			}
		} else {
			const karas = await getKaras({
				username: adminToken.username,
				random: 1,
				blacklist: true,
			});
			kara = karas.content[0];
		}
		if (kara) {
			await playSingleSong(kara.kid, true);
		} else {
			stopPlayer();
			stopAddASongMessage();
		}
	} catch (err) {
		sentry.error(err);
		logger.error('Unable to select random song to play at the end of playlist', { service, obj: err });
		emitWS(
			'operatorNotificationError',
			APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_RANDOM_SONG_AFTER_PLAYLIST', err)
		);
	}
}

export async function playCurrentSong(now: boolean) {
	if (!getState().player.playing || now) {
		profile('playCurrentSong');
		try {
			const conf = getConfig();
			const kara = await getCurrentSong();
			if (!kara) {
				throw 'No song selected';
			}
			if (getState().player.playerStatus === 'stop') {
				if (conf.Karaoke.AutoBalance) {
					await shufflePlaylist(getState().currentPlaid, 'balance');
				}
				// Testing if intro hasn't been played already and if we have at least one intro available
				// The intro is never played when there is a quiz
				if (conf.Playlist.Medias.Intros.Enabled && !getState().introPlayed && !getState().quiz.running) {
					setState({ introPlayed: true, counterToJingle: 1 });
					await mpv.playMedia('Intros');
					return;
				}
			}
			logger.debug('Karaoke selected', { service, obj: kara });

			// If we're in quiz mode, we need to make a check before playing
			if (getState().quiz.running) {
				// Check if the song has at least one answer possible from possible answer types
				// Whichever answer type we get to first that exists in a song breaks the loop.
				let answerPossible = false;
				for (const [possibleAnswerType, { Enabled }] of Object.entries(
					getState().quiz.settings.Answers.Accepted
				)) {
					if (!Enabled) {
						continue;
					}
					// Skipping title as all songs have titles... right? RIGHT?
					if (possibleAnswerType === 'title') {
						answerPossible = true;
					} else if (possibleAnswerType === 'year' && kara.year) {
						answerPossible = true;
					} else if (possibleAnswerType !== 'year' && kara[possibleAnswerType]?.length > 0) {
						answerPossible = true;
					}
					if (answerPossible) break;
				}
				if (!answerPossible)
					throw '[Quiz Mode] Song has no possible answer for the criterias selected for this game';
			}
			logger.info(`Playing ${kara.mediafile.substring(0, kara.mediafile.length - 4)}`, { service });
			const modifiers = getState().quiz.running ? setQuizModifier() : null;
			let startTime = 0;
			if (getState().quiz.running) startTime = startQuizRound(kara);
			await mpv.play(kara, modifiers, startTime);
			setState({ randomPlaying: false });
			updateUserQuotas(kara);
			writeStreamFiles('time_remaining_in_current_playlist');
			writeStreamFiles('song_name');
			writeStreamFiles('requester');
			await updatePlaylistDuration(kara.plaid);
			updatePlaylistLastEditTime(kara.plaid);
			emitWS('playlistInfoUpdated', kara.plaid);
			emit('newSong', kara);
			if (conf.Karaoke.Poll.Enabled && !conf.Karaoke.StreamerMode.Enabled) startPoll();
		} catch (err) {
			logger.error('Error during song playback', { service, obj: err });
			emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLAY', err));
			if (getState().player.playerStatus !== 'stop') {
				logger.warn('Skipping playback for this song', { service });
				try {
					await next();
				} catch (err2) {
					logger.warn('Skipping failed', { service });
					throw err2;
				}
			} else {
				logger.warn('Stopping karaoke due to error', { service });
				stopPlayer();
			}
		} finally {
			profile('playCurrentSong');
		}
	}
}

/** This is triggered when player ends its current song
 * To those who enter here, give up all hope. This is one of the most cursed functions of Karaoke Mugen next to user online functions and mpv's IPC.
 */
export async function playerEnding() {
	const state = getState();
	const conf = getConfig();
	logger.debug('Player Ending event triggered', { service });
	try {
		// Add song to played (history) table
		if (
			state.player.mediaType === 'song' &&
			// Ignore random karas from the entire library, but count karas from the fallback playlist as played
			(!state.randomPlaying || getConfig().Playlist.EndOfPlaylistAction === 'random_fallback') &&
			!getState().quiz.running
		) {
			addPlayedKara(state.player.currentSong?.kid);
		}

		if (state.playerNeedsRestart) {
			logger.info('Player restarts, please wait', { service });
			setState({ playerNeedsRestart: false });
			await restartPlayer();
		}
		// Stopping after current song, no need for all the code below.
		if (state.stopping) {
			await stopPlayer();
			next();
			return;
		}
		// When random karas are being played
		if (state.randomPlaying) {
			await playRandomSongAfterPlaylist();
			return;
		}

		// Handle balance
		if (state.player.mediaType === 'song' && !state.singlePlay && !state.randomPlaying) {
			const playlist = await selectPlaylistContentsMicro(state.currentPlaid);
			const previousSongIndex = playlist.findIndex(plc => plc.flag_playing);
			if (previousSongIndex >= 0) {
				const previousSong = playlist[previousSongIndex];
				state.usersBalance.add(previousSong.username);

				const remainingSongs = playlist.length - previousSongIndex - 1;
				if (remainingSongs > 0) {
					const nextSong = playlist[previousSongIndex + 1];
					if (state.usersBalance.has(nextSong.username)) {
						state.usersBalance.clear();
						if (conf.Karaoke.AutoBalance && remainingSongs > 1) {
							await shufflePlaylist(state.currentPlaid, 'balance');
						}
					}
					state.usersBalance.add(nextSong.username);
				}
			}
		}

		// If we just played an intro, play a sponsor.
		if (state.player.mediaType === 'Intros') {
			setState({ introPlayed: true });
			if (conf.Playlist.Medias.Sponsors.Enabled) {
				try {
					setState({ counterToSponsor: 1 });
					await mpv.playMedia('Sponsors');
				} catch (err) {
					logger.warn('Skipping sponsors due to error, playing current song', {
						service,
						obj: err,
					});
					emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
					await playCurrentSong(true);
				}
			} else {
				// Setting introSponsorPlayed here since sponsors were disabled by the time the intro played. So we don't accidentally go into the if 20 lines or so below.
				setState({ introSponsorPlayed: true });
				await playCurrentSong(true);
			}
			return;
		}
		// If Outro, load the background.
		if (state.player.mediaType === 'Outros') {
			if (['random', 'random_fallback'].includes(getConfig().Playlist.EndOfPlaylistAction)) {
				await playRandomSongAfterPlaylist();
			} else if (getConfig().Playlist.EndOfPlaylistAction === 'play_fallback') {
				await editPlaylist(getState().fallbackPlaid, { flag_current: true });
				setState({ currentPlaid: getState().fallbackPlaid });
				await next();
			} else if (getConfig().Playlist.EndOfPlaylistAction === 'repeat') {
				try {
					await next();
				} catch (err) {
					logger.error('Failed going to next song', { service, obj: err });
					throw err;
				}
			} else {
				stopPlayer();
			}
			return;
		}
		// If Sponsor after intro, just play currently selected song.
		if (state.player.mediaType === 'Sponsors' && !state.introSponsorPlayed && state.introPlayed) {
			try {
				setState({ introPlayed: true, introSponsorPlayed: true });
				await playCurrentSong(true);
			} catch (err) {
				logger.error('Unable to play current song, skipping', { service, obj: err });
				try {
					await next();
				} catch (err2) {
					logger.error('Failed going to next song', { service, obj: err2 });
					throw err2;
				}
			}
			return;
		}
		if (state.player.mediaType === 'Encores') {
			try {
				await next();
			} catch (err) {
				logger.error('Failed going to next song', { service, obj: err });
				throw err;
			}
			return;
		}
		// Testing for position before last to play an encore
		const pl = await getPlaylistInfo(state.currentPlaid, adminToken);
		logger.debug(
			`CurrentSong Pos : ${state.player.currentSong?.pos} - Playlist Kara Count : ${pl?.karacount} - Playlist name: ${pl?.name} - CurrentPlaylistID: ${state.currentPlaid} - Playlist ID: ${pl?.plaid}`,
			{ service }
		);
		if (
			conf.Playlist.Medias.Encores.Enabled &&
			state.player.currentSong?.pos === pl.karacount - 1 &&
			!getState().encorePlayed &&
			!getState().singlePlay &&
			!getState().quiz.running
		) {
			try {
				await mpv.playMedia('Encores');
				setState({ encorePlayed: true });
			} catch (err) {
				logger.error('Unable to play encore file, going to next song', { service, obj: err });
				emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
				try {
					await next();
				} catch (err2) {
					logger.error('Failed going to next song', { service, obj: err2 });
					throw err2;
				}
			}
			return;
		}
		setState({ encorePlayed: false });

		// Outros code, we're at the end of a playlist.
		// Outros are played after the very last song.
		if (
			state.player.currentSong?.pos === pl.karacount &&
			state.player.mediaType !== 'stop' &&
			state.player.mediaType !== 'pause' &&
			!state.singlePlay &&
			!state.quiz.running
		) {
			if (conf.Playlist.Medias.Outros.Enabled && !state.randomPlaying) {
				try {
					await mpv.playMedia('Outros');
				} catch (err) {
					logger.error('Unable to play outro file', { service, obj: err });
					emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
					if (conf.Playlist.EndOfPlaylistAction === 'random') {
						await playRandomSongAfterPlaylist();
					} else {
						stopPlayer();
					}
				}
			} else if (['random', 'random_fallback'].includes(conf.Playlist.EndOfPlaylistAction)) {
				await playRandomSongAfterPlaylist();
			} else if (conf.Playlist.EndOfPlaylistAction === 'play_fallback') {
				await editPlaylist(getState().fallbackPlaid, { flag_current: true });
				setState({ currentPlaid: getState().fallbackPlaid });
				await next();
			} else {
				await next();
			}
			return;
		}
		// Jingles and sponsors are played inbetween songs so we need to load the next song
		logger.info(
			`Songs before next jingle: ${
				conf.Playlist.Medias.Jingles.Interval - state.counterToJingle
			} / before next sponsor: ${conf.Playlist.Medias.Sponsors.Interval - state.counterToSponsor}`,
			{ service }
		);
		if (
			!state.singlePlay &&
			state.counterToJingle >= conf.Playlist.Medias.Jingles.Interval &&
			conf.Playlist.Medias.Jingles.Enabled
		) {
			try {
				setState({ counterToJingle: 0 });
				await mpv.playMedia('Jingles');
			} catch (err) {
				logger.error('Unable to play jingle file, going to next song', { service, obj: err });
				emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
				try {
					await next();
				} catch (err2) {
					logger.error('Failed going to next song', { service, obj: err2 });
					throw err2;
				}
			}
			return;
		}
		if (state.counterToSponsor >= conf.Playlist.Medias.Sponsors.Interval && conf.Playlist.Medias.Sponsors.Enabled) {
			try {
				setState({ counterToSponsor: 0 });
				await mpv.playMedia('Sponsors');
			} catch (err) {
				logger.error('Unable to play sponsor file, going to next song', { service, obj: err });
				emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
				try {
					await next();
				} catch (err2) {
					logger.error('Failed going to next song', { service, obj: err2 });
					throw err2;
				}
			}
			return;
		}
		if (!state.singlePlay) {
			setState({ counterToSponsor: state.counterToSponsor + 1, counterToJingle: state.counterToJingle + 1 });
		} else {
			setState({ singlePlay: false });
		}
		if (state.player.playerStatus !== 'stop') {
			try {
				await next();
			} catch (err) {
				logger.error('Failed going to next song', { service, obj: err });
				throw err;
			}
		} else {
			stopPlayer();
		}
	} catch (err) {
		logger.error('Unable to end play properly, stopping.', { service, obj: err });
		sentry.error(err);
		stopPlayer();
	}
}
