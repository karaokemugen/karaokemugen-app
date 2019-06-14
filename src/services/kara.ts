import {tagTypes, karaTypes} from '../lib/utils/constants';
import {ASSToLyrics} from '../utils/ass';
import {refreshTags, refreshKaraTags} from '../lib/dao/tag';
import {refreshKaraSeriesLang, refreshSeries, refreshKaraSeries} from '../lib/dao/series';
import { refreshAll, saveSetting } from '../lib/dao/database';
import { refreshYears, refreshKaras } from '../lib/dao/kara';
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
	selectAllKIDs
} from '../dao/kara';
import {updateKaraSeries} from '../dao/series';
import {updateKaraTags, checkOrCreateTag} from '../dao/tag';
import langs from 'langs';
import {getLanguage} from 'iso-countries-languages';
import {basename, resolve} from 'path';
import {profile} from '../lib/utils/logger';
import {Kara, KaraParams, KaraList} from '../lib/types/kara';
import {Series} from '../lib/types/series';
import { getOrAddSerieID, deleteSerie } from './series';
import {asyncUnlink, resolveFileInDirs} from '../lib/utils/files';
import {getConfig, resolvedPathMedias, resolvedPathKaras, resolvedPathSubs} from '../lib/utils/config';
import logger from 'winston';
import {getState} from '../utils/state';
import { editKaraInStore, removeKaraInStore, getStoreChecksum } from '../dao/dataStore';
import { DBKara, DBKaraBase, DBKaraHistory } from '../types/database/kara';
import {parseKara, getDataFromKaraFile} from '../lib/dao/karafile';
import { isPreviewAvailable } from '../lib/utils/previews';
import { Token } from '../lib/types/user';

export async function isAllKaras(karas: string[]): Promise<string[]> {
	// Returns an array of unknown karaokes
	// If array is empty, all songs in "karas" are present in database
	const allKaras = await selectAllKIDs();
	return karas.filter(kid => !allKaras.includes(kid));
}

export function translateKaraInfo(karas: DBKara|DBKara[], lang?: string): DBKara[] {
	// If lang is not provided, assume we're using node's system locale
	if (!lang) lang = getState().EngineDefaultLocale;
	// Test if lang actually exists in ISO639-1 format
	if (!langs.has('1',lang)) throw `Unknown language : ${lang}`;
	// Instanciate a translation object for our needs with the correct language.
	const i18n = require('i18n'); // Needed for its own translation instance
	i18n.configure({
		directory: resolve(__dirname,'../locales'),
	});
	i18n.setLocale(lang);

	// We need to read the detected locale in ISO639-1
	const detectedLocale = langs.where('1',lang);
	// If the kara list provided is not an array (only a single karaoke)
	// Put it into an array first
	if (!Array.isArray(karas)) karas = [karas];
	karas.forEach((kara, index) => {
		kara.languages = kara.languages || [];
		if (kara.languages.length > 0) {
			let languages = [];
			let langdata: any;
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
					langdata = langs.where('2B', karalang.name);
					if (langdata === undefined) {
						languages.push(i18n.__('UNKNOWN_LANGUAGE'));
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

export async function deleteKara(kid: string, refresh = true) {
	const kara = await getKaraMini(kid);
	if (!kara) throw `Unknown kara ID ${kid}`;

	// If kara_ids contains only one entry, it means the series won't have any more kara attached to it, so it's safe to remove it.
	const karas = await selectAllKaras({
		username: 'admin',
		mode: 'search',
		modeValue: `s:${kara.sid}`,
		admin: true
	});
	if (karas.length <= 1 && kara.sid.length > 0) {
		for(const sid of kara.sid) {
			try {
				await deleteSerie(sid);
			} catch(e) {
				logger.error(`[Kara] Unable to remove all series from a karaoke : ${e}`);
				//throw e;
			}
		}
	}

	// Remove files

	try {
		await asyncUnlink(await resolveFileInDirs(kara.mediafile, resolvedPathMedias()));
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing mediafile ${kara.mediafile} failed : ${err}`);
	}
	try {
		await asyncUnlink(await resolveFileInDirs(kara.karafile, resolvedPathKaras()));
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing karafile ${kara.karafile} failed : ${err}`);
	}
	if (kara.subfile) try {
		await asyncUnlink(await resolveFileInDirs(kara.subfile, resolvedPathSubs()));
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing subfile ${kara.subfile} failed : ${err}`);
	}

	removeKaraInStore(kara.kid);
	saveSetting('baseChecksum', getStoreChecksum());
	// Remove kara from database
	await deleteKaraDB(kid);
	logger.info(`[Kara] Song ${kara.karafile} removed`);

	if (refresh) delayedDbRefreshViews(2000);
}

let delayedDbRefreshTimeout = null;

export async function delayedDbRefreshViews(ttl = 100) {
	clearTimeout(delayedDbRefreshTimeout);
	delayedDbRefreshTimeout = setTimeout(refreshAll,ttl);
}

export async function getKara(kid: string, token: Token, lang?: string): Promise<DBKara[]> {
	profile('getKaraInfo');
	const kara = await getKaraDB(kid, token.username, lang, token.role);
	if (!kara) throw `Kara ${kid} unknown`;
	let output: DBKara[] = translateKaraInfo(kara, lang);
	const previewfile = await isPreviewAvailable(output[0].kid, output[0].mediasize);
	if (previewfile) output[0].previewfile = previewfile;
	profile('getKaraInfo');
	return output;
}

export async function getKaraMini(kid: string): Promise<DBKaraBase> {
	return await getKaraMiniDB(kid);
}

export async function getKaraLyrics(kid: string): Promise<string[]> {
	const kara = await getKaraMini(kid);
	if (!kara) throw `Kara ${kid} unknown`;
	if (kara.subfile === 'dummy.ass') return ['Lyrics not available for this song'];
	const ASS = await getASS(kara.subfile);
	if (ASS) return ASSToLyrics(ASS);
	return ['Lyrics not available for this song'];
}

async function updateSeries(kara: Kara) {
	if (!kara.series) return true;
	let lang = 'und';
	if (kara.lang) lang = kara.lang[0];
	let sids = [];
	for (const s of kara.series) {
		let langObj = {};
		langObj[lang] = s;
		let seriesObj: Series = {
			name: s
		};
		seriesObj.i18n = {...langObj};
		const sid = await getOrAddSerieID(seriesObj);
		if (sid) sids.push(sid);
	}
	await updateKaraSeries(kara.kid,sids);
}

async function updateTags(kara: Kara) {
	// Create an array of tags to add for our kara
	let tags = [];
	// Remove this when we'll update .kara file format to version 4
	kara.singer
		? kara.singer.forEach(t => tags.push({tag: t, type: tagTypes.singer}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.singer});
	kara.tags
		? kara.tags.forEach(t => tags.push({tag: t, type: tagTypes.misc}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.misc});
	kara.songwriter
		? kara.songwriter.forEach(t => tags.push({tag: t, type: tagTypes.songwriter}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.songwriter});
	kara.creator
		? kara.creator.forEach(t => tags.push({tag: t, type: tagTypes.creator}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.creator});
	kara.author
		? kara.author.forEach(t => tags.push({tag: t, type: tagTypes.author}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.author});
	kara.lang
		? kara.lang.forEach(t => tags.push({tag: t, type: tagTypes.lang}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.lang});
	kara.groups
		? kara.groups.forEach(t => tags.push({tag: t, type: tagTypes.group}))
		: tags.push({tag: 'NO_TAG', type: tagTypes.group});

	//Songtype is a little specific.
	tags.push({tag: karaTypes[kara.type].dbType, type: tagTypes.songtype});

	if (tags.length === 0) return true;
	for (const i in tags) {
		tags[i].id = await checkOrCreateTag(tags[i]);
	}
	return await updateKaraTags(kara.kid, tags);
}

export async function createKaraInDB(kara: Kara, opts = {refresh: true}) {
	await addKara(kara);
	await Promise.all([
		updateTags(kara),
		updateSeries(kara)
	]);
	if (opts.refresh) await refreshKarasAfterDBChange();
}

export async function editKaraInDB(kara: Kara, opts = {
	refresh: true
}) {
	await Promise.all([
		updateTags(kara),
		updateSeries(kara),
		updateKara(kara)
	]);
	if (opts.refresh) await refreshKarasAfterDBChange();
}

export async function getKaraHistory(): Promise<DBKaraHistory[]> {
	// Called by system route
	return await getKaraHistoryDB();
}

export async function getTop50(token: Token, lang: string): Promise<DBKara[]> {
	// Called by system route
	return await selectAllKaras({
		username: token.username,
		filter: null,
		lang: lang,
		mode: 'requested'
	});
}

export async function getKaraPlayed(token: Token, lang: string, from: number, size: number): Promise<DBKara[]> {
	// Called by system route
	return await selectAllKaras({
		username: token.username,
		filter: null,
		lang: lang,
		mode: 'played',
		from: from,
		size: size
	});
}

export async function addPlayedKara(kid: string) {
	profile('addPlayed');
	await addPlayed(kid);
	profile('addPlayed');
}

export async function getYears(): Promise<KaraList> {
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

export async function getAllKaras(): Promise<KaraList> {
	// Simple function to return all karaokes, compatibility with KM Server
	return await getKaras({token: {username: 'admin', role: 'admin'}});
}

export async function getKaras(params: KaraParams): Promise<KaraList> {
	profile('getKaras');
	const pl = await selectAllKaras({
		username: params.token.username,
		filter: params.filter,
		lang: params.lang,
		mode: params.mode,
		modeValue: params.modeValue,
		from: params.from,
		size: params.size,
		admin: params.token.role === 'admin',
		random: params.random
	});
	profile('formatList');
	const ret = formatKaraList(pl.slice(params.from, params.from + params.size), params.lang, params.from, pl.length);
	profile('formatList');
	profile('getKaras');
	return ret;
}

export function formatKaraList(karaList: DBKara[], lang: string, from: number, count: number): KaraList {
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

export async function refreshKarasAfterDBChange() {
	await Promise.all([
		refreshKaraSeries(),
		refreshKaraTags()
	]);
	await refreshKaras();
	refreshKaraSeriesLang();
	refreshSeries();
	refreshYears();
	refreshTags();
}

export async function integrateKaraFile(file: string) {
	const karaFileData = await parseKara(file);
	const karaFile = basename(file);
	const karaData = await getDataFromKaraFile(karaFile, karaFileData)
	const karaDB = await getKaraDB(karaData.kid, 'admin', null, 'admin');
	if (karaDB) {
		await editKaraInDB(karaData, { refresh: false });
		if (karaDB[0].karafile !== karaData.karafile) await asyncUnlink(await resolveFileInDirs(karaDB[0].karafile, getConfig().System.Path.Karas));
		if (karaDB[0].mediafile !== karaData.mediafile) await asyncUnlink(await resolveFileInDirs(karaDB[0].mediafile, getConfig().System.Path.Medias));
		if (karaDB[0].subfile !== 'dummy.ass' && karaDB[0].subfile !== karaData.subfile) await asyncUnlink(await resolveFileInDirs(karaDB[0].subfile, getConfig().System.Path.Lyrics));
	} else {
		await createKaraInDB(karaData, { refresh: false });
	}
	editKaraInStore(karaData.kid, karaFileData);
	saveSetting('baseChecksum', getStoreChecksum());
}