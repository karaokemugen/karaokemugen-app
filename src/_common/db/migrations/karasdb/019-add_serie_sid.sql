-- Up

CREATE TABLE IF NOT EXISTS tmp (
    pk_id_serie    INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    name           TEXT NOT NULL,
	NORM_name      TEXT NOT NULL COLLATE NOCASE,
    altname        TEXT,
    NORM_altname   TEXT COLLATE NOCASE,
	sid            TEXT UNIQUE NOT NULL,
	seriefile      TEXT
);

INSERT INTO tmp SELECT pk_id_serie,name,NORM_name,altname,NORM_altname,random(),'' FROM serie;
UPDATE tmp SET NORM_name = name;
PRAGMA foreign_keys = "0";
DROP TABLE serie;
ALTER TABLE tmp RENAME TO serie;
PRAGMA foreign_keys;

CREATE INDEX index_serie_sid ON serie (
	sid
);

-- Down

DROP INDEX index_serie_sid;
CREATE TABLE IF NOT EXISTS tmp (
    pk_id_serie    INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    name           TEXT NOT NULL,
	NORM_name      TEXT NOT NULL COLLATE NOCASE,
    altname        TEXT,
    NORM_altname   TEXT COLLATE NOCASE
);

INSERT INTO tmp SELECT pk_id_serie,name,NORM_name,altname,NORM_altname FROM serie;
UPDATE tmp SET NORM_name = name;
PRAGMA foreign_keys = "0";
DROP TABLE serie;
ALTER TABLE tmp RENAME TO serie;
PRAGMA foreign_keys;
