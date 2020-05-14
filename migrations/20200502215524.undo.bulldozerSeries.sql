DROP MATERIALIZED VIEW all_karas;
DROP MATERIALIZED VIEW series;

CREATE TABLE serie
(
	pk_sid UUID PRIMARY KEY,
    name CHARACTER VARYING UNIQUE NOT NULL,
    aliases JSONB,
	seriefile CHARACTER VARYING,
	repository CHARACTER VARYING,
	modified_at TIMESTAMPTZ
);

CREATE TABLE serie_lang
(
	pk_id_serie_lang serial PRIMARY KEY,
	fk_sid uuid NOT NULL,
	lang character(3) NOT NULL,
	name character varying NOT NULL,
	FOREIGN KEY(fk_sid) REFERENCES serie(pk_sid) ON DELETE CASCADE
);

CREATE TABLE kara_serie
(
	fk_sid uuid NOT NULL,
	fk_kid uuid NOT NULL,
	FOREIGN KEY(fk_sid) REFERENCES serie(pk_sid) ON DELETE CASCADE,
	FOREIGN KEY(fk_kid) REFERENCES kara(pk_kid) ON DELETE CASCADE
);

CREATE MATERIALIZED VIEW series_i18n AS
SELECT sl.fk_sid AS fk_sid, array_to_json(array_agg(json_build_object('lang', sl.lang, 'name', sl.name))) AS serie_langs
FROM serie_lang sl
GROUP BY sl.fk_sid;

CREATE MATERIALIZED VIEW all_series AS
SELECT
	s.name AS name,
	s.aliases AS aliases,
	s.pk_sid AS sid,
	array_to_json(array_agg(json_build_object('lang', sl.lang, 'name', sl.name))) as i18n,
	string_agg(sl.name, ' ') as search,
	series_aliases.list AS search_aliases,
	s.seriefile AS seriefile,
	(SELECT COUNT(ks.fk_kid) FROM kara_serie ks WHERE ks.fk_sid = s.pk_sid) AS karacount,
	s.repository AS repository,
	s.modified_at AS modified_at
	FROM serie s
	CROSS JOIN LATERAL (
		SELECT string_agg(series_aliases.elem::text, ' ') AS list
		FROM jsonb_array_elements_text(s.aliases) AS series_aliases(elem)
	) series_aliases
	LEFT JOIN serie_lang sl ON sl.fk_sid = s.pk_sid
	GROUP BY s.pk_sid, series_aliases.list
    ORDER BY name;

CREATE INDEX idx_as_name ON all_series(name);
CREATE INDEX idx_as_sid ON all_series(sid);
CREATE INDEX idx_as_search ON all_series(search);
CREATE INDEX idx_as_search_aliases ON all_series(search_aliases);

CREATE MATERIALIZED VIEW all_kara_serie_langs AS
	SELECT sl.name, sl.lang, ks.fk_kid AS kid
	FROM serie_lang sl
	INNER JOIN kara_serie ks ON sl.fk_sid = ks.fk_sid;

CREATE INDEX idx_akls_kid_lang ON all_kara_serie_langs(kid, lang);

DROP MATERIALIZED VIEW all_kara_tag;
CREATE MATERIALIZED VIEW all_kara_tag AS
SELECT
  k.pk_kid AS kid,
  jsonb_agg(DISTINCT(t.tagfile)) AS tagfiles,
  jsonb_agg(DISTINCT(t.name)) AS tags,
  jsonb_agg(DISTINCT(t.pk_tid)) AS tid,
  jsonb_agg(DISTINCT(t.aliases)) AS aliases,
  jsonb_agg(DISTINCT(t.i18n)) as i18n,
  string_agg(DISTINCT(t.name),' ') AS tags_searchable
FROM kara k
LEFT JOIN kara_tag kt ON k.pk_kid = kt.fk_kid
LEFT JOIN tag t ON kt.fk_tid = t.pk_tid
GROUP BY k.pk_kid;

CREATE MATERIALIZED VIEW all_kara_series AS
SELECT
  k.pk_kid AS kid,
  jsonb_agg(DISTINCT(s.seriefile)) AS seriefiles,
  jsonb_agg(DISTINCT(s.name)) AS serie_orig,
  jsonb_agg(DISTINCT(s.pk_sid)) AS sid,
  string_agg(DISTINCT(s.name),',') AS serie,
  jsonb_agg(DISTINCT(s.aliases)) AS serie_altname,
  jsonb_agg(DISTINCT(s18.serie_langs)::jsonb) as serie_i18n,
  string_agg(DISTINCT(sl.name),' ') AS serie_names
FROM kara k
LEFT JOIN kara_serie ks ON k.pk_kid = ks.fk_kid
LEFT JOIN serie s ON ks.fk_sid = s.pk_sid
LEFT JOIN serie_lang sl ON sl.fk_sid = s.pk_sid
LEFT JOIN series_i18n s18 ON s18.fk_sid = ks.fk_sid
GROUP BY k.pk_kid;

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
  aks.seriefiles AS seriefiles,
  aks.serie_altname AS serie_altname,
  aks.serie AS serie,
  aks.sid AS sid,
  akt.tid AS tid,
  akt.tags AS tags,
  akt.aliases AS tag_aliases,
  akt.tagfiles AS tagfiles,
  COALESCE(lower(unaccent(aks.serie)), lower(unaccent(singers.singers_sortable))) AS serie_singer_sortable,
  singers.singers AS singers,
  aks.serie_names AS serie_names,
  akt.tags_searchable AS tag_names,
  singers.singers_sortable AS singers_sortable,
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
LEFT JOIN all_kara_series aks ON k.pk_kid = aks.kid
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
GROUP BY k.pk_kid, languages_sortable, songtypes_sortable, singers_sortable, singers, songtypes, groups, songwriters, misc, authors, languages, creators, platforms, genres, origins, families, aks.seriefiles, aks.serie_orig, aks.serie_altname, aks.serie, aks.serie_names, aks.sid, akt.tid, akt.tags, akt.aliases, akt.tags_searchable, akt.tagfiles
ORDER BY languages_sortable, serie_singer_sortable, songtypes_sortable DESC, songorder;

CREATE INDEX idx_ak_created ON all_karas(created_at DESC);
CREATE INDEX idx_ak_serie ON all_karas(serie NULLS LAST);
CREATE INDEX idx_ak_serie_singer ON all_karas(serie_singer_sortable NULLS LAST);
CREATE INDEX idx_ak_songtypes ON all_karas(songtypes_sortable DESC);
CREATE INDEX idx_ak_songorder ON all_karas(songorder);
CREATE INDEX idx_ak_title ON all_karas(title);
CREATE INDEX idx_ak_singer ON all_karas(singers_sortable);
CREATE INDEX idx_ak_language ON all_karas(languages_sortable);
CREATE INDEX idx_ak_year ON all_karas(year);
CREATE INDEX idx_ak_kid ON all_karas(kid);

