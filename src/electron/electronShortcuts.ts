import { resolve } from 'node:path';

import { dialog, globalShortcut, systemPreferences } from 'electron';
import i18next from 'i18next';
import mpris from 'mpris-service';

import { getSongSeriesSingers } from '../lib/services/kara.js';
import { getConfig } from '../lib/utils/config.js';
import logger, { profile } from '../lib/utils/logger.js';
import { on } from '../lib/utils/pubsub.js';
import { next, pausePlayer, playPlayer, prev, setVolumePlayer, stopPlayer } from '../services/player.js';
import { getCurrentSong, getPlaylistInfo } from '../services/playlist.js';
import { CurrentSong } from '../types/playlist.js';
import { adminToken } from '../utils/constants.js';
import { getState, setState } from '../utils/state.js';

const service = 'MediaShortcuts';

export async function registerShortcuts() {
	if (process.platform === 'darwin') {
		if (getConfig().App.FirstRun)
			await dialog.showMessageBox({
				title: i18next.t('PERMISSIONS_KEYBOARD_INFO_MACOS.TITLE'),
				message: i18next.t('PERMISSIONS_KEYBOARD_INFO_MACOS.MESSAGE'),
			});
		systemPreferences.isTrustedAccessibilityClient(true);
	}
	profile('initKeyboardShortcuts');
	if (process.platform === 'linux') {
		mprisService().catch(err => {
			logger.warn(`Failed to start MPRIS service: ${err}`, { service, obj: err });
		});
	}
	globalShortcut.register('MediaPlayPause', () => {
		getState().player.playerStatus === 'play' ? pausePlayer() : playPlayer().catch(() => {});
	});
	globalShortcut.register('MediaNextTrack', () => {
		setState({ singlePlay: false, randomPlaying: false });
		next().catch(() => {});
	});
	globalShortcut.register('MediaPreviousTrack', () => {
		setState({ singlePlay: false, randomPlaying: false });
		prev().catch(() => {});
	});
	globalShortcut.register('MediaStop', () => {
		setState({ singlePlay: false, randomPlaying: false });
		stopPlayer().catch(() => {});
	});
	profile('initKeyboardShortcuts');
}

export function unregisterShortcuts() {
	globalShortcut.unregisterAll();
}

// TODO sometime : handle shuffle/loop

export async function mprisService() {
	const player = mpris({
		name: 'karaokemugen',
		identity: 'Karaoke Mugen',
		canRaise: false,
		canQuit: false,
		canFullscreen: false,
		hasTrackList: false,
		supportedUriSchemes: ['https'],
		supportedMimeTypes: ['audio/mpeg', 'video/mp4'],
		supportedInterfaces: ['player'],
		desktopEntry: 'karaokemugen_app',
	});

	player.playbackStatus = 'Stopped';
	player.canEditTracks = false;

	const song = await getCurrentSong();

	if (song) {
		player.metadata = await setMPRISMetadata(song);
	}

	player.on('quit', () => {
		stopPlayer(true).catch(() => {});
	});

	player.on('play', () => {
		getState().player.playerStatus === 'play' ? pausePlayer() : playPlayer().catch(() => {});
	});

	player.on('pause', () => {
		getState().player.playerStatus === 'play' ? pausePlayer() : playPlayer().catch(() => {});
	});

	player.on('playpause', () => {
		getState().player.playerStatus === 'play' ? pausePlayer() : playPlayer().catch(() => {});
	});

	player.on('next', () => {
		setState({ singlePlay: false, randomPlaying: false });
		next().catch(() => {});
	});

	player.on('previous', () => {
		setState({ singlePlay: false, randomPlaying: false });
		prev().catch(() => {});
	});

	player.on('stop', () => {
		setState({ singlePlay: false, randomPlaying: false });
		stopPlayer(true).catch(() => {});
	});

	player.on('volume', (volume: number) => {
		setVolumePlayer(volume);
	});

	on('newSong', async (kara: CurrentSong[]) => {
		player.canSeek = false;
		player.canPlay = true;
		player.canPause = true;
		player.canStop = true;
		player.canGoPrevious = true;
		player.canGoNext = true;
		player.metadata = await setMPRISMetadata(kara[0]);
	});

	on('playerStatusUpdated', (playbackState: string) => {
		// DEV: We skip stopped here because PlaybackAPI only shuttles true/false from GPM
		player.playbackStatus = playbackState[0];
	});
}

async function setMPRISMetadata(song: CurrentSong) {
	let playlist: string;
	if (song.plaid) {
		const pl = await getPlaylistInfo(song.plaid, adminToken);
		playlist = pl.name;
	} else {
		playlist = i18next.t('LIBRARY');
	}
	return {
		'mpris:artUrl': `file://${resolve(getState().resourcePath, 'initpage/public/km-logo.png')}`,
		'mpris:length': song?.duration * 1000 * 1000,
		// 'xesam:asText': (newSong.lyrics || ''),
		'xesam:title': song?.titles[song?.titles_default_language],
		'xesam:album': playlist,
		'xesam:artist': [getSongSeriesSingers(song, null)],
	};
}
