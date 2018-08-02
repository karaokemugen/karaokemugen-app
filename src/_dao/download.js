import {getUserDb, transaction} from './database';
const sql = require('../_common/db/download');

export async function insertDownload(downloads) {
	const dls = downloads.map((dl) => ({
		$name: dl.name,
		$status: 'DL_PLANNED',
		$size: dl.size,
		$urls: JSON.stringify(dl.urls),
		$uuid: dl.uuid,
	}));
	return await transaction(dls, sql.insertDownload);
}

export async function selectDownloads() {
	return await getUserDb().all(sql.selectDownloads);
}

export async function initDownloads() {
	await getUserDb().run(sql.updateRunningDownloads);
	await getUserDb().run(sql.deleteDoneFailedDownloads);
}

export async function selectDownload(id) {
	return await getUserDb().get(sql.selectDownload, {$id: id});
}

export async function deleteDownload(id) {
	return await getUserDb().run(sql.deleteDownload, {$id: id});
}

export async function updateDownload(uuid, status) {
	return await getUserDb().run(sql.updateDownload, {
		$uuid: uuid,
		$status: status
	});
}

export async function emptyDownload() {
	return await getUserDb().run(sql.emptyDownload);
}