ALTER TABLE playlist_content ADD COLUMN flag_playing BOOLEAN DEFAULT FALSE;
UPDATE playlist_content SET flag_playing = TRUE FROM playlist WHERE pk_id_plcontent = playlist.fk_id_plcontent_playing AND fk_id_playlist = playlist.pk_id_playlist;
ALTER TABLE playlist DROP COLUMN fk_id_plcontent_playing;

