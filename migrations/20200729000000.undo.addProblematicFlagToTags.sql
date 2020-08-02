DROP MATERIALIZED VIEW all_tags;
DROP MATERIALIZED VIEW all_karas;
DROP MATERIALIZED VIEW authors;
DROP MATERIALIZED VIEW creators;
DROP MATERIALIZED VIEW families;
DROP MATERIALIZED VIEW genres;
DROP MATERIALIZED VIEW groups;
DROP MATERIALIZED VIEW languages;
DROP MATERIALIZED VIEW misc;
DROP MATERIALIZED VIEW origins;
DROP MATERIALIZED VIEW platforms;
DROP MATERIALIZED VIEW series;
DROP MATERIALIZED VIEW singers;
DROP MATERIALIZED VIEW songtypes;
DROP MATERIALIZED VIEW songwriters;

DROP VIEW tag_tid;
CREATE VIEW tag_tid AS
SELECT pk_tid AS tid, name, short, aliases, i18n, types FROM tag;

CREATE MATERIALIZED VIEW series AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_series)) AS series, string_agg(t_series.name, ', ' ORDER BY name) AS series_sortable
    FROM kara_tag kt
    INNER JOIN tag_tid t_series ON kt.fk_tid = t_series.tid
	WHERE kt.type = 1
   GROUP BY  kt.fk_kid;

CREATE INDEX idx_series_kid ON series(fk_kid);

CREATE MATERIALIZED VIEW singers AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_singer)) AS singers, string_agg(t_singer.name, ', ' ORDER BY name) AS singers_sortable
    FROM kara_tag kt
    INNER JOIN tag_tid t_singer ON kt.fk_tid = t_singer.tid
	WHERE kt.type = 2
   GROUP BY  kt.fk_kid;

CREATE MATERIALIZED VIEW songtypes AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_songtype)) AS songtypes, string_agg(t_songtype.name, ', ' ORDER BY name) AS songtypes_sortable
    FROM kara_tag kt
    INNER JOIN tag_tid t_songtype ON kt.fk_tid = t_songtype.tid WHERE kt.type = 3
GROUP BY  kt.fk_kid;

CREATE MATERIALIZED VIEW creators AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_creator)) AS creators
    FROM kara_tag kt
    INNER JOIN tag_tid t_creator ON kt.fk_tid = t_creator.tid
	WHERE kt.type = 4
GROUP BY  kt.fk_kid;

CREATE MATERIALIZED VIEW languages AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_language)) AS languages, string_agg(t_language.name, ', ' ORDER BY name) AS languages_sortable
    FROM kara_tag kt
    INNER JOIN tag_tid t_language ON kt.fk_tid = t_language.tid
	WHERE kt.type = 5
GROUP BY  kt.fk_kid;

CREATE MATERIALIZED VIEW authors AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_author)) AS authors
    FROM kara_tag kt
    INNER JOIN tag_tid t_author ON kt.fk_tid = t_author.tid
	WHERE kt.type = 6
GROUP BY kt.fk_kid;

CREATE MATERIALIZED VIEW misc AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_misc)) AS misc
    FROM kara_tag kt
    INNER JOIN tag_tid t_misc ON kt.fk_tid = t_misc.tid
	WHERE kt.type = 7
GROUP BY kt.fk_kid;

CREATE MATERIALIZED VIEW songwriters AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_songwriter)) AS songwriters
    FROM kara_tag kt
    INNER JOIN tag_tid t_songwriter ON kt.fk_tid = t_songwriter.tid WHERE kt.type = 8
GROUP BY kt.fk_kid;

CREATE MATERIALIZED VIEW groups AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_group)) AS groups
    FROM kara_tag kt
    INNER JOIN tag_tid t_group ON kt.fk_tid = t_group.tid
	WHERE kt.type = 9
GROUP BY kt.fk_kid;

CREATE MATERIALIZED VIEW families AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_family)) AS families
    FROM kara_tag kt
    INNER JOIN tag_tid t_family ON kt.fk_tid = t_family.tid
	WHERE kt.type = 10
GROUP BY kt.fk_kid;

CREATE MATERIALIZED VIEW genres AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_genre)) AS genres
    FROM kara_tag kt
    INNER JOIN tag_tid t_genre ON kt.fk_tid = t_genre.tid
	WHERE kt.type = 12
GROUP BY kt.fk_kid;

CREATE MATERIALIZED VIEW origins AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_origin)) AS origins
    FROM kara_tag kt
    INNER JOIN tag_tid t_origin ON kt.fk_tid = t_origin.tid
	WHERE kt.type = 11
GROUP BY kt.fk_kid;

CREATE MATERIALIZED VIEW platforms AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_platform)) AS platforms
    FROM kara_tag kt
    INNER JOIN tag_tid t_platform ON kt.fk_tid = t_platform.tid
	WHERE kt.type = 13
GROUP BY kt.fk_kid;

CREATE INDEX idx_authors_kid ON authors(fk_kid);
CREATE INDEX idx_creators_kid ON creators(fk_kid);
CREATE INDEX idx_groups_kid ON groups(fk_kid);
CREATE INDEX idx_languages_kid ON languages(fk_kid);
CREATE INDEX idx_misc_kid ON misc(fk_kid);
CREATE INDEX idx_singers_kid ON singers(fk_kid);
CREATE INDEX idx_songwriters_kid ON songwriters(fk_kid);
CREATE INDEX idx_songtypes_kid ON songtypes(fk_kid);
CREATE INDEX idx_families_kid ON families(fk_kid);
CREATE INDEX idx_genres_kid ON genres(fk_kid);
CREATE INDEX idx_origins_kid ON origins(fk_kid);
CREATE INDEX idx_platforms_kid ON platforms(fk_kid);

CREATE MATERIALIZED VIEW all_tags AS
WITH t_count as (
    select a.fk_tid, json_agg(json_build_object('type', a.type, 'count', a.c))::text AS count_per_type
    FROM (
        SELECT fk_tid, count(fk_kid) as c, type
        FROM kara_tag
        GROUP BY fk_tid, type) as a
    GROUP BY a.fk_tid
)
SELECT
    t.name AS name,
    t.types AS types,
    t.aliases AS aliases,
    t.i18n AS i18n,
    t.pk_tid AS tid,
	tag_aliases.list AS search_aliases,
    t.tagfile AS tagfile,
    t.short as short,
	t.repository AS repository,
	t.modified_at AS modified_at,
    count_per_type::jsonb AS karacount
    FROM tag t
    CROSS JOIN LATERAL (
        SELECT string_agg(tag_aliases.elem::text, ' ') AS list
        FROM jsonb_array_elements_text(t.aliases) AS tag_aliases(elem)
    ) tag_aliases
    LEFT JOIN t_count on t.pk_tid = t_count.fk_tid
	GROUP BY t.pk_tid, tag_aliases.list, count_per_type
    ORDER BY name;

CREATE INDEX idx_at_name ON all_tags(name);
CREATE INDEX idx_at_tid ON all_tags(tid);
CREATE INDEX idx_at_search_aliases ON all_tags(search_aliases);

CREATE MATERIALIZED VIEW all_karas AS
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
  k.subchecksum,
  akt.tid AS tid,
  akt.tagfiles AS tagfiles,
  akt.tags AS tags_searchable,
  akt.i18n AS tags_i18n_searchable,
  akt.aliases AS tags_aliases_searchable,
  singers.singers AS singers,
  series.series AS series,
  COALESCE(lower(unaccent(series.series_sortable)), lower(unaccent(singers.singers_sortable))) AS serie_singer_sortable,
  songtypes.songtypes AS songtypes,
  songtypes.songtypes_sortable AS songtypes_sortable,
  creators.creators AS creators,
  languages.languages AS languages,
  languages.languages_sortable AS languages_sortable,
  authors.authors AS authors,
  misc.misc AS misc,
  songwriters.songwriters AS songwriters,
  groups.groups AS groups,
  families.families AS families,
  genres.genres AS genres,
  platforms.platforms AS platforms,
  origins.origins AS origins,
  k.repository AS repository
FROM kara k
LEFT JOIN all_kara_tag akt ON k.pk_kid = akt.kid
LEFT JOIN kara_tag kt ON k.pk_kid = kt.fk_kid
LEFT JOIN tag t ON kt.fk_tid = t.pk_tid
LEFT OUTER JOIN singers on k.pk_kid = singers.fk_kid
LEFT OUTER JOIN songtypes on k.pk_kid = songtypes.fk_kid
LEFT OUTER JOIN creators on k.pk_kid = creators.fk_kid
LEFT OUTER JOIN languages on k.pk_kid = languages.fk_kid
LEFT OUTER JOIN authors on k.pk_kid = authors.fk_kid
LEFT OUTER JOIN misc on k.pk_kid = misc.fk_kid
LEFT OUTER JOIN songwriters on k.pk_kid = songwriters.fk_kid
LEFT OUTER JOIN groups on k.pk_kid = groups.fk_kid
LEFT OUTER JOIN families on k.pk_kid = families.fk_kid
LEFT OUTER JOIN origins on k.pk_kid = origins.fk_kid
LEFT OUTER JOIN genres on k.pk_kid = genres.fk_kid
LEFT OUTER JOIN platforms on k.pk_kid = platforms.fk_kid
LEFT OUTER JOIN series on k.pk_kid = series.fk_kid
GROUP BY k.pk_kid, languages_sortable, serie_singer_sortable, songtypes_sortable, singers, songtypes, groups, songwriters, misc, authors, languages, creators, platforms, genres, origins, families, series, akt.tid, akt.aliases, akt.tags, akt.i18n, akt.tagfiles
ORDER BY languages_sortable, serie_singer_sortable, songtypes_sortable DESC, songorder;

CREATE INDEX idx_ak_tags ON all_karas(tags_searchable);
CREATE INDEX idx_ak_tags_i18n ON all_karas(tags_i18n_searchable);
CREATE INDEX idx_ak_tags_aliases ON all_karas(tags_aliases_searchable);
CREATE INDEX idx_ak_created ON all_karas(created_at DESC);
CREATE INDEX idx_ak_serie ON all_karas(series NULLS LAST);
CREATE INDEX idx_ak_songtypes ON all_karas(songtypes_sortable DESC);
CREATE INDEX idx_ak_songorder ON all_karas(songorder);
CREATE INDEX idx_ak_title ON all_karas(title);
CREATE INDEX idx_ak_series_singers ON all_karas(serie_singer_sortable);
CREATE INDEX idx_ak_language ON all_karas(languages_sortable);
CREATE INDEX idx_ak_year ON all_karas(year);
CREATE INDEX idx_ak_kid ON all_karas(kid);