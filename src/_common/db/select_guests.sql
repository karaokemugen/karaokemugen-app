SELECT g.pk_id_guest AS guest_id,
     g.name AS name,
	 a.imagefile AS avatar_file
FROM guest AS g, avatar AS a
WHERE g.fk_id_avatar = a.pk_id_avatar
     