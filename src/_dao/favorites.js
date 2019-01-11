import {db} from './database';
const sql = require('./sql/favorites');

export async function getFavoritesPlaylist(username) {
	const res = await db().query(sql.getFavoritesPlaylist, [username]);
	return res.rows[0];
}

