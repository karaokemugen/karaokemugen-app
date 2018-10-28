import timestamp from 'unix-timestamp';
import uuidV4 from 'uuid/v4';
import {check, initValidators} from '../_common/utils/validators';
import {tagTypes, karaTypes, karaTypesArray, subFileRegexp, uuidRegexp, mediaFileRegexp} from './constants';
import {extractAllKaraFiles, readAllKaras, compareKarasChecksum} from '../_admin/generate_karasdb';
import logger from 'winston';
import {findSeriesKaraByKaraID, getOrAddSerieID, deleteSerie} from './series';
import {ASSToLyrics} from '../_common/utils/ass';
import {getPlaylistContentsMini} from './playlist';
import {getAllKaras as getAllKarasDB,
	getYears as getYearsDB,
	getKara as getKaraDB,
	getKaraMini as getKaraMiniDB,
	deleteKara as deleteKaraDB,
	getASS,
	isKara as isKaraDB,
	addKara,
	updateKara,
	getKaraHistory as getKaraHistoryDB,
	getKaraViewcounts as getKaraViewcountsDB,
	addViewcount
} from '../_dao/kara';
import {updateKaraSeries} from '../_dao/series';
import {updateKaraTags, checkOrCreateTag} from '../_dao/tag';
import sample from 'lodash.sample';
import {getConfig} from '../_common/utils/config';
import langs from 'langs';
import {getLanguage} from 'iso-countries-languages';
import {resolve} from 'path';
import testJSON from 'is-valid-json';
import {profile} from '../_common/utils/logger';
import {isPreviewAvailable} from '../_webapp/previews';
import { asyncUnlink, resolveFileInDirs } from '../_common/utils/files';

export async function isAllKaras(karas) {
	let err;
	for (const kara_id of karas) {
		if (!await isKara(kara_id)) err = true;
	}
	if (err) {
		return false;
	} else {
		return true;
	}
}

async function isKara(kara_id) {
	return await isKaraDB(kara_id);
}

export function translateKaraInfo(karalist, lang) {
	const conf = getConfig();
	// If lang is not provided, assume we're using node's system locale
	if (!lang) lang = conf.EngineDefaultLocale;
	// Test if lang actually exists in ISO639-1 format
	if (!langs.has('1',lang)) throw `Unknown language : ${lang}`;
	// Instanciate a translation object for our needs with the correct language.
	const i18n = require('i18n'); // Needed for its own translation instance
	i18n.configure({
		directory: resolve(__dirname,'../_common/locales'),
	});
	i18n.setLocale(lang);

	// We need to read the detected locale in ISO639-1
	const detectedLocale = langs.where('1',lang);
	// If the kara list provided is not an array (only a single karaoke)
	// Put it into an array first
	let karas;
	if (!Array.isArray(karalist)) {
		karas = [];
		karas[0] = karalist;
	} else {
		karas = karalist;
	}
	karas.forEach((kara,index) => {
		karas[index].songtype_i18n = i18n.__(kara.songtype);
		karas[index].songtype_i18n_short = i18n.__(kara.songtype+'_SHORT');

		if (kara.language != null) {
			const karalangs = kara.language.split(',');
			let languages = [];
			let langdata;
			karalangs.forEach(karalang => {
				// Special case : und
				// Undefined language
				// In this case we return something different.
				// Special case 2 : mul
				// mul is for multilanguages, when a karaoke has too many languages to list.
				switch (karalang) {
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
					langdata = langs.where('2B',karalang);
					if (langdata === undefined) {
						languages.push(__('UNKNOWN_LANGUAGE'));
					} else {
						languages.push(getLanguage(detectedLocale[1],langdata[1]));
					}
					break;
				}
			});
			karas[index].language_i18n = languages.join();
		}
		// Let's do the same with tags, without language stuff
		if (kara.misc != null) {
			let tags = [];
			const karatags = kara.misc.split(',');
			karatags.forEach(function(karatag){
				tags.push(i18n.__(karatag));
			});
			karas[index].misc_i18n = tags.join();
		} else {
			karas[index].misc_i18n = null;
		}
		// We need to format the serie properly.
		if (kara.serie) {
			//Transform the i18n field we got from the database into an object.
			let seriei18n;
			if (kara.serie_i18n && kara.serie_i18n.length > 0 && testJSON(kara.serie_i18n)) {
				seriei18n = JSON.parse(kara.serie_i18n);
				karas[index].serie_i18n = {};
				const serieTrans = {};
				seriei18n.forEach((serieLang) => {
					serieTrans[serieLang.lang] = serieLang.name;
				});
				karas[index].serie_i18n = Object.assign(serieTrans);
			} else {
				karas[index].serie_i18n = {eng: kara.serie};
			}
		}
	});
	return karas;
}

export async function getAllKaras(username, filter, lang, searchType, searchValue) {
	return await getAllKarasDB(username, filter, lang, searchType, searchValue);
}

export async function getRandomKara(playlist_id, filter, username) {
	logger.debug('[Kara] Requesting a random song');
	// Get karaoke list
	let karas = await getAllKaras(username, filter);
	// Strip list to just kara IDs
	karas.forEach((elem,index) => {
		karas[index] = elem.kara_id;
	});
	//Now, get current playlist's contents.
	const pl = await getPlaylistContentsMini(playlist_id);
	//Strip playlist to just kara IDs
	pl.forEach((elem,index) => {
		pl[index] = elem.kara_id;
	});
	let allKarasNotInCurrentPlaylist = [];
	allKarasNotInCurrentPlaylist = karas.filter((el) => {
		return pl.indexOf(el) < 0;
	});
	return sample(allKarasNotInCurrentPlaylist);
}

export async function deleteKara(kara_id) {
	const kara = await getKaraMini(kara_id);
	if (!kara) throw `Unknown kara ID ${kara_id}`;
	// Find out which series this karaoke is from, and delete them if no more karaoke depends on them
	const serieKaraIDs = await findSeriesKaraByKaraID(kara_id);
	// If kara_ids contains only one entry, it means the series won't have any more kara attached to it, so it's safe to remove it.
	for (const serieKara of serieKaraIDs) {
		if (serieKara.kara_ids.split(',').length <= 1) await deleteSerie(serieKara.serie_id);
	}
	// Remove files
	const conf = getConfig();
	const PathsMedias = conf.PathMedias.split('|');
	const PathsSubs = conf.PathSubs.split('|');
	const PathsKaras = conf.PathKaras.split('|');
	try {
		await asyncUnlink(await resolveFileInDirs(kara.mediafile, PathsMedias));
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing mediafile ${kara.mediafile} failed : ${err}`);
	}
	try {
		await asyncUnlink(await resolveFileInDirs(kara.karafile, PathsKaras));
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing karafile ${kara.karafile} failed : ${err}`);
	}
	if (kara.subfile !== 'dummy.ass') try {
		await asyncUnlink(await resolveFileInDirs(kara.subfile, PathsSubs));
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing subfile ${kara.subfile} failed : ${err}`);
	}
	compareKarasChecksum({silent: true});
	// Remove kara from database
	await deleteKaraDB(kara_id);
}

export async function getKara(kara_id, username, lang) {
	profile('getKaraInfo');
	const kara = await getKaraDB(kara_id, username, lang);
	let output = translateKaraInfo(kara, lang);
	const previewfile = await isPreviewAvailable(output[0].mediafile);
	if (previewfile) output[0].previewfile = previewfile;
	profile('getKaraInfo');
	return output;
}

export async function getKaraMini(kara_id) {
	return await getKaraMiniDB(kara_id);
}

export async function getKaraLyrics(kara_id) {
	const kara = await getKaraMini(kara_id);
	if (!kara) throw `Kara ${kara_id} unknown`;
	if (kara.subfile === 'dummy.ass') return 'Lyrics not available for this song';
	const ASS = await getASS(kara.subfile);
	if (ASS) return ASSToLyrics(ASS);
	return 'Lyrics not available for this song';
}

async function updateSeries(kara) {
	if (!kara.series) return true;
	let lang = 'und';
	if (kara.lang) lang = kara.lang.split(',')[0];
	let series = [];
	for (const s of kara.series.split(',')) {
		let langObj = {};
		langObj[lang] = s;
		let seriesObj = {
			name: s
		};
		seriesObj.i18n = {...langObj};
		series.push(await getOrAddSerieID(seriesObj));
	}
	await updateKaraSeries(kara.kara_id,series);
}

async function updateTags(kara) {
	// Create an array of tags to add for our kara
	let tags = [];
	if (kara.singer) kara.singer.split(',').forEach(t => tags.push({tag: t, type: tagTypes.singer}));
	if (kara.tags) kara.tags.split(',').forEach(t => tags.push({tag: t, type: tagTypes.misc}));
	if (kara.songwriter) kara.songwriter.split(',').forEach(t => tags.push({tag: t, type: tagTypes.songwriter}));
	if (kara.creator) kara.creator.split(',').forEach(t => tags.push({tag: t, type: tagTypes.creator}));
	if (kara.author) kara.author.split(',').forEach(t => tags.push({tag: t, type: tagTypes.author}));
	if (kara.lang) kara.lang.split(',').forEach(t => tags.push({tag: t, type: tagTypes.lang}));

	//Songtype is a little specific.
	tags.push({tag: karaTypes[kara.type].dbType, type: tagTypes.songtype});

	if (tags.length === 0) return true;
	for (const i in tags) {
		tags[i].id = await checkOrCreateTag(tags[i]);
	}
	return await updateKaraTags(kara.kara_id, tags);
}

export async function createKaraInDB(kara) {
	kara.kara_id = await addKara(kara);
	await Promise.all([
		updateTags(kara),
		updateSeries(kara)
	]);
	compareKarasChecksum({silent: true});
}

export async function editKaraInDB(kara) {
	await updateKara(kara);
	await Promise.all([
		updateTags(kara),
		updateSeries(kara)
	]);
	compareKarasChecksum({silent: true});
}

/**
 * Generate info to write in a .kara file from an object passed as argument by filtering out unnecessary fields and adding default values if needed.
 */
export function formatKara(karaData) {
	timestamp.round = true;
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
		dateadded: karaData.dateadded || timestamp.now(),
		datemodif: karaData.datemodif || timestamp.now(),
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
	series: function(value, attributes) {
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

export async function validateKaras() {
	try {
		const karaFiles = await extractAllKaraFiles();
		const karas = await readAllKaras(karaFiles);
		verifyKIDsUnique(karas);
		if (karas.some((kara) => {
			return kara.error;
		})) throw 'One kara failed validation process';
	} catch(err) {
		throw err;
	}
}

function verifyKIDsUnique(karas) {
	const KIDs = [];
	karas.forEach((kara) => {
		if (!KIDs.includes(kara.KID)) {
			KIDs.push(kara.KID);
		} else {
			logger.error(`[Kara] KID ${kara.KID} is not unique : duplicate found in karaoke ${kara.lang} - ${kara.series} - ${kara.type}${kara.order} - ${kara.title}`);
			throw `Duplicate KID found : ${kara.KID}`;
		}
	});
}

export function karaDataValidationErrors(karaData) {
	initValidators();
	return check(karaData, karaConstraintsV3);
}

export function verifyKaraData(karaData) {
	const validationErrors = karaDataValidationErrors(karaData);
	if (validationErrors) {
		throw `Karaoke data is not valid: ${JSON.stringify(validationErrors)}`;
	}
	// Version 2 is considered deprecated, so let's throw an error.
	if (karaData.version < 3) throw 'Karaoke version 2 or lower is deprecated';
}

/** Only MV or LIVE types don't have to have a series filled. */
export function serieRequired(karaType) {
	return karaType !== karaTypes.MV.type && karaType !== karaTypes.LIVE.type;
}

export async function getKaraHistory() {
	return await getKaraHistoryDB();
}

export async function getTop50(token, lang) {
	let karas = await getAllKaras(token.username, null, lang);
	karas = karas.filter(kara => kara.requested > 0);
	karas.sort((a,b) => {
		if (a.requested < b.requested) return -1;
		if (a.requested > b.requested) return 1;
		return 0;
	});
	return karas;
}

export async function getKaraViewcounts() {
	return await getKaraViewcountsDB();
}

export async function addViewcountKara(kara_id, kid) {
	profile('addViewcount');
	const ret = await addViewcount(kara_id,kid);
	profile('addViewcount');
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

export async function getKaras(filter, lang, from, size, searchType, searchValue, token) {
	try {
		profile('getKaras');
		const pl = await getAllKaras(token.username, filter, lang, searchType, searchValue);
		profile('formatList');
		const ret = formatKaraList(pl.slice(from, from + size), lang, from, pl.length);
		profile('formatList');
		profile('getKaras');
		return ret;
	} catch(err) {
		throw err;
	}
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