DROP MATERIALIZED VIEW all_karas;
DROP MATERIALIZED VIEW all_series;
DROP MATERIALIZED VIEW all_kara_serie_langs;
DROP MATERIALIZED VIEW all_kara_series;
DROP MATERIALIZED VIEW series_i18n;

DROP TABLE kara_serie;
DROP TABLE serie_lang;
DROP TABLE serie;

DROP MATERIALIZED VIEW all_kara_tag;
CREATE MATERIALIZED VIEW all_kara_tag AS
SELECT
  k.pk_kid AS kid,
  jsonb_agg(DISTINCT(t.tagfile)) AS tagfiles,
  jsonb_agg(DISTINCT(t.pk_tid || '~' || kt.type)) AS tid,
  lower(unaccent(TRIM(REGEXP_REPLACE(jsonb_agg(t.aliases)::varchar, '[\]\,\[\"]', '', 'g')))) AS aliases,
  lower(unaccent(REGEXP_REPLACE(REGEXP_REPLACE(jsonb_agg(DISTINCT (t.i18n))::text, '".+?": "(.+?)"', '\1', 'g'), '[\[\{\}\],]', '', 'g'))) as i18n,
  lower(unaccent(string_agg(DISTINCT(t.name),' '))) AS tags
FROM kara k
LEFT JOIN kara_tag kt ON k.pk_kid = kt.fk_kid
LEFT JOIN tag t ON kt.fk_tid = t.pk_tid
GROUP BY k.pk_kid;

CREATE MATERIALIZED VIEW series AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_series)) AS series, string_agg(t_series.name, ', ' ORDER BY name) AS series_sortable
    FROM kara_tag kt
    INNER JOIN tag_tid t_series ON kt.fk_tid = t_series.tid
	WHERE kt.type = 1
   GROUP BY  kt.fk_kid;

CREATE INDEX idx_series_kid ON series(fk_kid);

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

