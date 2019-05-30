import {formatKaraList, isAllKaras, getKara} from './kara';
import {removeKaraFromWhitelist, getWhitelistContents as getWLContents, emptyWhitelist as emptyWL, addKaraToWhitelist as addToWL} from '../dao/whitelist';
import {generateBlacklist} from './blacklist';
import {profile} from '../utils/logger';
import logger from 'winston';
import { Token } from '../types/user';
import { KaraParams } from '../types/kara';

export async function addKaraToWhitelist(kid: string|string[], reason: string, token: Token, lang: string): Promise<string[]> {
	let karas = [];
	Array.isArray(kid)
		? karas = kid
		: karas = kid.split(',');
	const kara = await getKara(karas[0], token, lang);
	logger.info(`[Whitelist] Adding ${karas.length} karaokes to whitelist : ${kara[0].title}...`);
	try {
		profile('addKaraToWL');
		const karasUnknown = await isAllKaras(karas);
		if (karasUnknown.length > 0) throw 'One of the karaokes does not exist.';
		await addToWL(karas, reason);
		generateBlacklist();
		return karas;
	} catch(err) {
		console.log(err);
		throw {
			message: err,
			data: karas
		};
	} finally {
		profile('addKaraToWL');
	}
}

export async function getWhitelistContents(params: KaraParams) {
	profile('getWL');
	const pl = await getWLContents(params);
	const ret = formatKaraList(pl.slice(params.from, params.from + params.size), params.lang, params.from, pl.length);
	profile('getWL');
	return ret;
}

export async function deleteKaraFromWhitelist(karas: string[]) {
	try {
		profile('deleteWLC');
		logger.info(`[Whitelist] Deleting karaokes from whitelist : ${karas.toString()}`);
		await removeKaraFromWhitelist(karas);
		return await generateBlacklist();
	} catch(err) {
		throw err;
	} finally {
		profile('deleteWLC');
	}
}

export async function emptyWhitelist() {
	logger.info('[Whitelist] Wiping whitelist');
	await emptyWL();
	await generateBlacklist();
}
