import {tagTypes} from '../lib/utils/constants';
import {ASSToLyrics} from '../lib/utils/ass';
import {refreshTags, refreshKaraTags, refreshAllKaraTags} from '../lib/dao/tag';
import { saveSetting } from '../lib/dao/database';
import { refreshYears, refreshKaras } from '../lib/dao/kara';
import { getASS } from '../lib/dao/karafile';
import {selectAllKaras,
	getYears as getYearsDB,
	getKaraMini as getKaraMiniDB,
	deleteKara as deleteKaraDB,
	addKara,
	updateKara,
	addPlayed,
	getKaraHistory as getKaraHistoryDB,
	selectAllKIDs
} from '../dao/kara';
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
		const kara = await getKara(kid, {role: 'admin', username: 'admin'});
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
		for (const tid of kara.tid) {
			const tag = await getTag(tid.split('~')[0]);
			// Modify tag file we just copied to change its repo
			tag.repository = repoName;
			tag.modified_at = new Date().toISOString();
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
	const res = await selectAllKaras({
		username: token.username,
		filter: null,
		mode: 'kid',
		modeValue: kid,
		lang: lang,
		admin: token.role === 'admin'
	});
	profile('getKaraInfo');
	return res[0];
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
	await updateTags(kara);
	if (opts.refresh) await refreshKarasAfterDBChange(true);
}

export async function editKaraInDB(kara: Kara, opts = {
	refresh: true
}) {
	const promises = [updateKara(kara)];
	if (kara.newTags) promises.push(updateTags(kara));
	await Promise.all(promises);
	if (opts.refresh) await refreshKarasAfterDBChange(kara.newTags);
}

export async function getKaraHistory(): Promise<DBKaraHistory[]> {
	// Called by system route
	return await getKaraHistoryDB();
}

export async function getTop50(token: Token, lang?: string): Promise<DBKara[]> {
	// Called by system route
	return await selectAllKaras({
		username: token.username,
		lang: lang,
		filter: null,
		mode: 'requested'
	});
}

export async function getKaraPlayed(token: Token, lang: string, from: number, size: number): Promise<DBKara[]> {
	// Called by system route
	return await selectAllKaras({
		username: token.username,
		filter: null,
		mode: 'played',
		from: from,
		size: size,
		lang: lang
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
		mode: params.mode,
		modeValue: params.modeValue,
		from: params.from || 0,
		size: params.size || 9999999999,
		admin: params.token.role === 'admin',
		random: params.random
	});
	profile('formatList');
	const count = pl.length > 0 ? pl[0].count : 0;
	const ret = formatKaraList(pl, params.from || 0, count);
	profile('formatList');
	profile('getKaras');
	return ret;
}

export function formatKaraList(karaList: any, from: number, count: number): KaraList {
	let {i18n, avatars, data} = consolidateData(karaList);
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

export async function refreshKarasAfterDBChange(newTags: boolean) {
	profile('RefreshAfterDBChange');
	logger.debug('[DB] Refreshing DB after kara change');
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
	const karaDB = await getKara(karaData.kid, {role: 'admin', username: 'admin'});
	if (karaDB) {
		await editKaraInDB(karaData, { refresh: false });
		try {
			const oldKaraFile = (await resolveFileInDirs(karaDB.karafile, resolvedPathRepos('Karas', karaDB.repository)))[0];
			if (karaDB.karafile !== karaData.karafile) {
				await asyncUnlink(oldKaraFile);
				removeKaraInStore(oldKaraFile);
				addKaraToStore(file);
			} else {
				editKaraInStore(oldKaraFile);
			}
		} catch(err) {
			logger.warn(`[Kara] Failed to remove ${karaDB.karafile}, does it still exist?`);
		}
		if (karaDB.mediafile !== karaData.mediafile) try {
			await asyncUnlink((await resolveFileInDirs(karaDB.mediafile, resolvedPathRepos('Medias', karaDB.repository)))[0]);
		} catch(err) {
			logger.warn(`[Kara] Failed to remove ${karaDB.mediafile}, does it still exist?`);
		}
		if (karaDB.subfile && karaDB.subfile !== karaData.subfile) try {
			await asyncUnlink((await resolveFileInDirs(karaDB.subfile, resolvedPathRepos('Lyrics', karaDB.repository)))[0]);
		} catch(err) {
			logger.warn(`[Kara] Failed to remove ${karaDB.subfile}, does it still exist?`);
		}
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
		kara.data.modified_at = new Date().toISOString();
		await asyncWriteFile(karaPath, JSON.stringify(kara, null, 2));
		await editKaraInStore(karaPath);
	}
}

export function getSeriesSingers(kara: DBKara) {
	let series = '';
	if (kara.series[0]) {
		const locale = getState().defaultLocale;
		const lang = where('1', locale);
		series = kara.series[0].i18n[lang['2B']] || kara.series[0].i18n.eng || kara.series[0].name;
	} else {
		series = kara.singers.map(s => s.name).join(', ');
	}
	return series;
}
