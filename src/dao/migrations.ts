import { profile } from 'console';
import { dialog } from 'electron';
import i18next from 'i18next';
import Postgrator from 'postgrator';

import { win } from '../electron/electron.js';
import { refreshTags } from '../lib/dao/tag.js';
import logger from '../lib/utils/logger.js';
import { editRepo, getRepo } from '../services/repo.js';
import { migrateBLWLToSmartPLs } from '../utils/hokutoNoCode.js';
import Sentry from '../utils/sentry.js';
import { compareKarasChecksum, generateDB } from './database.js';

const service = 'DBMigration';

export async function postMigrationTasks(migrations: Postgrator.Migration[], didGeneration: boolean) {
	profile('postMigrationTasks');
	let doGenerate = false;
	// Add code here to do stuff when migrations occur
	for (const migration of migrations) {
		let breakFromLoop = false;
		switch (migration.name) {
			case 'initial':
				// Initial migration will likely trigger generation anyway.
				breakFromLoop = true;
				break;
			// 6.0 migrations
			case 'addTitlesToKara':
				if (!didGeneration) doGenerate = true;
				logger.info('Migration adding titles to karas detected, forcing generation', { service });
				break;
			case 'smartPlaylistsAndBLWLRework':
				logger.info('Migrating blacklist and whitelist to smart playlists', { service });
				await migrateBLWLToSmartPLs();
				break;
			case 'addKaraParents':
				if (!didGeneration) doGenerate = true;
				logger.info('Migration adding parents to karas detected, forcing generation', { service });
				break;
			case 'addDescriptionToTags':
				// This is actually the collections migration.
				if (!didGeneration) doGenerate = true;
				const world = getRepo('world.karaokes.moe');
				if (world) {
					await dialog.showMessageBox(win, {
						type: 'info',
						title: i18next.t('WORLD_REPOSITORY_DISABLED.TITLE'),
						message: i18next.t('WORLD_REPOSITORY_DISABLED.MESSAGE'),
					});
					world.Enabled = false;
					editRepo('world.karaokes.moe', world, false).catch(err => {
						logger.warn('Unable to edit repository world following migration', { service, obj: err });
						Sentry.error(err, 'warning');
					});
				}
				break;
			case 'reworkTagViewCollections':
				await refreshTags();
				break;
			// 7.0 migrations
			case 'addExternalDatabaseIds':
				if (!didGeneration) doGenerate = true;
				break;
			// 8.0 migrations
			case 'addFromDisplayType':
				if (!didGeneration) doGenerate = true;
				break;
			default:
		}
		if (breakFromLoop) break;
	}
	if (doGenerate) await Promise.all([generateDB(), compareKarasChecksum()]);
	profile('postMigrationTasks');
}
