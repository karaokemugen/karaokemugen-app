import {removeSeriesFile, writeSeriesFile} from '../_dao/seriesfile';
import {refreshSeries, insertSeriei18n, removeSerie, updateSerie, insertSerie, selectSerieByName, selectSerie, selectAllSeries, refreshKaraSeries} from '../_dao/series';
import {profile} from '../_utils/logger';
import {removeSerieInKaras, replaceSerieInKaras} from '../_dao/karafile';
import uuidV4 from 'uuid/v4';
import { sanitizeFile } from '../_utils/files';
import { refreshKaras } from '../_dao/kara';
import { compareKarasChecksum } from '../_dao/database';

export async function getSeries(filter, lang, from = 0, size = 99999999999) {
	profile('getSeries');
	const series = await selectAllSeries(filter, lang);
	const ret = formatSeriesList(series.slice(from, from + size), from, series.length);
	profile('getSeries');
	return ret;
}

export async function getOrAddSerieID(serieObj) {
	const serie = await selectSerieByName(serieObj.name);
	if (serie) return serie.sid;
	//Series does not exist, create it.
	return await addSerie(serieObj);
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

export async function getSerie(sid) {
	const serie = await selectSerie(sid);
	if (!serie) throw 'Series ID unknown';
	return serie;
}

export async function deleteSerie(sid) {
	const serie = await getSerie(sid);
	if (!serie) throw 'Series ID unknown';
	await removeSerie(sid);
	await Promise.all([
		refreshSeries(),
		removeSeriesFile(serie.name),
		removeSerieInKaras(serie.name),
	]);
	// Refreshing karas is done asynchronously
	compareKarasChecksum(true);
	refreshKaraSeries().then(refreshKaras());
}

export async function addSerie(serieObj) {
	if (serieObj.name.includes(',')) throw 'Commas not allowed in series name';
	const serie = await selectSerieByName(serieObj.name);
	if (serie) throw 'Series original name already exists';
	if (!serieObj.sid) serieObj.sid = uuidV4();
	if (!serieObj.seriefile) serieObj.seriefile = `${sanitizeFile(serieObj.name)}.series.json`;

	await insertSerie(serieObj),
	await Promise.all([
		insertSeriei18n(serieObj),
		writeSeriesFile(serieObj)
	]);

	compareKarasChecksum(true);
	await refreshSeries();
	refreshKaraSeries().then(refreshKaras());
	return serieObj.sid;
}

export async function editSerie(sid, serieObj) {
	if (serieObj.name.includes(',')) throw 'Commas not allowed in series name';
	const oldSerie = await getSerie(sid);
	if (!oldSerie) throw 'Series ID unknown';
	if (oldSerie.name !== serieObj.name) {
		await replaceSerieInKaras(oldSerie.name, serieObj.name);
		await removeSeriesFile(oldSerie.name);
	}
	serieObj.seriefile = sanitizeFile(serieObj.name) + '.series.json';
	await Promise.all([
		updateSerie(serieObj),
		writeSeriesFile(serieObj)
	]);
	compareKarasChecksum(true);
	await refreshSeries();
	refreshKaraSeries().then(refreshKaras());
}