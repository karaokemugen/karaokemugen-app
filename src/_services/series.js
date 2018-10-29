import {removeSeriesFile, writeSeriesFile, getDataFromSeriesFile} from '../_dao/seriesfile';
import {selectSeriesBySID, selectSeriesKaraByKaraID, insertSeriei18n, removeSerie, updateSerie, insertSerie, selectSerieByName, selectSerie, selectAllSeries} from '../_dao/series';
import {profile} from '../_common/utils/logger';
import {removeSerieInKaras, replaceSerieInKaras} from '../_dao/karafile';
import { compareKarasChecksum } from '../_admin/generate_karasdb';
import uuidV4 from 'uuid/v4';
import { sanitizeFile } from '../_common/utils/files';

export async function getSeries(filter, lang, from = 0, size = 99999999999) {
	profile('getSeries');
	const series = await selectAllSeries(filter, lang);
	const ret = formatSeriesList(series.slice(from, from + size), from, series.length);
	profile('getSeries');
	return ret;
}

export async function findSeriesKaraByKaraID(kara_id) {
	return await selectSeriesKaraByKaraID(kara_id);
}

export async function findSeriesBySID(sid) {
	return await selectSeriesBySID(sid);
}

export function formatSeriesList(seriesList, from, count) {
	return {
		infos: {
			count: count,
			from: from,
			to: from + seriesList.length
		},
		content: seriesList
	};
}

export async function getSerie(serie_id) {
	const serie = await selectSerie(serie_id);
	if (!serie) throw 'Series ID unknown';
	return serie;
}

export async function deleteSerie(serie_id) {
	const serie = await getSerie(serie_id);
	if (!serie) throw 'Series ID unknown';
	await removeSeriesFile(serie.name);
	await removeSerieInKaras(serie.name);
	await removeSerie(serie_id);
	compareKarasChecksum({silent: true});
}

export async function getOrAddSerieID(serieObj) {
	const series = await selectSerieByName(serieObj.name);
	if (series) return series.serie_id;
	//Series does not exist, create it.
	const id = await addSerie(serieObj);
	return id;
}

export async function integrateSeriesFile(file) {
	const seriesFileData = await getDataFromSeriesFile(file);
	const seriesDBData = await findSeriesBySID(seriesFileData.sid);
	if (seriesDBData) {
		await editSerie(seriesDBData.serie_id, seriesFileData);
	} else {
		await addSerie(seriesFileData);
	}
}

export async function addSerie(serieObj) {
	if (await selectSerieByName(serieObj.name)) throw 'Series original name already exists';
	if (!serieObj.sid) serieObj.sid = uuidV4();
	if (!serieObj.seriefile) serieObj.seriefile = sanitizeFile(serieObj.name) + '.series.json';
	const newSerieID = await insertSerie(serieObj);
	await Promise.all([
		insertSeriei18n(newSerieID, serieObj),
		writeSeriesFile(serieObj)
	]);
	compareKarasChecksum({silent: true});
	return newSerieID;
}

export async function editSerie(serie_id,serieObj) {
	const oldSerie = await getSerie(serie_id);
	if (!oldSerie) throw 'Series ID unknown';
	if (oldSerie.name !== serieObj.name) await replaceSerieInKaras(oldSerie.name, serieObj.name);
	serieObj.seriefile = sanitizeFile(serieObj.name) + '.series.json';
	await Promise.all([
		updateSerie(serie_id, serieObj),
		writeSeriesFile(serieObj)
	]);
	compareKarasChecksum({silent: true});
}