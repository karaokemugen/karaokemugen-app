import logger from 'winston/lib/winston';
import {open} from 'sqlite';
import {getConfig} from '../_common/utils/config';
import {join, resolve} from 'path';
import {asyncStat, asyncExists, asyncUnlink} from '../_common/utils/files';
import {retry, each} from 'async';
const DBgenerator = require('../_admin/generate_karasdb.js');
const sql = require('../_common/db/database');

// Setting up moment tools
import moment from 'moment';
require('moment-duration-format');
moment.locale('fr');

// Setting up databases
let karaDb;
let userDb;

export function transaction(items, sql) {
	retry({times: 5, interval: 100}, (callback) => {
		getUserDb().run('begin transaction')
			.then(() => {							
				each(items, (data,callback) => {
					getUserDb().prepare(sql).then((stmt) => {
						stmt.run(data).then(() => {
							callback(); 
						}).catch((err) => {
							callback(err); 
						});										
					});								
				}, (err) => {
					if (err) callback(err);
					getUserDb().run('commit').then(() => {
						callback(); 
					}).catch((err) => {
						callback(err);
					});
				});
			})
			.catch((err) => {
				logger.error('[DBI] Failed to begin transaction : '+err);
				logger.error('[DBI] Transaction will be retried');
				callback(err);
			});
	},(err) => {
		// Retry failed completely after 5 tries
		if (err) throw err;						
		return true;
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
		logger.debug('[DB] Opening user database');
		userDb = await open(userDbFile, {verbose: true});
		// Trace event. DO NOT UNCOMMENT
		// unless you want to flood your console.
		/*
		userDb.driver.on('trace',function(sql){
			console.log(sql);
		});
		*/
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
	return karaDb;	
}

export function getUserDb() {
	return userDb; 	
}

export async function initDBSystem() {
	let doGenerate = false;
	const conf = getConfig();	
	const karaDbFile = resolve(conf.appPath, conf.PathDB, conf.PathDBKarasFile);
	if (conf.optGenerateDB) {
		// Manual generation triggered.
		// Delete any existing karas.sqlite3 file
		if(await asyncExists(karaDbFile)) {
			await closeKaraDatabase();
			await asyncUnlink(karaDbFile);
			doGenerate = true;
		}
	} else {
		const karaDbFileStats = await asyncStat(karaDbFile);
		if (karaDbFileStats.size === 0) doGenerate = true;	
	}
	await closeKaraDatabase();	
	await openKaraDatabase();
	await migrateKaraDb();
	await closeUserDatabase();	
	await openUserDatabase();
	await migrateUserDb();	
	if (doGenerate) await generateDatabase();
	await closeKaraDatabase();	
	await getUserDb().run('ATTACH DATABASE "' + karaDbFile + '" as karasdb;');
	await compareDatabasesUUIDs();
	logger.info('[DBI] Database Interface is READY');
	getStats().then((stats) => {
		logger.info('[DBI] Karaoke count   : ' + stats.totalcount);
		logger.info('[DBI] Total duration  : ' + moment.duration(stats.totalduration, 'seconds').format('D [day(s)], H [hour(s)], m [minute(s)], s [second(s)]'));
		logger.info('[DBI] Total series    : ' + stats.totalseries);
		logger.info('[DBI] Total languages : ' + stats.totallanguages);
		logger.info('[DBI] Total artists   : ' + stats.totalartists);
		logger.info('[DBI] Total playlists : ' + stats.totalplaylists);
	});
	return true;	
}

async function compareDatabasesUUIDs() {
	const res = await getUserDb().get(sql.compareUUIDs);
	if (res && res.karasdb_uuid !== res.userdb_uuid) {
		//Databases are different, rewriting userdb's UUID with karasdb's UUID and running integrity checks.
		await DBgenerator.checkUserdbIntegrity(res.karasdb_uuid);
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

	const failedKaras = await DBgenerator.run(conf);
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
}

async function migrateUserDb() {
	return await getUserDb().migrate({ migrationsPath: join(__dirname,'../_common/db/migrations/userdata')});
}

async function migrateKaraDb() {
	return await getKaraDb().migrate({ migrationsPath: join(__dirname,'../_common/db/migrations/karasdb')});
}
