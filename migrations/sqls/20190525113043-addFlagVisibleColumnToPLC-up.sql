ALTER TABLE playlist_content ADD COLUMN flag_visible BOOLEAN DEFAULT true;
UPDATE playlist_content SET flag_visible = true;