import logger from 'winston';

import {	addPlayed,
	getKaraHistory as getKaraHistoryDB,
	getKaraMini as getKaraMiniDB,
	getYears as getYearsDB,
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
import { convert1LangTo2B } from '../lib/utils/langs';
import {profile} from '../lib/utils/logger';
import { DBKaraHistory } from '../types/database/kara';
import sentry from '../utils/sentry';
import { getState } from '../utils/state';


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
			mode: 'kid',
			modeValue: kid,
			lang: lang,
			admin: token.role === 'admin',
			ignoreBlacklist: true
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

export async function getKaraHistory(): Promise<DBKaraHistory[]> {
	// Called by system route
	try {
		return await getKaraHistoryDB();
	} catch(err) {
		sentry.error(err);
		logger.error('Unable to get kara history', {service: 'Kara', obj: err});
		throw err;
	}
}

export async function getTop50(token: Token, lang?: string): Promise<DBKara[]> {
	// Called by system route
	try {
		return await selectAllKaras({
			username: token.username.toLowerCase(),
			lang: lang,
			filter: null,
			mode: 'requested'
		});
	} catch(err) {
		sentry.error(err);
		logger.error('Unable to get kara ranking', {service: 'Kara', obj: err});
		throw err;
	}
}

export async function getKaraPlayed(token: Token, lang: string, from: number, size: number): Promise<DBKara[]> {
	// Called by system route
	try {
		return await selectAllKaras({
			username: token.username.toLowerCase(),
			filter: null,
			mode: 'played',
			from: from,
			size: size,
			lang: lang
		});
	} catch(err) {
		sentry.error(err);
		logger.error('Unable to get kara history', {service: 'Kara', obj: err});
		throw err;
	}
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
			mode: params.mode,
			modeValue: params.modeValue,
			from: params.from || 0,
			size: params.size || 9999999999,
			admin: params.token?.role === 'admin' || true,
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

export function getSeriesSingers(kara: DBKara, i18nParam?:any) {
	if (kara.series?.length > 0) {
		const mode = getConfig().Frontend.SeriesLanguageMode;
		const i18n = i18nParam ? i18nParam : kara.series[0].i18n;
		let series = '';
		switch(mode) {
		case 0:
			series = kara.series[0].name;
			break;
		case 1:
			series = i18n[kara.langs[0].name] || i18n?.eng || kara.series[0].name;
			break;
		case 2:
		case 3:
		default:
			const lang = convert1LangTo2B(getState().defaultLocale) || 'eng';
			series = i18n[lang] || i18n?.eng || kara.series[0].name;
			break;
		}
		return series;
	} else {
		return kara.singers.map(s => s.name).join(', ');
	}
}
