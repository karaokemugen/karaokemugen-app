import {db, transaction} from '../lib/dao/database';
import logger from '../lib/utils/logger';
import { DBDownload, DBDownloadBLC } from '../types/database/download';
import { KaraDownload, KaraDownloadBLC } from '../types/download';
import { sqldeleteDoneFailedDownloads, sqldeleteDownloadBLC, sqlemptyDownload, sqlinsertDownload, sqlinsertDownloadBLC,sqlselectDownload, sqlselectDownloadBLC, sqlselectDownloads, sqlselectPendingDownloads, sqlupdateDownloadStatus, sqlupdateRunningDownloads } from './sql/download';

export function insertDownloads(downloads: KaraDownload[] ) {
	const dls = downloads.map(dl => [
		dl.name,
		dl.size,
		'DL_PLANNED',
		dl.uuid,
		dl.repository,
		dl.kid
	]);
	logger.debug('[Download DAO] Running transaction');
	return transaction({sql: sqlinsertDownload, params: dls});
}

export async function selectDownloads(): Promise<DBDownload[]> {
	const dls = await db().query(sqlselectDownloads);
	return dls.rows;
}

export async function selectPendingDownloads(): Promise<DBDownload[]> {
	const dls = await db().query(sqlselectPendingDownloads);
	return dls.rows;
}

export async function initDownloads() {
	await db().query(sqlupdateRunningDownloads);
	await db().query(sqldeleteDoneFailedDownloads);
}

export async function selectDownload(id: string): Promise<DBDownload> {
	const dl = await db().query(sqlselectDownload, [id]);
	return dl.rows[0];
}

export function updateDownload(uuid: string, status: string) {
	return db().query(sqlupdateDownloadStatus, [
		status,
		uuid
	]);
}

export function emptyDownload() {
	return db().query(sqlemptyDownload);
}

export async function selectDownloadBLC(): Promise<DBDownloadBLC[]> {
	const res = await db().query(sqlselectDownloadBLC);
	return res.rows;
}

export function deleteDownloadBLC(id: number) {
	return db().query(sqldeleteDownloadBLC, [id]);
}

export function insertDownloadBLC(blc: KaraDownloadBLC) {
	return db().query(sqlinsertDownloadBLC, [blc.type, blc.value]);
}