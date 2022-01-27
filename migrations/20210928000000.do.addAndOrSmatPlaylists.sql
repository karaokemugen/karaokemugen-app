DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'smartPlaylistType') THEN
        CREATE TYPE smartPlaylistType AS
        ENUM('UNION', 'INTERSECT');
    END IF;
END$$;
ALTER TABLE playlist ADD COLUMN IF NOT EXISTS type_smart smartPlaylistType DEFAULT 'INTERSECT';