import {db} from '../lib/dao/database';
import { DBMedia } from '../types/database/medias';
import { sqldeleteMedia,sqlinsertMedia,sqlselectMedias } from './sql/medias';

export async function selectMedias(): Promise<DBMedia[]> {
	const res = await db().query(sqlselectMedias);
	return res.rows;
}

export async function insertMedias(media: DBMedia) {
	await db().query(sqlinsertMedia, [
		media.type,
		media.filename,
		media.size,
		media.audiogain
	]);
}

export async function deleteMedia(type: string, filename: string) {
	await db().query(sqldeleteMedia, [
		type,
		filename
	]);
}