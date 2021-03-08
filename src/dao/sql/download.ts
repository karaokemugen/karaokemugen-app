export const sqlselectDownloads = `
SELECT name,
	size,
	status,
	pk_uuid as uuid,
	started_at,
	repository,
	kid
FROM download
ORDER BY started_at DESC
`;

export const sqlselectPendingDownloads = `
SELECT name,
	size,
	status,
	pk_uuid as uuid,
	started_at,
	repository,
	kid
FROM download
WHERE status = 'DL_PLANNED'
ORDER BY started_at DESC
`;

export const sqlupdateRunningDownloads = `
UPDATE download
SET status = 'DL_PLANNED'
WHERE status = 'DL_RUNNING'
`;

export const sqldeleteDoneFailedDownloads = `
DELETE FROM download
WHERE status = 'DL_DONE' OR status = 'DL_FAILED'
`;

export const sqlinsertDownload = `
INSERT INTO download(
	name,
	size,
	status,
	pk_uuid,
	repository,
	kid
) VALUES(
	$1,
	$2,
	$3,
	$4,
	$5,
	$6)
`;

export const sqlupdateDownloadStatus = `
UPDATE download
SET status = $1
WHERE pk_uuid = $2
`;

export const sqlemptyDownload = 'TRUNCATE download CASCADE';

export const sqlselectDownloadBLC = `
SELECT
	pk_id_dl_blcriteria AS dlBLC_id,
	type,
	value
FROM download_blacklist_criteria
`;

export const sqldeleteDownloadBLC = `
DELETE FROM download_blacklist_criteria
WHERE pk_id_dl_blcriteria = $1;
`;

export const sqlinsertDownloadBLC = `
INSERT INTO download_blacklist_criteria(
	type,
	value
) VALUES($1, $2)
`;
