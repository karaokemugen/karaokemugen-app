import { dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import open from 'open';

import { getConfig } from '../../lib/utils/config';
import logger from '../../lib/utils/logger';
import { getState } from '../../utils/state';
import { handleFile, win } from '../electron';
import { setManualUpdate } from '../electronAutoUpdate';

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
	helpGuide: () => open('https://docs.karaokes.moe/user-guide/getting-started/'),
	website: () => open('https://karaokes.moe'),
	twitter: () => open('https://twitter.com/KaraokeMugen'),
	discord: () => open('https://karaokes.moe/discord'),
	forum: () => open('https://discourse.karaokes.moe'),
	gitlab: () => open('https://gitlab.com/karaokemugen/karaokemugen-app'),
	changelog: () => open('https://gitlab.com/karaokemugen/karaokemugen-app/-/releases'),
	contribDoc: () => open('https://docs.karaokes.moe/contrib-guide/base/'),
	sendKaraoke: () => open('https://kara.moe/base/import'),
	reportBug: () => open('https://discourse.karaokes.moe/c/help/8'),
	translations: () => open('https://hosted.weblate.org/projects/karaoke-mugen/'),
	donations: {
		fr: () => open('https://mugen.karaokes.moe/donations.html'),
		en: () => open('https://mugen.karaokes.moe/en/donations.html'),
	},
};

export function openURL(url: string) {
	const base = 'http://localhost';
	const port = getState().frontendPort;
	const fullUrl = `${base}:${port}${url}`;
	getConfig().GUI.OpenInElectron ? win?.loadURL(fullUrl) : open(fullUrl);
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
