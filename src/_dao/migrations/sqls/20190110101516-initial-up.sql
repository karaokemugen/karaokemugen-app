/* Replace with your SQL commands */

CREATE TABLE kara
(
	pk_id_kara serial PRIMARY KEY,
	kid uuid NOT NULL,
	title character varying NOT NULL,
	year smallint,
	songorder smallint NULL,
	mediafile character varying NOT NULL,
	subfile character varying NOT NULL,
	karafile character varying NOT NULL,
	duration smallint DEFAULT(0),
	mediasize integer DEFAULT(0),
	gain real DEFAULT(0),
	created_at timestamp NOT NULL,
	modified_at timestamp NOT NULL
);

CREATE TABLE settings
(
    option CHARACTER VARYING NOT NULL UNIQUE,
    value TEXT
);

CREATE TABLE serie
(
    pk_id_serie SERIAL PRIMARY KEY,
    name CHARACTER VARYING NOT NULL,
    aliases JSONB,
	seriefile CHARACTER VARYING,
	sid UUID
);

CREATE TABLE tag
(
	pk_id_tag SERIAL PRIMARY KEY,
	tagtype INTEGER NOT NULL,
	name CHARACTER VARYING NOT NULL,
	slug CHARACTER VARYING,
	i18n CHARACTER VARYING
);

CREATE TABLE serie_lang
(
	pk_id_serie_lang serial PRIMARY KEY,
	fk_id_serie integer NOT NULL,
	lang character(3) NOT NULL,
	name character varying NOT NULL,
	FOREIGN KEY(fk_id_serie) REFERENCES serie(pk_id_serie) ON DELETE CASCADE
);

CREATE TABLE kara_serie
(
	fk_id_serie integer NOT NULL,
	fk_id_kara integer NOT NULL,
	FOREIGN KEY(fk_id_serie) REFERENCES serie(pk_id_serie) ON DELETE RESTRICT,
	FOREIGN KEY(fk_id_kara) REFERENCES kara(pk_id_kara) ON DELETE RESTRICT
);

CREATE TABLE kara_tag
(
	fk_id_tag integer NOT NULL,
	fk_id_kara integer NOT NULL,
	FOREIGN KEY(fk_id_tag) REFERENCES tag(pk_id_tag) ON DELETE RESTRICT,
	FOREIGN KEY(fk_id_kara) REFERENCES kara(pk_id_kara) ON DELETE RESTRICT
);

CREATE INDEX idx_serie_lang_fk_id_serie ON serie_lang (fk_id_serie);
CREATE UNIQUE INDEX idx_kara_serie ON kara_serie (fk_id_kara, fk_id_serie);
CREATE UNIQUE INDEX idx_kara_tag ON kara_tag (fk_id_kara, fk_id_tag);

CREATE UNIQUE INDEX idx_kara_kid ON kara (kid);
CREATE UNIQUE INDEX idx_serie_sid ON serie (sid);

CREATE INDEX idx_kara_created ON kara(created_at DESC);
CREATE INDEX idx_serie_name ON serie(name);
CREATE INDEX idx_kara_songorder ON kara(songorder);
CREATE INDEX idx_kara_title ON kara(title);

CREATE TABLE users (
	pk_id_user serial PRIMARY KEY,
	login character varying UNIQUE,
	nickname character varying UNIQUE,
	password character varying,
	type smallint NOT NULL,
	avatar_file character varying NOT NULL DEFAULT 'blank.png',
	bio character varying,
	url character varying,
	email character varying,
	flag_online smallint NOT NULL
);

CREATE UNIQUE INDEX idx_users_login ON users(login);
CREATE UNIQUE INDEX idx_users_nickname ON users(nickname);

CREATE TABLE whitelist (
	pk_id_whitelist	SERIAL NOT NULL PRIMARY KEY,
	fk_id_kara	INTEGER NOT NULL,
	kid	UUID NOT NULL UNIQUE,
	created_at	TIMESTAMP NOT NULL
);

CREATE INDEX idx_whitelist_kid ON whitelist(kid);

CREATE TABLE played
(
	pk_id_played serial PRIMARY KEY,
	fk_id_kara INTEGER NOT NULL,
	session_started_at timestamp NOT NULL,
	kid uuid NOT NULL,
	played_at timestamp NOT NULL
);

CREATE UNIQUE INDEX idx_played_kara_startedat_kid_playedat ON played (fk_id_kara, session_started_at, kid, played_at);

CREATE TABLE requested
(
	pk_id_requested serial PRIMARY KEY,
	fk_id_user integer NOT NULL,
	fk_id_kara integer NOT NULL,
	session_started_at timestamp NOT NULL,
	kid uuid NOT NULL,
	requested_at timestamp NOT NULL
);

CREATE UNIQUE INDEX idx_requested_user_kara_startedat_kid_requestedat ON requested (fk_id_user, fk_id_kara, session_started_at, kid, requested_at);


CREATE TABLE playlist (
	pk_id_playlist	INTEGER PRIMARY KEY,
	name	CHARACTER VARYING NOT NULL,
	karacount	INTEGER NOT NULL DEFAULT 0,
	duration	INTEGER NOT NULL DEFAULT 0,
	created_at	TIMESTAMP NOT NULL,
	modified_at	TIMESTAMP NOT NULL,
	flag_visible	INTEGER NOT NULL DEFAULT 1,
	flag_current	INTEGER NOT NULL DEFAULT 0,
	flag_public	INTEGER NOT NULL DEFAULT 0,
	flag_favorites	INTEGER NOT NULL DEFAULT 0,
	time_left	INTEGER NOT NULL DEFAULT 0,
	fk_id_user	INTEGER NOT NULL DEFAULT 1,
	FOREIGN KEY(fk_id_user) REFERENCES users(pk_id_user) ON DELETE CASCADE
);

CREATE INDEX idx_playlist_user ON playlist(fk_id_user);


CREATE TABLE playlist_content (
	pk_id_plcontent	INTEGER PRIMARY KEY,
	fk_id_playlist INTEGER NOT NULL,
	fk_id_kara INTEGER NOT NULL,
	kid	UUID NOT NULL,
	created_at	TIMESTAMP NOT NULL,
	pos	REAL NOT NULL,
	flag_playing	INTEGER NOT NULL,
	nickname	CHARACTER VARYING,
	fk_id_user	INTEGER NOT NULL,
	flag_free	INTEGER NOT NULL,
	FOREIGN KEY(fk_id_playlist) REFERENCES playlist(pk_id_playlist) ON DELETE CASCADE
);

CREATE INDEX idx_plc_kid ON playlist_content(kid);
CREATE INDEX idx_plc_pos ON playlist_content(pos);
CREATE INDEX idx_plc_kara ON playlist_content(fk_id_kara);
CREATE INDEX idx_plc_playlist ON playlist_content(fk_id_playlist);

CREATE TABLE upvote (
	fk_id_plcontent	INTEGER NOT NULL,
	fk_id_user	INTEGER NOT NULL,
	FOREIGN KEY(fk_id_user) REFERENCES users(pk_id_user) ON DELETE CASCADE,
	FOREIGN KEY(fk_id_plcontent) REFERENCES playlist_content(pk_id_plcontent) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_upvote_plcontent_user ON upvote(fk_id_plcontent, fk_id_user);

CREATE TABLE blacklist_criteria (
	pk_id_blcriteria	INTEGER PRIMARY KEY,
	type	INTEGER NOT NULL,
	value	CHARACTER VARYING NOT NULL,
	uniquevalue	CHARACTER VARYING
);

CREATE TABLE blacklist (
	pk_id_blacklist	INTEGER PRIMARY KEY,
	fk_id_kara	INTEGER NOT NULL,
	kid	UUID NOT NULL UNIQUE,
	created_at	TIMESTAMP NOT NULL,
	reason	CHARACTER VARYING NOT NULL
);
CREATE INDEX idx_whitelist_kara ON whitelist (fk_id_kara);

CREATE VIEW stats AS
SELECT
(SELECT COUNT(pk_id_tag) FROM tag WHERE tagtype=2) AS singers,
(SELECT COUNT(pk_id_tag) FROM tag WHERE tagtype=8) AS songwriters,
(SELECT COUNT(pk_id_tag) FROM tag WHERE tagtype=4) AS creators,
(SELECT COUNT(pk_id_tag) FROM tag WHERE tagtype=6) AS authors,
(SELECT COUNT(pk_id_kara) FROM kara) AS karas,
(SELECT COUNT(pk_id_tag) FROM tag WHERE tagtype=5) AS languages,
(SELECT COUNT(pk_id_serie) FROM serie) AS series,
(SELECT COUNT(pk_id_played) FROM played) AS played,
(SELECT COUNT(pk_id_playlist) FROM playlist WHERE flag_favorites = 0) AS playlists,
(SELECT SUM(duration) FROM kara) AS duration;

CREATE MATERIALIZED VIEW all_karas AS
WITH series_i18n(serie_id, serie_langs) AS (
     SELECT sl.fk_id_serie, array_to_json(array_agg(json_build_object('lang', sl.lang, 'name', sl.name)))
     FROM serie_lang sl
     GROUP BY sl.fk_id_serie
),
singer AS (SELECT kt.fk_id_kara, jsonb_agg(to_jsonb(t_singer)) AS singers, string_agg(t_singer.name, ', ' ORDER BY name) AS singers_sortable
    FROM kara_tag kt
    INNER JOIN tag t_singer ON kt.fk_id_tag = t_singer.pk_id_tag AND t_singer.tagtype = 2
   GROUP BY  kt.fk_id_kara
),
songtype AS (SELECT kt.fk_id_kara, jsonb_agg(to_jsonb(t_songtype)) AS songtypes, string_agg(t_songtype.name, ', ' ORDER BY name) AS songtypes_sortable
    FROM kara_tag kt
    INNER JOIN tag t_songtype ON kt.fk_id_tag = t_songtype.pk_id_tag AND t_songtype.tagtype = 3
   GROUP BY  kt.fk_id_kara
),
creator AS (SELECT kt.fk_id_kara, jsonb_agg(to_jsonb(t_creator)) AS creators
    FROM kara_tag kt
    INNER JOIN tag t_creator ON kt.fk_id_tag = t_creator.pk_id_tag AND t_creator.tagtype = 4
   GROUP BY  kt.fk_id_kara
),
language AS (SELECT kt.fk_id_kara, jsonb_agg(to_jsonb(t_language)) AS languages, string_agg(t_language.name, ', ' ORDER BY name) AS languages_sortable
    FROM kara_tag kt
    INNER JOIN tag t_language ON kt.fk_id_tag = t_language.pk_id_tag AND t_language.tagtype = 5
   GROUP BY  kt.fk_id_kara
),
author AS (SELECT kt.fk_id_kara, jsonb_agg(to_jsonb(t_author)) AS authors
    FROM kara_tag kt
    INNER JOIN tag t_author ON kt.fk_id_tag = t_author.pk_id_tag AND t_author.tagtype = 6
   GROUP BY kt.fk_id_kara
),
misc AS (SELECT kt.fk_id_kara, jsonb_agg(to_jsonb(t_misc)) AS misc_tags
    FROM kara_tag kt
    INNER JOIN tag t_misc ON kt.fk_id_tag = t_misc.pk_id_tag AND t_misc.tagtype = 7
   GROUP BY kt.fk_id_kara
),
songwriter AS (SELECT kt.fk_id_kara, jsonb_agg(to_jsonb(t_songwriter)) AS songwriters
    FROM kara_tag kt
    INNER JOIN tag t_songwriter ON kt.fk_id_tag = t_songwriter.pk_id_tag AND t_songwriter.tagtype = 8
   GROUP BY kt.fk_id_kara
),
group_tags AS (SELECT kt.fk_id_kara, jsonb_agg(to_jsonb(t_group)) AS groups
    FROM kara_tag kt
    INNER JOIN tag t_group ON kt.fk_id_tag = t_group.pk_id_tag AND t_group.tagtype = 9
   GROUP BY kt.fk_id_kara
)

SELECT
 k.pk_id_kara AS kara_id,
  k.kid,
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
  jsonb_agg(DISTINCT(s.sid)) AS sid,
  jsonb_agg(DISTINCT(s18.serie_langs)::jsonb) as serie_i18n,
  string_agg(DISTINCT(s.name),',') AS serie,
  jsonb_agg(DISTINCT(s.aliases)) AS serie_altname,
  array_agg(DISTINCT(s.pk_id_serie)) AS serie_id,
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
  string_agg(DISTINCT(t.name),' ') AS tags
FROM kara k
LEFT JOIN kara_serie ks ON k.pk_id_kara = ks.fk_id_kara
LEFT JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
LEFT JOIN series_i18n s18 ON s18.serie_id = ks.fk_id_serie
LEFT JOIN kara_tag kt ON k.pk_id_kara = kt.fk_id_kara
LEFT JOIN tag t ON kt.fk_id_tag = t.pk_id_tag
LEFT OUTER JOIN singer on k.pk_id_kara = singer.fk_id_kara
LEFT OUTER JOIN songtype on k.pk_id_kara = songtype.fk_id_kara
LEFT OUTER JOIN creator on k.pk_id_kara = creator.fk_id_kara
LEFT OUTER JOIN language on k.pk_id_kara = language.fk_id_kara
LEFT OUTER JOIN author on k.pk_id_kara = author.fk_id_kara
LEFT OUTER JOIN misc on k.pk_id_kara = misc.fk_id_kara
LEFT OUTER JOIN songwriter on k.pk_id_kara = songwriter.fk_id_kara
LEFT OUTER JOIN group_tags on k.pk_id_kara = group_tags.fk_id_kara
GROUP BY k.pk_id_kara, languages_sortable, songtypes_sortable, singers_sortable, singers, songtypes, groups, songwriters, misc_tags, authors, languages, creators
ORDER BY languages_sortable, serie, singers_sortable, songtypes_sortable DESC, songorder;

CREATE INDEX idx_ak_created ON all_karas(created_at DESC);
CREATE INDEX idx_ak_serie ON all_karas(serie NULLS LAST);
CREATE INDEX idx_ak_songtypes ON all_karas(songtypes_sortable DESC);
CREATE INDEX idx_ak_songorder ON all_karas(songorder);
CREATE INDEX idx_ak_title ON all_karas(title);
CREATE INDEX idx_ak_singer ON all_karas(singers_sortable);
CREATE INDEX idx_ak_language ON all_karas(languages_sortable);
CREATE INDEX idx_ak_year ON all_karas(year);
CREATE INDEX idx_ak_kid ON all_karas(kid);
CREATE INDEX idx_ak_tags ON all_karas(tags);


CREATE MATERIALIZED VIEW all_tags AS
SELECT pk_id_tag AS tag_id, tagtype, name, slug,
 (SELECT COUNT(fk_id_kara) FROM kara_tag WHERE fk_id_tag = pk_id_tag) AS karacount
FROM tag
ORDER BY tagtype, name;

CREATE INDEX idx_at_tagid ON all_tags(tag_id);
CREATE INDEX idx_at_tagtype ON all_tags(tagtype);
CREATE INDEX idx_at_name ON all_tags(name);

CREATE MATERIALIZED VIEW all_years AS
SELECT DISTINCT k.year,
	(SELECT COUNT(pk_id_kara) FROM kara WHERE year = k.year)::integer AS karacount
FROM kara AS k
ORDER BY year;

CREATE INDEX idx_ay_year ON all_years(year);


CREATE MATERIALIZED VIEW all_series AS
SELECT s.pk_id_serie AS serie_id,
	s.name AS name,
	s.aliases AS aliases,
	s.sid AS sid,
	array_to_json(array_agg(json_build_object('lang', sl.lang, 'name', sl.name))) as i18n,
	string_agg(sl.name,' ') as search,
	s.seriefile AS seriefile,
	(SELECT COUNT(ks.fk_id_kara) FROM kara_serie ks WHERE ks.fk_id_serie = s.pk_id_serie) AS karacount
	FROM serie s
	LEFT JOIN serie_lang sl ON sl.fk_id_serie = s.pk_id_serie
	GROUP BY s.pk_id_serie
    ORDER BY name;

CREATE INDEX idx_as_id ON all_series(serie_id);
CREATE INDEX idx_as_name ON all_series(name);
CREATE INDEX idx_as_sid ON all_series(sid);
