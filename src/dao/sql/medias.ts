export const sqlselectMedias = `
SELECT type,
	filename,
	size,
	audiogain
FROM pl_medias
ORDER BY type, filename
`;

export const sqlinsertMedia = `
INSERT INTO pl_medias(type, filename, size, audiogain) VALUES(
	$1,
	$2,
	$3,
	$4
) ON CONFLICT(type, filename) DO UPDATE SET size = $3, audiogain = $4 WHERE pl_medias.type = $1 AND pl_medias.filename = $2
`;

export const sqldeleteMedia = `
DELETE FROM pl_medias WHERE type = $1 AND filename = $2
`;

