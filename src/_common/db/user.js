// SQL queries for user manipulation

export const testNickname = `SELECT pk_id_user
								FROM user
								WHERE nickname = $nickname
								  OR NORM_nickname = $NORM_nickname;
							`;
export const getUserRequests = `SELECT ak.kara_id AS kara_id,
      							ak.kid AS kid,
      							ak.title AS title,
								ak.NORM_title AS NORM_title,
      							ak.songorder AS songorder,
      							ak.serie AS serie,
      							ak.NORM_serie AS NORM_serie,
      							ak.serie_altname AS serie_altname,
      							ak.NORM_serie_altname AS NORM_serie_altname,
      							ak.singer AS singer,
      							ak.NORM_singer AS NORM_singer,
      							ak.songtype AS songtype,
      							ak.creator AS creator,
	  							ak.songwriter AS songwriter,
	  							ak.NORM_songwriter AS NORM_songwriter,
	  							ak.year AS year,
	  							ak.NORM_creator AS NORM_creator,
      							ak.language AS language,
      							ak.author AS author,
      							ak.NORM_author AS NORM_author,
      							ak.misc AS misc,
								(SELECT COUNT(pk_id_viewcount) AS viewcount FROM viewcount WHERE fk_id_kara = ak.kara_id) AS viewcount,
								(SELECT COUNT(pk_id_request) AS request FROM request WHERE fk_id_kara = ak.kara_id) AS requested,
      							ak.videofile AS videofile,
      							ak.videolength AS duration,
								ak.gain AS gain,
								(CASE WHEN $dejavu_time < (SELECT max(modified_at) FROM viewcount WHERE fk_id_kara = ak.kara_id)
	     							THEN 1
        							ELSE 0
      							END) AS flag_dejavu,
								(SELECT max(vc.modified_at) FROM viewcount AS vc WHERE vc.fk_id_kara = ak.kara_id) AS lastplayed_at
							FROM karasdb.all_karas AS ak
 							WHERE ak.kara_id IN (SELECT r.fk_id_kara FROM request AS r LEFT OUTER JOIN user AS u ON u.pk_id_user = r.fk_id_user WHERE u.login = $username)
							ORDER BY requested DESC, ak.language, ak.serie IS NULL, ak.serie, ak.songtype, ak.songorder, ak.title
							`;

export const reassignPlaylistToUser = 'UPDATE playlist SET fk_id_user = $id WHERE fk_id_user = $old_id;';

export const reassignPlaylistContentToUser = 'UPDATE playlist_content SET fk_id_user = $id WHERE fk_id_user = $old_id;';

export const selectUserByID = `SELECT u.pk_id_user AS id,
    							u.type AS type,
								u.login AS login,
								u.password AS password,
								u.nickname AS nickname,
								u.NORM_nickname AS norm_nickname,
								u.avatar_file AS avatar_file,
								u.bio AS bio,
								u.url AS url,
								u.email AS email,
								u.fingerprint AS fingerprint,
								u.last_login AS last_login,
								u.flag_online AS flag_online,
								u.flag_admin AS flag_admin
 							FROM user AS u
							WHERE u.pk_id_user = $id
							`;

export const selectUserByName = `SELECT u.pk_id_user AS id,
    							u.type AS type,
								u.login AS login,
								u.password AS password,
								u.nickname AS nickname,
								u.NORM_nickname AS norm_nickname,
								u.avatar_file AS avatar_file,
								u.bio AS bio,
								u.url AS url,
								u.email AS email,
								u.fingerprint AS fingerprint,
								u.last_login AS last_login,
								u.flag_online AS flag_online,
								u.flag_admin AS flag_admin
 							FROM user AS u
							WHERE u.login = $username
							`;

export const selectRandomGuestName = `SELECT pk_id_user AS id, login
										FROM user
										WHERE type = 2
											AND flag_online = 0
										ORDER BY RANDOM() LIMIT 1;
									`;

export const selectGuests = `SELECT u.pk_id_user AS user_id,
								u.nickname AS nickname,
								u.NORM_nickname AS NORM_nickname,
								u.login AS login,
	 							u.avatar_file AS avatar_file,
								(fingerprint IS NULL) AS available
							FROM user AS u
							WHERE u.type = 2;
							`;

export const selectUsers = `SELECT u.pk_id_user AS user_id,
								u.type AS type,
	 							u.avatar_file AS avatar_file,
								u.login AS login,
								u.nickname AS nickname,
								u.NORM_nickname AS NORM_nickname,
								u.last_login AS last_login,
								u.flag_online AS flag_online,
								u.flag_admin AS flag_admin,
								u.type AS type
							FROM user AS u
							ORDER BY u.flag_online DESC, u.type, u.nickname
								`;

export const deleteUser = `DELETE FROM user WHERE pk_id_user = $id;
						  `;

export const createUser = `INSERT INTO user(
							type,
							login,
							password,
							nickname,
							NORM_nickname,
							flag_online,
							flag_admin,
							last_login,
							bio,
							url,
							email)
						VALUES (
							$type,
							$login,
							$password,
							$nickname,
							$NORM_nickname,
							$flag_online,
							$flag_admin,
							$last_login,
							$bio,
							$url,
							$email);
						   `;

export const updateExpiredUsers = `UPDATE user SET
									last_login = 0,
									fingerprint = null,
									flag_online = 0
									WHERE last_login <= $expire_time;
								`;

export const updateLastLogin = `UPDATE user SET
									last_login = $now,
									flag_online = 1
								WHERE pk_id_user = $id;
								`;

export const updateUserFingerprint = `UPDATE user SET
										fingerprint = $fingerprint
									WHERE login = $username;
								`;

export const findFingerprint = `SELECT login
								FROM user
								WHERE fingerprint = $fingerprint;
							`;

export const resetGuestsPassword = `UPDATE user SET
									password = null
								WHERE flag_online = 0
								  AND type = 2`;

export const editUser = `UPDATE user SET
							login = $login,
							nickname = $nickname,
							NORM_nickname = $NORM_nickname,
							avatar_file = $avatar_file,
							bio = $bio,
							email = $email,
							url = $url,
							flag_admin = $flag_admin,
							type = $type
						WHERE
							pk_id_user = $id
						   `;

export const editUserPassword = `UPDATE user SET
							password = $password
						WHERE
							pk_id_user = $id
						   `;
