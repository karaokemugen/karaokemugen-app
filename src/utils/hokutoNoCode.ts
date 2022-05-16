// This code doesn't know it yet but it's already dead.
// More seriously, we're centralizing all code bound to be removed at some point due to various migrations through KM's versions.
//
// When removing code here, remember to go see if all functions called are still useful.

import i18next from 'i18next';
import { cloneDeep } from 'lodash';
import { resolve } from 'path';

import { insertCriteria, insertKaraIntoPlaylist, insertPlaylist } from '../dao/playlist';
import { updateRepo } from '../dao/repo';
import { db } from '../lib/dao/database';
import { relativePath } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import { addSystemMessage } from '../services/proxyFeeds';
import { editRepo, getRepos } from '../services/repo';
import { updateAllSmartPlaylists } from '../services/smartPlaylist';
import { Repository } from '../types/config';
import { OldRepository } from '../types/repo';
import { backupConfig } from './config';
import Sentry from './sentry';
import { getState } from './state';

/** Migrate from old repos to zip/git repos with maintainer mode. Remove in KM 7.0 */
export async function migrateReposToZip() {
	// Find unmigrated repositories
	const repos: OldRepository[] = cloneDeep(
		(getRepos() as any as OldRepository[]).filter(r => r.Path.Karas?.length > 0)
	);
	if (repos.length > 0) {
		// Create a config backup, just in case
		await backupConfig();
	}
	for (const oldRepo of repos) {
		// Determine basedir by going up one folder
		const dir = resolve(getState().dataPath, oldRepo.Path.Karas[0], '..');
		const newRepo: Repository = {
			Name: oldRepo.Name,
			Online: oldRepo.Online,
			Enabled: oldRepo.Enabled,
			SendStats: oldRepo.SendStats || true,
			Path: {
				Medias: oldRepo.Path.Medias,
			},
			MaintainerMode: false,
			AutoMediaDownloads: 'updateOnly',
			BaseDir: dir,
		};
		const extraPath = newRepo.Online && !newRepo.MaintainerMode ? './json' : '';
		newRepo.BaseDir = relativePath(getState().dataPath, resolve(getState().dataPath, dir, extraPath));
		await editRepo(newRepo.Name, newRepo, false).catch(err => {
			logger.error(`Unable to migrate repo ${oldRepo.Name} to zip-based: ${err}`, { service: 'Repo', obj: err });
			Sentry.error(err);
			addSystemMessage({
				type: 'system_error',
				date: new Date().toString(),
				dateStr: new Date().toLocaleDateString(),
				link: '#',
				html: `<p>${i18next.t('SYSTEM_MESSAGES.ZIP_MIGRATION_FAILED.BODY', { repo: oldRepo.Name })}</p>`,
				title: i18next.t('SYSTEM_MESSAGES.ZIP_MIGRATION_FAILED.TITLE'),
			});
			// Disable the repo and bypass stealth checks
			updateRepo({ ...oldRepo, Enabled: false } as any, oldRepo.Name);
		});
	}
}

/** Remove this in KM 7.0 */
export async function migrateFromDBMigrate() {
	// Return early if migrations table does not exist
	let migrationsDone = [];
	try {
		const tables = await db().query(
			"SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migrations'"
		);
		if (tables.rows.length === 0) return;
		const lastMigration = await db().query('SELECT * FROM migrations ORDER BY id DESC LIMIT 1');
		logger.info('Old migration system found, converting...', { service: 'DB' });
		if (lastMigration.rows.length === 0) {
			// Migration table empty for whatever reason.
			await db().query('DROP TABLE migrations;');
			return;
		}
		const id = lastMigration.rows[0].name.replaceAll('/', '').split('-')[0];
		migrationsDone = migrations.filter(m => m.version <= id);
	} catch (err) {
		logger.error('Error preparing migrations', { service: 'DB', obj: err });
		Sentry.error(err);
		throw err;
	}
	try {
		await db().query(`CREATE TABLE schemaversion (
			version BIGINT PRIMARY KEY,
			name TEXT,
			md5 TEXT,
			run_at TIMESTAMPTZ
		);
		`);
	} catch (err) {
		const error = new Error('Migration table already exists');
		Sentry.error(error);
		throw error;
	}
	for (const migration of migrationsDone) {
		db().query(
			`INSERT INTO schemaversion VALUES('${migration.version}', '${migration.name}', '${
				migration.md5
			}', '${new Date().toISOString()}')`
		);
	}
	await db().query('DROP TABLE migrations;');
}

/** Remove in KM 8.0 */
export async function migrateBLWLToSmartPLs() {
	const [BLCSets, BLCs, WL] = await Promise.all([
		db().query('SELECT * FROM blacklist_criteria_set'),
		db().query('SELECT * FROM blacklist_criteria'),
		db().query('SELECT * FROM whitelist'),
	]);
	// Convert whitelist, that's the easiest part.
	if (WL.rows.length > 0) {
		const plaid = await insertPlaylist({
			name: i18next.t('WHITELIST'),
			flag_whitelist: true,
			flag_visible: true,
			created_at: new Date(),
			modified_at: new Date(),
			username: 'admin',
		});
		let pos = 0;
		const songs = WL.rows.map(s => {
			pos += 1;
			return {
				plaid,
				username: 'admin',
				nickname: 'Dummy Plug System',
				kid: s.fk_kid,
				added_at: new Date(),
				pos,
				criteria: null,
				flag_visible: true,
			};
		});
		await insertKaraIntoPlaylist(songs);
	}
	// Blacklist(s)
	for (const set of BLCSets.rows) {
		const blc = BLCs.rows.filter(e => e.fk_id_blc_set === set.pk_id_blc_set);
		// No need to import an empty BLC set.
		if (blc.length === 0) continue;
		const plaid = await insertPlaylist({
			...set,
			flag_current: false,
			flag_visible: true,
			flag_blacklist: set.flag_current,
			flag_smart: true,
			username: 'admin',
			type_smart: 'UNION',
		});
		await insertCriteria(
			blc.map(e => ({
				plaid,
				type: e.type,
				value: e.value,
			}))
		);
	}
	await updateAllSmartPlaylists();
	try {
		await db().query('DROP TABLE IF EXISTS whitelist');
		await db().query('DROP TABLE IF EXISTS blacklist_criteria');
		await db().query('DROP TABLE IF EXISTS blacklist_criteria_set');
	} catch (err) {
		// Everything is daijokay
	}
}

// Contains migration list from before we switchted from db-migrate to postgrator.

// This is used to seed the database with the right migration data when a user migrates from a version with db-migrate to a version with postgrator.

// Let's try to remove this in KM 7.0

const migrations = [
	{
		version: 20190110101516,
		name: 'initial',
		md5: '415a3137b9c10f1418cea43681d95a7b',
	},
	{
		version: 20190214102323,
		name: 'addDefaultNullKaraOrder',
		md5: '9d41c6de0ed6978a4baeaa96d9affa67',
	},
	{
		version: 20190215154455,
		name: 'addKaraSerieLangMaterializedView',
		md5: '41c86d401c2afa569b8268019ab3be46',
	},
	{
		version: 20190226223300,
		name: 'createDownloadTable',
		md5: '64d976c1b00c34c2c0392bbd28f75291',
	},
	{
		version: 20190226230817,
		name: 'addFirstRepoTable',
		md5: '6977c10a3d34912a99c4da1152f71250',
	},
	{
		version: 20190410081710,
		name: 'addBLCDownloadTable',
		md5: '3063ed1f19c4241eaf11a08f428d1c75',
	},
	{
		version: 20190410125416,
		name: 'karaTagRestrictToCascade',
		md5: '8cc55b8ea3463a48fe58e4ded632fd6a',
	},
	{
		version: 20190515144041,
		name: 'removeSubfileNotNullConstraint',
		md5: 'ea565bc8935ae75cc7d20f4b487c1409',
	},
	{
		version: 20190517142357,
		name: 'fuckTimezones',
		md5: '9ae6712e78da4f67c88a8b3b9f153fd0',
	},
	{
		version: 20190522101040,
		name: 'addSessionTableAndColumns',
		md5: 'f8f18b8220be4d8793969ab3f0af9ad0',
	},
	{
		version: 20190524114916,
		name: 'addLangModeColumnsUser',
		md5: '56308fbef52ce46719f8c66c2fc2fe9c',
	},
	{
		version: 20190525113043,
		name: 'addFlagVisibleColumnToPLC',
		md5: '3b4f490d88e9f34d1b2d80f4828f3b4f',
	},
	{
		version: 20190617090553,
		name: 'removeOldGuestNames',
		md5: 'da01f816d46fd82b27d25ed57c9719b4',
	},
	{
		version: 20190617135011,
		name: 'coalesceUnaccentSeriesSingerOrder',
		md5: 'f6f2ea82af70b6504c1fa4cb0c411c0b',
	},
	{
		version: 20190620101811,
		name: 'addDownloadBLCUniqueValue',
		md5: 'f6c1471a6e13aa7d1580f3f959b5f012',
	},
	{
		version: 20190627142402,
		name: 'tagRework',
		md5: '81f053ab2a122176965e08ca31bd6809',
	},
	{
		version: 20190723140726,
		name: 'tagPreciseSearchWithType',
		md5: '3bfe10195a4cc273899ebf5c9b278fc0',
	},
	{
		version: 20190730142823,
		name: 'wipeBlacklistCriterias',
		md5: 'df9abe3c39ec7d1c853d9a6752c82594',
	},
	{
		version: 20190821192135,
		name: 'removeStatsView',
		md5: '5754d9eec3bf0c653ad51ccc99437417',
	},
	{
		version: 20191026124159,
		name: 'AddTagKaracountWithType',
		md5: 'b08c8654856613fc749564fa6429a18c',
	},
	{
		version: 20191212100536,
		name: 'addPrivateFlagForSessions',
		md5: 'cef9983acb7c8b6c4ee0ea6aa2ad3cbe',
	},
	{
		version: 20191214230722,
		name: 'addBLCIDtoBlacklist',
		md5: '294e947bc7edfd330882b8a4fb56e724',
	},
	{
		version: 20191215162839,
		name: 'makeNicknameMandatory',
		md5: '38353dd47023beaf591e0c0eec83a72e',
	},
	{
		version: 20200122135323,
		name: 'removeRepoTable',
		md5: 'adcc13ba580a10a2aff71e3dbd78e9f8',
	},
	{
		version: 20200122135336,
		name: 'addRepoToTagAndSeries',
		md5: '68bd68c762ac27c66462df42a723be70',
	},
	{
		version: 20200123153420,
		name: 'addRepoToDownload',
		md5: '1a5d167d6fbd774875f2f05c45f4d72d',
	},
	{
		version: 20200125131712,
		name: 'addRepositoryToAllKaras',
		md5: '49f612b18b69ccfd92775066986c4ef2',
	},
	{
		version: 20200203133537,
		name: 'addKIDtoDownloads',
		md5: '3997218ca60605bad9b3da8d7a1e135f',
	},
	{
		version: 20200309082852,
		name: 'alterKaraAddSubchecksum',
		md5: '7d020de85bb6d97498183ed716069186',
	},
	{
		version: 20200329131617,
		name: 'addUserConstraints',
		md5: '3a2683ef84d16d69293bb32fff4ee45f',
	},
	{
		version: 20200331095154,
		name: 'addModifiedAtToTagsAndSeries',
		md5: 'da270f39fcaf4612517ee996d8dd0ea2',
	},
];
