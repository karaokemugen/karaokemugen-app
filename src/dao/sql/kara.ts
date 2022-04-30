// SQL for kara management

export const sqladdViewcount = `
INSERT INTO played(
	fk_kid,
	played_at,
	fk_seid
)
VALUES(
	:kid,
	:played_at,
	:seid
) ON CONFLICT DO NOTHING;
`;

export const sqladdRequested = `
INSERT INTO requested(
	fk_login,
	fk_kid,
	requested_at,
	fk_seid
)
VALUES(
	$1,
	$2,
	$3,
	$4
) ON CONFLICT DO NOTHING;
`;

export const sqlgetAllKaras = (
	filterClauses: string[],
	whereClauses: string,
	groupClauses: string,
	orderClauses: string,
	havingClause: string,
	limitClause: string,
	offsetClause: string,
	additionalFrom: string[],
	selectRequested: string,
	groupClauseEnd: string,
	joinClauses: string[],
	collectionClauses: string[],
	withCTE: string[],
	blacklistClauses: string
) => `
WITH ${withCTE.join(', \n')}
SELECT
ak.pk_kid AS kid,
ak.titles AS titles,
ak.titles_aliases AS titles_aliases,
ak.titles_default_language AS titles_default_language,
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
jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 15)') AS warnings,
jsonb_path_query_array( tags, '$[*] ? (@.type_in_kara == 16)') AS collections,
ak.mediafile AS mediafile,
ak.karafile AS karafile,
ak.duration AS duration,
ak.gain AS gain,
ak.loudnorm AS loudnorm,
ak.created_at AS created_at,
ak.modified_at AS modified_at,
ak.mediasize AS mediasize,
ak.download_status AS download_status,
ak.comment AS comment,
ak.ignore_hooks AS ignoreHooks,
COUNT(p.*)::integer AS played,
${selectRequested}
(CASE WHEN :dejavu_time < MAX(p.played_at)
		THEN TRUE
		ELSE FALSE
END) AS flag_dejavu,
MAX(p.played_at) AS lastplayed_at,
NOW() - MAX(p.played_at) AS lastplayed_ago,
(CASE WHEN f.fk_kid IS NULL
		THEN FALSE
		ELSE TRUE
END) as flag_favorites,
ak.repository as repository,
ak.tid AS tid,
array_remove(array_agg(DISTINCT pc.pk_id_plcontent), null) AS public_plc_id,
(CASE WHEN COUNT(up.*) > 0 THEN TRUE ELSE FALSE END) as flag_upvoted,
array_remove(array_agg(DISTINCT pc_self.pk_id_plcontent), null) AS my_public_plc_id,
count(ak.pk_kid) OVER()::integer AS count,
array_remove(array_agg(DISTINCT krc.fk_kid_parent), null) AS parents,
array_remove(array_agg(DISTINCT krp.fk_kid_child), null) AS children,
array_remove((SELECT array_agg(DISTINCT fk_kid_child) FROM kara_relation WHERE fk_kid_parent = ANY (array_remove(array_agg(DISTINCT krc.fk_kid_parent), null))), ak.pk_kid) AS siblings
FROM all_karas AS ak
LEFT OUTER JOIN kara k ON k.pk_kid = ak.pk_kid
LEFT OUTER JOIN kara_relation krp ON krp.fk_kid_parent = ak.pk_kid
LEFT OUTER JOIN kara_relation krc ON krc.fk_kid_child = ak.pk_kid
LEFT OUTER JOIN played AS p ON p.fk_kid = ak.pk_kid
LEFT OUTER JOIN playlist_content AS pc ON pc.fk_kid = ak.pk_kid AND pc.fk_id_playlist = :publicPlaylist_id
LEFT OUTER JOIN playlist_content AS pc_self on pc_self.fk_kid = ak.pk_kid AND pc_self.fk_id_playlist = :publicPlaylist_id AND pc_self.fk_login = :username
LEFT OUTER JOIN upvote up ON up.fk_id_plcontent = pc.pk_id_plcontent AND up.fk_login = :username
LEFT OUTER JOIN favorites AS f ON f.fk_login = :username AND f.fk_kid = ak.pk_kid
${joinClauses.join('')}
${additionalFrom.join('')}
WHERE true
${collectionClauses.length > 0 ? `AND (${collectionClauses.map(clause => `(${clause})`).join(' OR ')})` : ''}
${filterClauses.map(clause => `AND (${clause})`).reduce((a, b) => `${a} ${b}`, '')}
${whereClauses}
${blacklistClauses}
GROUP BY ${groupClauses} ak.pk_kid, pc.fk_kid, ak.titles, ak.titles_aliases, ak.titles_default_language, ak.comment, ak.songorder, ak.serie_singer_sortable, ak.subfile, ak.year, ak.tags, ak.mediafile, ak.karafile, ak.duration, ak.gain, ak.loudnorm, ak.created_at, ak.modified_at, ak.mediasize, ak.repository, ak.songtypes_sortable, f.fk_kid, ak.tid, ak.languages_sortable, ak.download_status, ak.ignore_hooks, ak.titles_sortable ${groupClauseEnd}
${havingClause}
ORDER BY ${orderClauses} ak.serie_singer_sortable, ak.songtypes_sortable DESC, ak.songorder, ak.languages_sortable, ak.titles_sortable
${limitClause}
${offsetClause}

`;

export const sqlgetAllKarasMicro = (
	filterClauses: string[],
	additionalFrom: string[],
	collectionClauses: string[]
) => `SELECT
  k.pk_kid AS kid,
  k.duration AS duration,
  k.mediafile AS mediafile,
  k.mediasize AS mediasize,
  k.repository AS repository,
  k.subfile AS subfile,
  k.karafile AS karafile,
  k.download_status AS download_status
FROM kara AS k
${collectionClauses.length > 0 ? 'LEFT JOIN all_karas ak ON ak.pk_kid = k.pk_kid' : ''}
${additionalFrom.join('')}
WHERE true
  ${collectionClauses.length > 0 ? `AND (${collectionClauses.map(clause => `(${clause})`).join(' OR ')})` : ''}
  ${filterClauses.map(clause => `AND (${clause})`).reduce((a, b) => `${a} ${b}`, '')}
`;

export const sqldeleteKara = `
DELETE FROM kara WHERE pk_kid = ANY ($1);
`;

export const sqlupdateKara = `
UPDATE kara SET
	titles = :titles,
	titles_aliases = :titles_aliases,
	titles_default_language = :titles_default_language,
	year = :year,
	songorder = :songorder,
	mediafile = :mediafile,
	mediasize = :mediasize,
	subfile = :subfile,
	duration = :duration,
	gain = :gain,
	loudnorm = :loudnorm,
	created_at = :created_at,
	modified_at = :modified_at,
	karafile = :karafile,
	comment = :comment,
	ignore_hooks = :ignoreHooks
WHERE pk_kid = :kid
`;

export const sqlinsertKara = `
INSERT INTO kara(
	titles,
	titles_aliases,
	titles_default_language,
	year,
	songorder,
	mediafile,
	subfile,
	duration,
	gain,
	loudnorm,
	modified_at,
	created_at,
	karafile,
	pk_kid,
	repository,
	mediasize,
	download_status,
	comment,
	ignore_hooks
)
VALUES(
	:titles,
	:titles_aliases,
	:titles_default_language,
	:year,
	:songorder,
	:mediafile,
	:subfile,
	:duration,
	:gain,
	:loudnorm,
	:modified_at,
	:created_at,
	:karafile,
	:kid,
	:repository,
	:mediasize,
	:download_status,
	:comment,
	:ignoreHooks
);
`;

export const sqlgetYears = 'SELECT year, karacount::integer FROM all_years ORDER BY year';

export const sqlselectAllKIDs = (kid?: string) => `
SELECT pk_kid AS kid
FROM kara
${kid ? `WHERE pk_kid = '${kid}'` : ''}
`;

export const sqlTruncateOnlineRequested = 'TRUNCATE online_requested';

export const sqldeleteChildrenKara = 'DELETE FROM kara_relation WHERE fk_kid_child = $1';

export const sqlinsertChildrenParentKara = `
INSERT INTO kara_relation(
	fk_kid_parent,
	fk_kid_child
)
VALUES(
	:parent_kid,
	:child_kid
);
`;
