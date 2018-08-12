-- Up

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

SELECT k.pk_id_kara AS kara_id, k.kid, k.title, k.NORM_title, k.duration, k.gain, k.year, k.mediafile, k.subfile, k.created_at, k.modified_at, k.songorder, k.karafile
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

DROP VIEW all_karas;
CREATE VIEW IF NOT EXISTS all_karas AS SELECT k.pk_id_kara AS kara_id, k.kid, k.title, k.NORM_title, k.duration, k.gain, k.year, k.mediafile, k.subfile, k.created_at, k.modified_at, k.songorder, k.karafile, k.mediasize
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
,(select GROUP_CONCAT( t9.name)
    FROM kara_tag kt9
    INNER JOIN tag t9 ON kt9.fk_id_tag = t9.pk_id_tag AND t9.tagtype = 9
    WHERE k.pk_id_kara = kt9.fk_id_kara
    ) as groups
,(select GROUP_CONCAT( t4.NORM_name)
    FROM kara_tag kt4
    INNER JOIN tag t4 ON kt4.fk_id_tag = t4.pk_id_tag AND t4.tagtype = 4
    WHERE k.pk_id_kara = kt4.fk_id_kara
    ) as NORM_creator
,(select GROUP_CONCAT( t9.NORM_name)
    FROM kara_tag kt9
    INNER JOIN tag t9 ON kt9.fk_id_tag = t9.pk_id_tag AND t9.tagtype = 9
    WHERE k.pk_id_kara = kt9.fk_id_kara
    ) as NORM_groups
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