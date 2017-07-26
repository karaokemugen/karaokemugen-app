SELECT pk_id_playlist AS id_playlist, name, num_karas, length, creation_time, lastedit_time, flag_visible, flag_current, flag_public 
 FROM playlist
WHERE pk_id_playlist = $playlist_id;