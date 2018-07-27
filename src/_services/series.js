import {writeSeriesFile} from '../_dao/seriesfile';
import {insertSeriei18n, removeSerie, updateSerie, insertSerie, selectSerieByName, selectSerie, selectAllSeries} from '../_dao/series';
import {removeSerieInKaras, replaceSerieInKaras} from '../_dao/karafile';

async function updateSeriesFile() {
	const series = await getSeries();
	for (const i in series) {
		delete series[i].i18n_name;
		delete series[i].serie_id;
	}
	await writeSeriesFile(series);
}

export async function getSeries(filter, lang) {
	return await selectAllSeries(filter, lang);
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
	await removeSerieInKaras(serie.name);
	await removeSerie(serie_id);
	await updateSeriesFile();
}

export async function getOrAddSerieID(serieObj) {
	const series = await selectSerieByName(serieObj.name);
	if (series) return series.serie_id;
	//Series does not exist, create it.
	const id = await addSerie(serieObj);
	await updateSeriesFile();
	return id;
}

export async function addSerie(serieObj) {
	if (await selectSerieByName(serieObj.name)) throw 'Series original name already exists';
	const newSerieID = await insertSerie(serieObj);
	serieObj.serie_id = newSerieID;
	await insertSeriei18n(serieObj);
	await updateSeriesFile();
	return newSerieID;
}

export async function editSerie(serie_id,serieObj) {
	const oldSerie = await getSerie(serie_id);
	if (!oldSerie) throw 'Series ID unknown';
	await replaceSerieInKaras(oldSerie.name, serieObj.name);
	await updateSerie(serie_id, serieObj);
	await updateSeriesFile();

}