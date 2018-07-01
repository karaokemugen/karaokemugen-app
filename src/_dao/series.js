import {langSelector, buildClausesSeries, getUserDb} from './database';
import deburr from 'lodash.deburr';
const sql = require('../_common/db/series');

export async function getAllSeries(lang, filter) {

	const filterClauses = filter ? buildClausesSeries(filter) : [];	
	const query = sql.getSeries(filterClauses, langSelector(lang));

	let series = await getUserDb().all(query);
	series.forEach((serie, i) => series[i].i18n_names = JSON.parse(serie.i18n_names))	
	return series;
}

export async function checkOrCreateSerie(serie,lang) {	
	const serieDB = await getUserDb().get(sql.getSerieByName, {
		$name: serie		
	});
	if (serieDB) return serieDB.serie_id;
	//Series does not exist, create it.
	const res = await getUserDb().run(sql.insertSerie, {
		$name: serie,
		$NORM_name: deburr(serie)
	});
	await getUserDb().run(sql.insertSeriei18nDefault, {
		$id_serie: res.lastID,
		$lang: lang,
		$name: serie,
		$NORM_name: deburr(serie)
	});
	return res.lastID;
}

export async function updateKaraSeries(kara_id, series) {
	await getUserDb().run(sql.deleteSeriesByKara, { $kara_id: kara_id });
	for (const serie of series) {
		await getUserDb().run(sql.insertKaraSeries, {
			$kara_id: kara_id,
			$serie_id: serie
		});
	}	
}