import { autoUpdater } from "electron-updater";
import logger from "../lib/utils/logger";
import { dialog } from "electron";
import i18next from "i18next";
import { getConfig } from "../lib/utils/config";
import {win} from './electron';

let manualUpdate = false;

export function setManualUpdate(state: boolean) {
	manualUpdate = state;
}

export async function initAutoUpdate() {
	autoUpdater.logger = logger;
	autoUpdater.autoDownload = false;
	autoUpdater.on('error', (error) => {
		dialog.showErrorBox(`${i18next.t('ERROR')}: `, error === null ? 'unknown' : (error.stack || error).toString());
	});
	autoUpdater.on('update-available', async () => {
		const buttonIndex = await dialog.showMessageBox(win, {
			type: 'info',
			title: i18next.t('UPDATE_FOUND'),
			message: i18next.t('UPDATE_PROMPT'),
			buttons: [i18next.t('YES'), i18next.t('NO')]
		});
		if (buttonIndex.response === 0) {
			try {
				autoUpdater.downloadUpdate();
			} catch(err) {
				await dialog.showMessageBox(win, {
					type: 'info',
					title: i18next.t('UPDATE_FOUND'),
					message: i18next.t('UPDATE_ERROR') + err
				})
			}
		}
	});

	autoUpdater.on('update-not-available', () => {
		if (manualUpdate) dialog.showMessageBox({
			title: i18next.t('UPDATE_NOT_AVAILABLE'),
			message: i18next.t('CURRENT_VERSION_OK')
		});
	});

	autoUpdater.on('update-downloaded', async () => {
		await dialog.showMessageBox(win, {
			title: i18next.t('UPDATE_DOWNLOADED'),
			message: i18next.t('UPDATE_READY_TO_INSTALL_RESTARTING')
		});
		autoUpdater.quitAndInstall();
	});

	if (getConfig().Online.Updates.App && process.platform !== 'darwin') {
		try {
			autoUpdater.checkForUpdatesAndNotify();
		} catch(err) {
			//Non fatal, just report it
			logger.warn('[Updater] Unable to check for app updates: ' + err)
		}
	}
}