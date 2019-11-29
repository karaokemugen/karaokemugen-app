DELETE FROM settings;
TRUNCATE kara_tag CASCADE;
TRUNCATE kara_serie CASCADE;
TRUNCATE tag RESTART IDENTITY CASCADE;
TRUNCATE serie RESTART IDENTITY CASCADE;
TRUNCATE serie_lang RESTART IDENTITY CASCADE;
TRUNCATE kara RESTART IDENTITY CASCADE;
TRUNCATE repo CASCADE;

DROP MATERIALIZED VIEW all_karas;
DROP MATERIALIZED VIEW all_tags;
DROP MATERIALIZED VIEW all_kara_tag;
DROP MATERIALIZED VIEW singers;
DROP MATERIALIZED VIEW songtypes;
DROP MATERIALIZED VIEW creators;
DROP MATERIALIZED VIEW languages;
DROP MATERIALIZED VIEW authors;
DROP MATERIALIZED VIEW misc;
DROP MATERIALIZED VIEW songwriters;
DROP MATERIALIZED VIEW groups;
DROP MATERIALIZED VIEW families;
DROP MATERIALIZED VIEW origins;
DROP MATERIALIZED VIEW genres;
DROP MATERIALIZED VIEW platforms;
DROP VIEW stats;

DROP VIEW tag_tid;

ALTER TABLE kara_tag DROP CONSTRAINT kara_tag_fk_tid_fkey;
DROP INDEX idx_kara_tag;
ALTER TABLE kara_tag DROP COLUMN fk_tid;
ALTER TABLE kara_tag DROP COLUMN type;

ALTER TABLE tag DROP CONSTRAINT tag_pkey;
ALTER TABLE tag DROP COLUMN pk_tid;
ALTER TABLE tag ADD COLUMN pk_id_tag INTEGER NOT NULL PRIMARY KEY;
ALTER TABLE tag DROP COLUMN short;
ALTER TABLE tag ADD COLUMN slug CHARACTER VARYING;
ALTER TABLE tag DROP COLUMN aliases;
ALTER TABLE tag DROP COLUMN tagfile;
ALTER TABLE tag DROP COLUMN types;
ALTER TABLE tag ADD COLUMN tagtype INTEGER NOT NULL;
ALTER TABLE kara_tag ADD COLUMN fk_id_tag INTEGER NOT NULL;
ALTER TABLE kara_tag ADD CONSTRAINT kara_tag_fk_id_tag_fkey FOREIGN KEY (fk_id_tag) REFERENCES tag(pk_id_tag) ON DELETE CASCADE;
CREATE UNIQUE INDEX idx_kara_tag ON kara_tag (fk_kid, fk_id_tag);

CREATE VIEW stats AS
SELECT
(SELECT COUNT(pk_id_tag) FROM tag WHERE tagtype=2) AS singers,
(SELECT COUNT(pk_id_tag) FROM tag WHERE tagtype=8) AS songwriters,
(SELECT COUNT(pk_id_tag) FROM tag WHERE tagtype=4) AS creators,
(SELECT COUNT(pk_id_tag) FROM tag WHERE tagtype=6) AS authors,
(SELECT COUNT(pk_kid) FROM kara) AS karas,
(SELECT COUNT(pk_id_tag) FROM tag WHERE tagtype=5) AS languages,
(SELECT COUNT(pk_sid) FROM serie) AS series,
(SELECT COUNT(*) FROM played) AS played,
(SELECT COUNT(pk_id_playlist) FROM playlist) AS playlists,
(SELECT SUM(duration) FROM kara) AS duration;

CREATE MATERIALIZED VIEW singer AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_singer)) AS singers, string_agg(t_singer.name, ', ' ORDER BY name) AS singers_sortable
    FROM kara_tag kt
    INNER JOIN tag t_singer ON kt.fk_id_tag = t_singer.pk_id_tag AND t_singer.tagtype = 2
   GROUP BY  kt.fk_kid;

CREATE MATERIALIZED VIEW songtype AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_songtype)) AS songtypes, string_agg(t_songtype.name, ', ' ORDER BY name) AS songtypes_sortable
    FROM kara_tag kt
    INNER JOIN tag t_songtype ON kt.fk_id_tag = t_songtype.pk_id_tag AND t_songtype.tagtype = 3
GROUP BY  kt.fk_kid;

CREATE MATERIALIZED VIEW creator AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_creator)) AS creators
    FROM kara_tag kt
    INNER JOIN tag t_creator ON kt.fk_id_tag = t_creator.pk_id_tag AND t_creator.tagtype = 4
GROUP BY  kt.fk_kid;

CREATE MATERIALIZED VIEW language AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_language)) AS languages, string_agg(t_language.name, ', ' ORDER BY name) AS languages_sortable
    FROM kara_tag kt
    INNER JOIN tag t_language ON kt.fk_id_tag = t_language.pk_id_tag AND t_language.tagtype = 5
GROUP BY  kt.fk_kid;

CREATE MATERIALIZED VIEW author AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_author)) AS authors
    FROM kara_tag kt
    INNER JOIN tag t_author ON kt.fk_id_tag = t_author.pk_id_tag AND t_author.tagtype = 6
GROUP BY kt.fk_kid;

CREATE MATERIALIZED VIEW misc AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_misc)) AS misc_tags
    FROM kara_tag kt
    INNER JOIN tag t_misc ON kt.fk_id_tag = t_misc.pk_id_tag AND t_misc.tagtype = 7
GROUP BY kt.fk_kid;

CREATE MATERIALIZED VIEW songwriter AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_songwriter)) AS songwriters
    FROM kara_tag kt
    INNER JOIN tag t_songwriter ON kt.fk_id_tag = t_songwriter.pk_id_tag AND t_songwriter.tagtype = 8
GROUP BY kt.fk_kid;

CREATE MATERIALIZED VIEW group_tags AS
SELECT kt.fk_kid, jsonb_agg(to_jsonb(t_group)) AS groups
    FROM kara_tag kt
    INNER JOIN tag t_group ON kt.fk_id_tag = t_group.pk_id_tag AND t_group.tagtype = 9
GROUP BY kt.fk_kid;

CREATE INDEX idx_author_kid ON author(fk_kid);
CREATE INDEX idx_creator_kid ON creator(fk_kid);
CREATE INDEX idx_gt_kid ON group_tags(fk_kid);
CREATE INDEX idx_language_kid ON language(fk_kid);
CREATE INDEX idx_misc_kid ON misc(fk_kid);
CREATE INDEX idx_singer_kid ON singer(fk_kid);
CREATE INDEX idx_songwriter_kid ON songwriter(fk_kid);
CREATE INDEX idx_songtype_kid ON songtype(fk_kid);

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
  COALESCE(lower(unaccent(aks.serie)), lower(unaccent(singer.singers_sortable))) AS serie_singer_sortable,
  singer.singers AS singers,
  aks.serie_names AS serie_names,
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
  k.fk_repo_name AS repo
FROM kara k
LEFT JOIN all_kara_series aks ON k.pk_kid = aks.kid
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
GROUP BY k.pk_kid, languages_sortable, songtypes_sortable, singers_sortable, singers, songtypes, groups, songwriters, misc_tags, authors, languages, creators, aks.seriefiles, aks.serie_orig, aks.serie_altname, aks.serie, aks.serie_names, aks.sid
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
CREATE INDEX idx_ak_tags ON all_karas(tags);

CREATE MATERIALIZED VIEW all_tags AS
SELECT
	pk_id_tag AS tag_id,
	tagtype,
	name,
	slug,
	i18n,
	COUNT(kt.*) AS karacount
FROM tag
LEFT JOIN kara_tag kt ON fk_id_tag = pk_id_tag
GROUP BY pk_id_tag
ORDER BY tagtype, name;
