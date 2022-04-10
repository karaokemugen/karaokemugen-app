import internet from 'internet-available';

import { getStats } from '../dao/database';
import {
	insertOnlineRequested,
	insertPlayed,
	selectAllKaras,
	selectAllKarasMicro,
	selectAllKIDs,
	selectYears,
	truncateOnlineRequested,
} from '../dao/kara';
import { getASS } from '../lib/dao/karafile';
import { consolidateData, removeUnusedTagData } from '../lib/services/kara';
import { ASSLine } from '../lib/types/ass';
import { DBKara } from '../lib/types/database/kara';
import { KaraList, KaraParams, YearList } from '../lib/types/kara';
import { JWTTokenWithRoles, OldJWTToken } from '../lib/types/user';
import { ASSToLyrics } from '../lib/utils/ass';
import { getConfig } from '../lib/utils/config';
import HTTP from '../lib/utils/http';
import { convert1LangTo2B } from '../lib/utils/langs';
import logger, { profile } from '../lib/utils/logger';
import { adminToken } from '../utils/constants';
import sentry from '../utils/sentry';
import { getState } from '../utils/state';
import { getTagNameInLanguage } from './tag';

const service = 'Kara';

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

export async function getKara(kid: string, token: OldJWTToken | JWTTokenWithRoles, lang?: string): Promise<DBKara> {
	profile('getKaraInfo');
	if (!kid) throw { code: 400 };
	try {
		const res = await selectAllKaras({
			username: token.username.toLowerCase(),
			q: `k:${kid}`,
			lang,
			blacklist: false,
			ignoreCollections: true,
		});
		return res[0];
	} catch (err) {
		sentry.error(err);
		throw err;
	} finally {
		profile('getKaraInfo');
	}
}

export async function getKaraLyrics(kid: string): Promise<ASSLine[]> {
	const kara = await getKara(kid, adminToken);
	if (!kara) throw { code: 404, msg: `Kara ${kid} unknown` };
	if (!kara.subfile) return;
	const ASS = await getASS(kara.subfile, kara.repository);
	if (ASS) return ASSToLyrics(ASS);
}

export async function addPlayedKara(kid: string) {
	profile('addPlayed');
	await insertPlayed(kid);
	profile('addPlayed');
}

export async function getYears(): Promise<YearList> {
	const years = await selectYears();
	return {
		content: years,
		infos: {
			from: 0,
			to: years.length,
			count: years.length,
		},
	};
}

export async function getKarasMicro(kids: string[]) {
	profile('getKarasMicro');
	try {
		const pl = await selectAllKarasMicro({
			q: `k:${kids.join(',')}`,
		});
		return pl;
	} catch (err) {
		sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
		sentry.error(err);
		throw err;
	} finally {
		profile('getKarasMicro');
	}
}

export async function getKaras(params: KaraParams): Promise<KaraList> {
	profile('getKaras');
	try {
		const pl = await selectAllKaras({
			...params,
			username: params.token?.username || 'admin',
		});
		profile('formatList');
		const count = pl.length > 0 ? pl[0].count : 0;
		const ret = formatKaraList(pl, params.from || 0, count);
		profile('formatList');
		return ret;
	} catch (err) {
		sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
		sentry.error(err);
		throw err;
	} finally {
		profile('getKaras');
	}
}

export function formatKaraList(karaList: any, from: number, count: number): KaraList {
	karaList = removeUnusedTagData(karaList);
	const { i18n, avatars, data } = consolidateData(karaList);
	return {
		infos: {
			count,
			from,
			to: from + data.length,
		},
		i18n,
		avatars,
		content: data,
	};
}

/** Returns a string with series or singers with their correct i18n. */
export function getSongSeriesSingers(kara: DBKara): string {
	const langs = [getConfig().Player.Display.SongInfoLanguage, convert1LangTo2B(getState().defaultLocale), 'eng'];
	if (kara.series?.length > 0) {
		return getTagNameInLanguage(kara.series[0], langs);
	}
	return kara.singers.map(s => getTagNameInLanguage(s, langs)).join(', ');
}

/** Get kara's default title */
export function getSongTitle(kara: DBKara): string {
	const lang = getConfig().Player.Display.SongInfoLanguage || convert1LangTo2B(getState().defaultLocale);
	return kara.titles[lang] || kara.titles[kara.titles_default_language];
}

export function getSongVersion(kara: DBKara): string {
	if (kara.versions?.length > 0) {
		const versions = kara.versions.map(v => {
			const lang = convert1LangTo2B(getState().defaultLocale) || 'eng';
			return `[${v.i18n[lang] || v.i18n?.eng || v.i18n?.qjr || v.name}]`;
		});
		return ` ${versions.join(' ')}`;
	}
	return '';
}

export async function fetchPopularSongs() {
	try {
		const conf = getConfig();
		profile('initPopularSongs');
		const popularKIDs: Map<string, string> = new Map();
		try {
			await internet();
		} catch (err) {
			logger.warn('Internet not available, cannot init popular songs', { service, obj: err });
			profile('initPopularSongs');
			throw err;
		}
		const repos = conf.System.Repositories.filter(r => r.Enabled && r.Online);
		for (const repo of repos) {
			try {
				const res = await HTTP.get(`https://${repo.Name}/api/karas/search?order=requested`);
				const karas = res.data as any;
				for (const kara of karas.content) {
					popularKIDs.set(kara.kid, kara.requested);
				}
			} catch (err) {
				logger.warn(`Failed to fetch popular songs from ${repo.Name}`);
				throw err;
			}
		}
		await truncateOnlineRequested();
		const kidRequested = [...popularKIDs.entries()];
		await insertOnlineRequested(kidRequested);
	} catch (err) {
		// Non fatal
	} finally {
		profile('initPopularSongs');
	}
}

export function getKMStats() {
	return getStats();
}
