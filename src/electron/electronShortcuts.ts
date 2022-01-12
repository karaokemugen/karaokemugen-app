import { globalShortcut, systemPreferences } from 'electron';

import { next, pausePlayer, playPlayer, prev, stopPlayer } from '../services/player';
import { getState, setState } from '../utils/state';

export function registerShortcuts() {
	if (process.platform === 'darwin') systemPreferences.isTrustedAccessibilityClient(true);
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
}

export function unregisterShortcuts() {
	globalShortcut.unregisterAll();
}
