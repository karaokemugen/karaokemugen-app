ALTER TABLE users ADD COLUMN anime_list_to_fetch text;
ALTER TABLE users ADD COLUMN anime_list_last_modified_at timestamp with time zone;
ALTER TABLE users ADD COLUMN anime_list_ids int[];
