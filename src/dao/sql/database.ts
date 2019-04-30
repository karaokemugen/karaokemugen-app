// SQL for main database operations

export const getStats = `
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

export const upsertSetting = `
INSERT INTO settings (
	option,
	value
) VALUES($1, $2)
ON CONFLICT (option) DO UPDATE SET
	value = $2;
`;

export const selectSettings = 'SELECT option, value FROM settings;';