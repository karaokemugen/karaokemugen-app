// SQL queries for user manipulation

export const sqltestNickname = `
SELECT pk_login AS login
FROM users
WHERE nickname = :nickname
`;

export const sqlreassignPlaylistToUser = 'UPDATE playlist SET fk_login = :username WHERE fk_login = :old_username;';

export const sqlreassignRequestedToUser = 'UPDATE requested SET fk_login = :username WHERE fk_login = :old_username;';

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
	u.last_login_at AS last_login_at,
	(CASE WHEN :last_login_time_limit < u.last_login_at
		THEN TRUE
		ELSE FALSE
    END)  AS flag_online,
	u.main_series_lang AS main_series_lang,
	u.fallback_series_lang AS fallback_series_lang,
	u.flag_tutorial_done AS flag_tutorial_done,
	u.flag_sendstats AS flag_sendstats,
	u.location AS location,
	u.language AS language
FROM users AS u
WHERE u.pk_login = :username
`;

export const sqlselectRandomGuestName = `
SELECT pk_login AS login
FROM users
WHERE type = 2
	AND ($1 > last_login_at)
ORDER BY RANDOM() LIMIT 1;
`;

export const sqlselectGuests = `
SELECT
	u.nickname AS nickname,
	u.pk_login AS login,
	u.avatar_file AS avatar_file
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
	(CASE WHEN $1 < u.last_login_at
		THEN TRUE
		ELSE FALSE
    END)  AS flag_online
FROM users AS u
ORDER BY flag_online DESC, u.nickname
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
	last_login_at,
	flag_tutorial_done,
	flag_sendstats,
	language
)
VALUES (
	:type,
	:login,
	:password,
	:nickname,
	:last_login_at,
	:flag_tutorial_done,
	:flag_sendstats,
	:language
);
`;

export const sqlupdateLastLogin = `
UPDATE users SET
	last_login_at = :now
WHERE pk_login = :username;
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
	main_series_lang = :main_series_lang,
	fallback_series_lang = :fallback_series_lang,
	flag_tutorial_done = :flag_tutorial_done,
	location = :location,
	flag_sendstats = :flag_sendstats,
	language = :language
WHERE pk_login = :old_login
`;

export const sqleditUserPassword = `
UPDATE users SET
	password = :password
WHERE pk_login = :username
`;

export const sqlSelectAllDupeUsers = `
SELECT *,
	(select count(*) from favorites f where f.fk_login = ou.pk_login) AS favorites
FROM users ou
WHERE (select count(*) from users inr where lower(inr.pk_login) = lower(ou.pk_login)) > 1
  AND type < 2
ORDER BY pk_login, favorites DESC, last_login_at DESC
`;

export const sqlLowercaseAllUsers = 'UPDATE users SET pk_login = lower(pk_login) WHERE type < 2;';

export const sqlMergeUserDataPlaylist = 'UPDATE playlist SET fk_login = $2 WHERE fk_login = $1;';

export const sqlMergeUserDataPlaylistContent = 'UPDATE playlist_content SET fk_login = $2 WHERE fk_login = $1;';

export const sqlMergeUserDataRequested = 'UPDATE requested SET fk_login = $2 WHERE fk_login = $1;';