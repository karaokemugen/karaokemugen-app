import logger from 'winston';
import {basename, join} from 'path';
import deburr from 'lodash.deburr';
import {profile} from '../_utils/logger';
import {has as hasLang} from 'langs';
import {asyncReadFile, checksum, asyncReadDirFilter} from '../_utils/files';
import {getConfig, resolvedPathSeries, resolvedPathKaras, setConfig} from '../_utils/config';
import {getDataFromKaraFile, writeKara} from '../_dao/karafile';
import {
	insertKaras, insertKaraSeries, insertKaraTags, insertSeries, insertTags, inserti18nSeries, selectBlacklistKaras, selectBLCKaras,
	selectBLCTags, selectKaras, selectPlaylistKaras,
	selectTags, selectPlayedKaras, selectRequestKaras,
	selectWhitelistKaras,
	updateSeries
} from '../_dao/sql/generation';
import {tags as karaTags, karaTypesMap} from '../_services/constants';
import {serieRequired, verifyKaraData} from '../_services/kara';
import parallel from 'async-await-parallel';
import {refreshKaras, refreshYears} from '../_dao/kara';
import {findSeries, getDataFromSeriesFile} from '../_dao/seriesfile';
import {db, transaction, saveSetting} from '../_dao/database';
import { refreshSeries } from '../_dao/series';
import { refreshTags } from '../_dao/tag';
import slug from 'slug';
import {createHash} from 'crypto';
import Bar from '../_utils/bar';
import {emit} from '../_utils/pubsub';

let error = false;
let generating = false;
let bar;

function hash(string) {
	const hash = createHash('sha1');
	hash.update(string);
	return hash.digest('hex');
}

async function emptyDatabase() {
	await db().query('TRUNCATE kara_tag CASCADE;');
	bar.incr();
	await db().query('TRUNCATE kara_serie CASCADE;');
	bar.incr();
	await db().query('TRUNCATE tag RESTART IDENTITY CASCADE;');
	bar.incr();
	await db().query('TRUNCATE serie RESTART IDENTITY CASCADE;');
	bar.incr();
	await db().query('TRUNCATE serie_lang RESTART IDENTITY CASCADE;');
	bar.incr();
	await db().query('TRUNCATE kara RESTART IDENTITY CASCADE;');
	bar.incr();
	await db().query('VACUUM;');
	bar.incr();
}

export async function extractAllKaraFiles() {
	let karaFiles = [];
	for (const resolvedPath of resolvedPathKaras()) {
		karaFiles = karaFiles.concat(await asyncReadDirFilter(resolvedPath, '.kara'));
	}
	return karaFiles;
}

export async function extractAllSeriesFiles() {
	let seriesFiles = [];
	for (const resolvedPath of resolvedPathSeries()) {
		seriesFiles = seriesFiles.concat(await asyncReadDirFilter(resolvedPath, '.series.json'));
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
	data.seriefile = basename(seriesFile);
	bar.incr();
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
	bar.incr();
	return karaData;
}


function prepareKaraInsertData(kara, index) {
	return [
		index,
		kara.KID,
		kara.title,
		kara.year || null,
		kara.order || null,
		kara.mediafile,
		kara.subfile,
		new Date(kara.dateadded * 1000),
		new Date(kara.datemodif * 1000),
		kara.mediagain,
		kara.mediaduration,
		basename(kara.karafile),
		kara.mediasize
	];
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
			// One series is duplicated, we're going to throw an error.
			errors.push({
				name: serie.name
			});
		}
		searchSeries.push({ name: serie.name });
	}
	if (errors.length > 0) throw `One or several series are duplicated in your database : ${JSON.stringify(errors,null,2)}. Please fix this by removing the duplicated series file(s) and retry generating your database.`;
}

function checkDuplicateSIDs(series) {
	let searchSeries = [];
	let errors = [];
	for (const serie of series) {
		// Find out if our kara exists in our list, if not push it.
		const search = searchSeries.find(s => {
			return s.sid === serie.sid;
		});
		if (search) {
			// One SID is duplicated, we're going to throw an error.
			errors.push({
				sid: serie.sid,
				serie1: serie.seriefile,
				serie2: search.seriefile
			});
		}
		searchSeries.push({ sid: serie.sid, karafile: serie.seriefile });
	}
	if (errors.length > 0) throw `One or several SIDs are duplicated in your database : ${JSON.stringify(errors,null,2)}. Please fix this by removing the duplicated serie(s) and retry generating your database.`;
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
			map.has(serie) ? map.get(serie).push(karaIndex) : map.set(serie, [karaIndex]);
		});
	});
	for (const serie of seriesData) {
		if (!map.has(serie.name)) map.set(serie.name, [0]);
	}
	return map;
}

function prepareSerieInsertData(serie, index) {
	return [
		index,
		serie
	];
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
 * Warning : we iterate on keys and not on map entries to get the right order and thus the same indexes as the function prepareAllSeriesInsertData. This is the historical way of doing it and should be improved sometimes.
 */
function prepareAllKarasSeriesInsertData(mapSeries) {
	const data = [];
	let index = 1;
	for (const serie of mapSeries.keys()) {
		for (const karaIndex of mapSeries.get(serie)) {
			data.push([
				index,
				karaIndex
			]);
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
			data.push([
				JSON.stringify(serie.aliases),
				serie.name,
				serie.seriefile,
				serie.sid
			]);
		} else {
			data.push([
				null,
				serie.name,
				serie.seriefile,
				serie.sid
			]);
		}
		if (serie.i18n) {
			for (const lang of Object.keys(serie.i18n)) {
				i18nData.push([
					lang,
					serie.i18n[lang],
					serie.name
				]);
			}
		}
	}
	// Checking if some series present in .kara files are not present in the series files
	for (const serie of mapSeries.keys()) {
		if (!findSeries(serie, seriesData)) {
			// Print a warning and push some basic data so the series can be searchable at least
			logger.warn(`[Gen] Series "${serie}" is not in any series file`);
			// In strict mode, it triggers an error
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
	if (kara.groups) kara.groups.split(',').forEach(group => result.add(getTagId(group.trim() + ',9', allTags)));
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
	const slugs = [];
	const translations = require(join(__dirname,'../_locales/'));
	let lastIndex;

	allTags.forEach((tag, index) => {
		const tagParts = tag.split(',');
		const tagName = tagParts[0];
		const tagType = tagParts[1];
		slug.defaults.mode = 'rfc3986';
		let tagSlug = slug(tagName, {
			lower: true,
		});
		if (slugs.includes(`${tagType} ${tagSlug}`)) {
			tagSlug = `${tagSlug}-${hash(tagName)}`;
		}
		if (slugs.includes(`${tagType} ${tagSlug}`)) {
			logger.error(`[Gen] Duplicate: ${tagType} ${tagSlug} ${tagName}`);
			error = true;
		}
		slugs.push(`${tagType} ${tagSlug}`);
		const tagi18n = {};
		if (+tagType === 7 || +tagType === 3) {
			for (const language of Object.keys(translations)) {
				// Key is the language, value is a i18n text
				if (translations[language][tagName]) tagi18n[language] = translations[language][tagName];
			}
		}
		data.push([
			index + 1,
			tagType,
			tagName,
			tagSlug,
			tagi18n
		]);
		lastIndex = index + 1;
	});
	// We browse through tag data to add the default tags if they don't exist.
	for (const tag of karaTags) {
		if (!data.find(t => t.$tagname === `TAG_${tag}`)) {
			const tagDefaultName = `TAG_${tag}`;
			data.push([
				lastIndex + 1,
				7,
				tagDefaultName,
				slug(tagDefaultName),
				{}
			]);
			lastIndex++;
		}
	}
	// We do it as well for types
	for (const type of karaTypesMap) {
		if (!data.find(t => t.$tagname === `TYPE_${type[0]}`)) {
			const typeDefaultName = `TYPE_${type[0]}`;
			data.push([
				lastIndex + 1,
				3,
				typeDefaultName,
				slug(typeDefaultName),
				{}
			]);
			lastIndex++;
		}
	}
	return data;
}

function prepareTagsKaraInsertData(tagsByKara) {
	const data = [];

	tagsByKara.forEach((tags, karaIndex) => {
		tags.forEach(tagId => {
			data.push([
				tagId,
				karaIndex
			]);
		});
	});

	return data;
}

async function doTransaction(query) {
	await transaction([query]);
	bar.incr();
}

export async function run() {
	try {
		emit('databaseBusy',true);
		if (generating) throw 'A database generation is already in progress';
		generating = true;

		logger.info('[Gen] Starting database generation');
		const karaFiles = await extractAllKaraFiles();
		logger.debug(`[Gen] Number of .karas found : ${karaFiles.length}`);
		if (karaFiles.length === 0) throw 'No kara files found';

		bar = new Bar({
			message: 'Reading .kara files  ',
			event: 'generationProgress'
		}, karaFiles.length + 1);
		const karas = await readAllKaras(karaFiles);
		logger.debug(`[Gen] Number of karas read : ${karas.length}`);
		// Check if we don't have two identical KIDs
		checkDuplicateKIDs(karas);
		bar.incr();
		// Series data
		bar.stop();

		const seriesFiles = await extractAllSeriesFiles();
		if (seriesFiles.length === 0) throw 'No series files found';
		bar = new Bar({
			message: 'Reading .series files',
			event: 'generationProgress'
		}, seriesFiles.length);
		const seriesData = await readAllSeries(seriesFiles);
		checkDuplicateSeries(seriesData);
		checkDuplicateSIDs(seriesData);
		// Preparing data to insert
		bar.stop();
		logger.info('[Gen] Data files processed, creating database');
		bar = new Bar({
			message: 'Generating database  ',
			event: 'generationProgress'
		}, 21);
		await emptyDatabase();
		bar.incr();
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
		await Promise.all([
			doTransaction({sql: insertKaras, params: sqlInsertKaras}),
			doTransaction({sql: insertSeries, params: sqlInsertSeries}),
			doTransaction({sql: insertTags, params: sqlInsertTags}),
		]);
		await Promise.all([
			doTransaction({sql: insertKaraTags, params: sqlInsertKarasTags}),
			doTransaction({sql: insertKaraSeries, params: sqlInsertKarasSeries}),
			doTransaction({sql: inserti18nSeries, params: sqlInserti18nSeries}),
			doTransaction({sql: updateSeries, params: sqlUpdateSeries})
		]);
		refreshKaras();
		bar.incr();
		refreshSeries();
		bar.incr();
		refreshYears();
		bar.incr();
		refreshTags();
		bar.incr();
		await checkUserdbIntegrity(null);
		bar.stop();
		await saveSetting('lastGeneration', new Date());
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
export async function checkUserdbIntegrity() {
	logger.debug('[Gen] Running user database integrity checks');
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
		db().query(selectTags),
		db().query(selectKaras),
		db().query(selectBLCTags),
		db().query(selectWhitelistKaras),
		db().query(selectBLCKaras),
		db().query(selectBlacklistKaras),
		db().query(selectPlayedKaras),
		db().query(selectRequestKaras),
		db().query(selectPlaylistKaras)
	]);

	if (bar) bar.incr();

	// Listing existing KIDs
	const karaKIDs = allKaras.rows.map(k => `'${k.kid}'`).join(',');

	// Setting kara IDs to 0 when KIDs are absent
	await Promise.all([
		db().query(`UPDATE whitelist SET fk_id_kara = 0 WHERE kid NOT IN (${karaKIDs});`),
		db().query(`UPDATE blacklist SET fk_id_kara = 0 WHERE kid NOT IN (${karaKIDs});`),
		db().query(`UPDATE played SET fk_id_kara = 0 WHERE kid NOT IN (${karaKIDs});`),
		db().query(`UPDATE requested SET fk_id_kara = 0 WHERE kid NOT IN (${karaKIDs});`),
		db().query(`UPDATE playlist_content SET fk_id_kara = 0 WHERE kid NOT IN (${karaKIDs});`)
	]);
	if (bar) bar.incr();
	const karaIdByKid = new Map();
	allKaras.rows.forEach(k => karaIdByKid.set(k.kid, k.id_kara));
	let sql = '';
	whitelistKaras.rows.forEach(wlk => {
		if (karaIdByKid.has(wlk.kid) && karaIdByKid.get(wlk.kid) !== wlk.id_kara) {
			sql += `UPDATE whitelist SET fk_id_kara = ${karaIdByKid.get(wlk.kid)} WHERE kid = '${wlk.kid}';`;
		}
	});
	blacklistCriteriaKaras.rows.forEach(blck => {
		if (karaIdByKid.has(blck.kid) && karaIdByKid.get(blck.kid) !== blck.id_kara) {
			sql += `UPDATE blacklist_criteria SET value = ${karaIdByKid.get(blck.kid)} WHERE uniquevalue = '${blck.kid}';`;
		}
	});
	blacklistKaras.rows.forEach(blk => {
		if (karaIdByKid.has(blk.kid) && karaIdByKid.get(blk.kid) !== blk.id_kara) {
			sql += `UPDATE blacklist SET fk_id_kara = ${karaIdByKid.get(blk.kid)} WHERE kid = '${blk.kid}';`;
		}
	});
	viewcountKaras.rows.forEach(vck => {
		if (karaIdByKid.has(vck.kid) && karaIdByKid.get(vck.kid) !== vck.id_kara) {
			sql += `UPDATE played SET fk_id_kara = ${karaIdByKid.get(vck.kid)} WHERE kid = '${vck.kid}';`;
		}
	});
	requestKaras.rows.forEach(rqk => {
		if (karaIdByKid.has(rqk.kid) && karaIdByKid.get(rqk.kid) !== rqk.id_kara) {
			sql += `UPDATE requested SET fk_id_kara = ${karaIdByKid.get(rqk.kid)} WHERE kid = '${rqk.kid}';`;
		}
	});
	playlistKaras.rows.forEach(plck => {
		if (karaIdByKid.has(plck.kid) && karaIdByKid.get(plck.kid) !== plck.id_kara) {
			sql += `UPDATE playlist_content SET fk_id_kara = ${karaIdByKid.get(plck.kid)} WHERE kid = '${plck.kid}';`;
		}
	});

	blcTags.rows.forEach(blcTag => {
		let tagFound = false;
		allTags.rows.forEach(function (tag) {
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
		const beginSql = `
			BEGIN TRANSACTION;
		`;
		const endSql = `
			COMMIT;
		`;
		await db().query(beginSql + sql + endSql);
	}
	if (bar) bar.incr();
	logger.debug('[Gen] Integrity checks complete, database generated');
}

export async function compareKarasChecksum(opts = {silent: false}) {
	profile('compareChecksum');
	const conf = getConfig();
	const karaFiles = await extractAllKaraFiles();
	const seriesFiles = await extractAllSeriesFiles();
	let KMData = '';
	if (!opts.silent) bar = new Bar({
		message: 'Checking .karas...   '
	}, karaFiles.length);
	for (const karaFile of karaFiles) {
		KMData += await asyncReadFile(karaFile, 'utf-8');
		if (!opts.silent) bar.incr();
	}
	if (!opts.silent) bar.stop();
	if (!opts.silent) bar = new Bar({
		message: 'Checking series...   '
	}, seriesFiles.length);
	for (const seriesFile of seriesFiles) {
		KMData += await asyncReadFile(seriesFile, 'utf-8');
		if (!opts.silent) bar.incr();
	}
	if (!opts.silent) bar.stop();
	const karaDataSum = checksum(KMData);
	profile('compareChecksum');
	if (karaDataSum !== conf.appKaraDataChecksum) {
		setConfig({appKaraDataChecksum: karaDataSum});
		return false;
	}
	return true;
}