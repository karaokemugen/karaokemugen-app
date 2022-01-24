import { dialog } from 'electron';
import i18next from 'i18next';
import { Migration } from 'postgrator';

import logger from '../lib/utils/logger';
import { migrateBLWLToSmartPLs } from '../utils/hokutoNoCode';
import { getState } from '../utils/state';
import { compareKarasChecksum, generateDB } from './database';

export async function postMigrationTasks(migrations: Migration[], didGeneration: boolean) {
	let doGenerate = false;
	// Add code here to do stuff when migrations occur
	for (const migration of migrations) {
		let breakFromLoop = false;
		switch (migration.name) {
			// 4.0 migrations
			case 'initial':
				// Initial migration will likely trigger generation anyway.
				breakFromLoop = true;
				break;
			case 'addPlaylistTriggers':
				await dialog.showMessageBox(getState().windows.main, {
					type: 'info',
					title: i18next.t('NO_KARAOKE_MODE_ANYMORE.TITLE'),
					message: i18next.t('NO_KARAOKE_MODE_ANYMORE.MESSAGE'),
				});
				break;
			// 5.0 migrations
			case 'addPriorityToTags':
				if (!didGeneration) doGenerate = true;
				logger.info('Migration adding priority to tags detected, forcing generation', { service: 'DB' });
				break;
			// 6.0 migrations
			case 'addTitlesToKara':
				if (!didGeneration) doGenerate = true;
				logger.info('Migration adding titles to karas detected, forcing generation', { service: 'DB' });
				break;
			case 'smartPlaylistsAndBLWLRework':
				logger.info('Migrating blacklist and whitelist to smart playlists', { service: 'DB' });
				await migrateBLWLToSmartPLs();
				break;
			case 'addKaraParents':
				if (!didGeneration) doGenerate = true;
				logger.info('Migration adding parents to karas detected, forcing generation', { service: 'DB' });
				break;
			default:
		}
		if (breakFromLoop) break;
	}
	if (doGenerate) await Promise.all([generateDB(), compareKarasChecksum()]);
}
