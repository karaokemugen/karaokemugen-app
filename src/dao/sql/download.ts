export const sqlselectDownloads = (pending: boolean) => `
SELECT name,
	size,
	status,
	pk_uuid as uuid,
	started_at,
	repository,
	mediafile,
	fk_kid AS kid
FROM download
${pending ? "WHERE status = 'DL_PLANNED'" : ''}
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

export const sqlsetDownloaded = `
UPDATE kara SET download_status = $1
`;

export const sqlsetDownloadedAK = `
UPDATE all_karas SET download_status = $1
`;

export const sqlinsertDownload = `
INSERT INTO download(
	name,
	size,
	status,
	pk_uuid,
	repository,
	mediafile,
	fk_kid
) VALUES(
	$1,
	$2,
	$3,
	$4,
	$5,
	$6,
	$7)
`;

export const sqlupdateDownloadStatus = `
UPDATE download
SET status = $1
WHERE pk_uuid = $2
`;

export const sqlemptyDownload = 'TRUNCATE download CASCADE';
