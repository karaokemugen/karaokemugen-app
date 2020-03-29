import {tagTypes} from '../lib/utils/constants';
import {ASSToLyrics} from '../lib/utils/ass';
import {refreshTags, refreshKaraTags, refreshAllKaraTags} from '../lib/dao/tag';
import {refreshKaraSeriesLang, refreshSeries, refreshKaraSeries} from '../lib/dao/series';
import { saveSetting } from '../lib/dao/database';
import { refreshYears, refreshKaras } from '../lib/dao/kara';
import { getASS } from '../lib/dao/karafile';
import {selectAllKaras,
	getYears as getYearsDB,
	getKara as getKaraDB,
	getKaraMini as getKaraMiniDB,
	deleteKara as deleteKaraDB,
	addKara,
	updateKara,
	addPlayed,
	getKaraHistory as getKaraHistoryDB,
	selectAllKIDs
} from '../dao/kara';
import {updateKaraSeries} from '../dao/series';
import {updateKaraTags} from '../dao/tag';
import {basename} from 'path';
import {profile} from '../lib/utils/logger';
import {Kara, KaraParams, KaraList, YearList, KaraFileV4} from '../lib/types/kara';
import {asyncUnlink, resolveFileInDirs, asyncCopy, asyncReadFile, asyncWriteFile} from '../lib/utils/files';
import logger from 'winston';
import { editKaraInStore, removeKaraInStore, getStoreChecksum, sortKaraStore, addKaraToStore } from '../dao/dataStore';
import { DBKaraHistory } from '../types/database/kara';
import { DBKara, DBKaraBase } from '../lib/types/database/kara';
import {parseKara, getDataFromKaraFile} from '../lib/dao/karafile';
import { Token } from '../lib/types/user';
import { consolidateData, removeUnusedTagData } from '../lib/services/kara';
import { getState } from '../utils/state';
import {where} from 'langs';
import { resolvedPathRepos } from '../lib/utils/config';
import { resolve } from 'path';
import { getSerie } from './series';
import { writeSeriesFile } from '../lib/dao/seriesfile';
import { writeTagFile } from '../lib/dao/tagfile';
import { getTag } from './tag';
import { emitWS } from '../lib/utils/ws';

/* Returns an array of unknown karaokes. If array is empty, all songs in "karas" are present in database */
export async function isAllKaras(karas: string[]): Promise<string[]> {
	const allKaras = await selectAllKIDs();
	return karas.filter(kid => !allKaras.includes(kid));
}

export async function copyKaraToRepo(kid: string, repoName: string) {
	try {
		const kara = await getKaraDB(kid, 'admin', null, 'admin');
		const oldRepoName = kara.repository;
		kara.repository = repoName;
		const tasks = [];
		const karaFiles = await resolveFileInDirs(kara.karafile, resolvedPathRepos('Karas', oldRepoName));
		tasks.push(editKaraInDB(kara));
		tasks.push(asyncCopy(
			karaFiles[0],
			resolve(resolvedPathRepos('Karas', repoName)[0], kara.karafile),
			{ overwrite: true }
		));
		// End of naughtiness.
		const mediaFiles = await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', oldRepoName));
		tasks.push(asyncCopy(
			mediaFiles[0],
			resolve(resolvedPathRepos('Medias', repoName)[0], kara.mediafile),
			{ overwrite: true }
		));
		const lyricsFiles = await resolveFileInDirs(kara.subfile, resolvedPathRepos('Lyrics', oldRepoName));
		tasks.push(asyncCopy(
			lyricsFiles[0],
			resolve(resolvedPathRepos('Lyrics', repoName)[0], kara.subfile),
			{ overwrite: true }
		));
		// Now fetch all SIDs
		for (const sid of kara.sid) {
			if (sid) {
				const series = await getSerie(sid);
				// Modify serie file we just copied to change its repo
				series.repository = repoName;
				tasks.push(writeSeriesFile(series, resolvedPathRepos('Series', repoName)[0]));
			}
		}
		for (const tid of kara.tid) {
			const tag = await getTag(tid.split('~')[0]);
			// Modify tag file we just copied to change its repo
			tag.repository = repoName;
			tasks.push(writeTagFile(tag, resolvedPathRepos('Tags', repoName)[0]));
		}
		await Promise.all(tasks);
		// Until issue #497 is resolved, we're going to do something naughty.
		const karaFile = resolve(resolvedPathRepos('Karas', repoName)[0], kara.karafile);
		const karaFileRaw = await asyncReadFile(karaFile);
		const karaFileData: KaraFileV4 = JSON.parse(karaFileRaw);
		karaFileData.data.repository = repoName;
		await asyncWriteFile(karaFile, JSON.stringify(karaFileData, null, 2), 'utf-8');
	} catch(err) {
		throw err;
	}
}

export async function deleteKara(kid: string, refresh = true) {
	const kara = await getKaraMini(kid);
	if (!kara) throw `Unknown kara ID ${kid}`;
	// Remove files
	await deleteKaraDB(kid);
	emitWS('statsRefresh');
	try {
		await asyncUnlink((await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository)))[0]);
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing mediafile ${kara.mediafile} failed : ${err}`);
	}
	try {
		await asyncUnlink((await resolveFileInDirs(kara.karafile, resolvedPathRepos('Karas', kara.repository)))[0]);
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing karafile ${kara.karafile} failed : ${err}`);
	}
	if (kara.subfile) try {
		await asyncUnlink((await resolveFileInDirs(kara.subfile, resolvedPathRepos('Lyrics', kara.repository)))[0]);
	} catch(err) {
		logger.warn(`[Kara] Non fatal : Removing subfile ${kara.subfile} failed : ${err}`);
	}

	removeKaraInStore(kara.kid);
	saveSetting('baseChecksum', getStoreChecksum());
	// Remove kara from database
	logger.info(`[Kara] Song ${kara.karafile} removed`);

	if (refresh) {
		await refreshKaras();
		refreshTags();
		refreshAllKaraTags();
	}
}


export async function getKara(kid: string, token: Token, lang?: string): Promise<DBKara> {
	profile('getKaraInfo');
	let kara = await getKaraDB(kid, token.username, lang, token.role);
	if (!kara) throw `Kara ${kid} unknown`;
	profile('getKaraInfo');
	return kara;
}

export async function getKaraMini(kid: string): Promise<DBKaraBase> {
	return await getKaraMiniDB(kid);
}

export async function getKaraLyrics(kid: string): Promise<string[]> {
	const kara = await getKaraMini(kid);
	if (!kara) throw `Kara ${kid} unknown`;
	if (!kara.subfile) return ['Lyrics not available for this song'];
	const ASS = await getASS(kara.subfile, kara.repository);
	if (ASS) return ASSToLyrics(ASS);
	return ['Lyrics not available for this song'];
}

async function updateSeries(kara: Kara) {
	if (!kara.sids) return;
	await updateKaraSeries(kara.kid, kara.sids);
}

export async function updateTags(kara: Kara) {
	const tagsAndTypes = [];
	for (const type of Object.keys(tagTypes)) {
		if (kara[type]) for (const tag of kara[type]) {
			tagsAndTypes.push({tid: tag.tid, type: tagTypes[type]});
		}
	}
	await updateKaraTags(kara.kid, tagsAndTypes);
}

export async function createKaraInDB(kara: Kara, opts = {refresh: true}) {
	await addKara(kara);
	emitWS('statsRefresh');
	await Promise.all([
		updateSeries(kara),
		updateTags(kara)
	]);
	if (opts.refresh) await refreshKarasAfterDBChange(true, true);
}

export async function editKaraInDB(kara: Kara, opts = {
	refresh: true
}) {
	const promises = [updateKara(kara)];
	if (kara.newSeries) promises.push(updateSeries(kara));
	if (kara.newTags) promises.push(updateTags(kara));
	await Promise.all(promises);
	if (opts.refresh) await refreshKarasAfterDBChange(kara.newSeries, kara.newTags);
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

export async function getYears(): Promise<YearList> {
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
	return await getKaras({from: 0, size: 99999999, token: {username: 'admin', role: 'admin'}});
}

export async function getKaras(params: KaraParams): Promise<KaraList> {
	profile('getKaras');
	const pl = await selectAllKaras({
		username: params.token.username,
		filter: params.filter || '',
		lang: params.lang,
		mode: params.mode,
		modeValue: params.modeValue,
		from: params.from || 0,
		size: params.size || 9999999999,
		admin: params.token.role === 'admin',
		random: params.random
	});
	profile('formatList');
	const count = pl.length > 0 ? pl[0].count : 0;
	const ret = formatKaraList(pl, params.from || 0, count, params.lang);
	profile('formatList');
	profile('getKaras');
	return ret;
}

export function formatKaraList(karaList: any, from: number, count: number, lang: string): KaraList {
	// Get i18n from all tags found in all elements, and remove it
	const languages = [where('1', getState().EngineDefaultLocale)['2B']];
	languages.push(where('1', lang || getState().EngineDefaultLocale)['2B']);
	languages.push('eng'); // English is mandatory
	let {i18n, avatars, data} = consolidateData(karaList, languages);
	karaList = removeUnusedTagData(karaList);
	return {
		infos: {
			count: count,
			from: from,
			to: from + data.length
		},
		i18n: i18n,
		avatars: avatars,
		content: data
	};
}

export async function refreshKarasAfterDBChange(newSeries: boolean, newTags: boolean) {
	profile('RefreshAfterDBChange');
	logger.debug('[DB] Refreshing DB after kara change');
	if (newSeries) {
		await refreshKaraSeries();
		await refreshSeries();
		await refreshKaraSeriesLang();
	}
	if (newTags) {
		await refreshKaraTags();
		await refreshTags();
	}
	await refreshKaras();
	await refreshYears();
	logger.debug('[DB] Done refreshing DB after kara change');
	profile('RefreshAfterDBChange');
}

export async function integrateKaraFile(file: string) {
	const karaFileData = await parseKara(file);
	const karaFile = basename(file);
	const karaData = await getDataFromKaraFile(karaFile, karaFileData);
	const karaDB = await getKaraDB(karaData.kid, 'admin', null, 'admin');
	if (karaDB) {
		await editKaraInDB(karaData, { refresh: false });
		const oldKaraFile = (await resolveFileInDirs(karaDB.karafile, resolvedPathRepos('Karas', karaDB.repository)))[0];
		if (karaDB.karafile !== karaData.karafile) {
			await asyncUnlink(oldKaraFile);
			removeKaraInStore(oldKaraFile);
			addKaraToStore(file);
		} else {
			editKaraInStore(oldKaraFile);
		}
		if (karaDB.mediafile !== karaData.mediafile) await asyncUnlink((await resolveFileInDirs(karaDB.mediafile, resolvedPathRepos('Medias', karaDB.repository)))[0]);
		if (karaDB.subfile && karaDB.subfile !== karaData.subfile) await asyncUnlink((await resolveFileInDirs(karaDB.subfile, resolvedPathRepos('Lyrics', karaDB.repository)))[0]);
		sortKaraStore();

	} else {
		await createKaraInDB(karaData, { refresh: false });
	}
	saveSetting('baseChecksum', getStoreChecksum());
}

export async function removeSerieInKaras(sid: string, karas: KaraList) {
	logger.info(`[Kara] Removing serie ${sid} in .kara.json files`);
	const karasWithSerie = karas.content.filter((k: any) => {
		if (k.sid && k.sid.includes(sid)) return true;
	});
	if (karasWithSerie.length > 0) logger.info(`[Kara] Removing in ${karasWithSerie.length} files`);
	for (const karaWithSerie of karasWithSerie) {
		logger.info(`[Kara] Removing in ${karaWithSerie.karafile}...`);
		const karaPath = (await resolveFileInDirs(karaWithSerie.karafile, resolvedPathRepos('Karas', karaWithSerie.repository)))[0];
		const kara = await parseKara(karaPath[0]);
		kara.data.sids = kara.data.sids.filter((s: any) => s !== sid);
		kara.data.modified_at = new Date().toString();
		await asyncWriteFile(karaPath, JSON.stringify(kara, null, 2));
		await editKaraInStore(karaPath);
	}
}