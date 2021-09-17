ALTER TABLE playlist_content ADD COLUMN IF NOT EXISTS criterias JSONB;
ALTER TABLE playlist_content DROP COLUMN IF EXISTS comment;