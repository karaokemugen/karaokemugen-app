// SQL for playlist management
import { DownloadedStatus } from '../../lib/types/database/download.js';

const intermissionsDuration = `
		+ (floor((pc.pos - ppos.pos + :songsBeforeJingle) / :songsBetweenJingles) * :jinglesDuration)
		+ (floor((pc.pos - ppos.pos + :songsBeforeSponsor) / :songsBetweenSponsors) * :sponsorsDuration)
		+ ((pc.pos - ppos.pos) * :pauseDuration)

`;

const sqlSnippet = {
	CTEKaraDuration: `kara_duration AS (SELECT pk_kid, duration FROM all_karas)`,
	CTEPlayingPos: `playing_pos AS (
	SELECT pos FROM playlist_content
	   INNER JOIN playlist ON playlist.pk_plaid = playlist_content.fk_plaid
	   WHERE playlist.pk_plaid = :plaid
		 AND playlist.fk_plcid_playing = playlist_content.pk_plcid
   )
	`,

	playing_at: `NOW() + ((SELECT
		SUM(kd.duration)
	FROM kara_duration kd
	INNER JOIN playlist_content AS plc ON plc.fk_kid = kd.pk_kid
	WHERE plc.fk_plaid = :plaid
		AND plc.pos >= ppos.pos AND plc.pos < pc.pos
	)::integer
		${intermissionsDuration}
	) * interval '1 second' AS playing_at
	`,
};

export const sqlupdatePlaylistLastEditTime = `
UPDATE playlist SET
	modified_at = :modified_at
WHERE pk_plaid = :plaid;
`;

export const sqlemptyPlaylist = `
DELETE FROM playlist_content
WHERE fk_plaid = $1;
`;

export const sqldeletePlaylist = `
DELETE FROM playlist
WHERE pk_plaid = $1;
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
	flag_fallback = :flag_fallback,
	flag_smartlimit = :flag_smartlimit,
	type_smart = :type_smart,
	smart_limit_order = :smart_limit_order,
	smart_limit_type = :smart_limit_type,
	smart_limit_number = :smart_limit_number
WHERE pk_plaid = :plaid;
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
	flag_fallback,
	flag_smart,
	type_smart,
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
	:flag_fallback,
	:flag_smart,
	:type_smart,
	:username,
	0
) RETURNING pk_plaid
`;

export const sqlupdatePlaylistKaraCount = `
UPDATE playlist SET
	karacount = (
		SELECT COUNT(fk_kid)
		FROM playlist_content, kara AS k
		WHERE fk_plaid = $1
		  AND fk_kid = pk_kid
	)
WHERE pk_plaid = $1
`;

export const sqlreorderPlaylist = `
UPDATE playlist_content
SET pos = A.new_pos
FROM  (SELECT ROW_NUMBER() OVER (ORDER BY pos) AS new_pos, pk_plcid
    FROM playlist_content
	INNER JOIN kara k ON playlist_content.fk_kid = k.pk_kid
    WHERE fk_plaid = $1) AS A
WHERE A.pk_plcid = playlist_content.pk_plcid
`;

export const sqlupdatePLCSetPos = `
UPDATE playlist_content
SET pos = $1
WHERE pk_plcid = $2;
`;

export const sqlupdatePlaylistDuration = `
WITH playing_pos AS (
  SELECT pos
	FROM playlist_content, playlist
   WHERE playlist_content.pk_plcid = playlist.fk_plcid_playing AND playlist_content.fk_plaid = :plaid
),
last_pos AS (
  SELECT MAX(pos) AS pos
	FROM playlist_content
   WHERE playlist_content.fk_plaid = :plaid
),
kara_duration AS (SELECT pk_kid, duration FROM all_karas)
UPDATE playlist SET time_left = (
	SELECT COALESCE(SUM(kd.duration)
		${intermissionsDuration}
	,0)
		FROM playlist_content
		INNER JOIN kara_duration kd ON kd.pk_kid = playlist_content.fk_kid
		WHERE playlist_content.fk_plaid = :plaid
		AND playlist_content.pos >= COALESCE(ppos.pos,0)
	),
	time_played = (
		SELECT COALESCE(SUM(kd.duration),0) AS duration
		FROM playlist_content
		INNER JOIN kara_duration kd ON kd.pk_kid = playlist_content.fk_kid
		WHERE playlist_content.fk_plaid = :plaid
		AND playlist_content.pos < COALESCE(ppos.pos,0)
	),
	duration = (
		SELECT COALESCE(SUM(kd.duration)
			${intermissionsDuration}
		,0) AS duration
			FROM playlist_content
		    INNER JOIN kara_duration kd ON kd.pk_kid = playlist_content.fk_kid
			WHERE playlist_content.fk_plaid = :plaid
				AND playlist_content.pos >= 0
	),
	songs_played = (
		SELECT COUNT(playlist_content.pk_plcid)
		FROM playlist_content
		WHERE playlist_content.fk_plaid = :plaid
		AND playlist_content.pos < COALESCE(ppos.pos,0)
	),
	songs_left = (
	  SELECT COUNT(playlist_content.pk_plcid)
		FROM playlist_content
		WHERE playlist_content.fk_plaid = :plaid
		AND playlist_content.pos >= COALESCE(ppos.pos,0)
	)
FROM playing_pos ppos, last_pos pc
WHERE pk_plaid = :plaid;
`;

export const sqlgetPlaylistContentsMicro = (login: string) => `
SELECT pc.fk_kid AS kid,
	pc.pk_plcid AS plcid,
	(CASE WHEN pl.fk_plcid_playing = pc.pk_plcid
		THEN TRUE
		ELSE FALSE
	  END) AS flag_playing,
	pc.pos,
	pc.fk_login AS username,
	pc.nickname,
	pc.flag_free,
	pc.flag_visible,
	pc.flag_accepted,
	pc.flag_refused,
	pc.fk_plaid AS plaid,
	MAX(p.played_at) AS lastplayed_at,
	ak.from_display_type,
	ak.mediafile,
	ak.repository,
	ak.mediasize,
	ak.duration
FROM playlist_content pc
INNER JOIN all_karas ak ON pc.fk_kid = ak.pk_kid
LEFT OUTER JOIN playlist pl ON pl.pk_plaid = pc.fk_plaid
LEFT OUTER JOIN played AS p ON p.fk_kid = ak.pk_kid
WHERE pc.fk_plaid = $1
  ${login ? 'AND pc.fk_login = $2' : ''}
GROUP BY
	pc.pk_plcid,
	pc.pos,
	pc.fk_login,
	pc.nickname,
	pc.flag_free,
	pc.flag_visible,
	pc.flag_accepted,
	pc.flag_refused,
	pc.fk_plaid,
	ak.from_display_type,
	ak.mediafile,
	ak.repository,
	ak.mediasize,
	ak.duration,
	pl.fk_plcid_playing
ORDER BY pc.pos, pc.created_at DESC

`;

export const sqlgetPlaylistContents = (
	filterClauses: string[],
	whereClause: string,
	orderClause: string,
	limitClause: string,
	offsetClause: string,
	additionalFrom: string,
	incomingSongs?: boolean,
	filterByUser?: string
) => `
WITH blank AS (SELECT TRUE),
${sqlSnippet.CTEKaraDuration},
${sqlSnippet.CTEPlayingPos}
SELECT
  ak.tags AS tags,
  ${sqlSnippet.playing_at},
  ak.pk_kid AS kid,
  ak.titles AS titles,
  ak.titles_aliases AS titles_aliases,
  ak.titles_default_language AS titles_default_language,
  ak.songorder AS songorder,
  ak.songname AS songname,
  ak.lyrics_infos AS lyrics_infos,
  ak.year AS year,
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  pc.created_at AS added_at,
  ak.mediasize AS mediasize,
  ak.download_status AS download_status,
  ak.from_display_type AS from_display_type,
  COUNT(p.played_at)::integer AS played,
  COUNT(rq.requested_at)::integer AS requested,
  (CASE WHEN :dejavu_time < max(p.played_at)
		THEN TRUE
		ELSE FALSE
  END) AS flag_dejavu,
  pc.played_at AS played_at,
  (CASE WHEN f.fk_kid IS NULL
		THEN FALSE
		ELSE TRUE
  END) as flag_favorites,
  pc.nickname AS nickname,
  pc.fk_login AS username,
  u.avatar_file AS avatar_file,
  u.type AS user_type,
  pc.pos AS pos,
  pc.pk_plcid AS plcid,
  (CASE WHEN pl.fk_plcid_playing = pc.pk_plcid
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
  (SELECT COUNT(up.fk_plcid)::integer FROM upvote up WHERE up.fk_plcid = pc.pk_plcid) AS upvotes,
  (CASE WHEN COUNT(up.*) > 0 THEN TRUE ELSE FALSE END) as flag_upvoted,
  pc.flag_visible AS flag_visible,
  pc.flag_free AS flag_free,
  pc.flag_refused AS flag_refused,
  pc.flag_accepted AS flag_accepted,
  COUNT(pc.pk_plcid) OVER()::integer AS count,
  ak.repository AS repository,
  array_remove(array_agg(DISTINCT pc_pub.pk_plcid), null) AS public_plc_id,
  array_remove(array_agg(DISTINCT pc_self.pk_plcid), null) AS my_public_plc_id,
  pc.criterias
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_kid = ak.pk_kid
INNER JOIN playing_pos AS ppos ON 1 = 1
INNER JOIN kara_duration AS kd ON kd.pk_kid = pc.fk_kid
LEFT OUTER JOIN kara k ON k.pk_kid = ak.pk_kid
LEFT OUTER JOIN users AS u ON u.pk_login = pc.fk_login
LEFT OUTER JOIN playlist_content AS bl ON ak.pk_kid = bl.fk_kid AND bl.fk_plaid = :blacklist_plaid
LEFT OUTER JOIN playlist_content AS wl ON ak.pk_kid = wl.fk_kid AND wl.fk_plaid = :whitelist_plaid
LEFT OUTER JOIN upvote up ON up.fk_plcid = pc.pk_plcid AND up.fk_login = :username
LEFT OUTER JOIN favorites f ON f.fk_kid = ak.pk_kid AND f.fk_login = :username
LEFT OUTER JOIN played AS p ON p.fk_kid = ak.pk_kid
LEFT OUTER JOIN requested AS rq ON rq.fk_kid = ak.pk_kid
LEFT OUTER JOIN playlist AS pl ON pl.pk_plaid = pc.fk_plaid
LEFT OUTER JOIN playlist_content AS pc_pub ON pc_pub.fk_kid = pc.fk_kid AND pc_pub.fk_plaid = :public_plaid
LEFT OUTER JOIN playlist_content AS pc_self on pc_self.fk_kid = pc.fk_kid AND pc_self.fk_plaid = :public_plaid AND pc_self.fk_login = :username
${additionalFrom}
WHERE pc.fk_plaid = :plaid
${filterClauses.map(clause => `AND (${clause})`).join(' ')}
${whereClause}
${filterByUser ? ' AND pc.fk_login = :username' : ''}
${incomingSongs ? ' AND pc.pos > ppos.pos' : ''}
GROUP BY
	pl.fk_plcid_playing,
	ak.pk_kid,
	ak.titles,
	ak.titles_aliases,
	ak.titles_default_language,
	ak.songorder,
	ak.songname,
	ak.tags,
	ak.lyrics_infos,
	ak.year,
	ak.mediafile,
	ak.karafile,
	ak.from_display_type,
	ak.duration,
	ak.mediasize,
	pc.created_at,
	pc.nickname,
	ak.download_status,
	pc.fk_login, pc.pos,
	pc.pk_plcid,
	wl.fk_kid,
	bl.fk_kid,
	f.fk_kid,
	u.avatar_file,
	u.type,
	ak.repository,
	ppos.pos,
	pc.criterias
ORDER BY ${orderClause}
${limitClause}
${offsetClause}
`;

export const sqlgetPlaylistContentsMini = `
SELECT ak.pk_kid AS kid,
	ak.titles AS titles,
	ak.titles_aliases AS titles_aliases,
	ak.titles_default_language AS titles_default_language,
	ak.songname AS songname,
	ak.songorder AS songorder,
    ak.loudnorm AS loudnorm,
    pc.nickname AS nickname,
	pc.created_at AS added_at,
	ak.mediafile AS mediafile,
    ak.mediasize AS mediasize,
	ak.lyrics_infos AS lyrics_infos,
	ak.tags AS tags,
	ak.from_display_type AS from_display_type,
	pc.pos AS pos,
	(CASE WHEN pl.fk_plcid_playing = pc.pk_plcid
		THEN TRUE
		ELSE FALSE
	END) AS flag_playing,
	(SELECT (CASE WHEN :dejavu_time < max(p.played_at)
		THEN TRUE
		ELSE FALSE
  	END) FROM played p WHERE ak.pk_kid = p.fk_kid) AS flag_dejavu,
	pc.pk_plcid AS plcid,
	pc.fk_plaid as plaid,
	pc.fk_login AS username,
	pc.flag_free AS flag_free,
	pc.flag_refused AS flag_refused,
    pc.flag_accepted AS flag_accepted,
	pc.flag_visible AS flag_visible,
	pc.criterias,
	ak.duration AS duration,
	ak.repository as repository,
	(SELECT COUNT(up.fk_plcid)::integer FROM upvote up WHERE up.fk_plcid = pc.pk_plcid) AS upvotes
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_kid = ak.pk_kid
LEFT OUTER JOIN playlist AS pl ON pl.pk_plaid = pc.fk_plaid
WHERE pc.fk_plaid = :plaid
ORDER BY pc.pos;
`;

export const sqlgetPLCInfo = (forUser: boolean) => `
WITH playing_pos AS (
	SELECT pos FROM playlist_content
	   INNER JOIN playlist ON playlist.pk_plaid = playlist_content.fk_plaid
	   WHERE playlist.pk_plaid = :current_plaid
		 AND playlist.fk_plcid_playing = playlist_content.pk_plcid
   ), current_pos AS (
	SELECT pos FROM playlist_content
	   WHERE playlist_content.pk_plcid = :plcid
   )
SELECT
  ak.pk_kid AS kid,
  ak.tags AS tags,
  ak.titles AS titles,
  ak.titles_aliases AS titles_aliases,
  ak.titles_default_language AS titles_default_language,
  ak.songname AS songname,
  ak.songorder AS songorder,
  ak.lyrics_infos AS lyrics_infos,
  ak.year AS year,
  ak.mediafile AS mediafile,
  ak.karafile AS karafile,
  ak.duration AS duration,
  ak.loudnorm AS loudnorm,
  pc.created_at AS added_at,
  ak.created_at AS created_at,
  ak.modified_at AS modified_at,
  ak.mediasize AS mediasize,
  ak.download_status AS download_status,
  ak.from_display_type AS from_display_type,
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
  pc.played_at AS played_at,
  u.avatar_file AS avatar_file,
  u.type AS user_type,
  pc.pos AS pos,
  pc.pk_plcid AS plcid,
  pc.fk_plaid as plaid,
  (CASE WHEN pl.fk_plcid_playing = pc.pk_plcid
	THEN TRUE
	ELSE FALSE
  END) AS flag_playing,
  (SELECT COUNT(up.fk_plcid)::integer FROM upvote up WHERE up.fk_plcid = pc.pk_plcid) AS upvotes,
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
	WHERE plc.fk_plaid = :current_plaid
		AND plc.pos >= ppos.pos AND plc.pos < cpos.pos
)::integer, 0) AS time_before_play,
  pc.flag_visible AS flag_visible,
  ak.repository as repository,
  array_remove(array_agg(DISTINCT pc_pub.pk_plcid), null) AS public_plc_id,
  array_remove(array_agg(DISTINCT pc_self.pk_plcid), null) AS my_public_plc_id,
  array_remove(array_agg(DISTINCT krc.fk_kid_parent), null) AS parents,
  array_remove(array_agg(DISTINCT krp.fk_kid_child), null) AS children,
  array_remove((SELECT array_agg(DISTINCT fk_kid_child) FROM kara_relation WHERE fk_kid_parent = ANY (array_remove(array_agg(DISTINCT krc.fk_kid_parent), null))), ak.pk_kid) AS siblings,
  pc.criterias
FROM playlist_content AS pc
INNER JOIN playlist AS pl ON pl.pk_plaid = :current_plaid
INNER JOIN all_karas AS ak ON pc.fk_kid = ak.pk_kid
LEFT OUTER JOIN kara_relation krp ON krp.fk_kid_parent = ak.pk_kid
LEFT OUTER JOIN kara_relation krc ON krc.fk_kid_child = ak.pk_kid
LEFT OUTER JOIN users AS u ON u.pk_login = pc.fk_login
LEFT OUTER JOIN played p ON ak.pk_kid = p.fk_kid
LEFT OUTER JOIN upvote up ON up.fk_plcid = pc.pk_plcid AND up.fk_login = :username
LEFT OUTER JOIN requested rq ON rq.fk_kid = ak.pk_kid
LEFT OUTER JOIN playlist_content AS bl ON ak.pk_kid = bl.fk_kid AND bl.fk_plaid = :blacklist_plaid
LEFT OUTER JOIN playlist_content AS wl ON ak.pk_kid = wl.fk_kid AND wl.fk_plaid = :whitelist_plaid
LEFT OUTER JOIN favorites AS f on ak.pk_kid = f.fk_kid AND f.fk_login = :username
LEFT OUTER JOIN playlist_content AS pc_pub ON pc_pub.fk_kid = pc.fk_kid AND pc_pub.fk_plaid = :public_plaid
LEFT OUTER JOIN playlist_content AS pc_self on pc_self.fk_kid = pc.fk_kid AND pc_self.fk_plaid = :public_plaid AND pc_self.fk_login = :username
WHERE  pc.pk_plcid = :plcid
${forUser ? ' AND pl.flag_visible = TRUE' : ''}
GROUP BY
	pl.fk_plcid_playing,
	ak.pk_kid,
	ak.titles,
	ak.titles_aliases,
	ak.titles_default_language,
	ak.songname,
	ak.songorder,
	ak.lyrics_infos,
	ak.year,
	ak.tags,
	ak.mediafile,
	ak.karafile,
	ak.duration,
	ak.loudnorm,
	ak.created_at,
	ak.modified_at,
	ak.mediasize,
	ak.languages_sortable,
	ak.songtypes_sortable,
	pc.created_at,
	pc.nickname,
	pc.fk_login,
	pc.pos,
	pc.pk_plcid,
	wl.fk_kid,
	bl.fk_kid,
	f.fk_kid,
	u.avatar_file,
	u.type,
	ak.repository,
	ak.from_display_type,
	ak.download_status,
	pc.criterias
`;

export const sqlgetPLCInfoMini = `
SELECT pc.fk_kid AS kid,
	ak.titles AS titles,
    ak.titles_aliases AS titles_aliases,
	ak.mediafile AS mediafile,
	ak.mediasize AS mediasize,
	ak.repository AS repository,
	ak.songname AS songname,
    jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 1)') AS series,
	pc.nickname AS nickname,
	pc.fk_login AS username,
	pc.pk_plcid AS plcid,
	pc.fk_plaid AS plaid,
	COUNT(up.fk_login)::integer AS upvotes,
	pc.flag_visible AS flag_visible,
	pc.pos AS pos,
	(CASE WHEN pl.fk_plcid_playing = pc.pk_plcid
		THEN TRUE
		ELSE FALSE
	END) AS flag_playing
FROM all_karas AS ak
INNER JOIN playlist_content AS pc ON pc.fk_kid = ak.pk_kid
INNER JOIN playlist AS pl ON pl.pk_plaid = pc.fk_plaid
LEFT OUTER JOIN upvote up ON up.fk_plcid = pc.pk_plcid
WHERE  pc.pk_plcid = ANY ($1)
GROUP BY
	pl.fk_plcid_playing,
	pc.fk_kid,
	ak.titles,
	ak.titles_aliases,
	ak.mediasize,
	ak.mediafile,
	ak.repository,
	ak.songname,
	pc.nickname,
	pc.fk_login,
	pc.pk_plcid,
	pc.fk_plaid,
	ak.tags
`;

export const sqlgetPLCByKIDUser = `
SELECT
	pc.pos AS pos,
	(CASE WHEN pl.fk_plcid_playing = pc.pk_plcid
		THEN TRUE
		ELSE FALSE
	END) AS flag_playing,
	pc.pk_plcid AS plcid
FROM playlist_content pc
INNER JOIN playlist AS pl ON pl.pk_plaid = pc.fk_plaid
WHERE pc.fk_plaid = :plaid
	AND pc.fk_kid = :kid
	AND pc.fk_login = :username;
`;

export const sqlgetPlaylist = (singlePlaylist: boolean, visibleOnly: boolean) => `
SELECT pk_plaid AS plaid,
	name,
	karacount,
	songs_played,
	songs_left,
	duration,
	time_played,
	time_left,
	created_at,
	modified_at,
	flag_visible,
	flag_current,
	flag_public,
	flag_smart,
	flag_whitelist,
	flag_blacklist,
	flag_fallback,
	flag_smartlimit,
	smart_limit_number,
	smart_limit_order,
	smart_limit_type,
	fk_plcid_playing AS plcid_playing,
	fk_login AS username,
	type_smart
FROM playlist
WHERE 1 = 1
${singlePlaylist ? ' AND pk_plaid = $1 ' : ''}
${visibleOnly ? ' AND flag_visible = TRUE ' : ''}
ORDER BY flag_current DESC, flag_public DESC, name
`;

export const sqlupdatePLCCriterias = `
UPDATE playlist_content
SET criterias = $2
WHERE pk_plcid = ANY ($1);
`;

export const sqlsetPLCFree = `
UPDATE playlist_content
SET flag_free = TRUE
WHERE pk_plcid = ANY ($1);
`;

export const sqlsetPLCVisible = `
UPDATE playlist_content
SET flag_visible = TRUE
WHERE pk_plcid = ANY ($1);
`;

export const sqlsetPLCInvisible = `
UPDATE playlist_content
SET flag_visible = FALSE
WHERE pk_plcid = ANY ($1);
`;

export const sqlsetPLCAccepted = `
UPDATE playlist_content
SET flag_accepted = $2
WHERE pk_plcid = ANY ($1);
`;

export const sqlsetPLCRefused = `
UPDATE playlist_content
SET flag_refused = $2
WHERE pk_plcid = ANY ($1);
`;

export const sqlsetPLCFreeBeforePos = `
UPDATE playlist_content
SET flag_free = TRUE
WHERE fk_plaid = :plaid
	AND pos <= :pos;
`;

export const sqlshiftPosInPlaylist = `
UPDATE playlist_content
SET pos = pos + :shift
WHERE fk_plaid = :plaid
	AND pos >= :pos
`;

export const sqlgetMaxPosInPlaylist = `
SELECT MAX(pos) AS maxpos
FROM playlist_content
WHERE fk_plaid = $1;
`;

export const sqlsetPlaying = `
UPDATE playlist
SET fk_plcid_playing = $1
FROM playlist_content
WHERE pk_plaid = $2;
`;

export const sqlsetPlayedAt = `
UPDATE playlist_content
SET played_at = NOW()
WHERE pk_plcid = $1;
`;

export const sqladdCriteria = `
INSERT INTO playlist_criteria(
	value,
	type,
	fk_plaid
)
VALUES ($1,$2,$3)
ON CONFLICT DO NOTHING;
`;

export const sqlgetCriterias = `
SELECT type,
	value,
	fk_plaid AS plaid
FROM playlist_criteria
WHERE fk_plaid = $1
`;

export const sqldeleteCriteriaForPlaylist = `
DELETE FROM playlist_criteria
WHERE fk_plaid = $1;
`;

export const sqldeleteCriteria = `
DELETE FROM playlist_criteria
WHERE type = $1
  AND value = $2
  AND fk_plaid = $3;
`;

export const sqlselectKarasFromCriterias = {
	tagTypes: (type: string, value: any, collectionClauses: string[]) => `
	SELECT kt.fk_kid AS kid,
		jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::uuid)) AS criterias,
		ak.duration AS duration,
		ak.created_at AS created_at
	FROM playlist_criteria AS c
	INNER JOIN all_tags at ON at.types @> ARRAY[c.type] AND c.value = at.pk_tid::varchar
	INNER JOIN kara_tag kt ON at.pk_tid = kt.fk_tid AND kt.type = c.type
	LEFT JOIN all_karas ak ON ak.pk_kid = kt.fk_kid
	WHERE c.type ${type} AND c.value = '${value}'
		AND   kt.fk_kid NOT IN (select fk_kid from playlist_content where fk_plaid = $2)
		AND   fk_plaid = $1
		${
			collectionClauses?.length > 0
				? `AND ((${collectionClauses
						.map(clause => `(${clause})`)
						.join(
							' OR '
						)}) OR jsonb_array_length(jsonb_path_query_array( ak.tags, '$[*] ? (@.type_in_kara == 16)')) = 0)`
				: ''
		}

	`,

	// Precise year
	0: (value: number, collectionClauses: string[]) => `
	SELECT ak.pk_kid AS kid,
		jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::smallint)) AS criterias,
		ak.duration AS duration,
		ak.created_at AS created_at
	FROM playlist_criteria c
 	INNER JOIN all_karas ak ON ak.year = ${value}
	WHERE c.type = 0
	AND   ak.pk_kid NOT IN (select fk_kid from playlist_content where fk_plaid = $2)
	AND   fk_plaid = $1
	${
		collectionClauses?.length > 0
			? `AND ((${collectionClauses
					.map(clause => `(${clause})`)
					.join(
						' OR '
					)}) OR jsonb_array_length(jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 16)')) = 0)`
			: ''
	}
	`,

	// Specific song criteria
	1001: (collectionClauses: string[]) => `
	SELECT ak.pk_kid AS kid,
		jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::uuid)) AS criterias,
		ak.duration AS duration,
		ak.created_at AS created_at
	FROM playlist_criteria c
	INNER JOIN all_karas ak ON ak.pk_kid = c.value::uuid
	WHERE c.type = 1001
	AND   c.value::uuid NOT IN (select fk_kid from playlist_content where fk_plaid = $2)
	AND   fk_plaid = $1
	${
		collectionClauses.length > 0
			? `AND ((${collectionClauses
					.map(clause => `(${clause})`)
					.join(
						' OR '
					)}) OR jsonb_array_length(jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 16)')) = 0)`
			: ''
	}

	`,

	// Duration (longer than)
	1002: (value: number, collectionClauses: string[]) => `
	SELECT ak.pk_kid AS kid,
		jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::integer)) AS criterias,
		ak.duration AS duration,
		ak.created_at AS created_at
	FROM playlist_criteria c
	INNER JOIN all_karas ak ON ak.duration >= ${value}
	WHERE c.type = 1002
	AND   ak.pk_kid NOT IN (select fk_kid from playlist_content where fk_plaid = $2)
	AND   fk_plaid = $1
	${
		collectionClauses?.length > 0
			? `AND ((${collectionClauses
					.map(clause => `(${clause})`)
					.join(
						' OR '
					)}) OR jsonb_array_length(jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 16)')) = 0)`
			: ''
	}

	`,

	// Duration (shorter than)
	1003: (value: number, collectionClauses: string[]) => `
	SELECT ak.pk_kid AS kid,
		jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::integer)) AS criterias,
		ak.duration AS duration,
		ak.created_at AS created_at
	FROM playlist_criteria c
	INNER JOIN all_karas ak ON ak.duration <= ${value}
	WHERE c.type = 1003
	AND   ak.pk_kid NOT IN (select fk_kid from playlist_content where fk_plaid = $2)
	AND   fk_plaid = $1
	${
		collectionClauses?.length > 0
			? `AND ((${collectionClauses
					.map(clause => `(${clause})`)
					.join(
						' OR '
					)}) OR jsonb_array_length(jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 16)')) = 0)`
			: ''
	}

	`,

	// Download status
	1006: (value: DownloadedStatus, collectionClauses: string[]) => `
	SELECT ak.pk_kid AS kid,
		jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::varchar)) AS criterias,
		ak.duration AS duration,
		ak.created_at AS created_at
	FROM playlist_criteria c
	INNER JOIN all_karas ak ON ak.download_status = '${value}'
	WHERE c.type = 1006
	AND   ak.pk_kid NOT IN (select fk_kid from playlist_content where fk_plaid = $2)
	AND   fk_plaid = $1
	${
		collectionClauses?.length > 0
			? `AND ((${collectionClauses
					.map(clause => `(${clause})`)
					.join(
						' OR '
					)}) OR jsonb_array_length(jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 16)')) = 0)`
			: ''
	}

	`,
	// After year
	1007: (value: number, collectionClauses: string[]) => `
	SELECT ak.pk_kid AS kid,
		jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::varchar)) AS criterias,
		ak.duration AS duration,
		ak.created_at AS created_at
	FROM playlist_criteria c
	INNER JOIN all_karas ak ON ak.year >= ${value}
	WHERE c.type = 1007
	AND   ak.pk_kid NOT IN (select fk_kid from playlist_content where fk_plaid = $2)
	AND   fk_plaid = $1
	${
		collectionClauses?.length > 0
			? `AND ((${collectionClauses
					.map(clause => `(${clause})`)
					.join(
						' OR '
					)}) OR jsonb_array_length(jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 16)')) = 0)`
			: ''
	}

	`,
	// Before year
	1008: (value: number, collectionClauses: string[]) => `
	SELECT ak.pk_kid AS kid,
		jsonb_build_array(jsonb_build_object('type', c.type, 'value', c.value::varchar)) AS criterias,
		ak.duration AS duration,
		ak.created_at AS created_at
	FROM playlist_criteria c
	INNER JOIN all_karas ak ON ak.year <= ${value}
	WHERE c.type = 1008
	AND   ak.pk_kid NOT IN (select fk_kid from playlist_content where fk_plaid = $2)
	AND   fk_plaid = $1
	${
		collectionClauses?.length > 0
			? `AND ((${collectionClauses
					.map(clause => `(${clause})`)
					.join(
						' OR '
					)}) OR jsonb_array_length(jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 16)')) = 0)`
			: ''
	}

	`,
};

export const sqlremoveKaraFromPlaylist = `
DELETE FROM playlist_content
WHERE pk_plcid IN ($plcid)
`;

export const sqladdKaraToPlaylist = `
INSERT INTO playlist_content(
	fk_plaid,
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
) RETURNING pk_plcid AS plcid, fk_kid AS kid, pos, fk_login AS username
`;

export const sqlgetTimeSpentPerUser = `
SELECT COALESCE(SUM(k.duration),0)::integer AS time_spent
FROM kara AS k
INNER JOIN playlist_content AS pc ON pc.fk_kid = k.pk_kid
WHERE pc.fk_login = $2
	AND pc.fk_plaid = ANY ($1)
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
	AND pc.fk_plaid = ANY ($1)
	AND pc.flag_free = FALSE
`;
