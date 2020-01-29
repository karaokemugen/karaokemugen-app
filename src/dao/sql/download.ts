export const selectDownloads = `
SELECT name,
	urls,
	size,
	status,
	pk_uuid as uuid,
	started_at,
	repository
FROM download
ORDER BY started_at DESC
`;

export const selectPendingDownloads = `
SELECT name,
	urls,
	size,
	status,
	pk_uuid as uuid,
	started_at,
	repository
FROM download
WHERE status = 'DL_PLANNED'
ORDER BY started_at DESC
`;

export const selectDownload = `
SELECT name,
	urls,
	size,
	status,
	pk_uuid as uuid,
	started_at,
	repository
FROM download
WHERE pk_uuid = $1
`;

export const updateRunningDownloads = `
UPDATE download
SET status = 'DL_PLANNED'
WHERE status = 'DL_RUNNING'
`;

export const deleteDoneFailedDownloads = `
DELETE FROM download
WHERE status = 'DL_DONE' OR status = 'DL_FAILED'
`;

export const insertDownload = `
INSERT INTO download(
	name,
	urls,
	size,
	status,
	pk_uuid,
	repository
) VALUES(
	$1,
	$2,
	$3,
	$4,
	$5,
	$6)
`;

export const updateDownloadStatus = `
UPDATE download
SET status = $1
WHERE pk_uuid = $2
`;

export const deleteDownload = `
DELETE FROM download
WHERE pk_uuid = $1
`;

export const emptyDownload = 'TRUNCATE download CASCADE';

export const selectDownloadBLC = `
SELECT
	pk_id_dl_blcriteria AS dlBLC_id,
	type,
	value
FROM download_blacklist_criteria
`;

export const deleteDownloadBLC = `
DELETE FROM download_blacklist_criteria
WHERE pk_id_dl_blcriteria = $1;
`;

export const truncateDownloadBLC = `
TRUNCATE download_blacklist_criteria RESTART IDENTITY;
`;

export const insertDownloadBLC = `
INSERT INTO download_blacklist_criteria(
	type,
	value
) VALUES($1, $2)
`;
