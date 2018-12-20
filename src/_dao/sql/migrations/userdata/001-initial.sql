-- Up

CREATE TABLE IF NOT EXISTS viewcount  (
    pk_id_viewcount   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara        INTEGER NOT NULL,
    kid               TEXT NOT NULL,
    modified_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rating (
    pk_id_rating   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara     INTEGER NOT NULL,
    kid            TEXT NOT NULL,
    rating         INTEGER NOT NULL,
    modified_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist (
    pk_id_playlist   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    name             TEXT NOT NULL,
    NORM_name        TEXT COLLATE NOCASE NOT NULL,
    num_karas        INTEGER NOT NULL,
    length           INTEGER NOT NULL,
    created_at       INTEGER NOT NULL,
    modified_at      INTEGER NOT NULL,
    flag_visible     INTEGER NOT NULL,
    flag_current     INTEGER NOT NULL,
    flag_public      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_content (
    pk_id_plcontent   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_playlist    INTEGER NOT NULL REFERENCES playlist ON DELETE CASCADE,
    fk_id_kara        INTEGER NOT NULL,
    kid               TEXT NOT NULL,
    created_at        INTEGER NOT NULL,
    pseudo_add        TEXT,
    NORM_pseudo_add   TEXT COLLATE NOCASE,
    pos               REAL NOT NULL,
    flag_playing      INTEGER NOT NULL    
);

CREATE TABLE IF NOT EXISTS blacklist (
    pk_id_blacklist   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara        INTEGER NOT NULL,
    kid               TEXT NOT NULL,
    created_at        INTEGER NOT NULL,
    reason            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blacklist_criteria (
    pk_id_blcriteria   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    type             INTEGER NOT NULL,
    value   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS whitelist (
    pk_id_whitelist   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara        INTEGER NOT NULL,
    kid               TEXT NOT NULL,
    created_at        INTEGER NOT NULL,
    reason            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS index_viewcount_fk_id_kara ON viewcount (fk_id_kara);
CREATE INDEX IF NOT EXISTS index_rating_fk_id_kara ON rating (fk_id_kara);
CREATE INDEX IF NOT EXISTS index_playlist_id_playlist ON playlist (pk_id_playlist);
CREATE INDEX IF NOT EXISTS index_playlist_content_fk_id_playlist ON playlist_content (fk_id_playlist);
CREATE INDEX IF NOT EXISTS index_whitelist_fk_id_kara ON whitelist (fk_id_kara);
CREATE INDEX IF NOT EXISTS index_blacklist_fk_id_kara ON blacklist (fk_id_kara);

-- Down

DROP INDEX index_viewcount_fk_id_kara;
DROP INDEX index_rating_fk_id_kara;
DROP INDEX index_playlist_id_playlist;
DROP INDEX index_playlist_content_fk_id_playlist;
DROP INDEX index_whitelist_fk_id_kara;
DROP INDEX index_blacklist_fk_id_kara;
DROP TABLE whitelist;
DROP TABLE blacklist;
DROP TABLE blacklist_criteria;
DROP TABLE playlist_content;
DROP TABLE playlist;
DROP TABLE rating;
DROP TABLE viewcount;
