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
import {compareKarasChecksum, checkUserdbIntegrity, run as generateDB} from '../_admin/generate_karasdb';
const sql = require('../_common/db/database');

// Setting up databases
let karaDb;
let userDb;

export function paramWords(filter) {
	let params = {};
	const words = deburr(filter)
		.toLowerCase()
		.replace('\'', '')
		.replace(',', '')
		.split(' ')
		.filter(s => !('' === s))
		.map(word => {
			return `%${word}%`;
		});
	for (const i in words) {
		params[`$word${i}`] = `%${words[i]}%`;
	}
	return params;
}

export function buildClauses(words,source) {
	const params = paramWords(words);
	let sql = [];
	let extraClauses = '';
	for (const i in words.split(' ').filter(s => !('' === s))) {
		if (source === 'playlist') extraClauses = `OR pc.NORM_pseudo_add LIKE $word${i}`;
		sql.push(`ak.NORM_misc LIKE $word${i} OR
		ak.NORM_title LIKE $word${i} OR
		ak.NORM_author LIKE $word${i} OR
		ak.NORM_serie LIKE $word${i} OR
		ak.NORM_serie_i18n LIKE $word${i} OR
		ak.NORM_serie_altname LIKE $word${i} OR
		ak.NORM_singer LIKE $word${i} OR
		ak.NORM_songwriter LIKE $word${i} OR
		ak.NORM_creator LIKE $word${i} OR
		NORM_serie_orig LIKE $word${i} OR
		ak.language LIKE $word${i}
		${extraClauses}`);
	}
	return {
		sql: sql,
		params: params
	};
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
		userDb = await open(userDbFile, {verbose: true, cached: true});
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
	let doGenerate;
	const conf = getConfig();
	const karaDbFile = resolve(conf.appPath, conf.PathDB, conf.PathDBKarasFile);
	const userDbFile = resolve(conf.appPath, conf.PathDB, conf.PathDBUserFile);
	//If userdata is missing, assume it's the first time we're running.
	if (!await asyncExists(userDbFile)) setConfig({appFirstRun: 1});
	if (conf.optGenerateDB) {
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
	// Compare Karas checksums if generation hasn't been requested already
	logger.info('[DB] Checking kara files...');
	if (!await compareKarasChecksum()) {
		logger.info('[DB] Kara files have changed: database generation triggered');
		doGenerate = true;
	}
	if (doGenerate) await generateDatabase();
	await closeKaraDatabase();
	await Promise.all([
		getUserDb().run(`ATTACH DATABASE "${karaDbFile}" AS karasdb;`),
		getUserDb().run('PRAGMA TEMP_STORE=MEMORY'),
		getUserDb().run('PRAGMA JOURNAL_MODE=WAL'),
		getUserDb().run('PRAGMA SYNCHRONOUS=OFF')
	]);
	await getUserDb().run('VACUUM');
	await compareDatabasesUUIDs();
	logger.debug( '[DB] Database Interface is READY');
	const stats = await getStats();
	logger.info(`Songs        : ${stats.karas} (${duration(stats.duration)})`);
	logger.info(`Series       : ${stats.series}`);
	logger.info(`Languages    : ${stats.languages}`);
	logger.info(`Artists      : ${stats.singers} singers, ${stats.songwriters} songwriters, ${stats.creators} creators`);
	logger.info(`Kara Authors : ${stats.authors}`);
	logger.info(`Playlists    : ${stats.playlists}`);
	logger.info(`Songs played : ${stats.played}`);
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

export async function getStats() {
	return await getUserDb().get(sql.getStats);
}

async function generateDatabase() {
	const conf = getConfig();
	try {
		await generateDB(conf);
		logger.info('[DB] Database generation completed successfully!');
		if (conf.optGenerateDB) exit(0);
	} catch(err) {
		logger.error('[DB] Database generation completed with errors!');
		if (conf.optGenerateDB) exit(1);
	}
	return true;
}

async function migrateUserDb() {
	return await getUserDb().migrate({ migrationsPath: join(__dirname,'../_common/db/migrations/userdata')});
}

async function migrateKaraDb() {
	return await getKaraDb().migrate({ migrationsPath: join(__dirname,'../_common/db/migrations/karasdb')});
}

export function buildTypeClauses(mode, value) {
	if (mode === 'year') return ` AND year = ${value}`;
	if (mode === 'tag') return ` AND kara_id IN (SELECT fk_id_kara FROM kara_tag WHERE fk_id_tag = ${value})`;
	if (mode === 'serie') return ` AND kara_id IN (SELECT fk_id_kara FROM kara_serie WHERE fk_id_serie = ${value})`;
	return '';
}