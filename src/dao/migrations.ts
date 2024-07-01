import { profile } from 'console';
import Postgrator from 'postgrator';

import { compareKarasChecksum, generateDB } from './database.js';
import { db, getSettings } from '../lib/dao/database.js';
import { setConfig } from '../lib/utils/config.js';

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
			// 7.0 migrations
			case 'addExternalDatabaseIds':
			// 8.0 migrations
			// falls through
			case 'addFromDisplayType':
			// falls through
			case 'addAnnouncePositionToKara':
				if (!didGeneration) doGenerate = true;
				break;
			case 'moveInstanceIDAndTokenFromDBToConfig':
				const settings = await getSettings();
				if (settings.remoteToken) {
					setConfig({ Online: { RemoteToken: settings.remoteToken } });
					await db().query("DELETE FROM settings WHERE option = 'remoteToken'");
				}
				if (settings.instanceID) {
					setConfig({ App: { InstanceID: settings.instanceID } });
					await db().query("DELETE FROM settings WHERE option = 'instanceID'");
				}
				break;
			default:
		}
		if (breakFromLoop) break;
	}
	if (doGenerate) await Promise.all([generateDB(), compareKarasChecksum()]);
	profile('postMigrationTasks');
}
