import {isAllKaras} from './kara';
import {isAllKarasInPlaylist} from './playlist';
import {removeKaraFromWhitelist, getWhitelistContents as getWLContents, emptyWhitelist as emptyWL, addKaraToWhitelist as addToWL} from '../_dao/whitelist';
import {generateBlacklist} from './blacklist';
import {now} from 'unix-timestamp';
import {profile} from '../_common/utils/logger';
import {formatKaraList} from './kara';
import logger from 'winston';
import {getKara} from './kara';

export async function addKaraToWhitelist(kara_id) {
	let karas;
	if (typeof kara_id === 'string') {
		karas = kara_id.split(',');
	} else {
		karas = [kara_id];
	}
	const kara = await getKara(parseInt(karas[0], 10));
	logger.info(`[Whitelist] Adding ${karas.length} karaokes to whitelist : ${kara.title}...`);
	try {
		profile('addKaraToWL');
		const karasInWhitelist = await getWhitelistContents();
		if (!await isAllKaras(karas)) throw 'One of the karaokes does not exist.';
		const karaList = isAllKarasInPlaylist(karas,karasInWhitelist);
		if (karaList.length === 0) throw 'No karaoke could be added, all are in whitelist already';
		await addToWL(karaList,now());
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
	let karas;
	typeof wlcs === 'string' ? karas = wlcs.split(',') : karas = [wlcs];
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
