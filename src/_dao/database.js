import logger from 'winston/lib/winston';
import {open} from 'sqlite';
import {getConfig} from '../_common/utils/config';
import {join, resolve} from 'path';
import {asyncExists, asyncUnlink} from '../_common/utils/files';
import DBgenerator from '../_admin/generate_karasdb.js';
const sqlDB = require('../_common/db/database');

// Setting up moment tools
import moment from 'moment';
require('moment-duration-format');
moment.locale('fr');

// Setting up databases
let karaDb;
let userDb;

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
		logger.debug('[DB] Opening user database');
		userDb = await open(userDbFile, {verbose: true});
		// Trace event. DO NOT UNCOMMENT
		// unless you want to flood your console.
		//userDb.driver.on('trace',function(sql){
		//	console.log(sql);
		//});*/
	} else {
		throw 'User database already opened';
	}
}

export function closeDatabases() {
	return Promise.all([closeKaraDatabase(), closeUserDatabase()]);
}

async function closeKaraDatabase() {
	if (!karaDb) {
		logger.warn('[DB] Kara database already closed');
	} else {
		await karaDb.close();
		karaDb = null;
	}
}

async function closeUserDatabase() {
	if (!userDb) {
		logger.warn('[DB] User database already closed');
	} else {
		await userDb.close();
		userDb = null;
	}
}

/* Opened DB are exposed to be used by DAO objects. */

export function getKaraDb() {
	if (karaDb) return karaDb;
	openKaraDatabase().then(() => { 
		return karaDb; 
	});
}

export function getUserDb() {
	if (userDb) return userDb;
	openUserDatabase().then(() => { 
		return userDb; 
	});
}

export async function initDBSystem() {
	const conf = getConfig();	
	const karaDbFile = resolve(conf.appPath, conf.PathDB, conf.PathDBKarasFile);
	await migrateUserDb();
	await closeUserDatabase();
	var doGenerate = false;
	if (conf.optGenerateDB) {
		// Manual generation triggered.
		// Delete any existing karas.sqlite3 file
		if(await asyncExists(karaDbFile)) await asyncUnlink(karaDbFile);
	}
	if (!await asyncExists(karaDbFile)) doGenerate = true;
	await migrateKaraDb();
	await closeKaraDatabase();
	if (doGenerate) await generateDatabase();
	await openUserDatabase();
	await getUserDb().run('ATTACH DATABASE "' + karaDbFile + '" as karasdb;');
	await compareDatabasesUUIDs();
	logger.info('[DBI] Database Interface is READY');
	return await getStats();	
}

async function compareDatabasesUUIDs() {
	getUserDb().get(sqlDB.compareUUIDs).then((res) => {
		if (res == undefined) res = '';
		if (res.karasdb_uuid != res.userdb_uuid) {
		//Databases are different, rewriting userdb's UUID with karasdb's UUID and running integrity checks.
			DBgenerator.checkUserdbIntegrity(res.karasdb_uuid).then(() => {
				return true;
			})
				.catch((err) => {
					logger.error(`[DBI] Integrity check failed : ${err}`);
					throw err;
				});
		}						
		return true;
	})
		.catch((err) => {
			logger.error('[DBI] Unable to compare database UUIDs : '+err);
			throw err;
		});
}

export async function getStats() {
	let stats = {};
	var pGetSeriesCount = new Promise((resolve) => {
		getUserDb().get(sqlDB.calculateSeriesCount)
			.then((res) => {
				stats.totalseries = res.seriescount;
				resolve();
			});
	});
	var pGetPlaylistCount = new Promise((resolve) => {
		getUserDb().get(sqlDB.calculatePlaylistCount)
			.then((res) => {
				stats.totalplaylists = res.plcount;
				resolve();
			});
	});
	var pGetArtistCount = new Promise((resolve) => {
		getUserDb().get(sqlDB.calculateArtistCount)
			.then((res) => {
				stats.totalartists = res.artistcount;
				resolve();
			});
	});
	var pGetKaraCount = new Promise((resolve) => {
		getUserDb().get(sqlDB.calculateKaraCount)
			.then((res) => {
				stats.totalcount = res.karacount;
				resolve();
			});
	});
	var pGetLanguageCount = new Promise((resolve) => {
		getUserDb().get(sqlDB.calculateLangCount)
			.then((res) => {
				stats.totallanguages = res.langcount;
				resolve();
			});
	});
	var pGetDuration = new Promise((resolve) => {
		getUserDb().get(sqlDB.calculateDuration)
			.then((res) => {
				stats.totalduration = res.totalduration;							
				resolve();
			});
	});
	Promise.all([
		pGetKaraCount,
		pGetDuration,
		pGetSeriesCount,
		pGetLanguageCount,
		pGetArtistCount,
		pGetPlaylistCount
	]).then(() => {
		logger.info('[DBI] Karaoke count   : ' + stats.totalcount);					logger.info('[DBI] Total duration  : ' + moment.duration(stats.totalduration, 'seconds').format('D [day(s)], H [hour(s)], m [minute(s)], s [second(s)]'));
		logger.info('[DBI] Total series    : ' + stats.totalseries);
		logger.info('[DBI] Total languages : ' + stats.totallanguages);
		logger.info('[DBI] Total artists   : ' + stats.totalartists);
		logger.info('[DBI] Total playlists : ' + stats.totalplaylists);
	}).catch(() => {
		throw 'Stats general error';
	});
}

async function generateDatabase() {
	const conf = getConfig();
	DBgenerator.SYSPATH = conf.appPath;
	DBgenerator.SETTINGS = conf;
	DBgenerator.onLog = (type,message) => {
		logger.info('[DBI] [Gen]',message);
	};
	try {
		const failedKaras = await DBgenerator.run();
		logger.info('[DBI] Karaokes database created');
		if (conf.optGenerateDB) {
			if (failedKaras) {
				logger.info('[DBI] Database generation completed with errors!');
				process.exit(1);
			} else {
				logger.info('[DBI] Database generation completed successfully!');
				process.exit(0);
			}
		}
		return true;
	} catch (err) {
		logger.error(`[DBI] Database generation failed : ${err}`);
		throw err;
	}
}

async function migrateUserDb() {
	try {
		await userDb.migrate({ migrationsPath: join(__dirname,'../_common/db/migrations/userdata')});
		return true;	
	} catch (err) {
		logger.error(`[DBI] Failed to migrate user database : ${err}`);
		throw err;
	}
}

async function migrateKaraDb() {
	try {
		await karaDb.migrate({ migrationsPath: join(__dirname,'../_common/db/migrations/karasdb')});
		return true;	
	} catch (err) {
		logger.error(`[DBI] Failed to migrate karaokes database : ${err}`);
		throw err;
	}
}