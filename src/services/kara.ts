import internet from 'internet-available';

import {	addPlayed,
	emptyOnlineRequested,
	getKaraMini as getKaraMiniDB,
	getYears as getYearsDB,
	insertOnlineRequested,
	selectAllKaras,
	selectAllKIDs,
} from '../dao/kara';
import {getASS} from '../lib/dao/karafile';
import { consolidateData, removeUnusedTagData } from '../lib/services/kara';
import { ASSLine } from '../lib/types/ass';
import { DBKara, DBKaraBase } from '../lib/types/database/kara';
import {KaraList, KaraParams, YearList} from '../lib/types/kara';
import { Token } from '../lib/types/user';
import {ASSToLyrics} from '../lib/utils/ass';
import { getConfig } from '../lib/utils/config';
import HTTP from '../lib/utils/http';
import { convert1LangTo2B } from '../lib/utils/langs';
import logger, {profile} from '../lib/utils/logger';
import sentry from '../utils/sentry';
import { getTagNameInLanguage } from './tag';

let popularKaraFetchIntervalID: any;

export function initFetchPopularSongs() {
	if (!popularKaraFetchIntervalID) popularKaraFetchIntervalID = setInterval(fetchPopularSongs, 3600000);
	fetchPopularSongs();
}

/* Returns an array of unknown karaokes. If array is empty, all songs in "karas" are present in database */
export async function isAllKaras(karas: string[]): Promise<string[]> {
	const allKaras = await selectAllKIDs();
	return karas.filter(kid => !allKaras.includes(kid));
}

export async function getKara(kid: string, token: Token, lang?: string): Promise<DBKara> {
	profile('getKaraInfo');
	if (!kid) throw {code: 400};
	try {
		const res = await selectAllKaras({
			username: token.username.toLowerCase(),
			filter: null,
			q: `k:${kid}`,
			lang: lang,
			blacklist: false
		});
		return res[0];
	} catch(err) {
		sentry.error(err);
		throw err;
	} finally {
		profile('getKaraInfo');
	}


}

export function getKaraMini(kid: string): Promise<DBKaraBase> {
	return getKaraMiniDB(kid);
}

export async function getKaraLyrics(kid: string): Promise<ASSLine[]> {
	const kara = await getKaraMini(kid);
	if (!kara) throw {code: 404, msg: `Kara ${kid} unknown`};
	if (!kara.subfile) return;
	const ASS = await getASS(kara.subfile, kara.repository);
	if (ASS) return ASSToLyrics(ASS);
	return;
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

export function getAllKaras(): Promise<KaraList> {
	// Simple function to return all karaokes, compatibility with KM Server
	return getKaras({from: 0, size: 99999999, token: {username: 'admin', role: 'admin'}});
}

export async function getKaras(params: KaraParams): Promise<KaraList> {
	profile('getKaras');
	try {
		const pl = await selectAllKaras({
			username: params.token?.username || 'admin',
			filter: params.filter || '',
			order: params.order,
			q: params.q,
			from: params.from || 0,
			size: params.size || 9999999999,
			random: params.random,
			blacklist: params.blacklist
		});
		profile('formatList');
		const count = pl.length > 0 ? pl[0].count : 0;
		const ret = formatKaraList(pl, params.from || 0, count);
		profile('formatList');
		return ret;
	} catch(err) {
		sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
		sentry.error(err);
		throw err;
	} finally {
		profile('getKaras');
	}
}

export function formatKaraList(karaList: any, from: number, count: number): KaraList {
	karaList = removeUnusedTagData(karaList);
	const {i18n, avatars, data} = consolidateData(karaList);
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

/** Returns a string with series or singers with their correct i18n.*/
export function getSongSeriesSingers(kara: DBKara): string {
	if (kara.series?.length > 0) {
		const mode = getConfig().Frontend.SeriesLanguageMode;
		if (mode === 0) { // Original name
			return kara.series[0]?.name;
		} else if (mode === 1) { // Based on song language
			return getTagNameInLanguage(kara.series[0], kara.langs[0].name, 'eng');
		} else { // All other cases, based on application defaultLocale or English if unavailable
			const lang = convert1LangTo2B(getConfig().App.Language) || 'eng';
			return getTagNameInLanguage(kara.series[0], lang, 'eng');
		}
	} else {
		return kara.singers.map(s => s.name).join(', ');
	}
}

export function getSongVersion(kara: DBKara): string {
	if (kara.versions?.length > 0) {
		const mode = getConfig().Frontend.SeriesLanguageMode;
		const versions = kara.versions.map(v => {
			let ret = '';
			switch(mode) {
				case 0:
				// Original name
					ret = v.name;
					break;
				case 1:
				// Name according to song language
					ret = v.i18n ? v.i18n[kara.langs[0].name] : null || v.i18n?.eng || v.name;
					break;
				case 2:
				case 3:
				default:
					const lang = convert1LangTo2B(getConfig().App.Language) || 'eng';
					ret = v.i18n[lang] || v.i18n?.eng || v.name;
					break;
			}
			return `[${ret}]`;
		});
		return ` ${versions.join(' ')}`;
	} else {
		return '';
	}
}

export async function fetchPopularSongs() {
	try {
		const conf = getConfig();
		profile('initPopularSongs');
		const popularKIDs: Map<string, string> = new Map();
		try {
			await internet();
		} catch(err) {
			logger.warn('Internet not available, cannot init popular songs', {service: 'Kara', obj: err});
			profile('initPopularSongs');
			throw err;
		}
		const repos = conf.System.Repositories.filter(r => r.Enabled && r.Online);
		for (const repo of repos) {
			try {
				const res = await HTTP.get(`https://${repo.Name}/api/karas/search?order=requested`);
				const karas = JSON.parse(res.body);
				for (const kara of karas.content) {
					popularKIDs.set(kara.kid, kara.requested);
				}
			} catch(err) {
				logger.warn(`Failed to fetch popular songs from ${repo.Name}`);
				throw err;
			}
		}
		await emptyOnlineRequested();
		const kidRequested = Array.from(popularKIDs.entries());
		await insertOnlineRequested(kidRequested);
	} catch(err) {
		// Non fatal
	} finally {
		profile('initPopularSongs');
	}
}
