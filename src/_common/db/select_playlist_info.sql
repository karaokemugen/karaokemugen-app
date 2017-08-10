SELECT pk_id_playlist AS id_playlist, name, num_karas, length, created_at, modified_at, flag_visible, flag_current, flag_public
 FROM playlist
WHERE pk_id_playlist = $playlist_id