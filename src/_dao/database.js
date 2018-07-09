import logger from 'winston/lib/winston';
import {open} from 'sqlite';
import {setConfig, getConfig} from '../_common/utils/config';
import {join, resolve} from 'path';
import {asyncStat, asyncExists, asyncUnlink} from '../_common/utils/files';
import promiseRetry from 'promise-retry';
import {exit} from '../_services/engine';
import {duration} from '../_common/utils/date';
import deburr from 'lodash.deburr';
import langs from 'langs';
import {checkUserdbIntegrity, run as generateDB} from '../_admin/generate_karasdb';
const sql = require('../_common/db/database');

// Setting up databases
let karaDb;
let userDb;

export function buildClausesSeries(filter, type) {
	return deburr(filter)
		.toLowerCase()
		.replace('\'', '')
		.replace(',', '')
		.split(' ')
		.filter(s => !('' === s))
		.map(word => {
			return `s.NORM_name LIKE '%${word}%' OR
			s.NORM_altname LIKE '%${word}%'
			`;
		}
		);
}

export function buildClauses(filter,source) {
	return deburr(filter)
		.toLowerCase()
		.replace('\'', '')
		.replace(',', '')
		.split(' ')
		.filter(s => !('' === s))
		.map(word => {
			let extraClauses = '';
			if (source === 'playlist') extraClauses = `OR pc.NORM_pseudo_add LIKE '%${word}%'`;
			return `ak.NORM_misc LIKE '%${word}%' OR
			ak.NORM_title LIKE '%${word}%' OR
			ak.NORM_author LIKE '%${word}%' OR
			ak.NORM_serie LIKE '%${word}%' OR
			ak.NORM_serie_altname LIKE '%${word}%' OR
			ak.NORM_singer LIKE '%${word}%' OR
			ak.NORM_songwriter LIKE '%${word}%' OR
			ak.NORM_creator LIKE '%${word}%' OR
			ak.language LIKE '%${word}%'
			${extraClauses}`;
		}
		);
}

export function langSelector(lang) {
	const conf = getConfig();
	const userLocale = langs.where('1',lang || conf.EngineDefaultLocale);
	const engineLocale = langs.where('1',conf.EngineDefaultLocale);
	//Fallback to english for cases other than 0 (original name)
	switch(+conf.WebappSongLanguageMode) {
	case 0: return {main: null, fallback: null};
	default:
	case 1: return {main: 'ak.language',fallback: '\'eng\''};
	case 2: return {main: `'${engineLocale['2B']}'`, fallback: '\'eng\''};
	case 3: return {main: `'${userLocale['2B']}'`, fallback: '\'eng\''};
	}
}

async function doTransaction(items, sql) {
	try {
		await getUserDb().run('begin transaction');
		for (const index in items) {
			const stmt = await getUserDb().prepare(sql);
			await stmt.run(items[index]);
		}
		return await getUserDb().run('commit');
	} catch(err) {
		throw err;
	}
}

export async function transaction(items, sql) {
	await promiseRetry((retry) => {
		return doTransaction(items, sql).catch(retry);
	}, {
		retries: 50,
		minTimeout: 100,
		maxTimeout: 200
	}).then(() => {
		return true;
	}).catch((err) => {
		throw err;
	});
}

export function openDatabases(config) {
	const conf = config || getConfig();
	return Promise.all([openKaraDatabase(conf), openUserDatabase(conf)]);
}

async function openKaraDatabase() {
	const conf = getConfig();
	const karaDbFile = resolve(conf.appPath, conf.PathDB, conf.PathDBKarasFile);
	if (!karaDb) {
		logger.debug('[DB] Opening kara database');
		karaDb = await open(karaDbFile, {verbose: true});
	} else {
		throw 'Kara database already opened';
	}
}

async function openUserDatabase() {
	const conf = getConfig();
	const userDbFile = resolve(conf.appPath, conf.PathDB, conf.PathDBUserFile);
	if (!userDb) {
		logger.debug( '[DB] Opening user database');
		userDb = await open(userDbFile, {verbose: true});
		// Trace event.
		if (conf.optSQL) {
			userDb.driver.on('trace', sql => {
				logger.debug(sql.replace('\\t','').replace('\\n',' '));
			});
		}
	} else {
		throw 'User database already opened';
	}
}

async function closeKaraDatabase() {
	if (!karaDb) {
		logger.warn('[DB] Kara database already closed');
	} else {
		try {
			await karaDb.close();
			karaDb = null;
		} catch(err) {
			logger.warn('[DB] Kara database is busy, force closing');
			karaDb = null;
		}
	}
}

export async function closeUserDatabase() {
	if (!userDb) {
		logger.warn('[DB] User database already closed');
	} else {
		try {
			await userDb.close();
			userDb = null;
		} catch(err) {
			logger.warn('[DB] User database is busy, force closing');
			userDb = null;
		}
	}
}

/* Opened DB are exposed to be used by DAO objects. */

export function getKaraDb() {
	return karaDb;
}

export function getUserDb() {
	return userDb;
}

export async function initDBSystem() {
	let doGenerate = false;
	const conf = getConfig();
	const karaDbFile = resolve(conf.appPath, conf.PathDB, conf.PathDBKarasFile);
	const userDbFile = resolve(conf.appPath, conf.PathDB, conf.PathDBUserFile);
	if (!await asyncExists(userDbFile)) setConfig({appFirstRun: 1});
	if (conf.optGenerateDB) {
		// Manual generation triggered.
		// Delete any existing karas.sqlite3 file
		if(await asyncExists(karaDbFile)) {
			if (karaDb) await closeKaraDatabase();
			await asyncUnlink(karaDbFile);
		}
		doGenerate = true;
	} else {
		if (await asyncExists(karaDbFile)) {
			const karaDbFileStats = await asyncStat(karaDbFile);
			if (karaDbFileStats.size === 0) doGenerate = true;
		} else {
			doGenerate = true;
		}
	}
	if (karaDb) await closeKaraDatabase();
	await openKaraDatabase();
	await migrateKaraDb();
	await openUserDatabase();
	await migrateUserDb();
	if (doGenerate) await generateDatabase();
	await closeKaraDatabase();
	await getUserDb().run('ATTACH DATABASE "' + karaDbFile + '" as karasdb;');
	await getUserDb().run('PRAGMA TEMP_STORE=MEMORY');
	await getUserDb().run('PRAGMA JOURNAL_MODE=WAL');
	await getUserDb().run('PRAGMA SYNCHRONOUS=OFF');
	await getUserDb().run('VACUUM');

	await compareDatabasesUUIDs();
	logger.debug( '[DBI] Database Interface is READY');
	const stats = await getStats();
	logger.info(`Karaokes  : ${stats.totalcount}`);
	logger.info(`Duration  : ${duration(stats.totalduration)}`);
	logger.info(`Series    : ${stats.totalseries}`);
	logger.info(`Languages : ${stats.totallanguages}`);
	logger.info(`Artists   : ${stats.totalartists}`);
	logger.info(`Playlists : ${stats.totalplaylists}`);
	return true;
}

async function compareDatabasesUUIDs() {
	const res = await getUserDb().get(sql.compareUUIDs);
	if (res && res.karasdb_uuid !== res.userdb_uuid) {
		//Databases are different, rewriting userdb's UUID with karasdb's UUID and running integrity checks.
		await checkUserdbIntegrity(res.karasdb_uuid);
	}
	return true;
}

async function getSeriesCount() {
	const res = await getUserDb().get(sql.calculateSeriesCount);
	return res.seriescount;
}

async function getPlaylistCount() {
	const res = await getUserDb().get(sql.calculatePlaylistCount);
	return res.plcount;
}

async function getArtistCount() {
	const res = await getUserDb().get(sql.calculateArtistCount);
	return res.artistcount;
}

async function getLanguageCount() {
	const res = await getUserDb().get(sql.calculateLangCount);
	return res.langcount;
}

async function getTotalDuration() {
	const res = await getUserDb().get(sql.calculateDuration);
	return res.totalduration;
}

async function getKaraCount() {
	const res = await getUserDb().get(sql.calculateKaraCount);
	return res.karacount;
}

export async function getStats() {

	const [totalseries, totalcount, totalplaylists, totalartists, totallanguages, totalduration] =
		await Promise.all([
			getSeriesCount(), getKaraCount(), getPlaylistCount(), getArtistCount(), getLanguageCount(), getTotalDuration()
		]);

	return {
		totalseries, totalcount, totalplaylists, totalartists, totallanguages, totalduration
	};
}

async function generateDatabase() {
	const conf = getConfig();

	const failedKaras = await generateDB(conf);
	logger.debug('[DBI] Karaoke database created');
	if (conf.optGenerateDB) {
		if (failedKaras) {
			logger.error('[DBI] Database generation completed with errors!');
			exit(1);
		} else {
			logger.info('[DBI] Database generation completed successfully!');
			exit(0);
		}
	}
	return true;
}

async function migrateUserDb() {
	return await getUserDb().migrate({ migrationsPath: join(__dirname,'../_common/db/migrations/userdata')});
}

async function migrateKaraDb() {
	return await getKaraDb().migrate({ migrationsPath: join(__dirname,'../_common/db/migrations/karasdb')});
}
