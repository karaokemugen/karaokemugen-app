-- Up

ALTER TABLE serie ADD COLUMN seriefile TEXT;

DROP VIEW all_karas;

CREATE VIEW all_karas AS

WITH tags as (

SELECT kt.fk_id_kara
, GROUP_CONCAT(tag_singer.name) AS singer
, GROUP_CONCAT(tag_singer.NORM_name) AS NORM_singer
, GROUP_CONCAT(tag_songtype.name) AS songtype
, GROUP_CONCAT(tag_songtype.NORM_name) AS NORM_songtype
, GROUP_CONCAT(tag_creator.name) as creator
, GROUP_CONCAT(tag_creator.NORM_name) AS NORM_creator
, GROUP_CONCAT(tag_language.name) AS [language]
, GROUP_CONCAT(tag_language.NORM_name) AS NORM_language
, GROUP_CONCAT(tag_author.name) as author
, GROUP_CONCAT(tag_author.NORM_name) as NORM_author
, GROUP_CONCAT(tag_misc.name) AS misc
, GROUP_CONCAT(tag_misc.NORM_name) AS NORM_misc
, GROUP_CONCAT(tag_songwriter.name) as songwriter
, GROUP_CONCAT(tag_songwriter.NORM_name) as NORM_songwriter
, GROUP_CONCAT(tag_groups.name) as groups
, GROUP_CONCAT(tag_groups.NORM_name) as NORM_groups
FROM kara_tag kt
LEFT OUTER JOIN tag tag_singer on kt.fk_id_tag = tag_singer.pk_id_tag and tag_singer.tagtype = 2
LEFT OUTER JOIN tag tag_songtype on kt.fk_id_tag = tag_songtype.pk_id_tag and tag_songtype.tagtype = 3
LEFT OUTER JOIN tag tag_creator on kt.fk_id_tag = tag_creator.pk_id_tag and tag_creator.tagtype = 4
LEFT OUTER JOIN tag tag_language on kt.fk_id_tag = tag_language.pk_id_tag and tag_language.tagtype = 5
LEFT OUTER JOIN tag tag_author on kt.fk_id_tag = tag_author.pk_id_tag and tag_author.tagtype = 6
LEFT OUTER JOIN tag tag_misc on kt.fk_id_tag = tag_misc.pk_id_tag and tag_misc.tagtype = 7
LEFT OUTER JOIN tag tag_songwriter on kt.fk_id_tag = tag_songwriter.pk_id_tag and tag_songwriter.tagtype = 8
LEFT OUTER JOIN tag tag_groups on kt.fk_id_tag = tag_groups.pk_id_tag and tag_groups.tagtype = 9
GROUP BY kt.fk_id_kara )

SELECT k.pk_id_kara AS kara_id, k.kid, k.title, k.NORM_title, k.duration, k.gain, k.year, k.mediafile, k.subfile, k.created_at, k.modified_at, k.songorder, k.karafile, k.mediasize
,(select  json_group_array(json_object('lang',sl.lang, 'name', sl.name))
    from serie_lang sl, kara_serie ks
    where ks.fk_id_serie = sl.fk_id_serie
    and k.pk_id_kara = ks.fk_id_kara
    ) as serie_i18n
,(select GROUP_CONCAT( sl.NORM_name, ' ')
    from serie_lang sl, kara_serie ks
    where ks.fk_id_serie = sl.fk_id_serie
    and k.pk_id_kara = ks.fk_id_kara
    ) as NORM_serie_i18n
,(select GROUP_CONCAT( s.NORM_name )
    FROM kara_serie ks
    INNER JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
    WHERE k.pk_id_kara = ks.fk_id_kara
    ) as NORM_serie
,(select GROUP_CONCAT( s.name)
    FROM kara_serie ks
    INNER JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
    WHERE k.pk_id_kara = ks.fk_id_kara
    ) as serie
,(select GROUP_CONCAT( s.seriefile)
    FROM kara_serie ks
    INNER JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
    WHERE k.pk_id_kara = ks.fk_id_kara
    ) as seriefiles
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
, tags.*
, tags.singer
, tags.NORM_singer
, tags.songtype
, tags.NORM_songtype
, tags.creator
, tags.NORM_creator
, tags.[language]
, tags.NORM_language
, tags.author
, tags.NORM_author
, tags.misc
, tags.NORM_misc
, tags.songwriter
, tags.NORM_songwriter
, tags.groups
, tags.NORM_groups
from kara k
inner join tags on k.pk_id_kara = tags.fk_id_kara
order by language, serie, tags.singer, tags.songtype DESC, songorder


-- Down

CREATE TABLE IF NOT EXISTS tmp (
    pk_id_serie    INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
    name           TEXT NOT NULL,
	NORM_name      TEXT NOT NULL COLLATE NOCASE,
    altname        TEXT,
    NORM_altname   TEXT COLLATE NOCASE
);

INSERT INTO tmp SELECT pk_id_serie,name,NORM_name,altname,NORM_altname FROM serie;
PRAGMA foreign_keys = "0";
DROP TABLE serie;
ALTER TABLE tmp RENAME TO serie;
PRAGMA foreign_keys;

DROP VIEW all_karas;

CREATE VIEW all_karas AS

WITH tags as (

SELECT kt.fk_id_kara
, GROUP_CONCAT(tag_singer.name) AS singer
, GROUP_CONCAT(tag_singer.NORM_name) AS NORM_singer
, GROUP_CONCAT(tag_songtype.name) AS songtype
, GROUP_CONCAT(tag_songtype.NORM_name) AS NORM_songtype
, GROUP_CONCAT(tag_creator.name) as creator
, GROUP_CONCAT(tag_creator.NORM_name) AS NORM_creator
, GROUP_CONCAT(tag_language.name) AS [language]
, GROUP_CONCAT(tag_language.NORM_name) AS NORM_language
, GROUP_CONCAT(tag_author.name) as author
, GROUP_CONCAT(tag_author.NORM_name) as NORM_author
, GROUP_CONCAT(tag_misc.name) AS misc
, GROUP_CONCAT(tag_misc.NORM_name) AS NORM_misc
, GROUP_CONCAT(tag_songwriter.name) as songwriter
, GROUP_CONCAT(tag_songwriter.NORM_name) as NORM_songwriter
, GROUP_CONCAT(tag_groups.name) as groups
, GROUP_CONCAT(tag_groups.NORM_name) as NORM_groups
FROM kara_tag kt
LEFT OUTER JOIN tag tag_singer on kt.fk_id_tag = tag_singer.pk_id_tag and tag_singer.tagtype = 2
LEFT OUTER JOIN tag tag_songtype on kt.fk_id_tag = tag_songtype.pk_id_tag and tag_songtype.tagtype = 3
LEFT OUTER JOIN tag tag_creator on kt.fk_id_tag = tag_creator.pk_id_tag and tag_creator.tagtype = 4
LEFT OUTER JOIN tag tag_language on kt.fk_id_tag = tag_language.pk_id_tag and tag_language.tagtype = 5
LEFT OUTER JOIN tag tag_author on kt.fk_id_tag = tag_author.pk_id_tag and tag_author.tagtype = 6
LEFT OUTER JOIN tag tag_misc on kt.fk_id_tag = tag_misc.pk_id_tag and tag_misc.tagtype = 7
LEFT OUTER JOIN tag tag_songwriter on kt.fk_id_tag = tag_songwriter.pk_id_tag and tag_songwriter.tagtype = 8
LEFT OUTER JOIN tag tag_groups on kt.fk_id_tag = tag_groups.pk_id_tag and tag_groups.tagtype = 9
GROUP BY kt.fk_id_kara )

SELECT k.pk_id_kara AS kara_id, k.kid, k.title, k.NORM_title, k.duration, k.gain, k.year, k.mediafile, k.subfile, k.created_at, k.modified_at, k.songorder, k.karafile, k.mediasize
,(select  json_group_array(json_object('lang',sl.lang, 'name', sl.name))
    from serie_lang sl, kara_serie ks
    where ks.fk_id_serie = sl.fk_id_serie
    and k.pk_id_kara = ks.fk_id_kara
    ) as serie_i18n
,(select GROUP_CONCAT( sl.NORM_name, ' ')
    from serie_lang sl, kara_serie ks
    where ks.fk_id_serie = sl.fk_id_serie
    and k.pk_id_kara = ks.fk_id_kara
    ) as NORM_serie_i18n
,(select GROUP_CONCAT( s.NORM_name )
    FROM kara_serie ks
    INNER JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
    WHERE k.pk_id_kara = ks.fk_id_kara
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
, tags.*
, tags.singer
, tags.NORM_singer
, tags.songtype
, tags.NORM_songtype
, tags.creator
, tags.NORM_creator
, tags.[language]
, tags.NORM_language
, tags.author
, tags.NORM_author
, tags.misc
, tags.NORM_misc
, tags.songwriter
, tags.NORM_songwriter
, tags.groups
, tags.NORM_groups
from kara k
inner join tags on k.pk_id_kara = tags.fk_id_kara
order by language, serie, tags.singer, tags.songtype DESC, songorder
