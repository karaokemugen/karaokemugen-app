// SQL for Downloads

export const selectDownloads = 'SELECT pk_id_download, name, urls, size, status, uuid FROM download ORDER BY pk_id_download';

export const selectPendingDownloads = 'SELECT pk_id_download, name, urls, size, status, uuid FROM download WHERE status = "DL_PLANNED" ORDER BY pk_id_download';

export const selectDownload = 'SELECT pk_id_download, name, urls, size, status, uuid FROM download WHERE pk_id_download = $id';

export const updateRunningDownloads = 'UPDATE download SET status = \'DL_PLANNED\' WHERE status = \'DL_RUNNING\'';

export const deleteDoneFailedDownloads = 'DELETE FROM download WHERE status = \'DL_DONE\' OR status = \'DL_FAILED\'';

export const insertDownload = 'INSERT INTO download(name, urls, size, status, uuid) VALUES($name, $urls, $size, $status, $uuid)';

export const updateDownloadStatus = 'UPDATE download SET status = $status WHERE uuid = $uuid';

export const deleteDownload = 'DELETE FROM download WHERE pk_id_download = $id';

export const emptyDownload = 'DELETE FROM download';
