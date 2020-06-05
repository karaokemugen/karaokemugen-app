// SQL queries for user manipulation

export const sqltestNickname = `
SELECT pk_login AS login
FROM users
WHERE nickname = :nickname
`;

export const sqlreassignPlaylistToUser = 'UPDATE playlist SET fk_login = :username WHERE fk_login = :old_username;';

export const sqlreassignPlaylistContentToUser = 'UPDATE playlist_content SET fk_login = :username WHERE fk_login = :old_username;';

export const sqlselectUserByName = `
SELECT
	u.type AS type,
	u.pk_login AS login,
	u.password AS password,
	u.nickname AS nickname,
	u.avatar_file AS avatar_file,
	u.bio AS bio,
	u.url AS url,
	u.email AS email,
	u.fingerprint AS fingerprint,
	u.last_login_at AS last_login_at,
	u.flag_online AS flag_online,
	u.series_lang_mode AS series_lang_mode,
	u.main_series_lang AS main_series_lang,
	u.fallback_series_lang AS fallback_series_lang
FROM users AS u
WHERE u.pk_login = :username
`;

export const sqlselectRandomGuestName = `
SELECT pk_login AS login
FROM users
WHERE type = 2
	AND flag_online = FALSE
ORDER BY RANDOM() LIMIT 1;
`;

export const sqlselectGuests = `
SELECT
	u.nickname AS nickname,
	u.pk_login AS login,
	u.avatar_file AS avatar_file,
	(fingerprint IS NULL) AS available
FROM users AS u
WHERE u.type = 2;
`;

export const sqlselectUsers = `
SELECT
	u.type AS type,
	u.avatar_file AS avatar_file,
	u.pk_login AS login,
	u.nickname AS nickname,
	u.last_login_at AS last_login_at,
	u.flag_online AS flag_online
FROM users AS u
ORDER BY u.flag_online DESC, u.nickname
`;

export const sqldeleteUser = `
DELETE FROM users
WHERE pk_login = $1;
`;

export const sqlcreateUser = `
INSERT INTO users(
	type,
	pk_login,
	password,
	nickname,
	flag_online,
	last_login_at
)
VALUES (
	:type,
	:login,
	:password,
	:nickname,
	:flag_online,
	:last_login_at
);
`;

export const sqlupdateExpiredUsers = `
UPDATE users SET
	fingerprint = NULL,
	flag_online = FALSE
WHERE last_login_at <= $1;
`;

export const sqlupdateLastLogin = `
UPDATE users SET
	last_login_at = :now,
	flag_online = TRUE
WHERE pk_login = :username;
`;

export const sqlupdateUserFingerprint = `
UPDATE users SET
	fingerprint = :fingerprint,
	flag_online = TRUE
WHERE pk_login = :username;
`;

export const sqlfindFingerprint = `
SELECT pk_login
FROM users
WHERE fingerprint = $1;
`;

export const sqlresetGuestsPassword = `
UPDATE users SET
	password = null
WHERE flag_online = FALSE
AND type = 2
`;

export const sqleditUser = `
UPDATE users SET
	pk_login = :login,
	nickname = :nickname,
	avatar_file = :avatar_file,
	bio = :bio,
	email = :email,
	url = :url,
	type = :type,
	series_lang_mode = :series_lang_mode,
	main_series_lang = :main_series_lang,
	fallback_series_lang = :fallback_series_lang
WHERE pk_login = :old_login
`;

export const sqleditUserPassword = `
UPDATE users SET
	password = :password
WHERE pk_login = :username
`;
