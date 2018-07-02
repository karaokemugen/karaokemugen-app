import {writeSeriesFile, addSeriesData, editSeriesData, readSeriesFile, deleteSeriesData} from '../_dao/seriesfile';
import {insertSeriei18n, editSerie, insertSerie, selectSerieByName, selectSerie, selectAllSeries} from '../_dao/series';

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
	await deleteSeriesFile(serie.name);
}

async function deleteSeriesFile(name) {
	let seriesData = await readSeriesFile();					
	seriesData = await deleteSeriesData(name, seriesData);
	await writeSeriesFile(seriesData);
}

export async function getOrAddSerieID(seriesObj) {
	const series = await selectSerieByName(seriesObj);		
	if (series) return series.serie_id;
	//Series does not exist, create it.
	return await addSeriesDB(seriesObj);
}

async function addSeriesDB(seriesObj) {
	const newSerie = await insertSerie(seriesObj);
	newSerie.serie_id = newSerie.lastID;
	await insertSeriei18n(seriesObj);
	return newSerie.lastID;
}

export async function addSeries(seriesObj) {
	return await Promise.all([
		addSeriesFile(seriesObj),
		addSeriesDB(seriesObj)
	]);
}

export async function editSeries(serie_id,seriesObj) {
	const serie = await getSerie(serie_id);		
	if (!serie) throw 'Series ID unknown';
	
	return await Promise.all([
		editSeriesFile(serie.name,seriesObj),
		editSeriesDB(serie_id,seriesObj)
	]);
}

async function editSeriesFile(name, serieObj) {
	await deleteSeriesFile(name);
	await addSeriesFile(serieObj);
}

async function editSeriesDB(serie_id, serieObj) {
	return await editSerie(serie_id, serieObj);
}

export async function addSeriesFile(seriesObj) {
	let seriesData = await readSeriesFile();				
	seriesData = addSeriesData(seriesObj, seriesData);				
	await writeSeriesFile(seriesData);	
}
