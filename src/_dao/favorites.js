import {getUserDb} from './database';
const sql = require('../_common/db/favorites');

export async function getFavoritesPlaylist(username) {
	return await getUserDb().get(sql.getFavoritesPlaylist, {$username: username});
}

