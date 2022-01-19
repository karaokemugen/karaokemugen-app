CREATE TYPE playlist_smart_order AS ENUM('oldest', 'newest');
CREATE TYPE playlist_smart_limit_type AS ENUM('songs', 'duration');
ALTER TABLE playlist ADD COLUMN IF NOT EXISTS flag_smartlimit BOOLEAN DEFAULT(false);
ALTER TABLE playlist ADD COLUMN IF NOT EXISTS smart_limit_number INTEGER DEFAULT(0);
ALTER TABLE playlist ADD COLUMN IF NOT EXISTS smart_limit_order playlist_smart_order DEFAULT('newest');
ALTER TABLE playlist ADD COLUMN IF NOT EXISTS smart_limit_type playlist_smart_limit_type DEFAULT('songs');