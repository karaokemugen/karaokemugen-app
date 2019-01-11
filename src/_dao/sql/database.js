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

export const getStats = 'SELECT * FROM stats;';
