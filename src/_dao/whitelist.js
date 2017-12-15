import {getUserDb} from './database';
const sql = require('../_common/db/whitelist');

export async function isWhitelistContent(id) {
	const res = await getUserDb().get(sql.isWhitelistContent,
		{
			$id: id,
		});
	// FIXME : While playlist_controller isn't converted to ES2015+, logic is here
	if (res) return true;
	return false;
}

export async function getWhitelistContents() {
	return await getUserDb().all(sql.getWhitelistContents);
}

export async function emptyWhitelist() {
	return await getUserDb().run(sql.emptyWhitelist);
}