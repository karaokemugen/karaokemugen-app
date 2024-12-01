import { dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';

import logger from '../../lib/utils/logger.js';
import { getState } from '../../utils/state.js';
import { handleFile, win } from '../electron.js';
import { setManualUpdate } from '../electronAutoUpdate.js';

export const urls = {
	operatorOptions: () => openURL('/admin/options'),
	systemOptions: () => openURL('/system/options'),
	home: () => openURL('/welcome'),
	operator: () => openURL('/admin'),
	public: () => openURL('/public'),
	system: () => openURL('/system/home'),
	logs: () => openURL('/system/log'),
	download: () => openURL('/system/karas/download'),
	karas: () => openURL('/system/karas'),
	database: () => openURL('/system/db'),
	helpGuide: () => shell.openExternal('https://docs.karaokes.moe/user-guide/getting-started/'),
	website: () => shell.openExternal('https://karaokes.moe'),
	mastodon: () => shell.openExternal('https://shelter.moe/@KaraokeMugen'),
	bluesky: () => shell.openExternal('https://bsky.app/profile/karaokes.moe'),
	discord: () => shell.openExternal('https://karaokes.moe/discord'),
	forum: () => shell.openExternal('https://discourse.karaokes.moe'),
	gitlab: () => shell.openExternal('https://gitlab.com/karaokemugen/code/karaokemugen-app'),
	changelog: () => shell.openExternal('https://gitlab.com/karaokemugen/code/karaokemugen-app/-/releases'),
	contribDoc: () => shell.openExternal('https://docs.karaokes.moe/contrib-guide/create-karaoke/'),
	reportBug: () => shell.openExternal('https://discourse.karaokes.moe/c/help/8'),
	translations: () => shell.openExternal('https://hosted.weblate.org/projects/karaoke-mugen/'),
	donations: {
		fr: () => shell.openExternal('https://mugen.karaokes.moe/donations.html'),
		en: () => shell.openExternal('https://mugen.karaokes.moe/en/donations.html'),
	},
};

export function openURL(url: string) {
	const base = 'http://localhost';
	const port = getState().frontendPort;
	const fullUrl = `${base}:${port}${url}`;
	win?.loadURL(fullUrl);
}

export async function checkForUpdates() {
	setManualUpdate(true);
	logger.info('Checking for updates manually', { service: 'AppUpdate' });
	await autoUpdater.checkForUpdates().catch(() => {
		// Handled in electronAutoUpadte.ts
	});
	setManualUpdate(false);
}

export async function importFile() {
	const files = await dialog.showOpenDialog({
		properties: ['openFile', 'multiSelections'],
	});
	if (!files.canceled) {
		for (const file of files.filePaths) {
			await handleFile(file);
		}
	}
}
