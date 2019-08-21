import {formatKaraList, isAllKaras} from './kara';
import {removeKaraFromWhitelist, getWhitelistContents as getWLContents, emptyWhitelist as emptyWL, addKaraToWhitelist as addToWL} from '../dao/whitelist';
import {generateBlacklist} from './blacklist';
import logger, {profile} from '../lib/utils/logger';
import { KaraParams } from '../lib/types/kara';

/** Add a KID or KID array to the whitelist */
export async function addKaraToWhitelist(kids: string[], reason: string): Promise<string[]> {
	logger.info(`[Whitelist] Adding ${kids.length} karaokes to whitelist...`);
	try {
		profile('addKaraToWL');
		const karasUnknown = await isAllKaras(kids);
		if (karasUnknown.length > 0) throw 'One of the karaokes does not exist.';
		await addToWL(kids, reason);
		generateBlacklist();
		return kids;
	} catch(err) {
		throw {
			message: err,
			data: kids
		};
	} finally {
		profile('addKaraToWL');
	}
}

/** Get whitelist contents as a regular kara list */
export async function getWhitelistContents(params: KaraParams) {
	profile('getWL');
	const pl = await getWLContents(params);
	const count = pl.length > 0 ? pl[0].count : 0;
	const ret = formatKaraList(pl, params.from, count, params.lang);
	profile('getWL');
	return ret;
}

/** Remove KIDs from the whitelist */
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

/** Wipe whitelist clean, so it's whiter than white. */
export async function emptyWhitelist() {
	logger.info('[Whitelist] Wiping whitelist');
	await emptyWL();
	generateBlacklist();
}
