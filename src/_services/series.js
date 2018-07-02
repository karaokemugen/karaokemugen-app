import {writeSeriesFile} from '../_dao/seriesfile';
import {insertSeriei18n, removeSeries, editSerie, insertSerie, selectSerieByName, selectSerie, selectAllSeries} from '../_dao/series';

async function updateSeriesFile() {
	const series = getSeries();
	for (const i in series) delete series[i].i18n_name;
	await writeSeriesFile(series);	
}

export async function getSeries(lang, filter) {
	return await selectAllSeries(lang, filter);
}

export async function getSerie(serie_id) {
	const serie = await selectSerie(serie_id);
	if (!serie) throw 'Series ID unknown';
	return serie;
}

export async function deleteSerie(serie_id) {
	//Not removing from database, a regeneration will do the trick.
	const serie = await selectSerie(serie_id);
	if (!serie) throw 'Series ID unknown';
	await removeSeries(serie_id);
	await updateSeriesFile();
}

export async function getOrAddSerieID(seriesObj) {
	const series = await selectSerieByName(seriesObj);		
	if (series) return series.serie_id;
	//Series does not exist, create it.
	return await addSeries(seriesObj);
}

export async function addSeries(seriesObj) {
	const newSerie = await insertSerie(seriesObj);
	newSerie.serie_id = newSerie.lastID;
	await insertSeriei18n(seriesObj);
	await updateSeriesFile();
	return newSerie.lastID;
}

export async function editSeries(serie_id,serieObj) {
	const serie = await getSerie(serie_id);		
	if (!serie) throw 'Series ID unknown';
	await editSerie(serie_id, serieObj);
	await updateSeriesFile();	
}