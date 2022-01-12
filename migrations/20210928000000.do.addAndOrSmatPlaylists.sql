CREATE TYPE smartPlaylistType AS ENUM('UNION', 'INTERSECT');
ALTER TABLE playlist ADD COLUMN type_smart smartPlaylistType DEFAULT 'INTERSECT';