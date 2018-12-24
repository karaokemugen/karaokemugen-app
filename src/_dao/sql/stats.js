// SQL for stats

export const exportViewcounts = 'SELECT kid, session_started_at, modified_at FROM viewcount';

export const exportRequests = 'SELECT kid, session_started_at, requested_at FROM request';

export const exportFavorites = `
SELECT pc.kid
FROM playlist_content pc, playlist p
WHERE pc.fk_id_playlist = p.pk_id_playlist
	AND p.flag_favorites = 1;
`;