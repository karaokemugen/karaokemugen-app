import {buildClauses, getUserDb} from './database';
const sql = require('../_common/db/whitelist');

export async function getWhitelistContents(filter, from, size) {
	const filterClauses = filter ? buildClauses(filter) : [];
	const query = sql.getWhitelistContents(filterClauses);

	return await getUserDb().all(query, {
		$from: from || 0,
		$size: size || Number.MAX_SAFE_INTEGER
	});	
}

export async function emptyWhitelist() {
	return await getUserDb().run(sql.emptyWhitelist);
}

export async function countWhitelist(filter) {

	const filterClauses = filter ? buildClauses(filter) : [];
	const query = sql.countWhitelist(filterClauses);
		
	return (await getUserDb().get(query)).count;
}