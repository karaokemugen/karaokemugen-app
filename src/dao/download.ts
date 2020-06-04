import {db, transaction} from '../lib/dao/database';
import logger from '../lib/utils/logger';
import { DBDownload, DBDownloadBLC } from '../types/database/download';
import { KaraDownload, KaraDownloadBLC } from '../types/download';
const sql = require('./sql/download');

export function insertDownloads(downloads: KaraDownload[] ) {
	const dls = downloads.map(dl => [
		dl.name,
		dl.urls,
		dl.size,
		'DL_PLANNED',
		dl.uuid,
		dl.repository,
		dl.kid
	]);
	logger.debug('[Download DAO] Running transaction');
	return transaction([{sql: sql.insertDownload, params: dls}]);
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

export function updateDownload(uuid: string, status: string) {
	return db().query(sql.updateDownloadStatus, [
		status,
		uuid
	]);
}

export function emptyDownload() {
	return db().query(sql.emptyDownload);
}

export async function selectDownloadBLC(): Promise<DBDownloadBLC[]> {
	const res = await db().query(sql.selectDownloadBLC);
	return res.rows;
}

export function deleteDownloadBLC(id: number) {
	return db().query(sql.deleteDownloadBLC, [id]);
}

export function insertDownloadBLC(blc: KaraDownloadBLC) {
	return db().query(sql.insertDownloadBLC, [blc.type, blc.value]);
}