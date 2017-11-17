SELECT pk_id_user AS id,
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
WHERE id = $id;