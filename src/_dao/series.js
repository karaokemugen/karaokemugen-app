import {langSelector, buildClausesSeries, getUserDb} from './database';
import deburr from 'lodash.deburr';
const sql = require('../_common/db/series');

export async function selectAllSeries(lang, filter) {

	const filterClauses = filter ? buildClausesSeries(filter) : [];	
	const query = sql.getSeries(filterClauses, langSelector(lang));

	let series = await getUserDb().all(query);
	series.forEach((serie, i) => {
		if (!series[i].aliases) series[i].aliases = [];
		if (!Array.isArray(series[i].aliases)) series[i].aliases = series[i].aliases.split(',');
		series[i].i18n = JSON.parse(serie.i18n);
	});
	return series;
}

export async function selectSerieByName(name) {
	return await getUserDb().get(sql.getSerieByName, {$name: name});
}

export async function insertSerie(seriesObj) {
	let aliases;
	Array.isArray(seriesObj.aliases) ? aliases = seriesObj.aliases.join(',') : aliases = null;
	const res = await getUserDb().run(sql.insertSerie, {
		$name: seriesObj.name,
		$NORM_name: deburr(seriesObj.name),
		$altname: aliases,
		$NORM_altname: deburr(aliases)
	});
	return res.lastID;
}

export async function insertSeriei18n(seriesObj) {	
	for (const lang of Object.keys(seriesObj.i18n)) {
		await getUserDb().run(sql.insertSeriei18n, {
			$id_serie: seriesObj.serie_id,
			$lang: lang,
			$name: seriesObj.i18n[lang],
			$NORM_name: deburr(seriesObj.i18n[lang])
		});	
	}
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

export async function selectSerie(serie_id, lang) {
	const query = sql.getSerieByID(langSelector(lang));
	let series = await getUserDb().get(query, {$serie_id: serie_id});
	series.i18n = JSON.parse(series.i18n);	
	if (!series.aliases) series.aliases = [];
	if (!Array.isArray(series.aliases)) series.aliases = series.aliases.split(',');
	return series;
}

export async function removeSerie(serie_id) {
	return await Promise.all([
		getUserDb().run(sql.deleteSeries, {$serie_id: serie_id}),
		getUserDb().run(sql.deleteSeriesi18n, {$serie_id: serie_id})
	]);
}