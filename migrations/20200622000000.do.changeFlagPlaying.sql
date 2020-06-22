ALTER TABLE playlist ADD COLUMN fk_id_plcontent_playing INTEGER NOT NULL DEFAULT 0;
UPDATE playlist SET fk_id_plcontent_playing = COALESCE((SELECT pk_id_plcontent FROM playlist_content WHERE fk_id_playlist = pk_id_playlist AND flag_playing = TRUE), 0);
ALTER TABLE playlist_content DROP COLUMN flag_playing;