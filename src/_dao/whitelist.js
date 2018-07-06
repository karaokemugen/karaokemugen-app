import {transaction, langSelector, buildClauses, getUserDb} from './database';
const sql = require('../_common/db/whitelist');

export async function getWhitelistContents(filter, lang) {
	const filterClauses = filter ? buildClauses(filter) : [];
	const query = sql.getWhitelistContents(filterClauses, langSelector(lang));

	return await getUserDb().all(query);
}

export async function emptyWhitelist() {
	return await getUserDb().run(sql.emptyWhitelist);
}

export async function removeKaraFromWhitelist(wlcList) {
	const wlcs = wlcList.map((wlc) => ({ $wlc_id: wlc.wlc_id }));
	return await transaction(wlcs, sql.removeKaraFromWhitelist);
}