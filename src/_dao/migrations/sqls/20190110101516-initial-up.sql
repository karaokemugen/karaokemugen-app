CREATE TABLE kara
(
	pk_kid uuid NOT NULL PRIMARY KEY,
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
	pk_sid UUID PRIMARY KEY,
    name CHARACTER VARYING UNIQUE NOT NULL,
    aliases JSONB,
	seriefile CHARACTER VARYING
);

CREATE TABLE tag
(
	pk_id_tag SERIAL PRIMARY KEY,
	tagtype INTEGER NOT NULL,
	name CHARACTER VARYING NOT NULL,
	slug CHARACTER VARYING,
	i18n JSONB
);

CREATE UNIQUE INDEX idx_tag ON tag (name, tagtype);

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

CREATE TABLE kara_tag
(
	fk_id_tag integer NOT NULL,
	fk_kid uuid NOT NULL,
	FOREIGN KEY(fk_id_tag) REFERENCES tag(pk_id_tag) ON DELETE RESTRICT,
	FOREIGN KEY(fk_kid) REFERENCES kara(pk_kid) ON DELETE RESTRICT
);

CREATE INDEX idx_serie_lang_fk_sid ON serie_lang (fk_sid);
CREATE UNIQUE INDEX idx_kara_serie ON kara_serie (fk_kid, fk_sid);
CREATE UNIQUE INDEX idx_kara_tag ON kara_tag (fk_kid, fk_id_tag);

CREATE INDEX idx_kara_created ON kara(created_at DESC);
CREATE INDEX idx_serie_name ON serie(name);
CREATE INDEX idx_kara_songorder ON kara(songorder);
CREATE INDEX idx_kara_title ON kara(title);

CREATE TABLE users (
	pk_login character varying PRIMARY KEY,
	nickname character varying UNIQUE,
	password character varying,
	type smallint NOT NULL,
	avatar_file character varying NOT NULL DEFAULT 'blank.png',
	bio character varying,
	url character varying,
	email character varying,
	flag_online BOOLEAN DEFAULT FALSE,
	last_login_at timestamp,
	fingerprint character varying
);

CREATE UNIQUE INDEX idx_users_nickname ON users(nickname);

CREATE TABLE whitelist (
	fk_kid	UUID NOT NULL UNIQUE,
	created_at TIMESTAMP NOT NULL,
	reason CHARACTER VARYING
);

CREATE TABLE played
(
	session_started_at timestamp NOT NULL,
	fk_kid uuid NOT NULL,
	played_at timestamp NOT NULL
);

CREATE UNIQUE INDEX idx_played_startedat_kid_playedat ON played (fk_kid, played_at);

CREATE TABLE requested
(
	fk_login character varying NOT NULL,
	fk_kid uuid NOT NULL,
	session_started_at timestamp NOT NULL,
	requested_at timestamp NOT NULL
);

CREATE UNIQUE INDEX idx_requested_user_kid_requestedat ON requested (fk_login, fk_kid, requested_at);

CREATE TABLE favorites
(
	fk_login character varying NOT NULL,
	fk_kid uuid NOT NULL,
	FOREIGN KEY(fk_login) REFERENCES users(pk_login) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX idx_favorites ON favorites (fk_login, fk_kid);

CREATE TABLE playlist (
	pk_id_playlist	SERIAL PRIMARY KEY,
	name	CHARACTER VARYING NOT NULL,
	karacount	INTEGER NOT NULL DEFAULT 0,
	duration	INTEGER NOT NULL DEFAULT 0,
	created_at	TIMESTAMP NOT NULL,
	modified_at	TIMESTAMP NOT NULL,
	flag_visible	BOOLEAN DEFAULT TRUE,
	flag_current	BOOLEAN DEFAULT FALSE,
	flag_public	BOOLEAN DEFAULT FALSE,
	time_left	INTEGER NOT NULL DEFAULT 0,
	fk_login	CHARACTER VARYING NOT NULL DEFAULT 'admin',
	FOREIGN KEY(fk_login) REFERENCES users(pk_login) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_playlist_user ON playlist(fk_login);

CREATE TABLE playlist_content (
	pk_id_plcontent	SERIAL PRIMARY KEY,
	fk_id_playlist INTEGER NOT NULL,
	fk_kid UUID NOT NULL,
	created_at TIMESTAMP NOT NULL,
	pos	INTEGER NOT NULL,
	flag_playing BOOLEAN DEFAULT FALSE,
	nickname CHARACTER VARYING,
	fk_login CHARACTER VARYING NOT NULL,
	flag_free	BOOLEAN DEFAULT FALSE,
	FOREIGN KEY(fk_id_playlist) REFERENCES playlist(pk_id_playlist) ON DELETE CASCADE
);

CREATE INDEX idx_plc_kid ON playlist_content(fk_kid);
CREATE INDEX idx_plc_pos ON playlist_content(pos);
CREATE INDEX idx_plc_playlist ON playlist_content(fk_id_playlist);

CREATE TABLE upvote (
	fk_id_plcontent	INTEGER NOT NULL,
	fk_login CHARACTER VARYING NOT NULL,
	FOREIGN KEY(fk_login) REFERENCES users(pk_login) ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY(fk_id_plcontent) REFERENCES playlist_content(pk_id_plcontent) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_upvote_plcontent_user ON upvote(fk_id_plcontent, fk_login);

CREATE TABLE blacklist_criteria (
	pk_id_blcriteria SERIAL PRIMARY KEY,
	type INTEGER NOT NULL,
	value CHARACTER VARYING NOT NULL,
	uniquevalue	CHARACTER VARYING
);

CREATE TABLE blacklist (
	fk_kid	UUID NOT NULL UNIQUE,
	created_at TIMESTAMP NOT NULL,
	reason CHARACTER VARYING NOT NULL
);
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

CREATE MATERIALIZED VIEW series_i18n AS
SELECT sl.fk_sid AS fk_sid, array_to_json(array_agg(json_build_object('lang', sl.lang, 'name', sl.name))) AS serie_langs
FROM serie_lang sl
GROUP BY sl.fk_sid;

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
CREATE INDEX idx_series_i18n_sid ON series_i18n(fk_sid);
CREATE INDEX idx_singer_kid ON singer(fk_kid);
CREATE INDEX idx_songwriter_kid ON songwriter(fk_kid);
CREATE INDEX idx_songtype_kid ON songtype(fk_kid);

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

CREATE UNIQUE INDEX idx_all_ks_kid ON all_kara_series(kid);

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
  string_agg(DISTINCT(t.name),' ') AS tags
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

CREATE INDEX idx_at_tagid ON all_tags(tag_id);
CREATE INDEX idx_at_tagtype ON all_tags(tagtype);
CREATE INDEX idx_at_name ON all_tags(name);

CREATE MATERIALIZED VIEW all_years AS
SELECT DISTINCT
	k.year,
	COUNT(karas.pk_kid) AS karacount
FROM kara AS k
LEFT JOIN kara karas ON karas.pk_kid = k.pk_kid
GROUP BY k.year
ORDER BY year;

CREATE INDEX idx_ay_year ON all_years(year);


CREATE MATERIALIZED VIEW all_series AS
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

CREATE INDEX idx_as_name ON all_series(name);
CREATE INDEX idx_as_sid ON all_series(sid);
CREATE INDEX idx_as_search ON all_series(search);
CREATE INDEX idx_as_search_aliases ON all_series(search_aliases);