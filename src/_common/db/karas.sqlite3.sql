CREATE TABLE tag (
    pk_id_tag INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    tagtype   INTEGER,
    name  TEXT,
    NORM_name TEXT COLLATE NOCASE
);

CREATE TABLE series (
    pk_id_series  INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    name  TEXT,
    NORM_name TEXT COLLATE NOCASE,
    altname   TEXT,
    NORM_altname  TEXT COLLATE NOCASE
);

CREATE TABLE kara_tag (
    pk_id_kara_tag    INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara    INTEGER,
    fk_id_tag INTEGER
);

CREATE TABLE kara_series (
    pk_id_kara_series INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara    INTEGER,
    fk_id_series  INTEGER
);

CREATE TABLE kara (
    pk_id_kara INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    kid   TEXT UNIQUE,
    title TEXT,
    NORM_title    TEXT COLLATE NOCASE,
    year  TEXT,
    songorder INTEGER,
    videofile TEXT,
    subfile   TEXT,
    videolength   INTEGER,
    gain          REAL,
    date_added    INTEGER,
    date_last_modified    INTEGER,
    rating    REAL,
    viewcount INTEGER
);

CREATE INDEX index_kara_tag_id_tag ON kara_tag (fk_id_tag );
CREATE INDEX index_kara_tag_id_kara ON kara_tag (fk_id_kara );
CREATE INDEX index_kara_series_id_series ON kara_series (fk_id_series );
CREATE INDEX index_kara_series_id_kara ON kara_series (fk_id_kara );
