import openAboutWindow from 'about-window';
import { dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import i18next from 'i18next';
import open from 'open';
import { resolve } from 'path';

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
	helpGuide: () => open(`https://docs.karaokes.moe/${getState().defaultLocale}/user-guide/getting-started/`),
	website: () => open('https://karaokes.moe'),
	twitter: () => open('https://twitter.com/KaraokeMugen'),
	discord: () => open('https://karaokes.moe/discord'),
	gitlab: () => open('https://lab.shelter.moe/karaokemugen/karaokemugen-app'),
	changelog: () => open('https://lab.shelter.moe/karaokemugen/karaokemugen-app/-/releases'),
	contribDoc: () => open(`https://docs.karaokes.moe/${getState().defaultLocale}/contrib-guide/base/`),
	sendKaraoke: () => open('https://kara.moe/base/import'),
	reportBug: () => open('https://lab.shelter.moe/karaokemugen/karaokemugen-app/-/issues'),
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

export function displayAbout() {
	{
		const version = getState().version;
		const versionSHA = version.sha ? `version ${version.sha}` : '';
		openAboutWindow({
			icon_path: resolve(getState().resourcePath, 'build/icon.png'),
			product_name: `Karaoke Mugen\n${version.name}`,
			bug_link_text: i18next.t('ABOUT.BUG_REPORT'),
			bug_report_url:
				'https://lab.shelter.moe/karaokemugen/karaokemugen-app/issues/new?issue%5Bassignee_id%5D=&issue%5Bmilestone_id%5D=',
			homepage: 'https://mugen.karaokes.moe',
			description: versionSHA,
			copyright: i18next.t('ABOUT.COPYRIGHT'),
			use_version_info: true,
			css_path: resolve(getState().resourcePath, 'build/electronAboutWindow.css'),
			win_options: {
				title: i18next.t('ABOUT.TITLE'),
			},
		});
	}
}
