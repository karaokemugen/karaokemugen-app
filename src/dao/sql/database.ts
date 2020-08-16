// SQL for main database operations

export const sqlGetStats = `
SELECT
(SELECT COUNT(pk_tid) FROM tag)::integer AS tags,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[2])::integer AS singers,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[8])::integer AS songwriters,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[4])::integer AS creators,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[6])::integer AS authors,
(SELECT COUNT(pk_kid) FROM kara)::integer AS karas,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[5])::integer AS languages,
(SELECT COUNT(fk_kid) FROM whitelist)::integer AS whitelist,
(SELECT COUNT(fk_kid) FROM blacklist)::integer AS blacklist,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[1])::integer AS series,
(SELECT COUNT(*) FROM played)::integer AS played,
(SELECT COUNT(pk_id_playlist) FROM playlist)::integer AS playlists,
(SELECT SUM(duration) FROM kara)::integer AS duration;
`;

export const sqlResetUserData = `
TRUNCATE blacklist RESTART IDENTITY CASCADE;
TRUNCATE blacklist_criteria RESTART IDENTITY CASCADE;
TRUNCATE blacklist_criteria_set RESTART IDENTITY CASCADE;
TRUNCATE upvote RESTART IDENTITY CASCADE;
TRUNCATE playlist_content RESTART IDENTITY CASCADE;
TRUNCATE playlist RESTART IDENTITY CASCADE;
TRUNCATE users RESTART IDENTITY CASCADE;
TRUNCATE requested RESTART IDENTITY CASCADE;
TRUNCATE played RESTART IDENTITY CASCADE;
TRUNCATE whitelist RESTART IDENTITY CASCADE;
TRUNCATE settings;
TRUNCATE download CASCADE;
TRUNCATE download_blacklist_criteria RESTART IDENTITY CASCADE;
TRUNCATE pl_medias RESTART IDENTITY CASCADE;
`;

