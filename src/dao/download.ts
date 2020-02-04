import {db, transaction} from '../lib/dao/database';
import { KaraDownload, KaraDownloadBLC } from '../types/download';
import { DBDownload, DBDownloadBLC } from '../types/database/download';
const sql = require('./sql/download');

export async function insertDownloads(downloads: KaraDownload[] ) {
	const dls = downloads.map(dl => [
		dl.name,
		dl.urls,
		dl.size,
		'DL_PLANNED',
		dl.uuid,
		dl.kid
	]);
	return await transaction([{sql: sql.insertDownload, params: dls}]);
}

export async function selectDownloads(): Promise<DBDownload[]> {
	const dls = await db().query(sql.selectDownloads);
	return dls.rows;
}

export async function selectPendingDownloads(): Promise<DBDownload[]> {
	const dls = await db().query(sql.selectPendingDownloads);
	return dls.rows;
}

export async function initDownloads() {
	await db().query(sql.updateRunningDownloads);
	await db().query(sql.deleteDoneFailedDownloads);
}

export async function selectDownload(id: string): Promise<DBDownload> {
	const dl = await db().query(sql.selectDownload, [id]);
	return dl.rows[0];
}

export async function deleteDownload(id: string) {
	return await db().query(sql.deleteDownload, [id]);
}

export async function updateDownload(uuid: string, status: string) {
	return await db().query(sql.updateDownloadStatus, [
		status,
		uuid
	]);
}

export async function emptyDownload() {
	return await db().query(sql.emptyDownload);
}

export async function selectDownloadBLC(): Promise<DBDownloadBLC[]> {
	const res = await db().query(sql.selectDownloadBLC);
	return res.rows;
}

export async function truncateDownloadBLC() {
	return await db().query(sql.truncateDownloadBLC);
}

export async function deleteDownloadBLC(id: number) {
	return await db().query(sql.deleteDownloadBLC, [id]);
}

export async function insertDownloadBLC(blc: KaraDownloadBLC) {
	return await db().query(sql.insertDownloadBLC, [blc.type, blc.value]);
}