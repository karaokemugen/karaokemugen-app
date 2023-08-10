// SQL for main database operations

export const sqlGetStats = (collectionClauses: string[]) => `
SELECT
(SELECT COUNT(pk_tid) FROM tag)::integer AS tags,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[2])::integer AS singers,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[8])::integer AS songwriters,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[4])::integer AS creators,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[6])::integer AS authors,
(SELECT COUNT(pk_kid) FROM kara)::integer AS karas,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[5])::integer AS languages,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[1])::integer AS series,
(SELECT COUNT(*) FROM played)::integer AS played,
(SELECT COUNT(pk_plaid) FROM playlist)::integer AS playlists,
(SELECT SUM(duration) FROM kara)::integer AS duration,
(SELECT SUM(k.duration) FROM played p LEFT JOIN kara k ON k.pk_kid = p.fk_kid)::integer AS playtime,
(SELECT value FROM settings WHERE option = 'usageTime')::integer AS usagetime,
(SELECT SUM(k.mediasize)::bigint FROM kara k LEFT JOIN all_karas ak ON k.pk_kid = ak.pk_kid WHERE true ${
	collectionClauses.length > 0 ? `AND (${collectionClauses.map(clause => `(${clause})`).join(' OR ')})` : ''
}) AS total_media_size;
`;

export const sqlResetUserData = `
TRUNCATE upvote RESTART IDENTITY CASCADE;
TRUNCATE playlist_criteria RESTART IDENTITY CASCADE;
TRUNCATE playlist_content RESTART IDENTITY CASCADE;
TRUNCATE playlist RESTART IDENTITY CASCADE;
TRUNCATE users RESTART IDENTITY CASCADE;
TRUNCATE requested RESTART IDENTITY CASCADE;
TRUNCATE played RESTART IDENTITY CASCADE;
TRUNCATE whitelist RESTART IDENTITY CASCADE;
TRUNCATE settings;
TRUNCATE download CASCADE;
`;
