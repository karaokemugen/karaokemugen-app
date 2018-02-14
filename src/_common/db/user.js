// SQL queries for user manipulation

export const testUserName = `SELECT pk_id_user
								FROM user
								WHERE login = $login;
							`;

export const testNickname = `SELECT pk_id_user
								FROM user
								WHERE nickname = $nickname
								  OR NORM_nickname = $NORM_nickname;
							`;

export const testUserID = `SELECT pk_id_user
								FROM user
								WHERE pk_id_user = $id;
						  `;

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

export const isAdmin = `SELECT flag_admin 
						FROM user
						WHERE login = $username
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
							last_login) 
						VALUES (
							$type,
							$login,
							$password,
							$nickname,
							$NORM_nickname,
							$flag_online,
							$flag_admin,
							$last_login);
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
							url = $url
						WHERE 
							pk_id_user = $id
						   `;

export const editUserPassword = `UPDATE user SET 
							password = $password							
						WHERE 
							pk_id_user = $id
						   `;
