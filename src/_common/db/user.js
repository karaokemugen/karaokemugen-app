// SQL queries for user manipulation

export const testUserName = `SELECT pk_id_user
								FROM user
								WHERE login = $login;`;

export const testUserID = `SELECT pk_id_user
								FROM user
								WHERE pk_id_user = $id;`;

export const selectUserByID = `SELECT pk_id_user AS id,
    							fk_id_guest AS guest_id,
								login,
								password,
								nickname,
								NORM_nickname,
								fk_id_avatar AS avatar_id,
								bio,
								url,
								email,
								fingerprint,
								guest_expires,
								flag_online,
								flag_admin
 							FROM user
							WHERE id = $id;`;

export const selectUserByName = `SELECT pk_id_user AS id,
    								fk_id_guest AS guest_id,
									login,
									password,
									nickname,
									NORM_nickname,
									fk_id_avatar AS avatar_id,
									bio,
									url,
									email,
									fingerprint,
									guest_expires,
									flag_online,
									flag_admin
 								FROM user
								WHERE login = $username;`;

export const selectGuests = `SELECT g.pk_id_guest AS guest_id,
     							g.name AS name,
	 							a.imagefile AS avatar_file
							FROM guest AS g, avatar AS a
							WHERE g.fk_id_avatar = a.pk_id_avatar;`;

export const deleteUser = 'DELETE FROM user WHERE pk_id_user = $id;';

export const createUser = `INSERT INTO user(
							fk_id_guest,
							login,
							password,
							nickname,
							NORM_nickname,
							fk_id_avatar,
							flag_online,
							flag_admin,
							last_login) 
						VALUES (
							$guest_id,
							$login,
							$password,
							$nickname,
							$NORM_nickname,
							$avatar_id,
							$flag_online,
							$flag_admin,
							$last_login);`;