import {addKaraToWhitelist as addToWL,emptyWhitelist as emptyWL, getWhitelistContents as getWLContents, removeKaraFromWhitelist} from '../dao/whitelist';
import { KaraParams } from '../lib/types/kara';
import logger, {profile} from '../lib/utils/logger';
import { emitWS } from '../lib/utils/ws';
import sentry from '../utils/sentry';
import {generateBlacklist} from './blacklist';
import {formatKaraList, isAllKaras} from './kara';

/** Add a KID or KID array to the whitelist */
export async function addKaraToWhitelist(kids: string[], reason: string): Promise<string[]> {
	logger.info(`Adding ${kids.length} karaokes to whitelist...`, {service: 'Whitelist'});
	try {
		profile('addKaraToWL');
		const karasUnknown = await isAllKaras(kids);
		if (karasUnknown.length > 0) throw {code: 404, msg: 'One of the karaokes does not exist.'};
		await addToWL(kids, reason);
		generateBlacklist().then(() => emitWS('blacklistUpdated'));
		emitWS('whitelistUpdated');
		return kids;
	} catch(err) {
		sentry.error(new Error(err));
		throw err;
	} finally {
		profile('addKaraToWL');
	}
}

/** Get whitelist contents as a regular kara list */
export async function getWhitelistContents(params: KaraParams) {
	profile('getWL');
	const pl = await getWLContents(params);
	const count = pl.length > 0 ? pl[0].count : 0;
	const ret = formatKaraList(pl, params.from, count);
	profile('getWL');
	return ret;
}

/** Remove KIDs from the whitelist */
export async function deleteKaraFromWhitelist(karas: string[]) {
	try {
		profile('deleteWLC');
		logger.info('Deleting karaokes from whitelist', {service: 'Whitelist', obj: karas});
		await removeKaraFromWhitelist(karas);
		generateBlacklist().then(() => emitWS('blacklistUpdated'));
		emitWS('whitelistUpdated');
	} catch(err) {
		const error = new Error(err);
		sentry.error(error);
		throw error;
	} finally {
		profile('deleteWLC');
	}
}

/** Wipe whitelist clean, so it's whiter than white. */
export async function emptyWhitelist() {
	logger.info('Wiping whitelist', {service: 'Whitelist'});
	await emptyWL();
	generateBlacklist().then(() => emitWS('blacklistUpdated'));
	emitWS('whitelistUpdated');
}
