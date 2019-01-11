import {formatKaraList, isAllKaras, getKara} from './kara';
import {isAllKarasInPlaylist} from './playlist';
import {removeKaraFromWhitelist, getWhitelistContents as getWLContents, emptyWhitelist as emptyWL, addKaraToWhitelist as addToWL} from '../_dao/whitelist';
import {generateBlacklist} from './blacklist';
import {profile} from '../_utils/logger';
import logger from 'winston';

export async function addKaraToWhitelist(kara_id) {
	let karas = [kara_id];
	if (typeof kara_id === 'string') karas = kara_id.split(',');
	const kara = await getKara(karas[0]);
	logger.info(`[Whitelist] Adding ${karas.length} karaokes to whitelist : ${kara[0].title}...`);
	try {
		profile('addKaraToWL');
		if (!await isAllKaras(karas)) throw 'One of the karaokes does not exist.';
		const karasInWhitelist = await getWhitelistContents();
		const karaList = isAllKarasInPlaylist(karas,karasInWhitelist.content);
		if (karaList.length === 0) throw 'No karaoke could be added, all are in whitelist already';
		await addToWL(karaList);
		await generateBlacklist();
		return karaList;
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

export async function deleteKaraFromWhitelist(wlcs) {
	let karas = [wlcs];
	if (typeof wlcs === 'string') karas = wlcs.split(',');
	let karaList = [];
	karas.forEach((wlc_id) => {
		karaList.push({
			wlc_id: wlc_id
		});
	});
	try {
		profile('deleteWLC');
		logger.info(`[Whitelist] Deleting karaokes from whitelist : ${wlcs}`);
		await removeKaraFromWhitelist(karaList);
		return await generateBlacklist();
	} catch(err) {
		console.log(err);
		logger.err(`${err}`);
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
