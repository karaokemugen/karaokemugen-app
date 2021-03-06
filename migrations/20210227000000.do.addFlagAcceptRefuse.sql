ALTER TABLE playlist_content ADD COLUMN flag_accepted BOOLEAN;
ALTER TABLE playlist_content ADD COLUMN flag_refused BOOLEAN;

UPDATE playlist_content SET
	flag_accepted = FALSE,
	flag_refused = FALSE;
