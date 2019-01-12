// SQL for playlist management

export const updatePlaylistLastEditTime = `
UPDATE playlist SET
	modified_at = :modified_at
WHERE pk_id_playlist = :playlist_id;
`;

export const emptyPlaylist = `
DELETE FROM playlist_content
WHERE fk_id_playlist = $1;
`;

export const deletePlaylist = `
DELETE FROM playlist
WHERE pk_id_playlist = $1;
`;

export const editPlaylist = `
UPDATE playlist SET
	name = :name,
	modified_at = :modified_at,
	flag_visible = :flag_visible
WHERE pk_id_playlist = :playlist_id;
`;

export const createPlaylist = `
INSERT INTO playlist(
	name,
	karacount,
	duration,
	created_at,
	modified_at,
	flag_visible,
	flag_current,
	flag_public,
	flag_favorites,
	fk_id_user,
	time_left
)
VALUES(
	:name,
	0,
	0,
	:created_at,
	:modified_at,
	:flag_visible,
	:flag_current,
	:flag_public,
	:flag_favorites,
	(SELECT pk_id_user FROM users WHERE login = :username),
	0
) RETURNING pk_id_playlist
`;

export const updatePlaylistKaraCount = `
UPDATE playlist SET
	karacount = (
		SELECT COUNT(fk_id_kara)
		FROM playlist_content
		WHERE fk_id_playlist = $1
			AND fk_id_kara != 0
	)
WHERE pk_id_playlist = $1
`;

export const getPLCByDate = `
SELECT pc.pk_id_plcontent AS playlistcontent_id
FROM playlist_content AS pc
WHERE pc.created_at = :date_added
	AND pc.fk_id_playlist = :playlist_id
ORDER BY pc.pos
`;

export const updatePLCSetPos = `
UPDATE playlist_content
SET pos = $1
WHERE pk_id_plcontent = $2
`;


export const updatePlaylistDuration = `
UPDATE playlist SET time_left = (
	SELECT COALESCE(SUM(kara.duration),0) AS duration
		FROM kara, playlist_content
		WHERE playlist_content.fk_id_kara = kara.pk_id_kara
		AND playlist_content.fk_id_playlist = $1
		AND playlist_content.pos >= (
			SELECT COALESCE(pos,0)
			FROM playlist_content
			WHERE flag_playing = TRUE AND playlist_content.fk_id_playlist = $1
			)
	),
	duration = (
		SELECT COALESCE(SUM(kara.duration),0) AS duration
			FROM kara, playlist_content
			WHERE playlist_content.fk_id_kara = kara.pk_id_kara
				AND playlist_content.fk_id_playlist = $1
				AND playlist_content.pos >= 0)
WHERE pk_id_playlist = $1;
`;

export const getPlaylistContentsKaraIDs = `
SELECT pc.fk_id_kara AS kara_id,
	pc.fk_id_user AS user_id,
	pc.pk_id_plcontent AS playlistcontent_id,
	pc.flag_playing AS flag_playing,
	pc.pos AS pos
FROM playlist_content AS pc
WHERE pc.fk_id_playlist = $1
ORDER BY pc.pos,pc.created_at DESC
`;

export const getPlaylistContents = (filterClauses, lang, typeClauses, limitClause, offsetClause) => `
SELECT ak.kara_id AS kara_id,
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  COALESCE(
	  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.main}),
	  (SELECT sl.name FROM serie_lang sl, kara_serie ks WHERE sl.fk_id_serie = ks.fk_id_serie AND ks.fk_id_kara = kara_id AND sl.lang = ${lang.fallback}),
	  ak.serie) AS serie,
  ak.serie_altname AS serie_altname,
  ak.serie_i18n AS serie_i18n,
  ak.serie_id AS serie_id,
  ak.seriefiles AS seriefiles,
  ak.subfile AS subfile,
  ak.singers AS singers,
  ak.songtypes AS songtype,
  ak.creators AS creators,
  ak.songwriters AS songwriters,
  ak.year AS year,
  ak.languages AS languages,
  ak.authors AS authors,
  ak.misc_tags AS misc_tags,
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  ak.gain AS gain,
  pc.created_at AS created_at,
  ak.created_at AS kara_created_at,
  ak.modified_at AS kara_modified_at,
  ak.mediasize AS mediasize,
  COUNT(p.pk_id_played) AS played,
  COUNT(rq.pk_id_requested) AS requested,
  (CASE WHEN :dejavu_time < max(p.played_at)
		THEN TRUE
		ELSE FALSE
  END) AS flag_dejavu,
  MAX(p.played_at) AS lastplayed_at,
  (CASE WHEN cur_user_fav.fk_id_kara IS NULL
		THEN FALSE
		ELSE TRUE
  END) as flag_favorites,
  pc.nickname AS nickname,
  u.login AS username,
  pc.pos AS pos,
  pc.pk_id_plcontent AS playlistcontent_id,
  pc.flag_playing AS flag_playing,
  (CASE WHEN wl.fk_id_kara = ak.kara_id
	THEN TRUE
	ELSE FALSE
  END) AS flag_whitelisted,
  (CASE WHEN bl.fk_id_kara = ak.kara_id
	THEN TRUE
	ELSE FALSE
  END) AS flag_blacklisted,
  COUNT(up.fk_id_plcontent) AS upvotes,
  (CASE WHEN cur_user.pk_id_user = up.fk_id_user THEN 1 ELSE 0 END) as flag_upvoted
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
LEFT OUTER JOIN user AS u ON u.pk_id_user = pc.fk_id_user
LEFT OUTER JOIN blacklist AS bl ON ak.kara_id = bl.fk_id_kara
LEFT OUTER JOIN whitelist AS wl ON ak.kara_id = wl.fk_id_kara
LEFT OUTER JOIN upvote up ON up.fk_id_plcontent = pc.pk_id_plcontent
LEFT OUTER JOIN kara_serie AS ks_main ON ks_main.fk_id_kara = ak.kara_id
LEFT OUTER JOIN serie_lang AS sl_main ON sl_main.fk_id_serie = ks_main.fk_id_serie AND sl_main.lang = ${lang.main}
LEFT OUTER JOIN kara_serie AS ks_fall ON ks_fall.fk_id_kara = ak.kara_id
LEFT OUTER JOIN serie_lang AS sl_fall ON sl_fall.fk_id_serie = ks_fall.fk_id_serie AND sl_fall.lang = ${lang.fallback}
LEFT OUTER JOIN played AS p ON p.fk_id_kara = ak.kara_id
LEFT OUTER JOIN requested AS rq ON rq.fk_id_kara = ak.kara_id
LEFT OUTER JOIN users AS cur_user ON cur_user.login = :username
LEFT OUTER JOIN playlist AS cur_user_pl_fav ON cur_user.pk_id_user = cur_user_pl_fav.fk_id_user AND cur_user_pl_fav.flag_favorites = TRUE
LEFT OUTER JOIN playlist_content cur_user_fav ON cur_user_fav.fk_id_playlist = cur_user_pl_fav.fk_id_user AND cur_user_fav.fk_id_kara = ak.kara_id
WHERE pc.fk_id_playlist = $playlist_id
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
  ${typeClauses}
GROUP BY ak.kara_id, ak.kid, ak.title, ak.songorder, ak.serie, ak.serie_altname, ak.serie_i18n, ak.serie_id, ak.seriefiles, ak.subfile, ak.singers, ak.songtypes, ak.creators, ak.songwriters, ak.year, ak.languages, ak.authors, ak.misc_tags, ak.mediafile, ak.karafile, ak.duration, ak.gain, ak.created_at, ak.modified_at, ak.mediasize, cur_user_fav.fk_id_kara, ak.languages_sortable, ak.songtypes_sortable, ak.singers_sortable, pc.created_at, pc.nickname, u.login, pc.pos, pc.pk_id_plcontent, wl.fk_id_kara, bl.fk_id_kara
ORDER BY pc.pos
${limitClause}
${offsetClause}
`;

export const getPlaylistContentsMini = (lang) => `
SELECT ak.kara_id AS kara_id,
    ak.languages AS languages,
	ak.title AS title,
	ak.songorder AS songorder,
	COALESCE(
		(SELECT sl.name
			FROM serie_lang sl, kara_serie ks
			WHERE sl.fk_id_serie = ks.fk_id_serie
				AND ks.fk_id_kara = kara_id
				AND sl.lang = ${lang.main}
		),
		(SELECT sl.name
			FROM serie_lang sl, kara_serie ks
			WHERE sl.fk_id_serie = ks.fk_id_serie
				AND ks.fk_id_kara = kara_id
				AND sl.lang = ${lang.fallback}
		),
		ak.serie
	) AS serie,
	ak.serie_i18n AS serie_i18n,
    ak.songtypes AS songtypes,
	ak.singers AS singers,
    ak.gain AS gain,
    pc.nickname AS nickname,
	pc.created_at AS created_at,
	ak.mediafile AS mediafile,
	ak.subfile AS subfile,
	pc.pos AS pos,
	pc.flag_playing AS flag_playing,
	pc.pk_id_plcontent AS playlistcontent_id,
	ak.kid AS kid,
	pc.fk_id_user AS user_id,
	pc.flag_free AS flag_free,
	u.login AS username,
	ak.duration AS duration
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
LEFT OUTER JOIN users AS u ON u.pk_id_user = pc.fk_id_user
WHERE pc.fk_id_playlist = $1
ORDER BY pc.pos;
`;

export const getPlaylistPos = `
SELECT pc.pos AS pos,
	pc.pk_id_plcontent AS playlistcontent_id
FROM playlist_content AS pc
WHERE pc.fk_id_playlist = $1
ORDER BY pc.pos,pc.created_at DESC;
`;

export const getPlaylistKaraNames = `
SELECT pc.pos AS pos,
	pc.pk_id_plcontent AS playlistcontent_id,
	(ak.languages || (CASE WHEN ak.serie IS NULL
	    THEN ak.singer
        ELSE ak.serie
	END) || ak.songtypes || ak.songorder || ak.title) AS karaname
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
WHERE pc.fk_id_playlist = $1
ORDER BY karaname;
`;


export const getPLCInfo = `
SELECT ak.kara_id AS kara_id,
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  ak.serie AS serie,
  ak.serie_altname AS serie_altname,
  ak.serie_i18n AS serie_i18n,
  ak.serie_id AS serie_id,
  ak.seriefiles AS seriefiles,
  ak.subfile AS subfile,
  ak.singers AS singers,
  ak.songtypes AS songtype,
  ak.creators AS creators,
  ak.songwriters AS songwriters,
  ak.year AS year,
  ak.languages AS languages,
  ak.authors AS authors,
  ak.misc_tags AS misc_tags,
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  ak.gain AS gain,
  pc.created_at AS created_at,
  ak.created_at AS kara_created_at,
  ak.modified_at AS kara_modified_at,
  ak.mediasize AS mediasize,
  COUNT(p.pk_id_played) AS played,
  COUNT(rq.pk_id_requested) AS requested,
  (CASE WHEN :dejavu_time < max(p.played_at)
		THEN TRUE
		ELSE FALSE
  END) AS flag_dejavu,
  MAX(p.played_at) AS lastplayed_at,
  pc.nickname AS nickname,
  u.login AS username,
  pc.pos AS pos,
  pc.pk_id_plcontent AS playlistcontent_id,
  pc.fk_id_playlist as playlist_id,
  pc.flag_playing AS flag_playing,
  COUNT(up.fk_id_plcontent) AS upvotes,
  pc.flag_free AS flag_free,
  MAX(p.modified_at) AS lastplayed_at,
  (CASE WHEN wl.fk_id_kara IS NULL THEN FALSE ELSE TRUE END) as flag_whitelisted,
  (CASE WHEN bl.fk_id_kara IS NULL THEN FALSE ELSE TRUE END) as flag_blacklisted,
  (CASE WHEN cur_user_fav.fk_id_kara IS NULL THEN FALSE ELSE TRUE END) as flag_favorites,
  (CASE WHEN cur_user.pk_id_user = up.fk_id_user THEN TRUE ELSE FALSE END) as flag_upvoted,
  SUM(plc_before_karas.duration) - ak.duration AS time_before_play
FROM playlist_content AS pc
INNER JOIN all_karas AS ak ON pc.fk_id_kara = ak.kara_id
INNER JOIN users u ON u.pk_id_user = pc.fk_id_user
LEFT OUTER JOIN played p ON ak.kara_id = p.fk_id_kara
LEFT OUTER JOIN upvote up ON up.fk_id_plcontent = pc.pk_id_plcontent
LEFT OUTER JOIN request rq ON rq.fk_id_kara = ak.kara_id
LEFT OUTER JOIN blacklist AS bl ON ak.kara_id = bl.fk_id_kara
LEFT OUTER JOIN whitelist AS wl ON ak.kara_id = wl.fk_id_kara
LEFT OUTER JOIN users AS cur_user ON cur_user.login = :username
LEFT OUTER JOIN playlist AS cur_user_pl_fav ON cur_user.pk_id_user = cur_user_pl_fav.fk_id_user AND cur_user_pl_fav.flag_favorites = TRUE
LEFT OUTER JOIN playlist_content cur_user_fav ON cur_user_fav.fk_id_playlist = cur_user_pl_fav.fk_id_user AND cur_user_fav.fk_id_kara = pc.fk_id_kara
LEFT OUTER JOIN playlist_content AS plc_current_playing ON plc_current_playing.fk_id_playlist = pc.fk_id_playlist AND plc_current_playing.flag_playing = TRUE
LEFT OUTER JOIN playlist_content AS plc_before ON plc_before.fk_id_playlist = pc.fk_id_playlist AND plc_before.pos BETWEEN COALESCE(plc_current_playing.pos, 0) AND pc.pos
LEFT OUTER JOIN kara AS plc_before_karas ON plc_before_karas.pk_id_kara = plc_before.fk_id_kara
WHERE  pc.pk_id_plcontent = :playlistcontent_id
`;

export const getPLCInfoMini = `
SELECT pc.fk_id_kara AS kara_id,
	ak.title AS title,
	ak.serie AS serie,
	ak.serie_i18n AS serie_i18n,
	pc.nickname AS nickname,
	u.login AS username,
	pc.pk_id_plcontent AS playlistcontent_id,
	pc.fk_id_playlist AS playlist_id,
	pc.fk_id_user AS user_id,
	COUNT(up.fk_id_plcontent) AS upvotes
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
LEFT OUTER JOIN upvote up ON up.fk_id_plcontent = pc.pk_id_plcontent
LEFT OUTER JOIN users AS u ON u.pk_id_user = pc.fk_id_user
WHERE  pc.pk_id_plcontent = $1
`;


export const getPLCByKIDUserID = `
SELECT ak.kara_id AS kara_id,
	ak.title AS title,
	ak.songorder AS songorder,
	ak.serie AS serie,
	ak.serie_i18n AS serie_i18n,
	ak.songtypes AS songtypes,
	ak.singers AS singers,
	ak.gain AS gain,
	pc.nickname AS nickname,
	ak.mediafile AS mediafile,
	pc.pos AS pos,
	pc.flag_playing AS flag_playing,
	pc.pk_id_plcontent AS playlistcontent_id,
	ak.kid AS kid,
	(CASE WHEN :dejavu_time < max(p.played_at)
		THEN TRUE
		ELSE FALSE
    END) AS flag_dejavu,
	MAX(p.played_at) AS lastplayed_at
FROM all_karas AS ak
LEFT OUTER JOIN played p ON ak.kara_id = p.fk_id_kara
INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
WHERE pc.fk_id_playlist = :playlist_id
	AND pc.kid = :kid
	AND pc.fk_id_user = :user_id
ORDER BY pc.pos;
`;

export const getPlaylistInfo = `
SELECT p.pk_id_playlist AS playlist_id,
	p.name AS name,
	p.karacount AS karacount,
	p.duration AS duration,
	p.time_left AS time_left,
	p.created_at AS created_at,
	p.modified_at AS modified_at,
	p.flag_visible AS flag_visible,
	p.flag_current AS flag_current,
	p.flag_public AS flag_public,
	p.flag_favorites AS flag_favorites,
	u.login AS username
FROM playlist AS p, users AS u
WHERE pk_id_playlist = $1
	AND u.pk_id_user = p.fk_id_user
`;

export const getPlaylists = `
SELECT p.pk_id_playlist AS playlist_id,
	p.name AS name,
	p.karacount AS karacount,
	p.duration AS duration,
	p.time_left AS time_left,
	p.created_at AS created_at,
	p.modified_at AS modified_at,
	p.flag_visible AS flag_visible,
	p.flag_current AS flag_current,
	p.flag_public AS flag_public,
	p.flag_favorites AS flag_favorites,
	u.login AS username
FROM playlist AS p, users AS u
WHERE p.fk_id_user = u.pk_id_user
`;

export const testCurrentPlaylist = `
SELECT pk_id_playlist AS playlist_id
FROM playlist
WHERE flag_current = TRUE;
`;

export const setPLCFree = `
UPDATE playlist_content
SET flag_free = TRUE
WHERE pk_id_plcontent = $1;
`;

export const setPLCFreeBeforePos = `
UPDATE playlist_content
SET flag_free = TRUE
WHERE fk_id_playlist = :playlist_id
	AND pos <= :pos;
`;

export const testPublicPlaylist = `
SELECT pk_id_playlist AS playlist_id
FROM playlist
WHERE flag_public = TRUE;
`;

export const shiftPosInPlaylist = `
UPDATE playlist_content
SET pos = pos + :shift
WHERE fk_id_playlist = :playlist_id
	AND pos >= :pos
`;

export const getMaxPosInPlaylist = `
SELECT MAX(pos) AS maxpos
FROM playlist_content
WHERE fk_id_playlist = $1;
`;

export const raisePosInPlaylist = `
UPDATE playlist_content
SET pos = :newpos
WHERE fk_id_playlist = :playlist_id
	AND pos = :pos
`;

export const setCurrentPlaylist = `
UPDATE playlist
SET flag_current = TRUE
WHERE pk_id_playlist = $1;
`;

export const unsetCurrentPlaylist = `
UPDATE playlist SET flag_current = TRUE
`;

export const setVisiblePlaylist = `
UPDATE playlist
SET flag_visible = TRUE
WHERE pk_id_playlist = $1;
`;

export const unsetVisiblePlaylist = `
UPDATE playlist
SET flag_visible = TRUE
WHERE pk_id_playlist = $1;
`;

export const unsetPublicPlaylist = `
UPDATE playlist
SET flag_public = TRUE;
`;


export const setPublicPlaylist = `
UPDATE playlist
SET flag_public = TRUE
WHERE pk_id_playlist = $1;
`;

export const unsetPlaying = `
UPDATE playlist_content
SET flag_playing = FALSE
WHERE fk_id_playlist = $1
	AND flag_playing = TRUE;
`;

export const setPlaying = `
UPDATE playlist_content
SET flag_playing = TRUE
WHERE pk_id_plcontent = $1;
`;

export const countPlaylistUsers = `
SELECT COUNT(DISTINCT fk_id_user) AS NumberOfUsers
FROM playlist_content
WHERE fk_id_playlist = $1;
`;

export const getMaxPosInPlaylistForUser = `
SELECT MAX(pos) AS maxpos
FROM playlist_content
WHERE fk_id_playlist = :playlist_id
	AND fk_id_user = :user_id;
`;

export const trimPlaylist = `
DELETE FROM playlist_content
WHERE fk_id_playlist = :playlist_id
	AND pos > :pos;
`;
