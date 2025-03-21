import { dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import i18next from 'i18next';

import { exit } from '../components/engine.js';
import { getConfig } from '../lib/utils/config.js';
import logger from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import sentry from '../utils/sentry.js';
import { win } from './electron.js';

const service = 'ElectronUpdater';

let manualUpdate = false;
let updateRunning = false;

export function initAutoUpdate() {
	autoUpdater.logger = logger;
	autoUpdater.autoDownload = false;
	autoUpdater.disableDifferentialDownload = true;
	let task: Task;
	autoUpdater.on('error', error => {
		if (error.message === 'net::ERR_INTERNET_DISCONNECTED') {
			// Not yet handled cleanly by the electron-updater package
			logger.info('Device is offline, skipping update', { service, obj: error });
			return;
		}
		logger.error('', { service, obj: error });
	});
	autoUpdater.on('update-available', async () => {
		logger.info('Update detected', { service });
		if (updateRunning) return;
		updateRunning = true;
		const buttonIndex = await dialog.showMessageBox(win, {
			type: 'info',
			title: i18next.t('UPDATE_FOUND'),
			message: i18next.t('UPDATE_FOUND'),
			detail: i18next.t('UPDATE_PROMPT'),
			buttons: [i18next.t('YES'), i18next.t('NO')],
			cancelId: 1,
		});
		if (buttonIndex.response === 0) {
			try {
				await autoUpdater.downloadUpdate();
			} catch (err) {
				sentry.error(err);
				await dialog.showMessageBox(win, {
					type: 'info',
					title: i18next.t('UPDATE_FOUND'),
					message: i18next.t('UPDATE_FOUND'),
					detail: i18next.t('UPDATE_ERROR') + err,
				});
			}
		}
		updateRunning = false;
	});

	autoUpdater.on('update-not-available', () => {
		logger.info('Update not available', { service });
		if (manualUpdate) {
			dialog.showMessageBox({
				title: i18next.t('UPDATE_NOT_AVAILABLE'),
				message: i18next.t('UPDATE_NOT_AVAILABLE'),
				detail: i18next.t('CURRENT_VERSION_OK'),
			});
		}
	});

	autoUpdater.on('download-progress', state => {
		if (!task)
			task = new Task({
				text: `DOWNLOADING_APP_UPDATE`,
				total: 100,
			});
		task.update({
			value: state.percent,
		});
	});

	autoUpdater.on('update-downloaded', async () => {
		logger.info('Update downloaded', { service });
		if (task) task.end();
		await dialog.showMessageBox(win, {
			title: i18next.t('UPDATE_DOWNLOADED'),
			message: i18next.t('UPDATE_DOWNLOADED'),
			detail: i18next.t('UPDATE_READY_TO_INSTALL_RESTARTING'),
		});
		try {
			await exit(0, true);
			autoUpdater.quitAndInstall();
		} catch (err) {
			sentry.error(err);
			logger.error('Failed to quit and install', { service, obj: err });
		}
	});

	if (getConfig().Online.Updates.App) {
		try {
			logger.info('Checking for updates and notify', { service });
			autoUpdater.checkForUpdatesAndNotify();
		} catch (err) {
			// Non fatal, just report it
			sentry.error(err, 'warning');
			logger.warn('Unable to check for app updates', { service, obj: err });
		}
	}
}

export function setManualUpdate(state: boolean) {
	manualUpdate = state;
}
