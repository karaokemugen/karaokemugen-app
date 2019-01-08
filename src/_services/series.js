import {removeSeriesFile, writeSeriesFile} from '../_dao/seriesfile';
import {insertSeriei18n, removeSerie, updateSerie, insertSerie, selectSerieByName, selectSerie, selectAllSeries} from '../_dao/series';
import {profile} from '../_common/utils/logger';
import {removeSerieInKaras, replaceSerieInKaras} from '../_dao/karafile';
import uuidV4 from 'uuid/v4';
import { sanitizeFile } from '../_common/utils/files';

export async function getSeries(filter, lang, from = 0, size = 99999999999) {
	profile('getSeries');
	const series = await selectAllSeries(filter, lang);
	const ret = formatSeriesList(series.slice(from, from + size), from, series.length);
	profile('getSeries');
	return ret;
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
	//Not removing from database, a regeneration will do the trick.
	const serie = await getSerie(serie_id);
	if (!serie) throw 'Series ID unknown';
	await removeSeriesFile(serie.name);
	await removeSerieInKaras(serie.name);
	await removeSerie(serie_id);
}

export async function getOrAddSerieID(serieObj) {
	const series = await selectSerieByName(serieObj.name);
	if (series) return series.serie_id;
	//Series does not exist, create it.
	const id = await addSerie(serieObj);
	return id;
}

export async function addSerie(serieObj) {
	if (serieObj.name.includes(',')) throw 'Commas not allowed in series name';
	if (await selectSerieByName(serieObj.name)) throw 'Series original name already exists';
	serieObj.sid = uuidV4();
	serieObj.seriefile = sanitizeFile(serieObj.name) + '.series.json';
	const newSerieID = await insertSerie(serieObj);
	await Promise.all([
		insertSeriei18n(newSerieID, serieObj),
		writeSeriesFile(serieObj)
	]);
	return newSerieID;
}

export async function editSerie(serie_id,serieObj) {
	const oldSerie = await getSerie(serie_id);
	if (!oldSerie) throw 'Series ID unknown';
	if (serieObj.name.includes(',')) throw 'Commas not allowed in series name';
	if (oldSerie.name !== serieObj.name) {
		await replaceSerieInKaras(oldSerie.name, serieObj.name);
		await removeSeriesFile(oldSerie.name);
	}
	serieObj.seriefile = sanitizeFile(serieObj.name) + '.series.json';
	return Promise.all([
		updateSerie(serie_id, serieObj),
		writeSeriesFile(serieObj)
	]);
}