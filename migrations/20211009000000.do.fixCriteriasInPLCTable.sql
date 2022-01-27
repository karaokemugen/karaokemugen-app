ALTER TABLE playlist_content DROP COLUMN IF EXISTS criterias;
ALTER TABLE playlist_content ADD COLUMN criterias jsonb[];
