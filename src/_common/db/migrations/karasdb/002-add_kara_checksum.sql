-- Up

ALTER TABLE kara ADD COLUMN checksum TEXT

-- Down

CREATE TABLE tmp (
    pk_id_kara           INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    kid                  TEXT UNIQUE NOT NULL,
    title                TEXT,
    NORM_title           TEXT COLLATE NOCASE,
    year                 TEXT,
    songorder            INTEGER NOT NULL,
    videofile            TEXT NOT NULL,
    videolength          INTEGER,
    gain                 REAL DEFAULT (0),
    created_at           INTEGER NOT NULL,
    modified_at          INTEGER NOT NULL,
    rating               REAL,
    viewcount            INTEGER DEFAULT (0)	
);
INSERT INTO tmp SELECT pk_id_kara,kid,title,NORM_title,year,songorder,videofile,videolength,gain,created_at,modified_at,rating,viewcount FROM kara;
PRAGMA foreign_keys = "0";
DROP TABLE kara;
ALTER TABLE tmp RENAME TO kara;
PRAGMA foreign_keys;
