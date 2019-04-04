import uuidV4 from 'uuid/v4';
import {check, initValidators} from '../_utils/validators';
import {tagTypes, karaTypes, karaTypesArray, subFileRegexp, uuidRegexp, mediaFileRegexp} from './constants';
import logger from 'winston';
import {ASSToLyrics} from '../_utils/ass';
import {refreshKaras, refreshYears} from '../_dao/kara';
import {refreshKaraSeries, refreshSeries} from '../_dao/series';
import {refreshKaraTags, refreshTags} from '../_dao/tag';
import {now} from '../_utils/date';
import { compareKarasChecksum } from '../_dao/database';
import {selectAllKaras,
	getYears as getYearsDB,
	getKara as getKaraDB,
	getKaraMini as getKaraMiniDB,
	deleteKara as deleteKaraDB,
	getASS,
	addKara,
	updateKara,
	addPlayed,
	getKaraHistory as getKaraHistoryDB,
	selectRandomKara,
	selectAllKIDs
} from '../_dao/kara';
import {getState} from '../_utils/state';
import {updateKaraSeries} from '../_dao/series';
import {updateKaraTags, checkOrCreateTag} from '../_dao/tag';
import {getConfig} from '../_utils/config';
import langs from 'langs';
import {getLanguage} from 'iso-countries-languages';
import {resolve} from 'path';
import {profile} from '../_utils/logger';
import {isPreviewAvailable} from '../_webapp/previews';
import { getOrAddSerieID, deleteSerie } from './series';
import {asyncUnlink, resolveFileInDirs} from '../_utils/files';

export async function isAllKaras(karas) {
	// Returns an array of unknown karaokes
	// If array is empty, all songs in "karas" are present in database
	const allKaras = await selectAllKIDs();
	return karas.filter(kid => !allKaras.includes(kid));
}

export function translateKaraInfo(karas, lang) {
	// If lang is not provided, assume we're using node's system locale
	if (!lang) lang = getConfig().EngineDefaultLocale;
	// Test if lang actually exists in ISO639-1 format
	if (!langs.has('1',lang)) throw `Unknown language : ${lang}`;
	// Instanciate a translation object for our needs with the correct language.
	const i18n = require('i18n'); // Needed for its own translation instance
	i18n.configure({
		directory: resolve(__dirname,'../_locales'),
	});
	i18n.setLocale(lang);

	// We need to read the detected locale in ISO639-1
	const detectedLocale = langs.where('1',lang);
	// If the kara list provided is not an array (only a single karaoke)
	// Put it into an array first
	if (!Array.isArray(karas)) karas = [karas];
	karas.forEach((kara,index) => {
		kara.languages = kara.languages || [];
		if (kara.languages.length > 0) {
			let languages = [];
			let langdata;
			kara.languages.forEach(karalang => {
				// Special case : und
				// Undefined language
				// In this case we return something different.
				// Special case 2 : mul
				// mul is for multilanguages, when a karaoke has too many languages to list.
				switch (karalang.name) {
				case 'und':
					languages.push(i18n.__('UNDEFINED_LANGUAGE'));
					break;
				case 'mul':
					languages.push(i18n.__('MULTI_LANGUAGE'));
					break;
				case 'zxx':
					languages.push(i18n.__('NO_LANGUAGE'));
					break;
				default:
					// We need to convert ISO639-2B to ISO639-1 to get its language
					langdata = langs.where('2B',karalang.name);
					if (langdata === undefined) {
						languages.push(__('UNKNOWN_LANGUAGE'));
					} else {
						languages.push(getLanguage(detectedLocale[1],langdata[1]));
					}
					break;
				}
			});
			karas[index].languages_i18n = languages;
		}
	});
	return karas;
}

export async function getRandomKara(username, filter) {
	logger.debug('[Kara] Requesting a random song');
	return await selectRandomKara(getState().modePlaylistID);
}

export async function deleteKara(kid) {
	const kara = await getKaraMini(kid);
	if (!kara) throw `Unknown kara ID ${kid}`;

	// If kara_ids contains only one entry, it means the series won't have any more kara attached to it, so it's safe to remove it.
	const karas = await selectAllKaras('admin', null, null, 'search', `s:${kara.sid}`, null, null, true);
	if (karas.length <= 1 && kara.sid.length > 0) {
		for(let i=0; i<kara.sid.length; i++) {
			try {
				await deleteSerie(kara.sid[i]);
			} catch(e) {
				logger.error(`[Kara] Unable to remove all series from a karaoke : ${e}`);
				//throw e;
			}
		}
	}

	// Remove files
	const conf = getConfig();
	const PathsMedias = conf.PathMedias.split('|');
	const PathsSubs = conf.PathSubs.split('|');
	const PathsKaras = conf.PathKaras.split('|');

	try {
		await asyncUnlink(await resolveFileInDirs(kara.mediafile, PathsMedias)).catch(function(){ /* Fail silently */});
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing mediafile ${kara.mediafile} failed : ${err}`);
	}
	try {
		await asyncUnlink(await resolveFileInDirs(kara.karafile, PathsKaras)).catch(function(){ /* Fail silently */});
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing karafile ${kara.karafile} failed : ${err}`);
	}
	if (kara.subfile !== 'dummy.ass') try {
		await asyncUnlink(await resolveFileInDirs(kara.subfile, PathsSubs)).catch(function(){ /* Fail silently */});
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing subfile ${kara.subfile} failed : ${err}`);
	}

	compareKarasChecksum({silent: true});

	// Remove kara from database
	await deleteKaraDB(kid);
	logger.info(`[Kara] Song ${kara.karafile} removed`);

	delayedDbRefreshViews(2000)
}

var delayedDbRefreshTimeout = null;
export async function delayedDbRefreshViews(ttl=100) {
	clearTimeout(delayedDbRefreshTimeout)
	delayedDbRefreshTimeout = setTimeout(dbRefreshViews,ttl);
}
export async function dbRefreshViews() {
	logger.info(`[Kara] Refresh DB materialized views`);
		await Promise.all([
			refreshKaraSeries(),
			refreshKaraTags()
		]);
		await refreshKaras();
		refreshSeries();
		refreshYears();
		refreshTags();
}

export async function getKara(kid, token, lang) {
	profile('getKaraInfo');
	const kara = await getKaraDB(kid, token.username, lang, token.role);
	if (!kara) throw `Kara ${kid} unknown`;
	let output = translateKaraInfo(kara, lang);
	const previewfile = await isPreviewAvailable(output[0].kid, output[0].mediasize);
	if (previewfile) output[0].previewfile = previewfile;
	profile('getKaraInfo');
	return output;
}

export async function getKaraMini(kid) {
	return await getKaraMiniDB(kid);
}

export async function getKaraLyrics(kid) {
	const kara = await getKaraMini(kid);
	if (!kara) throw `Kara ${kid} unknown`;
	if (kara.subfile === 'dummy.ass') return 'Lyrics not available for this song';
	const ASS = await getASS(kara.subfile);
	if (ASS) return ASSToLyrics(ASS);
	return 'Lyrics not available for this song';
}

async function updateSeries(kara) {
	if (!kara.series) return true;
	let lang = 'und';
	if (kara.lang) lang = kara.lang.split(',')[0];
	let sids = [];
	for (const s of kara.series.split(',')) {
		let langObj = {};
		langObj[lang] = s;
		let seriesObj = {
			name: s
		};
		seriesObj.i18n = {...langObj};
		const sid = await getOrAddSerieID(seriesObj);
		sids.push(sid);
		// Remove this when we'll update .kara file format to version 4
		if (kara.KID) kara.kid = kara.KID;
	}
	await updateKaraSeries(kara.kid,sids);
}

async function updateTags(kara) {
	// Create an array of tags to add for our kara
	let tags = [];
	// Remove this when we'll update .kara file format to version 4
	if (kara.KID) kara.kid = kara.KID;
	kara.singer
		? kara.singer.split(',').forEach(t => tags.push({tag: t, type: tagTypes.singer}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.singer});
	kara.tags
		? kara.tags.split(',').forEach(t => tags.push({tag: t, type: tagTypes.misc}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.misc});
	kara.songwriter
		? kara.songwriter.split(',').forEach(t => tags.push({tag: t, type: tagTypes.songwriter}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.songwriter});
	kara.creator
		? kara.creator.split(',').forEach(t => tags.push({tag: t, type: tagTypes.creator}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.creator});
	kara.author
		? kara.author.split(',').forEach(t => tags.push({tag: t, type: tagTypes.author}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.author});
	kara.lang
		? kara.lang.split(',').forEach(t => tags.push({tag: t, type: tagTypes.lang}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.lang});
	kara.groups
		? kara.groups.split(',').forEach(t => tags.push({tag: t, type: tagTypes.group}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.group});

	//Songtype is a little specific.
	tags.push({tag: karaTypes[kara.type].dbType, type: tagTypes.songtype});

	if (tags.length === 0) return true;
	for (const i in tags) {
		tags[i].id = await checkOrCreateTag(tags[i]);
	}
	return await updateKaraTags(kara.kid, tags);
}

export async function createKaraInDB(kara) {
	await addKara(kara);
	await Promise.all([
		updateTags(kara),
		updateSeries(kara)
	]);

	dbRefreshViews();

}

export async function editKaraInDB(kara) {
	await Promise.all([
		updateTags(kara),
		updateSeries(kara),
		updateKara(kara)
	]);

	dbRefreshViews();
}

/**
 * Generate info to write in a .kara file from an object passed as argument by filtering out unnecessary fields and adding default values if needed.
 */
export function formatKara(karaData) {
	return {
		mediafile: karaData.mediafile || '',
		subfile: karaData.subfile || 'dummy.ass',
		subchecksum: karaData.subchecksum || '',
		title: karaData.title || '',
		series: karaData.series || '',
		type: karaData.type || '',
		order: karaData.order || '',
		year: karaData.year || '',
		singer: karaData.singer || '',
		tags: karaData.tags || '',
		groups: karaData.groups || '',
		songwriter: karaData.songwriter || '',
		creator: karaData.creator || '',
		author: karaData.author || '',
		lang: karaData.lang || 'und',
		KID: karaData.KID || uuidV4(),
		dateadded: karaData.dateadded || now(true),
		datemodif: karaData.datemodif || now(true),
		mediasize: karaData.mediasize || 0,
		mediagain: karaData.mediagain || 0,
		mediaduration: karaData.mediaduration || 0,
		version: karaData.version || 3
	};
}

const karaConstraintsV3 = {
	mediafile: {
		presence: {allowEmpty: false},
		format: mediaFileRegexp
	},
	subfile: {
		presence: {allowEmpty: false},
		format: subFileRegexp
	},
	title: {presence: {allowEmpty: true}},
	type: {presence: true, inclusion: karaTypesArray},
	series: (value, attributes) => {
		if (!serieRequired(attributes['type'])) {
			return { presence: {allowEmpty: true} };
		} else {
			return { presence: {allowEmpty: false} };
		}
	},
	lang: {langValidator: true},
	order: {integerValidator: true},
	year: {integerValidator: true},
	KID: {presence: true, format: uuidRegexp},
	dateadded: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	datemodif: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	mediasize: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	mediagain: {numericality: true},
	mediaduration: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	version: {numericality: {onlyInteger: true, equality: 3}}
};

export function karaDataValidationErrors(karaData) {
	initValidators();
	return check(karaData, karaConstraintsV3);
}

export function verifyKaraData(karaData) {
	// Version 2 is considered deprecated, so let's throw an error.
	if (karaData.version < 3) throw 'Karaoke version 2 or lower is deprecated';
	const validationErrors = karaDataValidationErrors(karaData);
	if (validationErrors) {
		throw `Karaoke data is not valid: ${JSON.stringify(validationErrors)}`;
	}
}

/** Only MV or LIVE types don't have to have a series filled. */
export function serieRequired(karaType) {
	return karaType !== karaTypes.MV.type && karaType !== karaTypes.LIVE.type;
}

export async function getKaraHistory() {
	// Called by system route
	return await getKaraHistoryDB();
}

export async function getTop50(token, lang) {
	// Called by system route
	return await selectAllKaras(token.username, null, lang, 'requested', null);
}

export async function getKaraPlayed(token, lang, from, size) {
	// Called by system route
	return await selectAllKaras(token.username, null, lang, 'played', null, from, size);
}

export async function addPlayedKara(kid) {
	profile('addPlayed');
	const ret = await addPlayed(kid);
	profile('addPlayed');
	return ret;
}

export async function getYears() {
	const years = await getYearsDB();
	return {
		content: years,
		infos: {
			from: 0,
			to: years.length,
			count: years.length
		}
	};
}

export async function getKaras(filter, lang, from = 0, size = 999999999, searchType, searchValue, token) {
	profile('getKaras');
	const pl = await selectAllKaras(token.username, filter, lang, searchType, searchValue, from, size, token.role === 'admin');
	profile('formatList');
	const ret = formatKaraList(pl.slice(from, from + size), lang, from, pl.length);
	profile('formatList');
	profile('getKaras');
	return ret;
}

export function formatKaraList(karaList, lang, from, count) {
	karaList = translateKaraInfo(karaList, lang);
	return {
		infos: {
			count: count,
			from: from,
			to: from + karaList.length
		},
		content: karaList
	};
}