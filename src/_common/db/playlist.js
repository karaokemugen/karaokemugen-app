// SQL for playlist management

export const countKarasInPlaylist = `SELECT COUNT(playlist_content.fk_id_kara) AS karaCount 
									FROM playlist_content 
									WHERE fk_id_playlist = $playlist_id;`;

export const getPLCByDate = `SELECT pc.pk_id_plcontent AS playlistcontent_id 
							FROM playlist_content AS pc
							WHERE pc.created_at = $date_added 
  							  AND pc.fk_id_playlist = $playlist_id
							ORDER BY pc.pos;
							`;