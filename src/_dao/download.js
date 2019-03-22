import {db, transaction} from './database';
const sql = require('./sql/download');

export async function insertDownloads(downloads) {
	const dls = downloads.map(dl => [
		dl.name,
		dl.urls,
		dl.size,
		'DL_PLANNED',
		dl.uuid
	]);
	return await transaction([{sql: sql.insertDownload, params: dls}]);
}

export async function selectDownloads() {
	const dls = await db().query(sql.selectDownloads);
	return dls.rows;
}

export async function selectPendingDownloads() {
	const dls = await db().query(sql.selectPendingDownloads);
	return dls.rows;
}

export async function initDownloads() {
	await db().query(sql.updateRunningDownloads);
	await db().query(sql.deleteDoneFailedDownloads);
}

export async function selectDownload(id) {
	const dl = await db().query(sql.selectDownload, [id]);
	return dl.rows[0];
}

export async function deleteDownload(id) {
	return await db().query(sql.deleteDownload, [id]);
}

export async function updateDownload(uuid, status) {
	return await db().query(sql.updateDownloadStatus, [
		status,
		uuid
	]);
}

export async function emptyDownload() {
	return await db().query(sql.emptyDownload);
}