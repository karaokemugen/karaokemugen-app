ALTER TABLE playlist_content DROP COLUMN criterias;
ALTER TABLE playlist_content ADD COLUMN criterias jsonb[];
