import { APIMessage } from '../controllers/common';
import { selectPlaylistContentsMicro, updatePlaylistDuration, updatePLCVisible } from '../dao/playlist';
import { getConfig } from '../lib/utils/config';
import logger, { profile } from '../lib/utils/logger';
import { emitWS } from '../lib/utils/ws';
import { CurrentSong } from '../types/playlist';
import { adminToken } from '../utils/constants';
import sentry from '../utils/sentry';
import { getState, setState } from '../utils/state';
import { writeStreamFiles } from '../utils/streamerFiles';
import { addPlayedKara, getKara, getKaras, getSongSeriesSingers, getSongTitle, getSongVersion } from './kara';
import { initAddASongMessage, mpv, next, restartPlayer, stopAddASongMessage, stopPlayer } from './player';
import { getCurrentSong, getPlaylistInfo, shufflePlaylist, updateUserQuotas } from './playlist';
import { startPoll } from './poll';

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
		logger.debug('Karaoke selected', { service: 'Player', obj: kara });
		logger.info(`Playing ${kara.mediafile}`, { service: 'Player' });

		// If series is empty, pick singer information instead
		const series = getSongSeriesSingers(kara);

		let songorder = `${kara.songorder}`;
		// If song order is 0, don't display it (we don't want things like OP0, ED0...)
		if (!kara.songorder || kara.songorder === 0) songorder = '';

		// Get song versions for display
		const versions = getSongVersion(kara);

		// Construct mpv message to display.
		const infos = `{\\bord2}{\\fscx70}{\\fscy70}{\\b1}${series}{\\b0}\\N{\\i1}${kara.songtypes
			.map(s => s.name)
			.join(' ')}${songorder} - ${getSongTitle(kara)}${versions}{\\i0}`;
		const current: CurrentSong = {
			...kara,
			nickname: 'Dummy Plug System',
			flag_playing: true,
			pos: 1,
			flag_free: false,
			flag_refused: false,
			flag_accepted: false,
			flag_visible: false,
			username: 'admin',
			login: 'admin',
			user_type: 0,
			plcid: -1,
			plaid: null,
			avatar: null,
			added_at: null,
			infos,
		};
		await mpv.play(current);
		writeStreamFiles('song_name');
		writeStreamFiles('requester');
		setState({ singlePlay: !randomPlaying, randomPlaying });
	} catch (err) {
		logger.error('Error during song playback', { service: 'Player', obj: err });
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLAY', err));
		// Not sending to sentry when media source couldn't be found
		if (!err.message.includes('No media source')) sentry.error(err, 'Warning');
		stopPlayer(true);
		throw err;
	}
}

export async function playRandomSongAfterPlaylist() {
	try {
		const karas = await getKaras({
			token: adminToken,
			random: 1,
			blacklist: true,
		});
		const kara = karas.content[0];
		if (kara) {
			await playSingleSong(kara.kid, true);
		} else {
			stopPlayer(true);
			stopAddASongMessage();
		}
	} catch (err) {
		sentry.error(err);
		logger.error('Unable to select random song to play at the end of playlist', { service: 'Player', obj: err });
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
			// No song to play, silently return
			if (!kara) {
				await stopPlayer(true);
				return;
			}

			if (kara.pos === 1) {
				if (conf.Karaoke.AutoBalance) {
					await shufflePlaylist(getState().currentPlaid, 'balance');
				}
				// Testing if intro hasn't been played already and if we have at least one intro available
				if (conf.Playlist.Medias.Intros.Enabled && !getState().introPlayed) {
					setState({ introPlayed: true });
					await mpv.playMedia('Intros');
					return;
				}
			}
			logger.debug('Karaoke selected', { service: 'Player', obj: kara });
			logger.info(`Playing ${kara.mediafile.substring(0, kara.mediafile.length - 4)}`, { service: 'Player' });
			await mpv.play(kara);
			setState({ randomPlaying: false });
			addPlayedKara(kara.kid);
			await Promise.all([
				updatePLCVisible([kara.plcid]),
				updatePlaylistDuration(kara.plaid),
				updateUserQuotas(kara),
				writeStreamFiles('time_remaining_in_current_playlist'),
				writeStreamFiles('song_name'),
				writeStreamFiles('requester'),
			]);
			emitWS('playlistInfoUpdated', kara.plaid);
			if (conf.Karaoke.Poll.Enabled && !conf.Karaoke.StreamerMode.Enabled) startPoll();
		} catch (err) {
			logger.error('Error during song playback', { service: 'Player', obj: err });
			if (!err.message.includes('No media source')) sentry.error(err, 'Warning');
			emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLAY', err));
			if (getState().player.playerStatus !== 'stop') {
				logger.warn('Skipping playback for this song', { service: 'Player' });
				try {
					await next();
				} catch (err2) {
					logger.warn('Skipping failed', { service: 'Player' });
					throw err2;
				}
			} else {
				logger.warn('Stopping karaoke due to error', { service: 'Player' });
				stopPlayer(true);
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
	logger.debug('Player Ending event triggered', { service: 'Player' });
	try {
		if (state.playerNeedsRestart) {
			logger.info('Player restarts, please wait', { service: 'Player' });
			setState({ playerNeedsRestart: false });
			await restartPlayer();
		}
		// Stopping after current song, no need for all the code below.
		if (state.stopping) {
			await stopPlayer(true);
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
					await mpv.playMedia('Sponsors');
				} catch (err) {
					logger.warn('Skipping sponsors due to error, playing current song', {
						service: 'Player',
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
			if (getConfig().Playlist.EndOfPlaylistAction === 'random') {
				await playRandomSongAfterPlaylist();
			} else if (getConfig().Playlist.EndOfPlaylistAction === 'repeat') {
				try {
					await next();
				} catch (err) {
					logger.error('Failed going to next song', { service: 'Player', obj: err });
					throw err;
				}
			} else {
				stopPlayer(true);
			}
			return;
		}
		// If Sponsor after intro, just play currently selected song.
		if (state.player.mediaType === 'Sponsors' && !state.introSponsorPlayed && state.introPlayed) {
			try {
				// If it's played just after an intro, play next song. If not, proceed as usual
				setState({ introPlayed: true, introSponsorPlayed: true });
				await playCurrentSong(true);
			} catch (err) {
				logger.error('Unable to play current song, skipping', { service: 'Player', obj: err });
				try {
					await next();
				} catch (err2) {
					logger.error('Failed going to next song', { service: 'Player', obj: err2 });
					throw err2;
				}
			}
			return;
		}
		if (state.player.mediaType === 'Encores') {
			try {
				await next();
			} catch (err) {
				logger.error('Failed going to next song', { service: 'Player', obj: err });
				throw err;
			}
			return;
		}
		// Testing for position before last to play an encore
		const pl = await getPlaylistInfo(state.currentPlaid, adminToken);
		logger.debug(
			`CurrentSong Pos : ${state.player.currentSong?.pos} - Playlist Kara Count : ${pl?.karacount} - Playlist name: ${pl?.name} - CurrentPlaylistID: ${state.currentPlaid} - Playlist ID: ${pl?.plaid}`,
			{ service: 'Player' }
		);
		if (
			conf.Playlist.Medias.Encores.Enabled &&
			state.player.currentSong?.pos === pl.karacount - 1 &&
			!getState().encorePlayed &&
			!getState().singlePlay
		) {
			try {
				await mpv.playMedia('Encores');
				setState({ encorePlayed: true });
			} catch (err) {
				logger.error('Unable to play encore file, going to next song', { service: 'Player', obj: err });
				emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
				try {
					await next();
				} catch (err2) {
					logger.error('Failed going to next song', { service: 'Player', obj: err2 });
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
			!state.singlePlay
		) {
			if (conf.Playlist.Medias.Outros.Enabled && !state.randomPlaying) {
				try {
					await mpv.playMedia('Outros');
				} catch (err) {
					logger.error('Unable to play outro file', { service: 'Player', obj: err });
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
		logger.info(
			`Songs before next jingle: ${
				conf.Playlist.Medias.Jingles.Interval - state.counterToJingle
			} / before next sponsor: ${conf.Playlist.Medias.Sponsors.Interval - state.counterToSponsor}`,
			{ service: 'Player' }
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
				logger.error('Unable to play jingle file, going to next song', { service: 'Player', obj: err });
				emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
				try {
					await next();
				} catch (err2) {
					logger.error('Failed going to next song', { service: 'Player', obj: err2 });
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
				logger.error('Unable to play sponsor file, going to next song', { service: 'Player', obj: err });
				emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_PLMEDIA', err));
				try {
					await next();
				} catch (err2) {
					logger.error('Failed going to next song', { service: 'Player', obj: err2 });
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
				return;
			} catch (err) {
				logger.error('Failed going to next song', { service: 'Player', obj: err });
				throw err;
			}
		} else {
			stopPlayer(true);
		}
	} catch (err) {
		logger.error('Unable to end play properly, stopping.', { service: 'Player', obj: err });
		sentry.error(err);
		stopPlayer(true);
	}
}
