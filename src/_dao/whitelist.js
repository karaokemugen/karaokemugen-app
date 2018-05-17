import {langSelector, buildClauses, getUserDb} from './database';
const sql = require('../_common/db/whitelist');

export async function getWhitelistContents(filter, lang) {
	const filterClauses = filter ? buildClauses(filter) : [];
	const query = sql.getWhitelistContents(filterClauses, langSelector(lang));

	return await getUserDb().all(query);
}

export async function emptyWhitelist() {
	return await getUserDb().run(sql.emptyWhitelist);
}
