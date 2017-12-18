import {getUserDb, transaction} from './database';
const sql = require('../_common/db/playlist');

export async function countKarasInPlaylist(id) {
	return await getUserDb().get(sql.countKarasInPlaylist, 
		{
			$playlist_id: id
		});
}

export async function getPLCByDate(playlist_id,date) {
	return await getUserDb().get(sql.getPLCByDate,
		{
			$playlist_id: playlist_id,
			$date_added: date
		});
}

