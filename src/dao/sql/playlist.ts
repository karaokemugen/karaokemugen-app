// SQL for playlist management

export const sqlupdatePlaylistLastEditTime = `
UPDATE playlist SET
	modified_at = :modified_at
WHERE pk_id_playlist = :plaid;
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
	flag_visible = :flag_visible,
	flag_current = :flag_current,
	flag_public = :flag_public,
	flag_smart = :flag_smart,
	flag_whitelist = :flag_whitelist,
	flag_blacklist = :flag_blacklist,
	type_smart = :type_smart
WHERE pk_id_playlist = :plaid;
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
	flag_blacklist,
	flag_whitelist,
	flag_smart,
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
	:flag_blacklist,
	:flag_whitelist,
	:flag_smart,
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
			WHERE playlist_content.pk_id_plcontent = playlist.fk_id_plcontent_playing AND playlist_content.fk_id_playlist = $1
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

export const sqlgetPlaylistContentsMicro = `
SELECT pc.fk_kid AS kid,
	pc.fk_login AS username,
	pc.pk_id_plcontent AS plcid,
	(CASE WHEN pl.fk_id_plcontent_playing = pc.pk_id_plcontent
		THEN TRUE
		ELSE FALSE
	  END) AS flag_playing,
	pc.pos AS pos,
	pc.fk_id_playlist AS plaid,
	jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 1)') AS series,
	jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 2)') AS singer,
	pc.fk_login AS username
FROM playlist_content pc
INNER JOIN all_karas ak ON pc.fk_kid = ak.pk_kid
LEFT OUTER JOIN playlist pl ON pl.pk_id_playlist = pc.fk_id_playlist
WHERE pc.fk_id_playlist = $1
ORDER BY pc.pos, pc.created_at DESC
`;

export const sqlgetPlaylistContents = (filterClauses: string[], whereClause: string, orderClause: string, limitClause: string, offsetClause: string, additionalFrom: string) => `
SELECT
  ak.pk_kid AS kid,
  ak.titles AS titles,
  ak.songorder AS songorder,
  ak.subfile AS subfile,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 2)') AS singers,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 3)') AS songtypes,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 4)') AS creators,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 8)') AS songwriters,
  ak.year AS year,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 5)') AS langs,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 6)') AS authors,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 9)') AS groups,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 7)') AS misc,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 11)') AS origins,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 13)') AS platforms,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 10)') AS families,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 12)') AS genres,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 1)') AS series,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 14)') AS versions,
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  pc.created_at AS created_at,
  ak.mediasize AS mediasize,
  ak.download_status AS download_status,
  COUNT(p.played_at)::integer AS played,
  COUNT(rq.requested_at)::integer AS requested,
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
  u.type AS user_type,
  pc.pos AS pos,
  pc.pk_id_plcontent AS plcid,
  (CASE WHEN pl.fk_id_plcontent_playing = pc.pk_id_plcontent
	THEN TRUE
	ELSE FALSE
  END) AS flag_playing,
  (CASE WHEN wl.fk_kid = ak.pk_kid
	THEN TRUE
	ELSE FALSE
  END) AS flag_whitelisted,
  (CASE WHEN bl.fk_kid = ak.pk_kid
	THEN TRUE
	ELSE FALSE
  END) AS flag_blacklisted,
  (SELECT COUNT(up.fk_id_plcontent)::integer FROM upvote up WHERE up.fk_id_plcontent = pc.pk_id_plcontent) AS upvotes,
  (CASE WHEN COUNT(up.*) > 0 THEN TRUE ELSE FALSE END) as flag_upvoted,
  pc.flag_visible AS flag_visible,
  pc.flag_free AS flag_free,
  pc.flag_refused AS flag_refused,
  pc.flag_accepted AS flag_accepted,
  COUNT(pc.pk_id_plcontent) OVER()::integer AS count,
  ak.repository AS repository,
  array_remove(array_agg(DISTINCT pc_pub.pk_id_plcontent), null) AS public_plc_id,
  array_remove(array_agg(DISTINCT pc_self.pk_id_plcontent), null) AS my_public_plc_id,
  pc.criterias
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_kid = ak.pk_kid
LEFT OUTER JOIN users AS u ON u.pk_login = pc.fk_login
LEFT OUTER JOIN playlist_content AS bl ON ak.pk_kid = bl.fk_kid AND bl.fk_id_playlist = :blacklist_plaid
LEFT OUTER JOIN playlist_content AS wl ON ak.pk_kid = wl.fk_kid AND wl.fk_id_playlist = :whitelist_plaid
LEFT OUTER JOIN upvote up ON up.fk_id_plcontent = pc.pk_id_plcontent AND up.fk_login = :username
LEFT OUTER JOIN favorites f ON f.fk_kid = ak.pk_kid AND f.fk_login = :username
LEFT OUTER JOIN played AS p ON p.fk_kid = ak.pk_kid
LEFT OUTER JOIN requested AS rq ON rq.fk_kid = ak.pk_kid
LEFT OUTER JOIN playlist AS pl ON pl.pk_id_playlist = pc.fk_id_playlist
LEFT OUTER JOIN playlist_content AS pc_pub ON pc_pub.fk_kid = pc.fk_kid AND pc_pub.fk_id_playlist = :public_plaid
LEFT OUTER JOIN playlist_content AS pc_self on pc_self.fk_kid = pc.fk_kid AND pc_self.fk_id_playlist = :public_plaid AND pc_self.fk_login = :username
${additionalFrom}
WHERE pc.fk_id_playlist = :plaid
  ${filterClauses.map(clause => 'AND (' + clause + ')').join(' ')}
  ${whereClause}
GROUP BY pl.fk_id_plcontent_playing, ak.pk_kid, ak.titles, ak.songorder, ak.tags, ak.subfile, ak.year, ak.mediafile, ak.karafile, ak.duration, ak.mediasize, pc.created_at, pc.nickname, ak.download_status, pc.fk_login, pc.pos, pc.pk_id_plcontent, wl.fk_kid, bl.fk_kid, f.fk_kid, u.avatar_file, u.type, ak.repository, pc.criterias
ORDER BY ${orderClause}
${limitClause}
${offsetClause}
`;

export const sqlgetPlaylistContentsMini = `
SELECT ak.pk_kid AS kid,
	jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 2)') AS singers,
	jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 3)') AS songtypes,
	jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 5)') AS langs,
	jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 7)') AS misc,
	jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 1)') AS series,
	jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 14)') AS versions,
	ak.titles AS titles,
	ak.songorder AS songorder,
    ak.gain AS gain,
	ak.loudnorm AS loudnorm,
    pc.nickname AS nickname,
	pc.created_at AS created_at,
	ak.mediafile AS mediafile,
    ak.mediasize AS mediasize,
	ak.subfile AS subfile,
	pc.pos AS pos,
	(CASE WHEN pl.fk_id_plcontent_playing = pc.pk_id_plcontent
		THEN TRUE
		ELSE FALSE
	END) AS flag_playing,
	pc.pk_id_plcontent AS plcid,
	pc.fk_login AS username,
	pc.flag_free AS flag_free,
	pc.flag_refused AS flag_refused,
    pc.flag_accepted AS flag_accepted,
	pc.flag_visible AS flag_visible,
	pc.criterias,
	ak.duration AS duration,
	ak.repository as repository,
	(SELECT COUNT(up.fk_id_plcontent)::integer FROM upvote up WHERE up.fk_id_plcontent = pc.pk_id_plcontent) AS upvotes
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_kid = ak.pk_kid
LEFT OUTER JOIN playlist AS pl ON pl.pk_id_playlist = pc.fk_id_playlist
WHERE pc.fk_id_playlist = $1
ORDER BY pc.pos;
`;

export const sqlgetPLCInfo = (forUser: boolean) => `
WITH playing_pos AS (
	SELECT pos FROM playlist_content
	   INNER JOIN playlist ON playlist.pk_id_playlist = playlist_content.fk_id_playlist
	   WHERE playlist.pk_id_playlist = :current_plaid
		 AND playlist.fk_id_plcontent_playing = playlist_content.pk_id_plcontent
   ), current_pos AS (
	SELECT pos FROM playlist_content
	   WHERE playlist_content.pk_id_plcontent = :plcid
   )
SELECT
  ak.pk_kid AS kid,
  ak.titles AS titles,
  ak.songorder AS songorder,
  ak.subfile AS subfile,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 2)') AS singers,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 3)') AS songtypes,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 4)') AS creators,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 8)') AS songwriters,
  ak.year AS year,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 5)') AS langs,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 6)') AS authors,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 9)') AS groups,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 7)') AS misc,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 11)') AS origins,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 13)') AS platforms,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 10)') AS families,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 12)') AS genres,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 1)') AS series,
  jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 14)') AS versions,
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  ak.gain AS gain,
  ak.loudnorm AS loudnorm,
  pc.created_at AS created_at,
  ak.created_at AS kara_created_at,
  ak.modified_at AS kara_modified_at,
  ak.mediasize AS mediasize,
  ak.download_status AS download_status,
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
  u.type AS user_type,
  pc.pos AS pos,
  pc.pk_id_plcontent AS plcid,
  pc.fk_id_playlist as plaid,
  (CASE WHEN pl.fk_id_plcontent_playing = pc.pk_id_plcontent
	THEN TRUE
	ELSE FALSE
  END) AS flag_playing,
  (SELECT COUNT(up.fk_id_plcontent)::integer FROM upvote up WHERE up.fk_id_plcontent = pc.pk_id_plcontent) AS upvotes,
  COALESCE(pc.flag_free, false) AS flag_free,
  (CASE WHEN wl.fk_kid IS NULL THEN FALSE ELSE TRUE END) as flag_whitelisted,
  (CASE WHEN bl.fk_kid IS NULL THEN FALSE ELSE TRUE END) as flag_blacklisted,
  (CASE WHEN f.fk_kid IS NULL THEN FALSE ELSE TRUE END) as flag_favorites,
  (CASE WHEN COUNT(up.*) > 0 THEN TRUE ELSE FALSE END) as flag_upvoted,
  COALESCE((SELECT
		SUM(kara.duration)
	FROM kara
	INNER JOIN current_pos AS cpos ON 1 = 1
	INNER JOIN playing_pos AS ppos ON 1 = 1
	INNER JOIN playlist_content AS plc ON plc.fk_kid = kara.pk_kid
	WHERE plc.fk_id_playlist = :current_plaid
		AND plc.pos >= ppos.pos AND plc.pos < cpos.pos
)::integer, 0) AS time_before_play,
  pc.flag_visible AS flag_visible,
  ak.repository as repository,
  array_remove(array_agg(DISTINCT pc_pub.pk_id_plcontent), null) AS public_plc_id,
  array_remove(array_agg(DISTINCT pc_self.pk_id_plcontent), null) AS my_public_plc_id,
  array_remove(array_agg(krc.fk_kid_parent), null) AS parents,
  array_remove(array_agg(krp.fk_kid_child), null) AS children,
  pc.criterias
FROM playlist_content AS pc
INNER JOIN playlist AS pl ON pl.pk_id_playlist = :current_plaid
INNER JOIN all_karas AS ak ON pc.fk_kid = ak.pk_kid
LEFT OUTER JOIN kara_relation krp ON krp.fk_kid_parent = ak.pk_kid
LEFT OUTER JOIN kara_relation krc ON krc.fk_kid_child = ak.pk_kid
LEFT OUTER JOIN users AS u ON u.pk_login = pc.fk_login
LEFT OUTER JOIN played p ON ak.pk_kid = p.fk_kid
LEFT OUTER JOIN upvote up ON up.fk_id_plcontent = pc.pk_id_plcontent AND up.fk_login = :username
LEFT OUTER JOIN requested rq ON rq.fk_kid = ak.pk_kid
LEFT OUTER JOIN playlist_content AS bl ON ak.pk_kid = bl.fk_kid AND bl.fk_id_playlist = :blacklist_plaid
LEFT OUTER JOIN playlist_content AS wl ON ak.pk_kid = wl.fk_kid AND wl.fk_id_playlist = :whitelist_plaid
LEFT OUTER JOIN favorites AS f on ak.pk_kid = f.fk_kid AND f.fk_login = :username
LEFT OUTER JOIN playlist_content AS pc_pub ON pc_pub.fk_kid = pc.fk_kid AND pc_pub.fk_id_playlist = :public_plaid
LEFT OUTER JOIN playlist_content AS pc_self on pc_self.fk_kid = pc.fk_kid AND pc_self.fk_id_playlist = :public_plaid AND pc_self.fk_login = :username
WHERE  pc.pk_id_plcontent = :plcid
${forUser ? ' AND pl.flag_visible = TRUE' : ''}
GROUP BY pl.fk_id_plcontent_playing, ak.pk_kid, ak.titles, ak.songorder, ak.subfile, ak.year, ak.tags, ak.mediafile, ak.karafile, ak.duration, ak.gain, ak.loudnorm, ak.created_at, ak.modified_at, ak.mediasize, ak.languages_sortable, ak.songtypes_sortable, pc.created_at, pc.nickname, pc.fk_login, pc.pos, pc.pk_id_plcontent, wl.fk_kid, bl.fk_kid, f.fk_kid, u.avatar_file, u.type, ak.repository, ak.download_status, pc.criterias
`;

export const sqlgetPLCInfoMini = `
SELECT pc.fk_kid AS kid,
	ak.titles AS titles,
	ak.mediafile AS mediafile,
	ak.mediasize AS mediasize,
	ak.repository AS repository,
    jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 1)') AS series,
	pc.nickname AS nickname,
	pc.fk_login AS username,
	pc.pk_id_plcontent AS plcid,
	pc.fk_id_playlist AS plaid,
	COUNT(up.fk_login)::integer AS upvotes,
	pc.flag_visible AS flag_visible,
	pc.pos AS pos,
	(CASE WHEN pl.fk_id_plcontent_playing = pc.pk_id_plcontent
		THEN TRUE
		ELSE FALSE
	END) AS flag_playing
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_kid = ak.pk_kid
INNER JOIN playlist AS pl ON pl.pk_id_playlist = pc.fk_id_playlist
LEFT OUTER JOIN upvote up ON up.fk_id_plcontent = pc.pk_id_plcontent
WHERE  pc.pk_id_plcontent = ANY ($1)
GROUP BY pl.fk_id_plcontent_playing, pc.fk_kid, ak.titles, ak.mediasize, ak.mediafile, ak.repository, pc.nickname, pc.fk_login, pc.pk_id_plcontent, pc.fk_id_playlist, ak.tags
`;


export const sqlgetPLCByKIDUser = `
SELECT
	pc.pos AS pos,
	(CASE WHEN pl.fk_id_plcontent_playing = pc.pk_id_plcontent
		THEN TRUE
		ELSE FALSE
	END) AS flag_playing,
	pc.pk_id_plcontent AS plcid
FROM playlist_content pc
INNER JOIN playlist AS pl ON pl.pk_id_playlist = pc.fk_id_playlist
WHERE pc.fk_id_playlist = :plaid
	AND pc.fk_kid = :kid
	AND pc.fk_login = :username;
`;

export const sqlgetPlaylistInfo = `
SELECT pk_id_playlist AS plaid,
	name,
	karacount,
	duration,
	time_left,
	created_at,
	modified_at,
	flag_visible,
	flag_current,
	flag_public,
	flag_smart,
	flag_whitelist,
	flag_blacklist,
	fk_id_plcontent_playing AS plcontent_id_playing,
	fk_login AS username,
	type_smart
FROM playlist
WHERE pk_id_playlist = $1
`;

export const sqlgetPlaylists = `
SELECT pk_id_playlist AS plaid,
	name,
	karacount,
	duration,
	time_left,
	created_at,
	modified_at,
	flag_visible,
	flag_current,
	flag_public,
	flag_whitelist,
	flag_blacklist,
	flag_smart,
	fk_id_plcontent_playing AS plcontent_id_playing,
	fk_login AS username,
	type_smart
FROM playlist
`;

export const sqlupdatePLCCriterias = `
UPDATE playlist_content
SET criterias = $2
WHERE pk_id_plcontent = ANY ($1);
`;

export const sqlsetPLCFree = `
UPDATE playlist_content
SET flag_free = TRUE
WHERE pk_id_plcontent = ANY ($1);
`;

export const sqlsetPLCVisible = `
UPDATE playlist_content
SET flag_visible = TRUE
WHERE pk_id_plcontent = ANY ($1);
`;

export const sqlsetPLCInvisible = `
UPDATE playlist_content
SET flag_visible = FALSE
WHERE pk_id_plcontent = ANY ($1);
`;

export const sqlsetPLCAccepted = `
UPDATE playlist_content
SET flag_accepted = $2
WHERE pk_id_plcontent = ANY ($1);
`;

export const sqlsetPLCRefused = `
UPDATE playlist_content
SET flag_refused = $2
WHERE pk_id_plcontent = ANY ($1);
`;

export const sqlsetPLCFreeBeforePos = `
UPDATE playlist_content
SET flag_free = TRUE
WHERE fk_id_playlist = :plaid
	AND pos <= :pos;
`;

export const sqlshiftPosInPlaylist = `
UPDATE playlist_content
SET pos = pos + :shift
WHERE fk_id_playlist = :plaid
	AND pos >= :pos
`;

export const sqlgetMaxPosInPlaylist = `
SELECT MAX(pos) AS maxpos
FROM playlist_content
WHERE fk_id_playlist = $1;
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
WHERE fk_id_playlist = :plaid
	AND fk_login = :username;
`;

export const sqltrimPlaylist = `
DELETE FROM playlist_content
WHERE fk_id_playlist = :plaid
	AND pos > :pos;
`;

export const sqladdCriteria = `
INSERT INTO playlist_criteria(
	value,
	type,
	fk_id_playlist
)
VALUES ($1,$2,$3);
`;

export const sqlgetCriterias = `
SELECT type,
	value,
	fk_id_playlist AS plaid
FROM playlist_criteria
WHERE fk_id_playlist = $1
`;

export const sqldeleteCriteriaForPlaylist = `
DELETE FROM playlist_criteria
WHERE fk_id_playlist = $1;
`;

export const sqldeleteCriteria = `
DELETE FROM playlist_criteria
WHERE type = $1
  AND value = $2
  AND fk_id_playlist = $3;
`;

export const sqlselectKarasFromCriterias = {
	tagTypes: (type: string, value: any) => `
	SELECT kt.fk_kid AS kid, jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::uuid)) AS criterias
	FROM playlist_criteria AS c
	INNER JOIN tag t ON t.types @> ARRAY[c.type] AND c.value = t.pk_tid::varchar
	INNER JOIN kara_tag kt ON t.pk_tid = kt.fk_tid AND kt.type = c.type
	WHERE c.type ${type} AND c.value = '${value}'
		AND   kt.fk_kid NOT IN (select fk_kid from playlist_content where fk_id_playlist = $2)
		AND   fk_id_playlist = $1
	`,

	0: (value: any) => `
	SELECT k.pk_kid AS kid , jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::smallint)) AS criterias
	FROM playlist_criteria c
 	INNER JOIN kara k ON k.year = ${value}
	WHERE c.type = 0
	AND   k.pk_kid NOT IN (select fk_kid from playlist_content where fk_id_playlist = $2)
	AND   fk_id_playlist = $1
	`,

	1001: `
	SELECT k.pk_kid AS kid, jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::uuid)) AS criterias
	FROM playlist_criteria c
	INNER JOIN kara k ON k.pk_kid = c.value::uuid
	WHERE c.type = 1001
	AND   c.value::uuid NOT IN (select fk_kid from playlist_content where fk_id_playlist = $2)
	AND   fk_id_playlist = $1
	`,

	1002: (value: any) => `
	SELECT k.pk_kid AS kid, jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::integer)) AS criterias
	FROM playlist_criteria c
	INNER JOIN kara k on k.duration >= ${value}
	WHERE c.type = 1002
	AND   k.pk_kid NOT IN (select fk_kid from playlist_content where fk_id_playlist = $2)
	AND   fk_id_playlist = $1
	`,

	1003: (value: any) => `
	SELECT k.pk_kid AS kid, jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::integer)) AS criterias
	FROM playlist_criteria c
	INNER JOIN kara k on k.duration <= ${value}
	WHERE c.type = 1003
	AND   k.pk_kid NOT IN (select fk_kid from playlist_content where fk_id_playlist = $2)
	AND   fk_id_playlist = $1
	`,

	1004: (value: any) => `
	SELECT ak.pk_kid AS kid, jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::varchar)) AS criterias
	FROM playlist_criteria c
	INNER JOIN all_karas ak ON ak.titles_sortable LIKE ('%' || lower(unaccent('${value}')) || '%')
	WHERE c.type = 1004
	AND   ak.pk_kid NOT IN (select fk_kid from playlist_content where fk_id_playlist = $2)
	AND   fk_id_playlist = $1
	`,

	1005: (value: any) => `
	SELECT kt.fk_kid AS kid, jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::varchar)) AS criterias
	FROM playlist_criteria c
	INNER JOIN tag t ON unaccent(t.name) ILIKE ('%' || unaccent('${value}') || '%')
	INNER JOIN kara_tag kt ON t.pk_tid = kt.fk_tid
	WHERE c.type = 1005
	AND   kt.fk_kid NOT IN (select fk_kid from playlist_content where fk_id_playlist = $2)
	AND   fk_id_playlist = $1
	`,

	1006: (value: any) => `
	SELECT k.pk_kid AS kid, jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::varchar)) AS criterias
	FROM playlist_criteria c
	INNER JOIN kara k ON k.download_status = '${value}'
	WHERE c.type = 1006
	AND   k.pk_kid NOT IN (select fk_kid from playlist_content where fk_id_playlist = $2)
	`
};

export const sqlremoveKaraFromPlaylist = `
DELETE FROM playlist_content
WHERE pk_id_plcontent IN ($plcid)
`;

export const sqladdKaraToPlaylist = `
INSERT INTO playlist_content(
	fk_id_playlist,
	fk_login,
	nickname,
	fk_kid,
	created_at,
	pos,
	flag_free,
	flag_visible,
	flag_refused,
	flag_accepted,
	criterias
) VALUES(
	$1,
	$2,
	$3,
	$4,
	$5,
	$6,
	$7,
	$8,
	$9,
	$10,
	$11
) RETURNING pk_id_plcontent AS plc_id, fk_kid AS kid, pos, fk_login AS username
`;

export const sqlgetTimeSpentPerUser = `
SELECT COALESCE(SUM(k.duration),0)::integer AS time_spent
FROM kara AS k
INNER JOIN playlist_content AS pc ON pc.fk_kid = k.pk_kid
WHERE pc.fk_login = $2
	AND pc.fk_id_playlist = $1
	AND pc.flag_free = FALSE
`;

export const sqlupdateFreeOrphanedSongs = `
UPDATE playlist_content SET
	flag_free = TRUE
WHERE created_at <= $1;
`;

export const sqlgetSongCountPerUser = `
SELECT COUNT(1)::integer AS count
FROM playlist_content AS pc
WHERE pc.fk_login = $2
	AND pc.fk_id_playlist = $1
	AND pc.flag_free = FALSE
`;