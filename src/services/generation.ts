import logger from 'winston';
import {basename, join} from 'path';
import {has as hasLang} from 'langs';
import {asyncReadDirFilter} from '../utils/files';
import {resolvedPathSeries, resolvedPathKaras} from '../utils/config';
import {getDataFromKaraFile, verifyKaraData, writeKara, parseKara} from '../dao/karafile';
import {selectBLCTags, selectTags} from '../dao/sql/generation';
import {tags as karaTags, karaTypesMap} from '../services/constants';
import {Kara, KaraFileV4} from '../types/kara';
import parallel from 'async-await-parallel';
import {getDataFromSeriesFile} from '../dao/seriesfile';
import {copyFromData, refreshAll, db, saveSetting} from '../dao/database';
import slugify from 'slugify';
import {createHash} from 'crypto';
import Bar from '../utils/bar';
import {emit} from '../utils/pubsub';
import { generateBlacklist } from './blacklist';
import { Series } from '../types/series';
import { TagsInsertData, SeriesInsertData, SeriesMap, TagsByKara} from '../types/generation';
import { Tag } from '../types/tag';

let error = false;
let generating = false;
let bar: any;

function hash(string: string): string {
	const hash = createHash('sha1');
	hash.update(string);
	return hash.digest('hex');
}

async function emptyDatabase() {
	await db().query(`
	BEGIN;
	TRUNCATE kara_tag CASCADE;
	TRUNCATE kara_serie CASCADE;
	TRUNCATE tag RESTART IDENTITY CASCADE;
	TRUNCATE serie RESTART IDENTITY CASCADE;
	TRUNCATE serie_lang RESTART IDENTITY CASCADE;
	TRUNCATE kara RESTART IDENTITY CASCADE;
	TRUNCATE repo CASCADE;
	COMMIT;
	`);
}

export async function extractAllKaraFiles(): Promise<string[]> {
	let karaFiles = [];
	for (const resolvedPath of resolvedPathKaras()) {
		karaFiles = karaFiles.concat(await asyncReadDirFilter(resolvedPath, '.kara.json'));
	}
	return karaFiles;
}

export async function extractAllSeriesFiles(): Promise<string[]> {
	let seriesFiles = [];
	for (const resolvedPath of resolvedPathSeries()) {
		seriesFiles = seriesFiles.concat(await asyncReadDirFilter(resolvedPath, '.series.json'));
	}
	return seriesFiles;
}

export async function readAllSeries(seriesFiles: string[]): Promise<SeriesInsertData> {
	const seriesPromises = [];
	const seriesMap = new Map();
	for (const seriesFile of seriesFiles) {
		seriesPromises.push(() => processSerieFile(seriesFile, seriesMap));
	}
	const seriesData = await parallel(seriesPromises, 16);
	return { data: seriesData, map: seriesMap };
}

async function processSerieFile(seriesFile: string, map: Map<string, string[]>): Promise<Series> {
	const data = await getDataFromSeriesFile(seriesFile);
	data.seriefile = basename(seriesFile);
	map.set(data.sid, []);
	bar.incr();
	return data;
}

export async function readAllKaras(karafiles: string[], seriesMap: SeriesMap): Promise<Kara[]> {
	const karaPromises = [];
	for (const karafile of karafiles) {
		karaPromises.push(() => readAndCompleteKarafile(karafile, seriesMap));
	}
	const karas = await parallel(karaPromises, 16);
	if (karas.some((kara: Kara) => kara.error)) error = true;
	return karas.filter((kara: Kara) => !kara.error);
}

async function readAndCompleteKarafile(karafile: string, seriesMap: SeriesMap): Promise<Kara> {
	let karaData: Kara = {}
	const karaFileData: KaraFileV4 = await parseKara(karafile);
	try {
		verifyKaraData(karaFileData);
		karaData = await getDataFromKaraFile(karafile, karaFileData);
	} catch (err) {
		logger.warn(`[Gen] Kara file ${karafile} is invalid/incomplete : ${err}`);
		karaData.error = true;
		return karaData;
	}
	if (karaData.sids.length > 0) {
		for (const sid of karaData.sids) {
			const seriesData = seriesMap.get(sid);
			if (seriesData) {
				seriesData.push(karaData.kid);
				seriesMap.set(sid, seriesData);
			} else {
				karaData.error = true;
				logger.error(`[Gen] Series ${sid} was not found in your series.json files (Kara file : ${karafile})`);
			}
		}
	}
	await writeKara(karafile, karaData);
	bar.incr();
	return karaData;
}


function prepareKaraInsertData(kara: Kara): any[] {
	return [
		kara.kid,
		kara.title,
		kara.year || null,
		kara.order || null,
		kara.mediafile,
		kara.subfile,
		basename(kara.karafile),
		kara.mediaduration,
		kara.mediasize,
		kara.mediagain,
		kara.dateadded.toISOString(),
		kara.datemodif.toISOString(),
		kara.repo
	];
}

function prepareAllKarasInsertData(karas: Kara[]): any[] {
	return karas.map(kara => prepareKaraInsertData(kara));
}

function checkDuplicateKIDs(karas: Kara[]) {
	let searchKaras = [];
	let errors = [];
	for (const kara of karas) {
		// Find out if our kara exists in our list, if not push it.
		const search = searchKaras.find(k => {
			return k.kid === kara.kid;
		});
		if (search) {
			// One KID is duplicated, we're going to throw an error.
			errors.push({
				kid: kara.kid,
				kara1: kara.karafile,
				kara2: search.karafile
			});
		}
		searchKaras.push({ kid: kara.kid, karafile: kara.karafile });
	}
	if (errors.length > 0) throw `One or several KIDs are duplicated in your database : ${JSON.stringify(errors,null,2)}. Please fix this by removing the duplicated karaoke(s) and retry generating your database.`;
}

function checkDuplicateSIDs(series: Series[]) {
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

function prepareSerieInsertData(data: Series): string[] {

	if (data.aliases) data.aliases.forEach((d,i) => {
		data.aliases[i] = d.replace(/"/g,'\\"');
	});
	return [
		data.sid,
		data.name,
		JSON.stringify(data.aliases || []),
		data.seriefile
	];
}

function prepareAllSeriesInsertData(mapSeries: any, seriesData: Series[]): string[][] {
	const data = [];
	for (const serie of mapSeries) {
		const serieData = seriesData.find(e => e.sid === serie[0]);
		data.push(prepareSerieInsertData(serieData));
	}
	return data;
}

/**
 * Warning : we iterate on keys and not on map entries to get the right order and thus the same indexes as the function prepareAllSeriesInsertData. This is the historical way of doing it and should be improved sometimes.
 */
function prepareAllKarasSeriesInsertData(mapSeries: any): string[][] {
	const data = [];
	for (const serie of mapSeries) {
		for (const kid of serie[1]) {
			data.push([
				serie[0],
				kid
			]);
		}
	}
	return data;
}

async function prepareAltSeriesInsertData(seriesData: Series[]): Promise<string[][]> {
	const i18nData = [];
	let index = 0;
	for (const serie of seriesData) {
		if (serie.i18n) {
			for (const lang of Object.keys(serie.i18n)) {
				index++;
				i18nData.push([
					index,
					serie.sid,
					lang,
					serie.i18n[lang]
				]);
			}
		}
	}
	return i18nData;
}

function getAllKaraTags(karas: Kara[]): TagsInsertData {
	const allTags = [];
	const tagsByKara = new Map();
	karas.forEach(kara => {
		const karaIndex = kara.kid;
		tagsByKara.set(karaIndex, getKaraTags(kara, allTags));
	});
	return {
		tagsByKara: tagsByKara,
		allTags: allTags
	};
}

function getKaraTags(kara: Kara, allTags: string[]): Set<number> {

	const result = new Set();

	if (kara.singer.length > 0) {
		kara.singer.forEach(singer => result.add(getTagId(singer.trim() + ',2', allTags)));
	} else {
		result.add(getTagId('NO_TAG,2', allTags));
	}
	if (kara.author.length > 0) {
		kara.author.forEach(author => result.add(getTagId(author.trim() + ',6', allTags)));
	} else {
		result.add(getTagId('NO_TAG,6', allTags));
	}
	if (kara.tags.length > 0) {
		kara.tags.forEach(tag => result.add(getTagId(tag.trim() + ',7', allTags)));
	} else {
		result.add(getTagId('NO_TAG,7', allTags));
	}
	if (kara.creator.length > 0) {
		kara.creator.forEach(creator => result.add(getTagId(creator.trim() + ',4', allTags)));
	} else {
		result.add(getTagId('NO_TAG,4', allTags));
	}
	if (kara.songwriter.length > 0) {
		kara.songwriter.forEach(songwriter => result.add(getTagId(songwriter.trim() + ',8', allTags)));
	} else {
		result.add(getTagId('NO_TAG,8', allTags));
	}
	if (kara.groups.length > 0) kara.groups.forEach(group => result.add(getTagId(group.trim() + ',9', allTags)));
	if (kara.lang) kara.lang.forEach(lang => {
		if (lang === 'und' || lang === 'mul' || lang === 'zxx' || hasLang('2B', lang)) {
			result.add(getTagId(lang.trim() + ',5', allTags));
		}
	});

	getTypes(kara, allTags).forEach(type => result.add(type));

	return result;
}

function getTypes(kara: Kara, allTags: string[]): Set<Number> {
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

function getTagId(tagName: string, tags: string[]): number {
	const index = tags.indexOf(tagName) + 1;
	if (index > 0) {
		return index;
	}
	tags.push(tagName);
	return tags.length;
}

function prepareAllTagsInsertData(allTags: string[]): any[][] {
	const data = [];
	const slugs = [];
	const translations = require(join(__dirname,'../locales/'));
	let lastIndex: number;

	allTags.forEach((tag, index) => {
		const tagParts = tag.split(',');
		const tagName = tagParts[0];
		const tagType = tagParts[1];
		let tagSlug = slugify(tagName);
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
			JSON.stringify(tagi18n)
		]);
		lastIndex = index + 1;
	});
	// We browse through tag data to add the default tags if they don't exist.
	for (const tag of karaTags) {
		const tagi18n = {};
		if (!data.find(t => t[2] === `TAG_${tag}`)) {
			const tagDefaultName = `TAG_${tag}`;
			for (const language of Object.keys(translations)) {
				// Key is the language, value is a i18n text
				if (translations[language][`TAG_${tag}`]) tagi18n[language] = translations[language][`TAG_${tag}`];
			}
			data.push([
				lastIndex + 1,
				7,
				tagDefaultName,
				slugify(tagDefaultName),
				JSON.stringify(tagi18n)
			]);
			lastIndex++;
		}
	}
	// We do it as well for types
	for (const type of karaTypesMap.entries()) {
		const tagi18n = {};
		if (!data.find(t => t[2] === `TYPE_${type[0]}`)) {
			const typeDefaultName = `TYPE_${type[0]}`;
			for (const language of Object.keys(translations)) {
				// Key is the language, value is a i18n text
				if (translations[language][`TYPE_${type[0]}`]) tagi18n[language] = translations[language][`TAG_${type[0]}`];
			}
			data.push([
				lastIndex + 1,
				3,
				typeDefaultName,
				slugify(typeDefaultName),
				JSON.stringify(tagi18n)
			]);
			lastIndex++;
		}
	}
	return data;
}

function prepareTagsKaraInsertData(tagsByKara: TagsByKara) {
	const data = [];

	tagsByKara.forEach((tags, kid) => {
		tags.forEach(tagId => {
			data.push([
				tagId,
				kid
			]);
		});
	});

	return data;
}

export async function run(validateOnly: boolean = false) {
	try {
		emit('databaseBusy',true);
		if (generating) throw 'A database generation is already in progress';
		generating = true;
		error = false;
		logger.info('[Gen] Starting database generation');
		const karaFiles = await extractAllKaraFiles();
		const seriesFiles = await extractAllSeriesFiles();
		logger.debug(`[Gen] Number of .karas found : ${karaFiles.length}`);
		if (karaFiles.length === 0) {
			// Returning early if no kara is found
			logger.warn('[Gen] No .kara files found, ending generation');
			await emptyDatabase();
			return;
		}
		if (seriesFiles.length === 0) throw 'No series files found';
		bar = new Bar({
			message: 'Reading series data  ',
			event: 'generationProgress'
		}, seriesFiles.length);
		const series = await readAllSeries(seriesFiles);
		checkDuplicateSIDs(series.data);
		bar.stop();

		bar = new Bar({
			message: 'Reading kara data    ',
			event: 'generationProgress'
		}, karaFiles.length + 1);
		const karas = await readAllKaras(karaFiles, series.map);
		logger.debug(`[Gen] Number of karas read : ${karas.length}`);
		// Check if we don't have two identical KIDs
		checkDuplicateKIDs(karas);
		bar.incr();
		bar.stop();
		if (error) throw 'Error during generation. Find out why in the messages above.';
		if (validateOnly) {
			return true;
		}
		// Preparing data to insert
		logger.info('[Gen] Data files processed, creating database');
		bar = new Bar({
			message: 'Generating database  ',
			event: 'generationProgress'
		}, 16);
		const sqlInsertKaras = prepareAllKarasInsertData(karas);
		bar.incr();
		const sqlInsertSeries = prepareAllSeriesInsertData(series.map, series.data);
		bar.incr();
		const sqlInsertKarasSeries = prepareAllKarasSeriesInsertData(series.map);
		bar.incr();
		const sqlSeriesi18nData = await prepareAltSeriesInsertData(series.data);
		bar.incr();
		const tags = getAllKaraTags(karas);
		bar.incr();
		const sqlInsertTags = prepareAllTagsInsertData(tags.allTags);
		bar.incr();
		const sqlInsertKarasTags = prepareTagsKaraInsertData(tags.tagsByKara);
		bar.incr();
		await emptyDatabase();
		bar.incr();
		// Inserting data in a transaction
		await Promise.all([
			copyFromData('kara', sqlInsertKaras),
			copyFromData('serie', sqlInsertSeries),
			copyFromData('tag', sqlInsertTags)
		]);
		bar.incr();
		await Promise.all([
			copyFromData('serie_lang', sqlSeriesi18nData),
			copyFromData('kara_tag', sqlInsertKarasTags),
			copyFromData('kara_serie', sqlInsertKarasSeries)
		]);
		bar.incr();
		// Adding the kara.moe repository. For now it's the only one available, we'll add everything to manage multiple repos later.
		await db().query('INSERT INTO repo VALUES(\'kara.moe\')');
		bar.incr();
		// Setting the pk_id_tag sequence to allow further edits during runtime
		await db().query('SELECT SETVAL(\'tag_pk_id_tag_seq\',(SELECT MAX(pk_id_tag) FROM tag))');
		await db().query('SELECT SETVAL(\'serie_lang_pk_id_serie_lang_seq\',(SELECT MAX(pk_id_serie_lang) FROM serie_lang))');
		bar.incr();
		await db().query('VACUUM ANALYZE;');
		bar.incr();
		await Promise.all([
			checkUserdbIntegrity(),
			refreshAll()
		]);
		bar.incr();
		await saveSetting('lastGeneration', new Date().toString());
		bar.incr();
		bar.stop();
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
 * Get all tags and compare to the ones in the blacklist criterias, if any.
 * If tag IDs have changed, update them in blacklist criterias.
 */
export async function checkUserdbIntegrity() {
	logger.debug('[Gen] Running user database integrity checks');
	const [
		allTags,
		blcTags,
	] = await Promise.all([
		db().query(selectTags),
		db().query(selectBLCTags),
	]);

	if (bar) bar.incr();
	let sql = '';

	blcTags.rows.forEach((blcTag: Tag ) => {
		let tagFound = false;
		allTags.rows.forEach((tag: Tag) => {
			if (tag.name === blcTag.name && tag.type === blcTag.type) {
				// Found a matching Tagname, checking if id_tags are the same
				if (tag.id !== blcTag.id) {
					sql += `UPDATE blacklist_criteria SET value = ${tag.id}
						WHERE uniquevalue = '${blcTag.name}' AND type = ${blcTag.type};`;
				}
				tagFound = true;
			}
		});
		//If No Tag with this name and type was found in the AllTags table, delete the Tag
		if (!tagFound) {
			sql += `DELETE FROM blacklist_criteria WHERE uniquevalue = '${blcTag.name}' AND type = ${blcTag.type};`;
			logger.warn(`[Gen] Deleted Tag ${blcTag.name} from blacklist criteria (type ${blcTag.type})`);
		}
	});
	if (sql) {
		logger.debug( '[Gen] UPDATE SQL : ' + sql);
		await db().query(`
		BEGIN;
		${sql}
		COMMIT;
		`);
	}
	if (bar) bar.incr();
	await generateBlacklist();
	if (bar) bar.incr();
	logger.debug('[Gen] Integrity checks complete, database generated');
}
