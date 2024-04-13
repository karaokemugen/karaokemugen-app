import { getConfig, setConfig } from '../lib/utils/config.js';
import { sendCommand } from '../services/player.js';

export async function initSteamDeck() {
	if (!process.env.SteamDeck && !process.env.SteamOS) return;

	const conf = getConfig();
	if (conf.Player.StayOnTop) {
		sendCommand('toggleAlwaysOnTop');
		setConfig({ Player: { StayOnTop: false } });
	}
	if (!conf.Player.FullScreen) {
		sendCommand('toggleFullscreen');
		setConfig({ Player: { FullScreen: true } });
	}
	if (conf.Player.Borders) {
		sendCommand('toggleBorders');
		setConfig({ Player: { Borders: false } });
	}
	if (conf.Player.Monitor) {
		setConfig({ Player: { Monitor: false } });
	}
}
