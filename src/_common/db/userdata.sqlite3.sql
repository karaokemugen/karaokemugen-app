BEGIN TRANSACTION;

CREATE TABLE viewcount (
    pk_id_viewcount INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara      INTEGER NOT NULL,
    kid   TEXT,
    datetime        INTEGER
);

CREATE TABLE rating (
    pk_id_rating INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara   INTEGER NOT NULL,
    kid   TEXT,
    rating       INTEGER NOT NULL,
    datetime     INTEGER
);

CREATE TABLE playlist (
    pk_id_playlist INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    name           TEXT    NOT NULL,
    NORM_name      TEXT COLLATE NOCASE   NOT NULL,
    num_karas      INTEGER NOT NULL,
    length         INTEGER NOT NULL,
    creation_time  INTEGER NOT NULL,
    lastedit_time  INTEGER NOT NULL,
    flag_visible   INTEGER NOT NULL,
    flag_current   INTEGER NOT NULL,
    flag_public    INTEGER NOT NULL
);

CREATE TABLE playlist_content (
    pk_idplcontent INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_playlist INTEGER NOT NULL,
    fk_id_kara     INTEGER NOT NULL,
    kid   TEXT,
    date_add       INTEGER,
    pseudo_add     TEXT,
    NORM_pseudo_add     TEXT COLLATE NOCASE,
    pos            REAL NOT NULL,
    flag_playing   INTEGER NOT NULL,
    banned         INTEGER DEFAULT (0),
    ban_date       INTEGER,
    ban_reason     TEXT
);

CREATE TABLE blacklist (
    fk_id_kara INTEGER NOT NULL UNIQUE ON CONFLICT IGNORE,
    kid   TEXT,
    ban_date   INTEGER,
    ban_reason TEXT
);

CREATE TABLE blacklist_criteria (
    pk_id_blcriteria INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    blcriteria_type  INTEGER NOT NULL,
    blcriteria_value TEXT NOT NULL
);

CREATE TABLE whitelist (
    pk_id_whitelist INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara      INTEGER NOT NULL,
    kid   TEXT,
    wl_date         INTEGER,
    wl_reason       TEXT
);

CREATE INDEX index_viewcount_fk_id_kara ON viewcount (fk_id_kara);
CREATE INDEX index_rating_fk_id_kara ON rating (fk_id_kara);
CREATE INDEX index_playlist_id_playlist ON playlist (pk_id_playlist);
CREATE INDEX index_playlist_content_fk_id_playlist ON playlist_content (fk_id_playlist);
CREATE INDEX index_whitelist_fk_id_kara ON whitelist (fk_id_kara);
CREATE INDEX index_blacklist_fk_id_kara ON blacklist (fk_id_kara);
COMMIT;
