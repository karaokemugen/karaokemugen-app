/* Initialize settings table to force regen */
DELETE FROM settings;
TRUNCATE kara_tag CASCADE;
TRUNCATE kara_serie CASCADE;
TRUNCATE tag RESTART IDENTITY CASCADE;
TRUNCATE serie RESTART IDENTITY CASCADE;
TRUNCATE serie_lang RESTART IDENTITY CASCADE;
TRUNCATE kara RESTART IDENTITY CASCADE;
TRUNCATE repo CASCADE;

DROP MATERIALIZED VIEW all_tags;
DROP MATERIALIZED VIEW all_karas;
DROP MATERIALIZED VIEW singer;
DROP MATERIALIZED VIEW songtype;
DROP MATERIALIZED VIEW creator;
DROP MATERIALIZED VIEW language;
DROP MATERIALIZED VIEW author;
DROP MATERIALIZED VIEW misc;
DROP MATERIALIZED VIEW songwriter;
DROP MATERIALIZED VIEW group_tags;
DROP VIEW stats;

ALTER TABLE kara_tag DROP CONSTRAINT kara_tag_fk_id_tag_fkey;
DROP INDEX idx_kara_tag;
ALTER TABLE kara_tag DROP COLUMN fk_id_tag;
ALTER TABLE tag DROP CONSTRAINT tag_pkey;
ALTER TABLE tag DROP COLUMN pk_id_tag;
ALTER TABLE tag ADD COLUMN pk_tid uuid NOT NULL PRIMARY KEY;
ALTER TABLE tag ADD COLUMN short CHARACTER VARYING;
ALTER TABLE tag DROP COLUMN slug;
ALTER TABLE tag ADD COLUMN aliases JSONB;
ALTER TABLE tag DROP COLUMN tagtype;
ALTER TABLE tag ADD COLUMN types INTEGER[] NOT NULL;
ALTER TABLE tag ADD COLUMN tagfile CHARACTER VARYING NOT NULL;

ALTER TABLE kara_tag ADD COLUMN fk_tid UUID NOT NULL;
ALTER TABLE kara_tag ADD CONSTRAINT kara_tag_fk_tid_fkey FOREIGN KEY (fk_tid) REFERENCES tag(pk_tid) ON DELETE CASCADE;
ALTER TABLE kara_tag ADD COLUMN type INTEGER NOT NULL;
CREATE UNIQUE INDEX idx_kara_tag ON kara_tag (fk_kid, fk_tid, type);

CREATE VIEW tag_tid AS
SELECT pk_tid AS tid, name, short, aliases, i18n, types FROM tag;

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
SELECT
	t.name AS name,
	t.types AS types,
	t.aliases AS aliases,
	t.i18n AS i18n,
	t.pk_tid AS tid,
	tag_aliases.list AS search_aliases,
	t.tagfile AS tagfile,
    t.short as short,
	COUNT(kt.fk_kid) AS karacount
	FROM tag t
	CROSS JOIN LATERAL (
		SELECT string_agg(tag_aliases.elem::text, ' ') AS list
		FROM jsonb_array_elements_text(t.aliases) AS tag_aliases(elem)
	) tag_aliases
	LEFT JOIN kara_tag kt ON kt.fk_tid = t.pk_tid
	GROUP BY t.pk_tid, tag_aliases.list
    ORDER BY name;

CREATE INDEX idx_at_name ON all_tags(name);
CREATE INDEX idx_at_tid ON all_tags(tid);
CREATE INDEX idx_at_search_aliases ON all_tags(search_aliases);

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
  k.fk_repo_name AS repo
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

CREATE VIEW stats AS
SELECT
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[2]) AS singers,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[8]) AS songwriters,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[4]) AS creators,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[6]) AS authors,
(SELECT COUNT(pk_kid) FROM kara) AS karas,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[5]) AS languages,
(SELECT COUNT(pk_sid) FROM serie) AS series,
(SELECT COUNT(*) FROM played) AS played,
(SELECT COUNT(pk_id_playlist) FROM playlist) AS playlists,
(SELECT SUM(duration) FROM kara) AS duration;
