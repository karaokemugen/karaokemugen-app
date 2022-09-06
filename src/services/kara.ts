import { convertToASS as srt2ass } from 'convert-srt-to-ass';
import internet from 'internet-available';
import { parse } from 'path';

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
import { getLyrics } from '../lib/dao/karafile';
import { formatKaraList } from '../lib/services/kara';
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
	// FIXME: add support for converting lrc/vtt on the fly here
	const ext = parse(kara.subfile).ext;
	let lyrics = await getLyrics(kara.subfile, kara.repository);
	// If any other format we return.
	if (ext === '.srt') {
		lyrics = srt2ass(lyrics);
	}
	return ASSToLyrics(lyrics);
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

export async function getKarasMicro(kids: string[], notFromAllKaras = false) {
	// The second argument prevents the query from looking into the all_karas table
	// which might not be refreshed yet and might not contain the song you wish to find (integrateKaraFile uses this)
	// This is akin to ignore collections.
	// This might be a bit counter-intuitive but I felt like making a getKarasNano was worse.
	// Let's go Gare du Nord to settle this.
	profile('getKarasMicro');
	try {
		const pl = await selectAllKarasMicro({
			q: `k:${kids.join(',')}`,
			ignoreCollections: notFromAllKaras,
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
			username: params?.username || 'admin',
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

/** Returns a string with series or singers with their correct i18n.
 * If series, only first one is returned
 * If singers only, only first two singers are returned with a "..." string added if there are more
 */
export function getSongSeriesSingers(kara: DBKara): string {
	const langs = [getConfig().Player.Display.SongInfoLanguage, convert1LangTo2B(getState().defaultLocale), 'eng'];
	// Multiple series aren't very common, so we return always the first one
	if (kara.series?.length > 0) {
		return getTagNameInLanguage(kara.series[0], langs);
	}
	// Multiple singer groups aren't too common but you never know : we'll return at least 2, then add ... if needs be.
	if (kara.singergroups?.length > 0) {
		const result = kara.singergroups.slice(0, 2).map(sg => getTagNameInLanguage(sg, langs));
		if (kara.singergroups.length > 2) result.push('...');
		return result.join(', ');
	}
	// Same with singers
	const result = kara.singers.map(s => getTagNameInLanguage(s, langs)).slice(0, 2);
	if (kara.singers.length > 2) result.push('...');
	return result.join(', ');
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
