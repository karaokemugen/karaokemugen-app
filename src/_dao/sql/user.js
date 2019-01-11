// SQL queries for user manipulation

export const testNickname = `
SELECT pk_id_user
FROM users
WHERE nickname = :nickname
`;

export const reassignPlaylistToUser = 'UPDATE playlist SET fk_id_user = :id WHERE fk_id_user = :old_id;';

export const reassignPlaylistContentToUser = 'UPDATE playlist_content SET fk_id_user = :id WHERE fk_id_user = :old_id;';

export const selectUserByID = `
SELECT u.pk_id_user AS id,
	u.type AS type,
	u.login AS login,
	u.password AS password,
	u.nickname AS nickname,
	u.avatar_file AS avatar_file,
	u.bio AS bio,
	u.url AS url,
	u.email AS email,
	u.fingerprint AS fingerprint,
	u.last_login_at AS last_login_at,
	u.flag_online AS flag_online
FROM users AS u
WHERE u.pk_id_user = $1
`;

export const selectUserByName = `
SELECT u.pk_id_user AS id,
	u.type AS type,
	u.login AS login,
	u.password AS password,
	u.nickname AS nickname,
	u.avatar_file AS avatar_file,
	u.bio AS bio,
	u.url AS url,
	u.email AS email,
	u.fingerprint AS fingerprint,
	u.last_login_at AS last_login_at,
	u.flag_online AS flag_online
FROM users AS u
WHERE u.login = :username
`;

export const selectRandomGuestName = `
SELECT pk_id_user AS id, login
FROM users
WHERE type = 2
	AND flag_online = 0
ORDER BY RANDOM() LIMIT 1;
`;

export const selectGuests = `
SELECT u.pk_id_user AS user_id,
	u.nickname AS nickname,
	u.login AS login,
	u.avatar_file AS avatar_file,
	(fingerprint IS NULL) AS available
FROM users AS u
WHERE u.type = 2;
`;

export const selectUsers = `
SELECT u.pk_id_user AS user_id,
	u.type AS type,
	u.avatar_file AS avatar_file,
	u.login AS login,
	u.nickname AS nickname,
	u.last_login_at AS last_login_at,
	u.flag_online AS flag_online,
	u.type AS type
FROM users AS u
ORDER BY u.flag_online DESC, u.nickname
`;

export const deleteUser = `
DELETE FROM users
WHERE pk_id_user = $1;
`;

export const createUser = `
INSERT INTO users(
	type,
	login,
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

export const updateExpiredUsers = `
UPDATE users SET
	last_login = 0,
	fingerprint = null,
	flag_online = 0
WHERE last_login_at <= $1;
`;

export const updateLastLogin = `
UPDATE users SET
	last_login_at = :now,
	flag_online = 1
WHERE pk_id_user = :id;
`;

export const updateUserFingerprint = `
UPDATE users SET
	fingerprint = :fingerprint
WHERE login = :username;
`;

export const findFingerprint = `
SELECT login
FROM users
WHERE fingerprint = :fingerprint;
`;

export const resetGuestsPassword = `
UPDATE users SET
	password = null
WHERE flag_online = 0
AND type = 2
`;

export const editUser = `
UPDATE users SET
	login = :login,
	nickname = :nickname,
	avatar_file = :avatar_file,
	bio = :bio,
	email = :email,
	url = :url,
	type = :type
WHERE pk_id_user = :id
`;

export const editUserPassword = `
UPDATE users SET
	password = :password
WHERE pk_id_user = :id
`;
