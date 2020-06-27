// SQL for playlist management

export const sqlupdatePlaylistLastEditTime = `
UPDATE playlist SET
	modified_at = :modified_at
WHERE pk_id_playlist = :playlist_id;
`;

export const sqlemptyPlaylist = `
DELETE FROM playlist_content
WHERE fk_id_playlist = $1;
`;

export const sqldeletePlaylist = `
DELETE FROM playlist
WHERE pk_id_playlist = $1;
`;

export const sqleditPlaylist = `
UPDATE playlist SET
	name = :name,
	modified_at = :modified_at,
	flag_visible = :flag_visible
WHERE pk_id_playlist = :playlist_id;
`;

export const sqlcreatePlaylist = `
INSERT INTO playlist(
	name,
	karacount,
	duration,
	created_at,
	modified_at,
	flag_visible,
	flag_current,
	flag_public,
	fk_login,
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
	:username,
	0
) RETURNING pk_id_playlist
`;

export const sqlupdatePlaylistKaraCount = `
UPDATE playlist SET
	karacount = (
		SELECT COUNT(fk_kid)
		FROM playlist_content, kara AS k
		WHERE fk_id_playlist = $1
		  AND fk_kid = pk_kid
	)
WHERE pk_id_playlist = $1
`;

export const sqlgetPLCByDate = `
SELECT pc.pk_id_plcontent AS playlistcontent_id
FROM playlist_content AS pc
WHERE pc.created_at = :date_added
	AND pc.fk_id_playlist = :playlist_id
ORDER BY pc.pos
`;

export const sqlreorderPlaylist = `
UPDATE playlist_content
SET pos = A.new_pos
FROM  (SELECT ROW_NUMBER() OVER (ORDER BY pos) AS new_pos, pk_id_plcontent
    FROM playlist_content
	INNER JOIN kara k ON playlist_content.fk_kid = k.pk_kid
    WHERE fk_id_playlist = $1) AS A
WHERE A.pk_id_plcontent = playlist_content.pk_id_plcontent
`;

export const sqlupdatePLCSetPos = `
UPDATE playlist_content
SET pos = $1
WHERE pk_id_plcontent = $2;
`;

export const sqlupdatePlaylistDuration = `
UPDATE playlist SET time_left = (
	SELECT COALESCE(SUM(kara.duration),0) AS duration
		FROM kara, playlist_content
		WHERE playlist_content.fk_kid = kara.pk_kid
		AND playlist_content.fk_id_playlist = $1
		AND playlist_content.pos >= (
			SELECT COALESCE(pos,0)
			FROM playlist_content, playlist
			WHERE playlist_content.pk_id_plcontent = playlist.fk_id_plcontent_playing AND playlist_content.fk_id_playlist = 1
			)
	),
	duration = (
		SELECT COALESCE(SUM(kara.duration),0) AS duration
			FROM kara, playlist_content
			WHERE playlist_content.fk_kid = kara.pk_kid
				AND playlist_content.fk_id_playlist = $1
				AND playlist_content.pos >= 0)
WHERE pk_id_playlist = $1;
`;

export const sqlgetPlaylistContentsKaraIDs = `
SELECT pc.fk_kid AS kid,
	pc.fk_login AS login,
	pc.pk_id_plcontent AS playlistcontent_id,
	(CASE WHEN pl.fk_id_plcontent_playing = pc.pk_id_plcontent
		THEN TRUE
		ELSE FALSE
	  END) AS flag_playing,
	pc.pos AS pos,
	pc.fk_id_playlist AS playlist_id,
	ak.series AS series,
	ak.singers AS singer
FROM playlist_content pc
INNER JOIN all_karas ak ON pc.fk_kid = ak.kid
LEFT OUTER JOIN playlist pl ON pl.pk_id_playlist = pc.fk_id_playlist
WHERE pc.fk_id_playlist = $1
ORDER BY pc.pos, pc.created_at DESC
`;

export const sqlgetPlaylistContents = (filterClauses: string[], whereClause: string, orderClause: string, limitClause: string, offsetClause: string) => `
SELECT
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  ak.subfile AS subfile,
  COALESCE(ak.series, '[]'::jsonb) AS series,
  COALESCE(ak.singers, '[]'::jsonb) AS singers,
  COALESCE(ak.songtypes, '[]'::jsonb) AS songtypes,
  COALESCE(ak.creators, '[]'::jsonb) AS creators,
  COALESCE(ak.songwriters, '[]'::jsonb) AS songwriters,
  ak.year AS year,
  COALESCE(ak.languages, '[]'::jsonb) AS langs,
  COALESCE(ak.authors, '[]'::jsonb) AS authors,
  COALESCE(ak.groups, '[]'::jsonb) AS groups,
  COALESCE(ak.misc, '[]'::jsonb) AS misc,
  COALESCE(ak.origins, '[]'::jsonb) AS origins,
  COALESCE(ak.platforms, '[]'::jsonb) AS platforms,
  COALESCE(ak.families, '[]'::jsonb) AS families,
  COALESCE(ak.genres, '[]'::jsonb) AS genres,  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  pc.created_at AS created_at,
  ak.mediasize AS mediasize,
  COUNT(p.played_at) AS played,
  COUNT(rq.requested_at) AS requested,
  (CASE WHEN :dejavu_time < max(p.played_at)
		THEN TRUE
		ELSE FALSE
  END) AS flag_dejavu,
  MAX(p.played_at) AS lastplayed_at,
  (CASE WHEN f.fk_kid IS NULL
		THEN FALSE
		ELSE TRUE
  END) as flag_favorites,
  pc.nickname AS nickname,
  pc.fk_login AS username,
  u.avatar_file AS avatar_file,
  pc.pos AS pos,
  pc.pk_id_plcontent AS playlistcontent_id,
  (CASE WHEN pl.fk_id_plcontent_playing = pc.pk_id_plcontent
	THEN TRUE
	ELSE FALSE
  END) AS flag_playing,
  (CASE WHEN wl.fk_kid = ak.kid
	THEN TRUE
	ELSE FALSE
  END) AS flag_whitelisted,
  (CASE WHEN bl.fk_kid = ak.kid
	THEN TRUE
	ELSE FALSE
  END) AS flag_blacklisted,
  (SELECT COUNT(up.fk_id_plcontent)::integer FROM upvote up WHERE up.fk_id_plcontent = pc.pk_id_plcontent) AS upvotes,
  (CASE WHEN COUNT(up.*) > 0 THEN TRUE ELSE FALSE END) as flag_upvoted,
  pc.flag_visible AS flag_visible,
  COUNT(pc.pk_id_plcontent) OVER()::integer AS count,
  ak.repository AS repository
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_kid = ak.kid
LEFT OUTER JOIN users AS u ON u.pk_login = pc.fk_login
LEFT OUTER JOIN blacklist AS bl ON ak.kid = bl.fk_kid
LEFT OUTER JOIN whitelist AS wl ON ak.kid = wl.fk_kid
LEFT OUTER JOIN upvote up ON up.fk_id_plcontent = pc.pk_id_plcontent AND up.fk_login = :username
LEFT OUTER JOIN favorites f ON f.fk_kid = ak.kid AND f.fk_login = :username
LEFT OUTER JOIN played AS p ON p.fk_kid = ak.kid
LEFT OUTER JOIN requested AS rq ON rq.fk_kid = ak.kid
LEFT OUTER JOIN playlist AS pl ON pl.pk_id_playlist = pc.fk_id_playlist
WHERE pc.fk_id_playlist = :playlist_id
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
  ${whereClause}
GROUP BY pl.fk_id_plcontent_playing, ak.kid, ak.title, ak.songorder, ak.series, ak.subfile, ak.singers, ak.songtypes, ak.creators, ak.songwriters, ak.year, ak.languages, ak.authors, ak.misc, ak.origins, ak.families, ak.genres, ak.platforms, ak.mediafile, ak.groups, ak.karafile, ak.duration, ak.mediasize, pc.created_at, pc.nickname, pc.fk_login, pc.pos, pc.pk_id_plcontent, wl.fk_kid, bl.fk_kid, f.fk_kid, u.avatar_file, ak.repository
ORDER BY ${orderClause}
${limitClause}
${offsetClause}
`;

export const sqlgetPlaylistContentsMini = `
SELECT ak.kid AS kid,
    ak.languages AS langs,
	ak.title AS title,
	ak.songorder AS songorder,
	ak.songtypes AS songtypes,
	ak.series AS series,
	ak.singers AS singers,
	ak.misc AS misc,
    ak.gain AS gain,
    pc.nickname AS nickname,
	pc.created_at AS created_at,
	ak.mediafile AS mediafile,
	ak.subfile AS subfile,
	pc.pos AS pos,
	(CASE WHEN pl.fk_id_plcontent_playing = pc.pk_id_plcontent
		THEN TRUE
		ELSE FALSE
	END) AS flag_playing,
	pc.pk_id_plcontent AS playlistcontent_id,
	pc.fk_login AS username,
	pc.flag_free AS flag_free,
	pc.flag_visible AS flag_visible,
	ak.duration AS duration,
	ak.repository as repository
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_kid = ak.kid
LEFT OUTER JOIN playlist AS pl ON pl.pk_id_playlist = pc.fk_id_playlist
WHERE pc.fk_id_playlist = $1
ORDER BY pc.pos;
`;

export const sqlgetPlaylistPos = `
SELECT pc.pos AS pos,
	pc.pk_id_plcontent AS playlistcontent_id
FROM playlist_content AS pc
WHERE pc.fk_id_playlist = $1
ORDER BY pc.pos,pc.created_at DESC;
`;

export const sqlgetPLCInfo = (forUser: boolean) => `
SELECT
  ak.kid AS kid,
  ak.title AS title,
  ak.songorder AS songorder,
  ak.subfile AS subfile,
  COALESCE(ak.series, '[]'::jsonb) AS series,
  COALESCE(ak.singers, '[]'::jsonb) AS singers,
  COALESCE(ak.songtypes, '[]'::jsonb) AS songtypes,
  COALESCE(ak.creators, '[]'::jsonb) AS creators,
  COALESCE(ak.songwriters, '[]'::jsonb) AS songwriters,
  ak.year AS year,
  COALESCE(ak.languages, '[]'::jsonb) AS langs,
  COALESCE(ak.authors, '[]'::jsonb) AS authors,
  COALESCE(ak.groups, '[]'::jsonb) AS groups,
  COALESCE(ak.misc, '[]'::jsonb) AS misc,
  COALESCE(ak.origins, '[]'::jsonb) AS origins,
  COALESCE(ak.platforms, '[]'::jsonb) AS platforms,
  COALESCE(ak.families, '[]'::jsonb) AS families,
  COALESCE(ak.genres, '[]'::jsonb) AS genres,
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  ak.gain AS gain,
  pc.created_at AS created_at,
  ak.created_at AS kara_created_at,
  ak.modified_at AS kara_modified_at,
  ak.mediasize AS mediasize,
  COUNT(p.played_at)::integer AS played,
  COUNT(rq.requested_at)::integer AS requested,
  (CASE WHEN :dejavu_time < max(p.played_at)
		THEN TRUE
		ELSE FALSE
  END) AS flag_dejavu,
  MAX(p.played_at) AS lastplayed_at,
  NOW() - MAX(p.played_at) AS lastplayed_ago,
  pc.nickname AS nickname,
  pc.fk_login AS username,
  u.avatar_file AS avatar_file,
  pc.pos AS pos,
  pc.pk_id_plcontent AS playlistcontent_id,
  pc.fk_id_playlist as playlist_id,
  (CASE WHEN pl.fk_id_plcontent_playing = pc.pk_id_plcontent
	THEN TRUE
	ELSE FALSE
  END) AS flag_playing,
  (SELECT COUNT(up.fk_id_plcontent)::integer FROM upvote up WHERE up.fk_id_plcontent = pc.pk_id_plcontent) AS upvotes,
  pc.flag_free AS flag_free,
  (CASE WHEN wl.fk_kid IS NULL THEN FALSE ELSE TRUE END) as flag_whitelisted,
  (CASE WHEN bl.fk_kid IS NULL THEN FALSE ELSE TRUE END) as flag_blacklisted,
  (CASE WHEN f.fk_kid IS NULL THEN FALSE ELSE TRUE END) as flag_favorites,
  (CASE WHEN COUNT(up.*) > 0 THEN TRUE ELSE FALSE END) as flag_upvoted,
  (SELECT
	SUM(k.duration)
   FROM kara k
   LEFT OUTER JOIN playlist_content AS plc_current_playing ON plc_current_playing.pk_id_plcontent = pl.fk_id_plcontent_playing
   LEFT OUTER JOIN playlist_content AS plc_before ON plc_before.pos BETWEEN COALESCE(plc_current_playing.pos, 0) AND (pc.pos - 1)
   WHERE k.pk_kid = plc_before.fk_kid
  ) AS time_before_play,
  pc.flag_visible AS flag_visible,
  ak.repository as repository
FROM playlist_content AS pc
INNER JOIN playlist AS pl ON pl.pk_id_playlist = pc.fk_id_playlist
INNER JOIN all_karas AS ak ON pc.fk_kid = ak.kid
LEFT OUTER JOIN users AS u ON u.pk_login = pc.fk_login
LEFT OUTER JOIN played p ON ak.kid = p.fk_kid
LEFT OUTER JOIN upvote up ON up.fk_id_plcontent = pc.pk_id_plcontent AND up.fk_login = :username
LEFT OUTER JOIN requested rq ON rq.fk_kid = ak.kid
LEFT OUTER JOIN blacklist AS bl ON ak.kid = bl.fk_kid
LEFT OUTER JOIN whitelist AS wl ON ak.kid = wl.fk_kid
LEFT OUTER JOIN favorites AS f on ak.kid = f.fk_kid AND f.fk_login = :username
WHERE  pc.pk_id_plcontent = :playlistcontent_id
${forUser ? ' AND pl.flag_visible = TRUE' : ''}
GROUP BY pl.fk_id_plcontent_playing, ak.kid, ak.title, ak.songorder, ak.series, ak.subfile, ak.singers, ak.songtypes, ak.creators, ak.songwriters, ak.year, ak.languages, ak.authors, ak.groups, ak.misc, ak.genres, ak.platforms, ak.origins, ak.families, ak.mediafile, ak.karafile, ak.duration, ak.gain, ak.created_at, ak.modified_at, ak.mediasize, ak.languages_sortable, ak.songtypes_sortable, pc.created_at, pc.nickname, pc.fk_login, pc.pos, pc.pk_id_plcontent, wl.fk_kid, bl.fk_kid, f.fk_kid, u.avatar_file, ak.repository
`;

export const sqlgetPLCInfoMini = `
SELECT pc.fk_kid AS kid,
	ak.title AS title,
	COALESCE(ak.series, '[]'::jsonb) AS series,
	pc.nickname AS nickname,
	pc.fk_login AS username,
	pc.pk_id_plcontent AS playlistcontent_id,
	pc.fk_id_playlist AS playlist_id,
	COUNT(up.fk_login)::integer AS upvotes,
	pc.flag_visible AS flag_visible,
	(CASE WHEN pl.fk_id_plcontent_playing = pc.pk_id_plcontent
		THEN TRUE
		ELSE FALSE
	END) AS flag_playing
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_kid = ak.kid
INNER JOIN playlist AS pl ON pl.pk_id_playlist = pc.fk_id_playlist
LEFT OUTER JOIN upvote up ON up.fk_id_plcontent = pc.pk_id_plcontent
WHERE  pc.pk_id_plcontent = $1
GROUP BY pl.fk_id_plcontent_playing, pc.fk_kid, ak.title, ak.series, pc.nickname, pc.fk_login, pc.pk_id_plcontent, pc.fk_id_playlist
`;


export const sqlgetPLCByKIDUser = `
SELECT
	pc.pos AS pos,
	(CASE WHEN pl.fk_id_plcontent_playing = pc.pk_id_plcontent
		THEN TRUE
		ELSE FALSE
	END) AS flag_playing,
	pc.pk_id_plcontent AS playlistcontent_id
FROM playlist_content pc
INNER JOIN playlist AS pl ON pl.pk_id_playlist = pc.fk_id_playlist
WHERE pc.fk_id_playlist = :playlist_id
	AND pc.fk_kid = :kid
	AND pc.fk_login = :username;
`;

export const sqlgetPlaylistInfo = `
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
	p.fk_id_plcontent_playing AS plcontent_id_playing,
	p.fk_login AS username
FROM playlist AS p
WHERE pk_id_playlist = $1
`;

export const sqlgetPlaylists = `
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
	p.fk_id_plcontent_playing AS plcontent_id_playing,
	p.fk_login AS username
FROM playlist AS p
`;

export const sqltestCurrentPlaylist = `
SELECT pk_id_playlist AS playlist_id
FROM playlist
WHERE flag_current = TRUE;
`;

export const sqlsetPLCFree = `
UPDATE playlist_content
SET flag_free = TRUE
WHERE pk_id_plcontent = $1;
`;

export const sqlsetPLCVisible = `
UPDATE playlist_content
SET flag_visible = TRUE
WHERE pk_id_plcontent = $1;
`;

export const sqlsetPLCInvisible = `
UPDATE playlist_content
SET flag_visible = FALSE
WHERE pk_id_plcontent = $1;
`;


export const sqlsetPLCFreeBeforePos = `
UPDATE playlist_content
SET flag_free = TRUE
WHERE fk_id_playlist = :playlist_id
	AND pos <= :pos;
`;

export const sqltestPublicPlaylist = `
SELECT pk_id_playlist AS playlist_id
FROM playlist
WHERE flag_public = TRUE;
`;

export const sqlshiftPosInPlaylist = `
UPDATE playlist_content
SET pos = pos + :shift
WHERE fk_id_playlist = :playlist_id
	AND pos >= :pos
`;

export const sqlgetMaxPosInPlaylist = `
SELECT MAX(pos) AS maxpos
FROM playlist_content
WHERE fk_id_playlist = $1;
`;

export const sqlsetCurrentPlaylist = `
UPDATE playlist
SET flag_current = TRUE
WHERE pk_id_playlist = $1;
`;

export const sqlsetVisiblePlaylist = `
UPDATE playlist
SET flag_visible = TRUE
WHERE pk_id_playlist = $1;
`;

export const sqlunsetVisiblePlaylist = `
UPDATE playlist
SET flag_visible = TRUE
WHERE pk_id_playlist = $1;
`;

export const sqlsetPublicPlaylist = `
UPDATE playlist
SET flag_public = TRUE
WHERE pk_id_playlist = $1;
`;

export const sqlsetPlaying = `
UPDATE playlist
SET fk_id_plcontent_playing = $1
FROM playlist_content
WHERE pk_id_playlist = $2;
`;

export const sqlcountPlaylistUsers = `
SELECT COUNT(DISTINCT fk_login)::integer AS NumberOfUsers
FROM playlist_content
WHERE fk_id_playlist = $1;
`;

export const sqlgetMaxPosInPlaylistForUser = `
SELECT MAX(pos) AS maxpos
FROM playlist_content
WHERE fk_id_playlist = :playlist_id
	AND fk_login = :username;
`;

export const sqltrimPlaylist = `
DELETE FROM playlist_content
WHERE fk_id_playlist = :playlist_id
	AND pos > :pos;
`;
