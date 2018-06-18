import logger from 'winston';
import uuidV4 from 'uuid/v4';
import {resolve} from 'path';
import deburr from 'lodash.deburr';
import isEmpty from 'lodash.isempty';
import {open} from 'sqlite';
import {has as hasLang} from 'langs';
import {asyncReadFile, asyncCopy, asyncExists, asyncMkdirp, asyncReadDir, asyncRemove} from '../_common/utils/files';
import {getConfig, resolvedPathKaras} from '../_common/utils/config';
import {getDataFromKaraFile, writeKara} from '../_dao/karafile';
import {
	insertKaras, insertKaraSeries, insertKaraTags, insertSeries, insertTags, inserti18nSeries, selectBlacklistKaras, selectBLCKaras,
	selectBLCTags, selectKaras, selectPlaylistKaras,
	selectTags, selectViewcountKaras, selectRequestKaras,
	selectWhitelistKaras,
	updateSeriesAltNames
} from '../_common/db/generation';
import {karaTypesMap} from '../_services/constants';
import {serieRequired, verifyKaraData} from '../_services/kara';
import {join} from 'path';
import parallel from 'async-await-parallel';
import testJSON from 'is-valid-json';
import {emit} from '../_common/utils/pubsub';

let error = false;

async function emptyDatabase(db) {
	await db.run('DELETE FROM kara_tag;');
	await db.run('DELETE FROM kara_serie;');
	await db.run('DELETE FROM tag;');
	await db.run('DELETE FROM serie;');
	await db.run('DELETE FROM kara;');
	await db.run('DELETE FROM sqlite_sequence;');
	await db.run('VACUUM;');
}

async function backupDir(directory) {
	const backupDir = directory + '_backup';
	if (await asyncExists(backupDir)) {
		logger.debug('[Gen] Removing backup dir ' + backupDir);
		await asyncRemove(backupDir);
	}
	logger.debug('[Gen] Creating backup dir ' + backupDir);
	await asyncMkdirp(backupDir);
	await asyncCopy(
		directory,
		backupDir,
		{
			overwrite: true,
			preserveTimestamps: true
		}
	);
}

export async function backupKaraDirs(config) {
	const backupPromises = [];
	for (const pathKara of config.PathKaras.split('|')) {
		const resolvedPath = resolve(config.appPath, pathKara);
		backupPromises.push(backupDir(resolvedPath));
	}
	await Promise.all(backupPromises);
}

export async function deleteBackupDirs(config) {
	const deletePromises = [];
	for (const pathKara of config.PathKaras.split('|')) {
		const pathBackup = pathKara + '_backup';
		if (await asyncExists(pathBackup)) {
			deletePromises.push(asyncRemove(pathBackup));
		}
	}
	await Promise.all(deletePromises);
}

async function extractKaraFiles(karaDir) {
	const karaFiles = [];
	const dirListing = await asyncReadDir(karaDir);
	for (const file of dirListing) {
		if (file.endsWith('.kara') && !file.startsWith('.')) {
			karaFiles.push(resolve(karaDir, file));
		}
	}
	return karaFiles;
}

export async function extractAllKaraFiles() {
	let karaFiles = [];
	for (const resolvedPath of resolvedPathKaras()) {
		karaFiles = karaFiles.concat(await extractKaraFiles(resolvedPath));
	}
	return karaFiles;
}

export async function getAllKaras(karafiles) {
	const karaPromises = [];	
	for (const karafile of karafiles) {
		karaPromises.push(() => readAndCompleteKarafile(karafile));
	}
	const karas = await parallel(karaPromises, 16);
	// Errors are non-blocking
	if (karas.some((kara) => {
		return kara.error;
	})) error = true;
	return karas;
}

async function readAndCompleteKarafile(karafile) {
	const karaData = await getDataFromKaraFile(karafile);
	try {
		verifyKaraData(karaData);
	} catch (err) {
		logger.warn(`[Gen] Kara file ${karafile} is invalid/incomplete : ${err}`);
		error = true;
		return karaData;
	}	
	await writeKara(karafile, karaData);
	return karaData;
}

function prepareKaraInsertData(kara, index) {
	return {
		$id_kara: index,
		$kara_KID: kara.KID,
		$kara_title: kara.title,
		$titlenorm: deburr(kara.title).replace('\'', '').replace(',', ''),
		$kara_year: kara.year,
		$kara_songorder: kara.order,
		$kara_mediafile: kara.mediafile,
		$kara_subfile: kara.subfile,
		$kara_dateadded: kara.dateadded,
		$kara_datemodif: kara.datemodif,		
		$kara_gain: kara.mediagain,
		$kara_duration: kara.mediaduration		
	};
}

function prepareAllKarasInsertData(karas) {
	// Remember JS indexes start at 0.
	return karas.map((kara, index) => prepareKaraInsertData(kara, index + 1));
}

function getSeries(kara) {
	const series = new Set();

	// Extracted series names from kara files
	if (kara.series && kara.series.trim()) {
		kara.series.split(',').forEach(serie => {
			if (serie.trim()) {
				series.add(serie.trim());
			}
		});
	}

	// At least one series is mandatory if kara is not LIVE/MV type
	if (serieRequired(kara.type) && isEmpty(series)) {
		logger.error(`Karaoke series cannot be detected! (${JSON.stringify(kara)})`);
		error = true;
	}

	return series;
}

/**
 * Returns a Map<String, Array>, linking a series to the karaoke indexes involved.
 */
function getAllSeries(karas) {
	const map = new Map();
	karas.forEach((kara, index) => {
		const karaIndex = index + 1;
		getSeries(kara).forEach(serie => {
			if (map.has(serie)) {
				map.get(serie).push(karaIndex);
			} else {
				map.set(serie, [karaIndex]);
			}
		});
	});

	return map;
}

function prepareSerieInsertData(serie, index) {
	return {
		$id_serie: index,
		$serie: serie		
	};
}

function prepareAllSeriesInsertData(mapSeries) {
	const data = [];
	let index = 1;
	for (const serie of mapSeries.keys()) {
		data.push(prepareSerieInsertData(serie, index));
		index++;
	}
	return data;
}

/**
 * Warning : we iterate on keys and not on map entries to get the right order and thus the same indexes as the function prepareAllSeriesInsertData. This is the historical way of doing it and should be improved sometimes.tre améliorée.
 */
function prepareAllKarasSeriesInsertData(mapSeries) {
	const data = [];
	let index = 1;
	for (const serie of mapSeries.keys()) {
		mapSeries.get(serie).forEach(karaIndex => {
			data.push({
				$id_serie: index,
				$id_kara: karaIndex
			});
		});
		index++;
	}

	return data;
}

async function prepareAltSeriesInsertData(altSeriesFile, mapSeries) {

	const altNameData = [];
	const i18nData = [];
	if (await asyncExists(altSeriesFile)) {
		let altNamesFile = await asyncReadFile(altSeriesFile, 'utf-8');
		if (testJSON(altNamesFile)) {
			altNamesFile = JSON.parse(altNamesFile);
			for (const serie of altNamesFile.series) {
				if (serie.aliases) altNameData.push({
					$serie_altnames: serie.aliases.join(','),
					$serie_altnamesnorm: deburr(serie.aliases.join(' ')).replace('\'', '').replace(',', ''),
					$serie_name: serie.name				
				});
				if (serie.i18n) {
					for (const lang of Object.keys(serie.i18n)) {
						i18nData.push({
							$lang: lang,
							$serie: serie.i18n[lang],
							$serienorm: deburr(serie.i18n[lang]),
							$name: serie.name						
						});
					}
				}
			}
			// Checking if some series present in .kara files are not present in the series file
			for (const serie of mapSeries.keys()) {			
				if (!altNamesFile.series.find(s => {
					return s.name === serie;
				})) {
					// Print a warning and push some basic data so the series can be searchable at least
					logger.warn(`[Gen] Series ${serie} is not in the series file`);
					if (getConfig().optStrict) strictModeError(serie);
					altNameData.push({
						$serie_name: serie
					});
					i18nData.push({
						$lang: 'jpn',
						$serie: serie,
						$serienorm: deburr(serie).replace('\'', '').replace(',', ''),
						$name: serie
					});
				}
			}
		} else {
			logger.error('[Gen] Alternative series names file contains errors!');
			error = true;	
		}
	} else {
		logger.error('[Gen] No alternative series names file found!');
		error = true;
	}

	return {
		altNameData: altNameData,
		i18nData: i18nData
	};
}

function getAllKaraTags(karas) {

	const allTags = [];

	const tagsByKara = new Map();

	karas.forEach((kara, index) => {
		const karaIndex = index + 1;
		tagsByKara.set(karaIndex, getKaraTags(kara, allTags));
	});

	return {
		tagsByKara: tagsByKara,
		allTags: allTags
	};
}

function getKaraTags(kara, allTags) {

	const result = new Set();

	if (kara.singer) {
		kara.singer.split(',').forEach(singer => result.add(getTagId(singer.trim() + ',2', allTags)));
	}

	if (kara.author) {
		kara.author.split(',').forEach(author => result.add(getTagId(author.trim() + ',6', allTags)));
	}

	if (kara.tags) {
		kara.tags.split(',').forEach(tag => result.add(getTagId(tag.trim() + ',7', allTags)));
	}

	if (kara.creator) {
		kara.creator.split(',').forEach(creator => result.add(getTagId(creator.trim() + ',4', allTags)));
	}

	if (kara.songwriter) {
		kara.songwriter.split(',').forEach(songwriter => result.add(getTagId(songwriter.trim() + ',8', allTags)));
	}

	if (kara.lang) {
		kara.lang.split(',').forEach(lang => {
			if (lang === 'und' || lang === 'mul' || hasLang('2B', lang)) {
				result.add(getTagId(lang.trim() + ',5', allTags));
			}
		});
	}

	getTypes(kara, allTags).forEach(type => result.add(type));

	return result;
}

function getTypes(kara, allTags) {
	const result = new Set();

	karaTypesMap.forEach((value, key) => {
		// Adding spaces since some keys are included in others.
		// For example MV and AMV.
		if (` ${kara.type} `.includes(` ${key} `)) {
			result.add(getTagId(value, allTags));
		}
	});

	if (result.size === 0) {
		logger.warn('[Gen] Karaoke type cannot be detected : ' + kara.type + ' in kara : ' + JSON.stringify(kara));
		error = true;		
	}

	return result;
}

function strictModeError(series) {	
	logger.error(`[Gen] STRICT MODE ERROR : One series ${series} does not exist in the series file`);
	error = true;
}

function getTagId(tagName, tags) {

	const index = tags.indexOf(tagName) + 1;

	if (index > 0) {
		return index;
	}

	tags.push(tagName);
	return tags.length;
}

function prepareAllTagsInsertData(allTags) {
	const data = [];
	const translations = require(join(__dirname,'../_common/locales'));
	
	allTags.forEach((tag, index) => {
		const tagParts = tag.split(',');
		const tagName = tagParts[0];
		const tagType = tagParts[1];
		let tagNorm;
		if (+tagType === 7) {
			const tagTranslations = [];
			for (const [key, value] of Object.entries(translations)) {				
				// Key is the language, value is a i18n text
				if (value[tagName]) tagTranslations.push(value[tagName]);
			}			
			tagNorm = tagTranslations.join(' ');			
		} else {
			tagNorm = tagName;
		}		
		data.push({
			$id_tag: index + 1,
			$tagtype: tagType,
			$tagname: tagName,
			$tagnamenorm: deburr(tagNorm).replace('\'', '').replace(',', '')
		});
	});

	return data;
}

function prepareTagsKaraInsertData(tagsByKara) {
	const data = [];

	tagsByKara.forEach((tags, karaIndex) => {
		tags.forEach(tagId => {
			data.push({
				$id_tag: tagId,
				$id_kara: karaIndex
			});
		});
	});

	return data;
}

async function runSqlStatementOnData(stmtPromise, data) {
	const stmt = await stmtPromise;
	const sqlPromises = data.map(sqlData => stmt.run(sqlData));
	await Promise.all(sqlPromises);
	await stmt.finalize();
}


export async function run(config) {
	try {
		emit('databaseBusy',true);
		const conf = config || getConfig();

		const karas_dbfile = resolve(conf.appPath, conf.PathDB, conf.PathDBKarasFile);
		const series_altnamesfile = resolve(conf.appPath, conf.PathAltname);

		logger.info('[Gen] Starting database generation');
		logger.info('[Gen] GENERATING DATABASE CAN TAKE A WHILE, PLEASE WAIT.');
		const db = await open(karas_dbfile, {verbose: true, Promise});
		await emptyDatabase(db);
		//await backupKaraDirs(conf);
		const karaFiles = await extractAllKaraFiles();
		const karas = await getAllKaras(karaFiles);
		// Can be done in background
		//deleteBackupDirs(conf);		
		// Preparing data to insert
		const sqlInsertKaras = prepareAllKarasInsertData(karas);
		const seriesMap = getAllSeries(karas);
		const sqlInsertSeries = prepareAllSeriesInsertData(seriesMap);
		const sqlInsertKarasSeries = prepareAllKarasSeriesInsertData(seriesMap);
		const tags = getAllKaraTags(karas);
		const sqlInsertTags = prepareAllTagsInsertData(tags.allTags);
		const sqlInsertKarasTags = prepareTagsKaraInsertData(tags.tagsByKara);
		const seriesAltNamesData = await prepareAltSeriesInsertData(series_altnamesfile, seriesMap);
		const sqlUpdateSeriesAltNames = seriesAltNamesData.altNameData;
		const sqlInserti18nSeries = seriesAltNamesData.i18nData;
		
		// Inserting data in a transaction

		await db.run('begin transaction');
		await Promise.all([
			runSqlStatementOnData(db.prepare(insertKaras), sqlInsertKaras),
			runSqlStatementOnData(db.prepare(insertSeries), sqlInsertSeries),
			runSqlStatementOnData(db.prepare(insertTags), sqlInsertTags),
			runSqlStatementOnData(db.prepare(insertKaraTags), sqlInsertKarasTags),
			runSqlStatementOnData(db.prepare(insertKaraSeries), sqlInsertKarasSeries)
		]);
		await Promise.all([
			runSqlStatementOnData(db.prepare(inserti18nSeries), sqlInserti18nSeries),
			runSqlStatementOnData(db.prepare(updateSeriesAltNames), sqlUpdateSeriesAltNames)
		]);		
		
		await db.run('commit');		
		await db.close();
		await checkUserdbIntegrity(null, conf);		
		return error;
	} catch (err) {
		logger.error(err);
		return error;
	} finally {
		emit('databaseBusy',false);
	}
}


/**
 * @function run_userdb_integrity_checks
 * Get all karas from all_karas view
 * Get all karas in playlist_content, blacklist, viewcount, whitelist
 * Parse karas in playlist_content, search for the KIDs in all_karas
 * If id_kara is different, write a UPDATE query.
 */
export async function checkUserdbIntegrity(uuid, config) {

	const conf = config || getConfig();

	if (!uuid) uuid = uuidV4();
	const karas_dbfile = resolve(conf.appPath, conf.PathDB, conf.PathDBKarasFile);
	const karas_userdbfile = resolve(conf.appPath, conf.PathDB, conf.PathDBUserFile);
	logger.info('[Gen] Running user database integrity checks');

	const [db, userdb] = await Promise.all([
		open(karas_dbfile, {Promise}),
		open(karas_userdbfile, {Promise})
	]);
	
	const [
		allTags,
		allKaras,
		blcTags,
		whitelistKaras,
		blacklistCriteriaKaras,
		blacklistKaras,
		viewcountKaras,
		requestKaras,
		playlistKaras
	] = await Promise.all([
		db.all(selectTags),
		db.all(selectKaras),
		userdb.all(selectBLCTags),
		userdb.all(selectWhitelistKaras),
		userdb.all(selectBLCKaras),
		userdb.all(selectBlacklistKaras),
		userdb.all(selectViewcountKaras),
		userdb.all(selectRequestKaras),
		userdb.all(selectPlaylistKaras)
	]);

	await userdb.run('BEGIN TRANSACTION');
	await userdb.run('PRAGMA foreign_keys = OFF;');

	// Listing existing KIDs	
	const karaKIDs = allKaras.map(k => '\'' + k.kid + '\'').join(',');

	// Deleting records which aren't in our KID list
	await Promise.all([
		userdb.run(`DELETE FROM whitelist WHERE kid NOT IN (${karaKIDs});`),
		userdb.run(`DELETE FROM blacklist_criteria WHERE uniquevalue NOT IN (${karaKIDs});`),
		userdb.run(`DELETE FROM blacklist WHERE kid NOT IN (${karaKIDs});`),
		userdb.run(`DELETE FROM viewcount WHERE kid NOT IN (${karaKIDs});`),
		userdb.run(`DELETE FROM request WHERE kid NOT IN (${karaKIDs});`),
		userdb.run(`DELETE FROM playlist_content WHERE kid NOT IN (${karaKIDs});`)
	]);
	const karaIdByKid = new Map();
	allKaras.forEach(k => karaIdByKid.set(k.kid, k.id_kara));
	let sql = '';

	whitelistKaras.forEach(wlk => {
		if (karaIdByKid.has(wlk.kid) && karaIdByKid.get(wlk.kid) !== wlk.id_kara) {
			sql += `UPDATE whitelist SET fk_id_kara = ${karaIdByKid.get(wlk.kid)} WHERE kid = '${wlk.kid}';`;
		}
	});
	blacklistCriteriaKaras.forEach(blck => {
		if (karaIdByKid.has(blck.kid) && karaIdByKid.get(blck.kid) !== blck.id_kara) {
			sql += `UPDATE blacklist_criteria SET value = ${karaIdByKid.get(blck.kid)} WHERE uniquevalue = '${blck.kid}';`;
		}
	});
	blacklistKaras.forEach(blk => {
		if (karaIdByKid.has(blk.kid) && karaIdByKid.get(blk.kid) !== blk.id_kara) {
			sql += `UPDATE blacklist SET fk_id_kara = ${karaIdByKid.get(blk.kid)} WHERE kid = '${blk.kid}';`;
		}
	});
	viewcountKaras.forEach(vck => {
		if (karaIdByKid.has(vck.kid) && karaIdByKid.get(vck.kid) !== vck.id_kara) {
			sql += `UPDATE viewcount SET fk_id_kara = ${karaIdByKid.get(vck.kid)} WHERE kid = '${vck.kid}';`;
		}
	});
	requestKaras.forEach(rqk => {
		if (karaIdByKid.has(rqk.kid) && karaIdByKid.get(rqk.kid) !== rqk.id_kara) {
			sql += `UPDATE request SET fk_id_kara = ${karaIdByKid.get(rqk.kid)} WHERE kid = '${rqk.kid}';`;
		}
	});
	playlistKaras.forEach(plck => {
		if (karaIdByKid.has(plck.kid) && karaIdByKid.get(plck.kid) !== plck.id_kara) {
			sql += `UPDATE playlist_content SET fk_id_kara = ${karaIdByKid.get(plck.kid)} WHERE kid = '${plck.kid}';`;
		}
	});
	
	blcTags.forEach(function (blcTag) {
		let tagFound = false;
		allTags.forEach(function (tag) {
			if (tag.name === blcTag.tagname && tag.tagtype === blcTag.type) {
				// Found a matching Tagname, checking if id_tags are the same
				if (tag.id_tag !== blcTag.id_tag) {
					sql += `UPDATE blacklist_criteria SET value = ${tag.id_tag}
						WHERE uniquevalue = '${blcTag.tagname}' AND type = ${blcTag.type};`;
				}
				tagFound = true;
			}
		});
		//If No Tag with this name and type was found in the AllTags table, delete the Tag
		if (!tagFound) {
			sql += `DELETE FROM blacklist_criteria WHERE uniquevalue = '${blcTag.tagname}' AND type = ${blcTag.type};`;
			logger.warn(`[Gen] Deleted Tag ${blcTag.tagname} from blacklist criteria (type ${blcTag.type})`);
		}
	});

	if (sql) {
		logger.debug('[Gen] UPDATE SQL : ' + sql);
		await userdb.exec(sql);
	}

	const sqlDB = require('../_common/db/database.js');

	await Promise.all([
		userdb.run(sqlDB.updateUUID, { $uuid: uuid }),
		db.run(sqlDB.updateUUID, { $uuid: uuid })
	]);

	await userdb.run('PRAGMA foreign_keys = ON;');
	await userdb.run('COMMIT');

	logger.info('[Gen] Integrity checks complete, database generated');	
}
