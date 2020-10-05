import { app, dialog } from 'electron';
import i18next from 'i18next';
import { Migration } from 'postgrator';

import {win} from '../electron/electron';
import logger from '../lib/utils/logger';
import { initDownloader } from '../services/download';
import { redownloadSongs } from '../services/downloadUpdater';
import { generateDB } from './database';

export async function postMigrationTasks(migrations: Migration[]) {
	let doGenerate = false;
	// Add code here to do stuff when migrations occur
	for (const migration of migrations) {
		let breakFromLoop = false;
		switch (migration.name) {
		case 'initial':
			//Initial migration will likely trigger generation anyway.
			breakFromLoop = true;
			break;
		case 'bulldozerSeries':
			// Force generation + force download of all songs present
			if (app) {
				const buttonIndex = await dialog.showMessageBox(win, {
					type: 'info',
					title: i18next.t('BASE_UPDATE_NEEDED'),
					message: i18next.t('BASE_UPDATE_BULLDOZERSERIES'),
					buttons: [i18next.t('YES'), i18next.t('NO')],
					cancelId: 1
				});
				if (buttonIndex.response === 0) {
					await initDownloader();
					await redownloadSongs();
				}
			}
			break;
		case 'addPlaylistTriggers':
			if (app) {
				await dialog.showMessageBox(win, {
					type: 'info',
					title: i18next.t('NO_KARAOKE_MODE_ANYMORE.TITLE'),
					message: i18next.t('NO_KARAOKE_MODE_ANYMORE.MESSAGE')
				});
			}
			break;
		case 'addPriorityToTags':
			doGenerate = true;
			logger.info('Migration adding priority to tags detected, forcing generation', {service: 'DB'});
			break;
		default:
		}
		if (breakFromLoop) break;
	}
	if (doGenerate) await generateDB();
}
