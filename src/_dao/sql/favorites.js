// SQL for favorites management

export const getFavoritesPlaylist = `
SELECT p.pk_id_playlist AS playlist_id
FROM playlist AS p,
	users AS u
WHERE p.fk_id_user = u.pk_id_user
	AND u.login = $1
	AND p.flag_favorites = 1
`;
