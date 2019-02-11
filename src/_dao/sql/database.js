// SQL for main database operations

export const getStats = 'SELECT * FROM stats;';

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