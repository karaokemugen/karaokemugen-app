-- Up

CREATE TABLE  IF NOT EXISTS tag (
    pk_id_tag   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    tagtype     INTEGER NOT NULL,
    name        TEXT NOT NULL,
    NORM_name   TEXT NOT NULL COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS serie (
    pk_id_serie    INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    name           TEXT NOT NULL,
    NORM_name      TEXT NOT NULL COLLATE NOCASE,
    altname        TEXT,
    NORM_altname   TEXT COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS kara_tag (
    pk_id_kara_tag   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara       INTEGER NOT NULL REFERENCES kara,
    fk_id_tag        INTEGER NOT NULL REFERENCES tag
);

CREATE TABLE IF NOT EXISTS kara_serie (
    pk_id_kara_serie   INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    fk_id_kara         INTEGER NOT NULL REFERENCES kara,
    fk_id_serie        INTEGER NOT NULL REFERENCES serie
);

CREATE TABLE IF NOT EXISTS kara (
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

CREATE TABLE ass IF NOT EXISTS (
	pk_id_ass			 INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
	fk_id_kara           INTEGER NOT NULL REFERENCES kara,
	ass                  TEXT
);

CREATE INDEX IF NOT EXISTS index_kara_tag_id_tag ON kara_tag (fk_id_tag );
CREATE INDEX IF NOT EXISTS index_kara_tag_id_kara ON kara_tag (fk_id_kara );
CREATE INDEX IF NOT EXISTS index_kara_ass ON ass (fk_id_kara );
CREATE INDEX IF NOT EXISTS index_kara_serie_id_serie ON kara_serie (fk_id_serie );
CREATE INDEX IF NOT EXISTS index_kara_serie_id_kara ON kara_serie (fk_id_kara );
CREATE VIEW IF NOT EXISTS all_karas AS SELECT k.pk_id_kara AS kara_id, k.kid, k.title, k.NORM_title, k.videolength, k.gain, k.year, k.videofile, k.created_at, k.modified_at, k.rating, k.viewcount
,k.songorder
,(select GROUP_CONCAT( s.name)
    FROM kara_serie ks
    INNER JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
    WHERE k.pk_id_kara = ks.fk_id_kara
    ) as serie
,(select GROUP_CONCAT( s.NORM_name)
    FROM kara_serie ks
    INNER JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
    WHERE k.pk_id_kara = ks.fk_id_kara
    ) as NORM_serie
,(select GROUP_CONCAT( s.altname)
    FROM kara_serie ks
    INNER JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
    WHERE k.pk_id_kara = ks.fk_id_kara
    ) as serie_altname
,(select GROUP_CONCAT( s.NORM_altname)
    FROM kara_serie ks
    INNER JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
    WHERE k.pk_id_kara = ks.fk_id_kara
    ) as NORM_serie_altname
,(select GROUP_CONCAT( t2.name)
    FROM kara_tag kt2  
    INNER JOIN tag t2 ON kt2.fk_id_tag = t2.pk_id_tag AND t2.tagtype = 2
    WHERE k.pk_id_kara = kt2.fk_id_kara
    ) as singer
,(select GROUP_CONCAT( t2.NORM_name)
    FROM kara_tag kt2  
    INNER JOIN tag t2 ON kt2.fk_id_tag = t2.pk_id_tag AND t2.tagtype = 2
    WHERE k.pk_id_kara = kt2.fk_id_kara
    ) as NORM_singer
,(select GROUP_CONCAT( t3.name)
    FROM kara_tag kt3  
    INNER JOIN tag t3 ON kt3.fk_id_tag = t3.pk_id_tag AND t3.tagtype = 3
    WHERE k.pk_id_kara = kt3.fk_id_kara
    ) as songtype
,(select GROUP_CONCAT( t4.name)
    FROM kara_tag kt4  
    INNER JOIN tag t4 ON kt4.fk_id_tag = t4.pk_id_tag AND t4.tagtype = 4
    WHERE k.pk_id_kara = kt4.fk_id_kara
    ) as creator
,(select GROUP_CONCAT( t4.NORM_name)
    FROM kara_tag kt4  
    INNER JOIN tag t4 ON kt4.fk_id_tag = t4.pk_id_tag AND t4.tagtype = 4
    WHERE k.pk_id_kara = kt4.fk_id_kara
    ) as NORM_creator
,(select GROUP_CONCAT( t5.name)
    FROM kara_tag kt5  
    INNER JOIN tag t5 ON kt5.fk_id_tag = t5.pk_id_tag AND t5.tagtype = 5
    WHERE k.pk_id_kara = kt5.fk_id_kara
    ) as [language]
,(select GROUP_CONCAT( t6.name)
    FROM kara_tag kt6  
    INNER JOIN tag t6 ON kt6.fk_id_tag = t6.pk_id_tag AND t6.tagtype = 6
    WHERE k.pk_id_kara = kt6.fk_id_kara
    ) as author
,(select GROUP_CONCAT( t6.NORM_name)
    FROM kara_tag kt6  
    INNER JOIN tag t6 ON kt6.fk_id_tag = t6.pk_id_tag AND t6.tagtype = 6
    WHERE k.pk_id_kara = kt6.fk_id_kara
    ) as NORM_author
,(select GROUP_CONCAT( t7.name)
    FROM kara_tag kt7  
    INNER JOIN tag t7 ON kt7.fk_id_tag = t7.pk_id_tag AND t7.tagtype = 7
    WHERE k.pk_id_kara = kt7.fk_id_kara
    ) as misc
,(select GROUP_CONCAT( t8.name)
    FROM kara_tag kt8  
    INNER JOIN tag t8 ON kt8.fk_id_tag = t8.pk_id_tag AND t8.tagtype = 8
    WHERE k.pk_id_kara = kt8.fk_id_kara
    ) as songwriter
,(select GROUP_CONCAT( t8.NORM_name)
    FROM kara_tag kt8  
    INNER JOIN tag t8 ON kt8.fk_id_tag = t8.pk_id_tag AND t8.tagtype = 8
    WHERE k.pk_id_kara = kt8.fk_id_kara
    ) as NORM_songwriter
FROM kara k
order by language, serie, singer, songtype, songorder

-- Down

DROP VIEW all_karas;
DROP TABLE kara_tag;
DROP TABLE kara_serie;
DROP TABLE tag;
DROP TABLE ass;
DROP TABLE serie;
DROP TABLE kara;
