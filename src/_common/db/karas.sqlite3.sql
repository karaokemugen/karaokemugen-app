CREATE TABLE tag (
    pk_id_tag   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    tagtype     INTEGER,
    name        TEXT,
    NORM_name   TEXT COLLATE NOCASE
);

CREATE TABLE serie (
    pk_id_serie    INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    name           TEXT,
    NORM_name      TEXT COLLATE NOCASE,
    altname        TEXT,
    NORM_altname   TEXT COLLATE NOCASE
);

CREATE TABLE kara_tag (
    pk_id_kara_tag   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara       INTEGER REFERENCES kara,
    fk_id_tag        INTEGER REFERENCES tag
);

CREATE TABLE kara_serie (
    pk_id_kara_serie   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara         INTEGER REFERENCES kara,
    fk_id_serie        INTEGER REFERENCES serie
);

CREATE TABLE kara (
    pk_id_kara           INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    kid                  TEXT UNIQUE,
    title                TEXT,
    NORM_title           TEXT COLLATE NOCASE,
    year                 TEXT,
    songorder            INTEGER,
    videofile            TEXT,
    subfile              TEXT,
    videolength          INTEGER,
    gain                 REAL,
    date_added           INTEGER,
    date_last_modified   INTEGER,
    rating               REAL,
    viewcount            INTEGER
);

CREATE INDEX index_kara_tag_id_tag ON kara_tag (fk_id_tag );
CREATE INDEX index_kara_tag_id_kara ON kara_tag (fk_id_kara );
CREATE INDEX index_kara_serie_id_serie ON kara_serie (fk_id_serie );
CREATE INDEX index_kara_serie_id_kara ON kara_serie (fk_id_kara );
