import {formatKaraList, isAllKaras, getKara} from './kara';
import {isAllKarasInPlaylist} from './playlist';
import {removeKaraFromWhitelist, getWhitelistContents as getWLContents, emptyWhitelist as emptyWL, addKaraToWhitelist as addToWL} from '../_dao/whitelist';
import {generateBlacklist} from './blacklist';
import {profile} from '../_utils/logger';
import logger from 'winston';

export async function addKaraToWhitelist(kid, reason, token, lang) {
	let karas = [kid];
	if (Array.isArray(kid)) karas = kid;
	if (typeof kid === 'string') karas = kid.split(',');
	const kara = await getKara(karas[0], token, lang);
	logger.info(`[Whitelist] Adding ${karas.length} karaokes to whitelist : ${kara[0].title}...`);
	try {
		profile('addKaraToWL');
		if (!await isAllKaras(karas)) throw 'One of the karaokes does not exist.';
		await addToWL(karas, reason);
		generateBlacklist();
		return karas;
	} catch(err) {
		throw {
			message: err,
			data: karas
		};
	} finally {
		profile('addKaraToWL');
	}
}

export async function getWhitelistContents(filter, lang, from, size) {
	try {
		profile('getWL');
		const pl = await getWLContents(filter, lang);
		const ret = formatKaraList(pl.slice(from, from + size), lang, from, pl.length);
		profile('getWL');
		return ret;
	} catch(err) {
		throw err;
	}
}

export async function deleteKaraFromWhitelist(kid) {
	let karas = [kid];
	if (Array.isArray(kid)) karas = kid;
	if (typeof wlcs === 'string') karas = kid.split(',');
	try {
		profile('deleteWLC');
		logger.info(`[Whitelist] Deleting karaokes from whitelist : ${kid}`);
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
