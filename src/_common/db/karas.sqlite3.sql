CREATE TABLE tag (
    pk_id_tag   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    tagtype     INTEGER NOT NULL,
    name        TEXT NOT NULL,
    NORM_name   TEXT NOT NULL COLLATE NOCASE
);

CREATE TABLE serie (
    pk_id_serie    INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    name           TEXT NOT NULL,
    NORM_name      TEXT NOT NULL COLLATE NOCASE,
    altname        TEXT,
    NORM_altname   TEXT COLLATE NOCASE
);

CREATE TABLE kara_tag (
    pk_id_kara_tag   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara       INTEGER NOT NULL REFERENCES kara,
    fk_id_tag        INTEGER NOT NULL REFERENCES tag
);

CREATE TABLE kara_serie (
    pk_id_kara_serie   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara         INTEGER NOT NULL REFERENCES kara,
    fk_id_serie        INTEGER NOT NULL REFERENCES serie
);

CREATE TABLE kara (
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

CREATE TABLE ass (
	pk_id_ass			 INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
	fk_id_kara           INTEGER NOT NULL REFERENCES kara,
	ass                  TEXT
);

CREATE INDEX index_kara_tag_id_tag ON kara_tag (fk_id_tag );
CREATE INDEX index_kara_tag_id_kara ON kara_tag (fk_id_kara );
CREATE INDEX index_kara_ass ON ass (fk_id_kara );
CREATE INDEX index_kara_serie_id_serie ON kara_serie (fk_id_serie );
CREATE INDEX index_kara_serie_id_kara ON kara_serie (fk_id_kara );
