// SQL for main database operations

export const compareUUIDs = `
SELECT
	db.value AS karasdb_uuid,
	udb.value AS userdb_uuid
FROM karasdb.settings AS db,
	settings AS udb
WHERE db.option = 'uuid'
	AND udb.option = 'uuid'
`;

export const updateUUID = `
UPDATE settings
	SET value = $uuid
WHERE option = 'uuid'
`;

export const getStats = `SELECT
(SELECT COUNT(pk_id_tag) FROM karasdb.tag WHERE tagtype=2) AS singers,
(SELECT COUNT(pk_id_tag) FROM karasdb.tag WHERE tagtype=8) AS songwriters,
(SELECT COUNT(pk_id_tag) FROM karasdb.tag WHERE tagtype=4) AS creators,
(SELECT COUNT(pk_id_tag) FROM karasdb.tag WHERE tagtype=6) AS authors,
(SELECT COUNT(pk_id_viewcount) FROM viewcount) AS played,
(SELECT COUNT(pk_id_kara) FROM karasdb.kara) AS karas,
(SELECT COUNT(pk_id_tag) FROM karasdb.tag WHERE tagtype = 5) AS languages,
(SELECT COUNT(pk_id_playlist) FROM playlist WHERE flag_favorites = 0) AS playlists,
(SELECT COUNT(pk_id_serie) FROM karasdb.serie) AS series,
(SELECT SUM(duration) FROM karasdb.kara) AS duration;
`;
