import {db} from './database';
const sql = require('./sql/favorites');

export async function getFavoritesPlaylist(username) {
	const res = await db().query(sql.getFavoritesPlaylist, [username]);
	if (res.rows[0]) return res.rows[0].playlist_id;
}

