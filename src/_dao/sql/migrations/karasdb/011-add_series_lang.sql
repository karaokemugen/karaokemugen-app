-- Up

CREATE TABLE serie_lang (
    pk_id_serie_lang    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
    fk_id_serie    INTEGER,
    lang    TEXT,
    name    TEXT,
    NORM_name    TEXT
);

CREATE TABLE IF NOT EXISTS tmp (
    pk_id_serie    INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    name           TEXT NOT NULL,
    altname        TEXT,
    NORM_altname   TEXT COLLATE NOCASE
);

INSERT INTO tmp SELECT pk_id_serie,name,altname,NORM_altname FROM serie;
PRAGMA foreign_keys = "0";
DROP TABLE serie;
ALTER TABLE tmp RENAME TO serie;
PRAGMA foreign_keys;

DROP VIEW all_karas;
CREATE VIEW IF NOT EXISTS all_karas AS SELECT k.pk_id_kara AS kara_id, k.kid, k.title, k.NORM_title, k.duration, k.gain, k.year, k.mediafile, k.subfile, k.created_at, k.modified_at, k.songorder
,(select  json_group_array(json_object('lang',sl.lang, 'name', sl.name))
    from serie_lang sl, kara_serie ks
    where ks.fk_id_serie = sl.fk_id_serie
    and k.pk_id_kara = ks.fk_id_kara 
    ) as serie_i18n
,(select GROUP_CONCAT( sl.NORM_name, ' ')
    from serie_lang sl, kara_serie ks
    where ks.fk_id_serie = sl.fk_id_serie
    and k.pk_id_kara = ks.fk_id_kara 
    ) as NORM_serie
,(select GROUP_CONCAT( s.name)
    FROM kara_serie ks
    INNER JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
    WHERE k.pk_id_kara = ks.fk_id_kara
    ) as serie
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
,(select GROUP_CONCAT( t7.NORM_name)
    FROM kara_tag kt7  
    INNER JOIN tag t7 ON kt7.fk_id_tag = t7.pk_id_tag AND t7.tagtype = 7
    WHERE k.pk_id_kara = kt7.fk_id_kara
    ) as NORM_misc
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
order by language, serie, singer, songtype DESC, songorder

-- Down

DROP TABLE serie_lang;

CREATE TABLE IF NOT EXISTS tmp (
    pk_id_serie    INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    name           TEXT NOT NULL,
	NORM_name      TEXT COLLATE NOCASE,
    altname        TEXT,
    NORM_altname   TEXT COLLATE NOCASE
);

INSERT INTO tmp SELECT pk_id_serie,name,name,altname,NORM_altname FROM serie;
PRAGMA foreign_keys = "0";
DROP TABLE serie;
ALTER TABLE tmp RENAME TO serie;
PRAGMA foreign_keys;

DROP VIEW all_karas;
CREATE VIEW IF NOT EXISTS all_karas AS SELECT k.pk_id_kara AS kara_id, k.kid, k.title, k.NORM_title, k.duration, k.gain, k.year, k.mediafile, k.subfile, k.created_at, k.modified_at, k.songorder
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
,(select GROUP_CONCAT( t7.NORM_name)
    FROM kara_tag kt7  
    INNER JOIN tag t7 ON kt7.fk_id_tag = t7.pk_id_tag AND t7.tagtype = 7
    WHERE k.pk_id_kara = kt7.fk_id_kara
    ) as NORM_misc
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
order by language, serie, singer, songtype DESC, songorder