// SQL queries for user manipulation

import { UserParams } from '../../lib/types/user';

export const sqlreassignPlaylistToUser = 'UPDATE playlist SET fk_login = :username WHERE fk_login = :old_username;';

export const sqlreassignRequestedToUser = 'UPDATE requested SET fk_login = :username WHERE fk_login = :old_username;';

export const sqlreassignPlaylistContentToUser = 'UPDATE playlist_content SET fk_login = :username WHERE fk_login = :old_username;';

export const sqlselectUsers = (params: UserParams) => `
SELECT
	u.type,
	u.pk_login AS login,
	u.nickname,
	u.avatar_file,
	u.last_login_at,
	${params.full ? `
		u.password,
		u.bio,
		u.url,
		u.email,
		u.main_series_lang AS main_series_lang,
		u.fallback_series_lang AS fallback_series_lang,
		u.flag_tutorial_done AS flag_tutorial_done,
		u.flag_sendstats AS flag_sendstats,
		u.location AS location,
		u.language AS language,
		u.flag_parentsonly AS flag_parentsonly,
	` : ''}
	(CASE WHEN :last_login_time_limit < u.last_login_at
		THEN TRUE
		ELSE FALSE
    END)  AS flag_logged_in
FROM users AS u
WHERE 1 = 1
${params.singleUser ? ' AND u.pk_login = :username' : ''}
${params.singleNickname ? ' AND u.nickname = :nickname' : ''}
${params.guestOnly || params.randomGuest ? ' AND u.type = 2' : ''}
${params.randomGuest ? ' AND (:last_login_time_limit > u.last_login_at)' : ''}
${params.randomGuest ? ' ORDER BY RANDOM() LIMIT 1' : ''}
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
	flag_parentsonly = :flag_parentsonly,
	language = :language
WHERE pk_login = :old_login
RETURNING pk_login as login, *;
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
