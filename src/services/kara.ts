import { convertToASS as srt2ass } from 'convert-srt-to-ass';
import internet from 'internet-available';
import { parse } from 'path';

import { getStats } from '../dao/database.js';
import {
	insertOnlineRequested,
	insertPlayed,
	selectAllKaras,
	selectAllKarasMicro,
	selectYears,
	truncateOnlineRequested,
} from '../dao/kara.js';
import { getLyrics, getMediaFileInfo } from '../lib/dao/karafile.js';
import { formatKaraList } from '../lib/services/kara.js';
import { ASSLine } from '../lib/types/ass.js';
import { DBKara } from '../lib/types/database/kara.js';
import { KaraList, KaraParams, MediaInfo, YearList } from '../lib/types/kara.js';
import { JWTTokenWithRoles, OldJWTToken } from '../lib/types/user.js';
import { ASSToLyrics } from '../lib/utils/ass.js';
import { getConfig } from '../lib/utils/config.js';
import { ErrorKM } from '../lib/utils/error.js';
import HTTP from '../lib/utils/http.js';
import logger, { profile } from '../lib/utils/logger.js';
import { isUUID } from '../lib/utils/validators.js';
import { adminToken } from '../utils/constants.js';
import sentry from '../utils/sentry.js';

const service = 'Kara';

let popularKaraFetchIntervalID: any;

export function initFetchPopularSongs() {
	if (!popularKaraFetchIntervalID) popularKaraFetchIntervalID = setInterval(fetchPopularSongs, 3600000);
	fetchPopularSongs();
}

export function stopFetchPopularSongs() {
	if (popularKaraFetchIntervalID) clearInterval(popularKaraFetchIntervalID);
}

export async function getKara(kid: string, token: OldJWTToken | JWTTokenWithRoles, lang?: string): Promise<DBKara> {
	try {
		profile('getKaraInfo');
		if (!isUUID(kid)) throw new ErrorKM('INVALID_DATA', 400, false);
		const res = await selectAllKaras({
			username: token.username.toLowerCase(),
			q: `k:${kid}`,
			lang,
			blacklist: false,
			ignoreCollections: true,
		});
		return res[0];
	} catch (err) {
		logger.error(`Error getting kara ${kid} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('SONG_VIEW_ERROR');
	} finally {
		profile('getKaraInfo');
	}
}

export async function getKaraLyrics(kid: string): Promise<ASSLine[]> {
	try {
		const kara = await getKara(kid, adminToken);
		if (!kara) throw new ErrorKM('UNKNOWN_SONG', 404, false);
		if (!kara.subfile) return;
		// FIXME: add support for converting lrc/vtt on the fly here
		const ext = parse(kara.subfile).ext;
		let lyrics = await getLyrics(kara.subfile, kara.repository);
		// If any other format we return.
		if (ext === '.srt') {
			lyrics = srt2ass(lyrics);
		}
		return ASSToLyrics(lyrics);
	} catch (err) {
		throw err instanceof ErrorKM ? err : new ErrorKM('LYRICS_VIEW_ERROR');
	}
}

export async function getKaraMediaInfo(kid: string): Promise<MediaInfo> {
	try {
		if (!isUUID(kid)) throw new ErrorKM('INVALID_DATA', 400, false);
		const kara = await getKara(kid, adminToken);
		if (!kara) throw new ErrorKM('UNKNOWN_SONG', 404, false);
		return await getMediaFileInfo(kara.mediafile, kara.repository);
	} catch (err) {
		logger.error(`Unable to retrieve kara media info : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('GET_MEDIA_INFO_ERROR');
	}
}

export async function addPlayedKara(kid: string) {
	profile('addPlayed');
	await insertPlayed(kid);
	profile('addPlayed');
}

export async function getYears(): Promise<YearList> {
	try {
		const years = await selectYears();
		return {
			content: years,
			infos: {
				from: 0,
				to: years.length,
				count: years.length,
			},
		};
	} catch (err) {
		logger.error(`Error getting years : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('YEARS_LIST_ERROR');
	}
}

export async function getKarasMicro(kids: string[], ignoreCollectionsAndBlacklist = false) {
	profile('getKarasMicro');
	try {
		const pl = await selectAllKarasMicro({
			q: `k:${kids.join(',')}`,
			ignoreCollections: ignoreCollectionsAndBlacklist,
			blacklist: !ignoreCollectionsAndBlacklist,
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
		throw new ErrorKM('SONG_LIST_ERROR', 500, false);
	} finally {
		profile('getKaras');
	}
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
	try {
		return getStats();
	} catch (err) {
		logger.error(`Unable to fetch DB stats : ${err}`, { service });
		sentry.error(err);
		throw new ErrorKM('STATS_ERROR');
	}
}
