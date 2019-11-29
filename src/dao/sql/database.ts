// SQL for main database operations

export const getStats = `
SELECT
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[2]) AS singers,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[8]) AS songwriters,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[4]) AS creators,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[6]) AS authors,
(SELECT COUNT(pk_kid) FROM kara) AS karas,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[5]) AS languages,
(SELECT COUNT(fk_kid) FROM whitelist) AS whitelist,
(SELECT COUNT(fk_kid) FROM blacklist) AS blacklist,
(SELECT COUNT(pk_sid) FROM serie) AS series,
(SELECT COUNT(*) FROM played) AS played,
(SELECT COUNT(pk_id_playlist) FROM playlist) AS playlists,
(SELECT SUM(duration) FROM kara) AS duration;
`;

export const resetUserData = `
TRUNCATE blacklist RESTART IDENTITY CASCADE;
TRUNCATE blacklist_criteria RESTART IDENTITY CASCADE;
TRUNCATE upvote RESTART IDENTITY CASCADE;
TRUNCATE playlist_content RESTART IDENTITY CASCADE;
TRUNCATE playlist RESTART IDENTITY CASCADE;
TRUNCATE users RESTART IDENTITY CASCADE;
TRUNCATE requested RESTART IDENTITY CASCADE;
TRUNCATE played RESTART IDENTITY CASCADE;
TRUNCATE whitelist RESTART IDENTITY CASCADE;
TRUNCATE settings;
TRUNCATE download CASCADE;
`;

