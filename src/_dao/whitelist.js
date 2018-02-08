import {getUserDb} from './database';
const sql = require('../_common/db/whitelist');

export async function getWhitelistContents() {
	return await getUserDb().all(sql.getWhitelistContents);
}

export async function emptyWhitelist() {
	return await getUserDb().run(sql.emptyWhitelist);
}
