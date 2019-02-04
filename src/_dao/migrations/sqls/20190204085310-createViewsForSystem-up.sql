CREATE VIEW v_all_karas AS
WITH series_i18n(sid, serie_langs) AS (
     SELECT sl.fk_sid, array_to_json(array_agg(json_build_object('lang', sl.lang, 'name', sl.name)))
     FROM serie_lang sl
     GROUP BY sl.fk_sid
),
singer AS (SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_singer)) AS singers, string_agg(t_singer.name, ', ' ORDER BY name) AS singers_sortable
    FROM kara_tag kt
    INNER JOIN tag t_singer ON kt.fk_id_tag = t_singer.pk_id_tag AND t_singer.tagtype = 2
   GROUP BY  kt.fk_kid
),
songtype AS (SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_songtype)) AS songtypes, string_agg(t_songtype.name, ', ' ORDER BY name) AS songtypes_sortable
    FROM kara_tag kt
    INNER JOIN tag t_songtype ON kt.fk_id_tag = t_songtype.pk_id_tag AND t_songtype.tagtype = 3
   GROUP BY  kt.fk_kid
),
creator AS (SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_creator)) AS creators
    FROM kara_tag kt
    INNER JOIN tag t_creator ON kt.fk_id_tag = t_creator.pk_id_tag AND t_creator.tagtype = 4
   GROUP BY  kt.fk_kid
),
language AS (SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_language)) AS languages, string_agg(t_language.name, ', ' ORDER BY name) AS languages_sortable
    FROM kara_tag kt
    INNER JOIN tag t_language ON kt.fk_id_tag = t_language.pk_id_tag AND t_language.tagtype = 5
   GROUP BY  kt.fk_kid
),
author AS (SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_author)) AS authors
    FROM kara_tag kt
    INNER JOIN tag t_author ON kt.fk_id_tag = t_author.pk_id_tag AND t_author.tagtype = 6
   GROUP BY kt.fk_kid
),
misc AS (SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_misc)) AS misc_tags
    FROM kara_tag kt
    INNER JOIN tag t_misc ON kt.fk_id_tag = t_misc.pk_id_tag AND t_misc.tagtype = 7
   GROUP BY kt.fk_kid
),
songwriter AS (SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_songwriter)) AS songwriters
    FROM kara_tag kt
    INNER JOIN tag t_songwriter ON kt.fk_id_tag = t_songwriter.pk_id_tag AND t_songwriter.tagtype = 8
   GROUP BY kt.fk_kid
),
group_tags AS (SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_group)) AS groups
    FROM kara_tag kt
    INNER JOIN tag t_group ON kt.fk_id_tag = t_group.pk_id_tag AND t_group.tagtype = 9
   GROUP BY kt.fk_kid
)

SELECT
  k.pk_kid AS kid,
  k.title,
  k.duration,
  k.gain,
  k.year,
  k.mediafile,
  k.subfile,
  k.created_at,
  k.modified_at,
  k.songorder,
  k.karafile,
  k.mediasize,
  jsonb_agg(DISTINCT(s.seriefile)) AS seriefiles,
  jsonb_agg(DISTINCT(s.name)) AS serie_orig,
  jsonb_agg(DISTINCT(s.pk_sid)) AS sid,
  jsonb_agg(DISTINCT(s18.serie_langs)::jsonb) as serie_i18n,
  string_agg(DISTINCT(s.name),',') AS serie,
  jsonb_agg(DISTINCT(s.aliases)) AS serie_altname,
  singer.singers AS singers,
  singer.singers_sortable AS singers_sortable,
  songtype.songtypes AS songtypes,
  songtype.songtypes_sortable AS songtypes_sortable,
  creator.creators AS creators,
  language.languages AS languages,
  language.languages_sortable AS languages_sortable,
  author.authors AS authors,
  misc.misc_tags AS misc_tags,
  songwriter.songwriters AS songwriters,
  group_tags.groups AS groups,
  array_agg(DISTINCT(kt.fk_id_tag)) AS all_tags_id,
  string_agg(DISTINCT(t.name),' ') AS tags,
  string_agg(DISTINCT(sl.name),' ') AS serie_names
FROM kara k
LEFT JOIN kara_serie ks ON k.pk_kid = ks.fk_kid
LEFT JOIN serie s ON ks.fk_sid = s.pk_sid
LEFT JOIN serie_lang sl ON sl.fk_sid = s.pk_sid
LEFT JOIN series_i18n s18 ON s18.sid = ks.fk_sid
LEFT JOIN kara_tag kt ON k.pk_kid = kt.fk_kid
LEFT JOIN tag t ON kt.fk_id_tag = t.pk_id_tag
LEFT OUTER JOIN singer on k.pk_kid = singer.fk_kid
LEFT OUTER JOIN songtype on k.pk_kid = songtype.fk_kid
LEFT OUTER JOIN creator on k.pk_kid = creator.fk_kid
LEFT OUTER JOIN language on k.pk_kid = language.fk_kid
LEFT OUTER JOIN author on k.pk_kid = author.fk_kid
LEFT OUTER JOIN misc on k.pk_kid = misc.fk_kid
LEFT OUTER JOIN songwriter on k.pk_kid = songwriter.fk_kid
LEFT OUTER JOIN group_tags on k.pk_kid = group_tags.fk_kid
GROUP BY k.pk_kid, languages_sortable, songtypes_sortable, singers_sortable, singers, songtypes, groups, songwriters, misc_tags, authors, languages, creators
ORDER BY languages_sortable, serie, singers_sortable, songtypes_sortable DESC, songorder;

CREATE VIEW v_all_tags AS
SELECT pk_id_tag AS tag_id, tagtype, name, slug, i18n,
 (SELECT COUNT(fk_kid) FROM kara_tag WHERE fk_id_tag = pk_id_tag) AS karacount
FROM tag
ORDER BY tagtype, name;

CREATE VIEW v_all_years AS
SELECT DISTINCT k.year,
	(SELECT COUNT(pk_kid) FROM kara WHERE year = k.year)::integer AS karacount
FROM kara AS k
ORDER BY year;

CREATE VIEW v_all_series AS
SELECT
	s.name AS name,
	s.aliases AS aliases,
	s.pk_sid AS sid,
	array_to_json(array_agg(json_build_object('lang', sl.lang, 'name', sl.name))) as i18n,
	string_agg(sl.name, ' ') as search,
	series_aliases.list AS search_aliases,
	s.seriefile AS seriefile,
	(SELECT COUNT(ks.fk_kid) FROM kara_serie ks WHERE ks.fk_sid = s.pk_sid) AS karacount
	FROM serie s
	CROSS JOIN LATERAL (
		SELECT string_agg(series_aliases.elem::text, ' ') AS list
		FROM jsonb_array_elements_text(s.aliases) AS series_aliases(elem)
	) series_aliases
	LEFT JOIN serie_lang sl ON sl.fk_sid = s.pk_sid
	GROUP BY s.pk_sid, series_aliases.list
    ORDER BY name;
