DROP MATERIALIZED VIEW all_karas;
DROP MATERIALIZED VIEW all_tags;
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

ALTER TABLE tag DROP COLUMN priority;

create materialized view all_tags as
WITH t_count AS (
    SELECT a.fk_tid,
           json_agg(json_build_object('type', a.type, 'count', a.c))::text AS count_per_type
    FROM (SELECT kara_tag.fk_tid,
                 count(kara_tag.fk_kid) AS c,
                 kara_tag.type
          FROM kara_tag
          GROUP BY kara_tag.fk_tid, kara_tag.type) a
    GROUP BY a.fk_tid
)
SELECT t.pk_tid AS tid,
       t.name,
       t.types,
       t.aliases,
       t.i18n,
       (CASE
            WHEN tag_aliases.list IS NULL THEN to_tsvector('public.unaccent_conf', ''::text)
            ELSE to_tsvector('public.unaccent_conf', tag_aliases.list)
            END || to_tsvector('public.unaccent_conf', t.i18n)) || to_tsvector('public.unaccent_conf', t.name::text) AS search_vector,
       t.tagfile,
       t.short,
       t.repository,
       t.modified_at,
       t.problematic,
       t.noLiveDownload,
       t_count.count_per_type::jsonb AS karacount
FROM tag t
         CROSS JOIN LATERAL ( SELECT string_agg(tag_aliases_1.elem, ' '::text) AS list
                              FROM jsonb_array_elements_text(t.aliases) tag_aliases_1(elem)) tag_aliases
         LEFT JOIN t_count ON t.pk_tid = t_count.fk_tid
GROUP BY t.pk_tid, tag_aliases.list, t_count.count_per_type
ORDER BY t.name;

create index idx_at_name
    on all_tags (name);

create index idx_at_tid
    on all_tags (tid);

create index idx_at_search_vector
    on all_tags using gin (search_vector);

CREATE VIEW tag_tid AS
SELECT pk_tid AS tid, name, short, aliases, i18n, types, problematic, noLiveDownload FROM tag;

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

create materialized view all_karas as
SELECT k.pk_kid                                                                                     AS kid,
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
       akt.tid,
       akt.tagfiles,
       ((akt.tags || akt.i18n) || akt.aliases) || to_tsvector('public.unaccent_conf', k.title::text) AS search_vector,
       singers.singers,
       series.series,
       COALESCE(lower(unaccent(series.series_sortable)),
                lower(unaccent(singers.singers_sortable))) AS serie_singer_sortable,
       songtypes.songtypes,
       songtypes.songtypes_sortable,
       creators.creators,
       languages.languages,
       languages.languages_sortable,
       authors.authors,
       misc.misc,
       songwriters.songwriters,
       groups.groups,
       families.families,
       genres.genres,
       platforms.platforms,
       origins.origins,
       k.repository
FROM kara k
         LEFT JOIN all_kara_tag akt ON k.pk_kid = akt.kid
         LEFT JOIN kara_tag kt ON k.pk_kid = kt.fk_kid
         LEFT JOIN tag t ON kt.fk_tid = t.pk_tid
         LEFT JOIN singers ON k.pk_kid = singers.fk_kid
         LEFT JOIN songtypes ON k.pk_kid = songtypes.fk_kid
         LEFT JOIN creators ON k.pk_kid = creators.fk_kid
         LEFT JOIN languages ON k.pk_kid = languages.fk_kid
         LEFT JOIN authors ON k.pk_kid = authors.fk_kid
         LEFT JOIN misc ON k.pk_kid = misc.fk_kid
         LEFT JOIN songwriters ON k.pk_kid = songwriters.fk_kid
         LEFT JOIN groups ON k.pk_kid = groups.fk_kid
         LEFT JOIN families ON k.pk_kid = families.fk_kid
         LEFT JOIN origins ON k.pk_kid = origins.fk_kid
         LEFT JOIN genres ON k.pk_kid = genres.fk_kid
         LEFT JOIN platforms ON k.pk_kid = platforms.fk_kid
         LEFT JOIN series ON k.pk_kid = series.fk_kid
GROUP BY k.pk_kid, languages.languages_sortable,
         (COALESCE(lower(unaccent(series.series_sortable)), lower(unaccent(singers.singers_sortable)))),
         songtypes.songtypes_sortable, singers.singers, songtypes.songtypes, groups.groups, songwriters.songwriters,
         misc.misc, authors.authors, languages.languages, creators.creators, platforms.platforms, genres.genres,
         origins.origins, families.families, series.series, akt.tid, akt.aliases, akt.tags, akt.i18n, akt.tagfiles
ORDER BY languages.languages_sortable,
         (COALESCE(lower(unaccent(series.series_sortable)), lower(unaccent(singers.singers_sortable)))),
         songtypes.songtypes_sortable DESC, k.songorder;

create index idx_ak_search_vector
    on all_karas using gin (search_vector);

create index idx_ak_created
    on all_karas (created_at desc);

create index idx_ak_serie
    on all_karas (series);

create index idx_ak_songtypes
    on all_karas (songtypes_sortable desc);

create index idx_ak_songorder
    on all_karas (songorder);

create index idx_ak_title
    on all_karas (title);

create index idx_ak_series_singers
    on all_karas (serie_singer_sortable);

create index idx_ak_language
    on all_karas (languages_sortable);

create index idx_ak_year
    on all_karas (year);

create index idx_ak_kid
    on all_karas (kid);

