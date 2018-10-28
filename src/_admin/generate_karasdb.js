import logger from 'winston';
import uuidV4 from 'uuid/v4';
import {basename, join, resolve} from 'path';
import deburr from 'lodash.deburr';
import {profile} from '../_common/utils/logger';
import {open} from 'sqlite';
import {has as hasLang} from 'langs';
import {asyncReadFile, checksum, asyncCopy, asyncReadDir} from '../_common/utils/files';
import {getConfig, resolvedPathSeries, resolvedPathKaras, setConfig} from '../_common/utils/config';
import {getDataFromKaraFile, writeKara} from '../_dao/karafile';
import {
	insertKaras, insertKaraSeries, insertKaraTags, insertSeries, insertTags, inserti18nSeries, selectBlacklistKaras, selectBLCKaras,
	selectBLCTags, selectKaras, selectPlaylistKaras,
	selectTags, selectViewcountKaras, selectRequestKaras,
	selectWhitelistKaras,
	updateSeriesAltNames
} from '../_common/db/generation';
import {tags as karaTags, karaTypesMap} from '../_services/constants';
import {serieRequired, verifyKaraData} from '../_services/kara';
import parallel from 'async-await-parallel';
import {emit} from '../_common/utils/pubsub';
import {findSeries, getDataFromSeriesFile} from '../_dao/seriesfile';
import {updateUUID} from '../_common/db/database.js';
import cliProgress from 'cli-progress';
import {emitWS} from '../_webapp/frontend';


let error = false;
let generating = false;
let bar = {};

function initBar(options, preset, total, start) {
	bar = new cliProgress.Bar(options, preset);
	bar.start(total, start);
	emitWS('generationProgress', {
		value: start,
		total: total,
		text: options.format.substr(0, options.format.indexOf('{'))
	});
};

function stopBar() {
	bar.stop();
	emitWS('generationProgress', {
		value: 100,
		total: 100
	});
};

function incrBar() {
	bar.increment();
	emitWS('generationProgress', {
		value: bar.value,
		total: bar.total
	});
};

async function emptyDatabase(db) {
	await db.run('DELETE FROM kara_tag;');
	incrBar();
	await db.run('DELETE FROM kara_serie;');
	incrBar();
	await db.run('DELETE FROM tag;');
	incrBar();
	await db.run('DELETE FROM serie;');
	incrBar();
	await db.run('DELETE FROM serie_lang;');
	incrBar();
	await db.run('DELETE FROM kara;');
	incrBar();
	await db.run('DELETE FROM sqlite_sequence;');
	incrBar();
	await db.run('VACUUM;');
	incrBar();
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

async function extractSeriesFiles(seriesDir) {
	const seriesFiles = [];
	const dirListing = await asyncReadDir(seriesDir);
	for (const file of dirListing) {
		if (file.endsWith('.series.json') && !file.startsWith('.')) {
			seriesFiles.push(resolve(seriesDir, file));
		}
	}
	return seriesFiles;
}

export async function extractAllKaraFiles() {
	let karaFiles = [];
	for (const resolvedPath of resolvedPathKaras()) {
		karaFiles = karaFiles.concat(await extractKaraFiles(resolvedPath));
	}
	return karaFiles;
}

export async function extractAllSeriesFiles() {
	let seriesFiles = [];
	for (const resolvedPath of resolvedPathSeries()) {
		seriesFiles = seriesFiles.concat(await extractSeriesFiles(resolvedPath));
	}
	return seriesFiles;
}

export async function readAllSeries(seriesFiles) {
	const seriesPromises = [];
	for (const seriesFile of seriesFiles) {
		seriesPromises.push(() => processSerieFile(seriesFile));
	}
	return await parallel(seriesPromises, 16);
}

async function processSerieFile(seriesFile) {
	const data = await getDataFromSeriesFile(seriesFile);
	incrBar();
	return data;
}

export async function readAllKaras(karafiles) {
	const karaPromises = [];
	for (const karafile of karafiles) {
		karaPromises.push(() => readAndCompleteKarafile(karafile));
	}
	const karas = await parallel(karaPromises, 16);
	// Errors are non-blocking
	if (karas.some((kara) => {
		return kara.error;
	})) error = true;

	return karas.filter(kara => !kara.error);
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
	incrBar();
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
		$kara_mediasize: kara.mediasize,
		$kara_subfile: kara.subfile,
		$kara_dateadded: kara.dateadded,
		$kara_datemodif: kara.datemodif,
		$kara_gain: kara.mediagain,
		$kara_duration: kara.mediaduration,
		$kara_karafile: basename(kara.karafile)
	};
}

function prepareAllKarasInsertData(karas) {
	// Remember JS indexes start at 0.
	return karas.map((kara, index) => prepareKaraInsertData(kara, index + 1));
}

function checkDuplicateKIDs(karas) {
	let searchKaras = [];
	let errors = [];
	for (const kara of karas) {
		// Find out if our kara exists in our list, if not push it.
		const search = searchKaras.find(k => {
			return k.KID === kara.KID;
		});
		if (search) {
			// One KID is duplicated, we're going to throw an error.
			errors.push({
				KID: kara.KID,
				kara1: kara.karafile,
				kara2: search.karafile
			});
		}
		searchKaras.push({ KID: kara.KID, karafile: kara.karafile });
	}
	if (errors.length > 0) throw `One or several KIDs are duplicated in your database : ${JSON.stringify(errors,null,2)}. Please fix this by removing the duplicated karaoke(s) and retry generating your database.`;
}

function checkDuplicateSeries(series) {
	let searchSeries = [];
	let errors = [];
	for (const serie of series) {
		// Find out if our series exists in our list, if not push it.
		const search = searchSeries.find(s => {
			return s.name === serie.name;
		});
		if (search) {
			// One KID is duplicated, we're going to throw an error.
			errors.push({
				name: serie.name
			});
		}
		searchSeries.push({ name: serie.name });
	}
	if (errors.length > 0) throw `One or several series are duplicated in your database : ${JSON.stringify(errors,null,2)}. Please fix this by removing the duplicated series file(s) and retry generating your database.`;
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
	if (serieRequired(kara.type) && !series) {
		logger.error(`Karaoke series cannot be detected! (${JSON.stringify(kara)})`);
		error = true;
	}

	return series;
}

/**
 * Returns a Map<String, Array>, linking a series to the karaoke indexes involved.
 */
function getAllSeries(karas, seriesData) {
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
	for (const serie of seriesData) {
		if (!map.has(serie.name)) {
			map.set(serie.name, [0]);
		}
	}
	return map;
}

function prepareSerieInsertData(serie, index) {
	return {
		$id_serie: index,
		$serie: serie,
		$NORM_serie: deburr(serie)
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
		for (const karaIndex of mapSeries.get(serie)) {
			if (karaIndex > 0) data.push({
				$id_serie: index,
				$id_kara: karaIndex
			});
		}
		index++;
	}

	return data;
}

async function prepareAltSeriesInsertData(seriesData, mapSeries) {

	const data = [];
	const i18nData = [];

	for (const serie of seriesData) {
		if (serie.aliases) {
			data.push({
				$serie_altnames: serie.aliases.join(','),
				$serie_altnamesnorm: deburr(serie.aliases.join(' ')).replace('\'', '').replace(',', ''),
				$serie_name: serie.name,
				$serie_file: serie.seriefile
			});
		} else {
			data.push({
				$serie_altnames: null,
				$serie_altnamesnorm: null,
				$serie_name: serie.name,
				$serie_file: serie.seriefile
			});
		}
		if (serie.i18n) {
			for (const lang of Object.keys(serie.i18n)) {
				i18nData.push({
					$lang: lang,
					$serie: serie.i18n[lang],
					$serienorm: deburr(serie.i18n[lang]).replace('\'', '').replace(',', ''),
					$name: serie.name
				});
			}
		}
	}
	// Checking if some series present in .kara files are not present in the series file
	for (const serie of mapSeries.keys()) {
		if (!findSeries(serie, seriesData)) {
			// Print a warning and push some basic data so the series can be searchable at least
			logger.warn(`[Gen] Series "${serie}" is not in any series file`);
			if (getConfig().optStrict) strictModeError(serie);
			data.push({
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
	return {
		data: data,
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
	} else {
		result.add(getTagId('NO_TAG,2', allTags));
	}
	if (kara.author) {
		kara.author.split(',').forEach(author => result.add(getTagId(author.trim() + ',6', allTags)));
	} else {
		result.add(getTagId('NO_TAG,6', allTags));
	}
	if (kara.tags) {
		kara.tags.split(',').forEach(tag => result.add(getTagId(tag.trim() + ',7', allTags)));
	} else {
		result.add(getTagId('NO_TAG,7', allTags));
	}
	if (kara.creator) {
		kara.creator.split(',').forEach(creator => result.add(getTagId(creator.trim() + ',4', allTags)));
	} else {
		result.add(getTagId('NO_TAG,4', allTags));
	}
	if (kara.songwriter) {
		kara.songwriter.split(',').forEach(songwriter => result.add(getTagId(songwriter.trim() + ',8', allTags)));
	} else {
		result.add(getTagId('NO_TAG,8', allTags));
	}
	if (kara.group) kara.group.split(',').forEach(group => result.add(getTagId(group.trim() + ',9', allTags)));
	if (kara.lang) kara.lang.split(',').forEach(lang => {
		if (lang === 'und' || lang === 'mul' || lang === 'zxx' || hasLang('2B', lang)) {
			result.add(getTagId(lang.trim() + ',5', allTags));
		}
	});

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
		logger.warn(`[Gen] Karaoke type cannot be detected (${kara.type}) in kara :  ${JSON.stringify(kara, null, 2)}`);
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
	let lastIndex;

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
		lastIndex = index + 1;
	});
	// We browse through tag data to add the default tags if they don't exist.
	for (const tag of karaTags) {
		if (!data.find(t => t.$tagname === `TAG_${tag}`)) {
			data.push({
				$id_tag: lastIndex + 1,
				$tagtype: 7,
				$tagname: `TAG_${tag}`,
				$tagnamenorm: `TAG_${tag}`
			});
			lastIndex++;
		}
	}
	// We do it as well for types
	for (const type of karaTypesMap) {
		if (!data.find(t => t.$tagname === `TYPE_${type[0]}`)) {
			data.push({
				$id_tag: lastIndex + 1,
				$tagtype: 3,
				$tagname: `TYPE_${type[0]}`,
				$tagnamenorm: `TYPE_${type[0]}`
			});
			lastIndex++;
		}
	}
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
	incrBar();
}

function createBar(message, length) {
	const barFormat = `${message} {bar} {percentage}% - ETA {eta_formatted}`;
	initBar({
		format: barFormat,
		stopOnComplete: true
		  }, cliProgress.Presets.shades_classic, length, 0);
}

export async function run(config) {
	try {
		emit('databaseBusy',true);
		if (generating) throw 'A database generation is already in progress';
		generating = true;
		const conf = config || getConfig();

		const karas_dbfile = resolve(conf.appPath, conf.PathDB, conf.PathDBKarasFile);
		logger.info('[Gen] Starting database generation');
		logger.info('[Gen] GENERATING DATABASE CAN TAKE A WHILE, PLEASE WAIT.');
		const db = await open(karas_dbfile, {verbose: true, Promise});
		const karaFiles = await extractAllKaraFiles();
		logger.debug(`[Gen] Number of .karas found : ${karaFiles.length}`);
		if (karaFiles.length === 0) throw 'No kara files found';
		createBar('Reading .kara files  ', karaFiles.length + 1);
		const karas = await readAllKaras(karaFiles);
		logger.debug(`[Gen] Number of karas read : ${karas.length}`);
		// Check if we don't have two identical KIDs
		checkDuplicateKIDs(karas);
		incrBar();
		// Series data
		stopBar();

		const seriesFiles = await extractAllSeriesFiles();
		if (seriesFiles.length === 0) throw 'No series files found';
		createBar('Reading .series files', seriesFiles.length);
		const seriesData = await readAllSeries(seriesFiles);
		checkDuplicateSeries(seriesData);

		// Preparing data to insert
		stopBar();
		logger.info('[Gen] Data files processed, creating database');
		createBar('Generating database  ', 20);
		await emptyDatabase(db);
		incrBar();
		const sqlInsertKaras = prepareAllKarasInsertData(karas);
		const seriesMap = getAllSeries(karas, seriesData);
		const sqlInsertSeries = prepareAllSeriesInsertData(seriesMap);
		const sqlInsertKarasSeries = prepareAllKarasSeriesInsertData(seriesMap);
		const seriesAltNamesData = await prepareAltSeriesInsertData(seriesData, seriesMap);
		const sqlUpdateSeries = seriesAltNamesData.data;
		const sqlInserti18nSeries = seriesAltNamesData.i18nData;
		const tags = getAllKaraTags(karas);
		const sqlInsertTags = prepareAllTagsInsertData(tags.allTags);
		const sqlInsertKarasTags = prepareTagsKaraInsertData(tags.tagsByKara);

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
			runSqlStatementOnData(db.prepare(updateSeriesAltNames), sqlUpdateSeries)
		]);

		await db.run('commit');
		incrBar();
		await db.close();
		await checkUserdbIntegrity(null, conf);
		stopBar();
		emitWS('generationProgress', {
			value: 100,
			total: 100,
			text: 'Generation done'
		});
		if (error) throw 'Error during generation. Find out why in the messages above.';
	} catch (err) {
		logger.error(`[Gen] Generation error: ${err}`);
		throw err;
	} finally {
		emit('databaseBusy',false);
		generating = false;
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

	//If no uuid provided, we're making a new database
	if (!uuid) uuid = uuidV4();
	const karas_dbfile = resolve(conf.appPath, conf.PathDB, conf.PathDBKarasFile);
	const karas_userdbfile = resolve(conf.appPath, conf.PathDB, conf.PathDBUserFile);
	//Backup userdb file before running integrity checks
	await asyncCopy(
		karas_userdbfile,
		karas_userdbfile + '.backup',
		{ overwrite: true }
	);
	if (bar) incrBar();


	logger.debug('[Gen] Running user database integrity checks');

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

	if (bar) incrBar();

	await userdb.run('BEGIN TRANSACTION');
	await userdb.run('PRAGMA foreign_keys = OFF;');

	// Listing existing KIDs
	const karaKIDs = allKaras.map(k => `'${k.kid}'`).join(',');

	// Setting kara IDs to 0 when KIDs are absent
	await Promise.all([
		userdb.run(`UPDATE whitelist SET fk_id_kara = 0 WHERE kid NOT IN (${karaKIDs});`),
		userdb.run(`UPDATE blacklist SET fk_id_kara = 0 WHERE kid NOT IN (${karaKIDs});`),
		userdb.run(`UPDATE viewcount SET fk_id_kara = 0 WHERE kid NOT IN (${karaKIDs});`),
		userdb.run(`UPDATE request SET fk_id_kara = 0 WHERE kid NOT IN (${karaKIDs});`),
		userdb.run(`UPDATE playlist_content SET fk_id_kara = 0 WHERE kid NOT IN (${karaKIDs});`)
	]);
	if (bar) incrBar();
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

	blcTags.forEach(blcTag => {
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
		logger.debug( '[Gen] UPDATE SQL : ' + sql);
		await userdb.exec(sql);
	}

	await Promise.all([
		userdb.run(updateUUID, { $uuid: uuid }),
		db.run(updateUUID, { $uuid: uuid })
	]);

	await userdb.run('PRAGMA foreign_keys = ON;');
	await userdb.run('COMMIT');
	if (bar) incrBar();
	logger.debug('[Gen] Integrity checks complete, database generated');
}

export async function compareKarasChecksum(opts = {silent: false}) {
	profile('compareChecksum');
	const conf = getConfig();
	const karaFiles = await extractAllKaraFiles();
	const seriesFiles = await extractAllSeriesFiles();
	let KMData = '';
	if (!opts.silent) createBar('Checking .karas...    ', karaFiles.length);
	for (const karaFile of karaFiles) {
		KMData += await asyncReadFile(karaFile, 'utf-8');
		if (!opts.silent) incrBar();
	}
	if (!opts.silent) stopBar();
	if (!opts.silent) createBar('Checking series...    ', karaFiles.length);
	for (const seriesFile of seriesFiles) {
		KMData += await asyncReadFile(seriesFile, 'utf-8');
		if (!opts.silent) incrBar();
	}
	if (!opts.silent) stopBar();
	const karaDataSum = checksum(KMData);
	profile('compareChecksum');
	if (karaDataSum !== conf.appKaraDataChecksum) {
		setConfig({appKaraDataChecksum: karaDataSum});
		return false;
	}
	return true;
}