import {langSelector, paramWords, db} from './database';
import {pg as yesql} from 'yesql';

const sql = require('./sql/series');

export async function refreshSeries() {
	return await db().query('REFRESH MATERIALIZED VIEW all_series');
}

export function buildClausesSeries(words) {
	const params = paramWords(words);
	let sql = [];
	for (const i in words.split(' ').filter(s => !('' === s))) {
		sql.push(`lower(unaccent(as.search)) LIKE :word${i}`);
	}
	return {
		sql: sql,
		params: params
	};
}

export async function selectAllSeries(filter, lang, from, size) {

	const filterClauses = filter ? buildClausesSeries(filter) : {sql: [], params: {}};
	let offsetClause = '';
	let limitClause = '';
	//Disabled until frontend manages this
	//if (from && from > 0) offsetClause = `OFFSET ${from} `;
	//if (size && size > 0) limitClause = `LIMIT ${size} `;
	const query = sql.getSeries(filterClauses.sql, langSelector(lang), limitClause, offsetClause);
	const q = yesql(query)(filterClauses.params);
	const series = await db().query(q);
	for (const i in series.rows) {
		delete series.rows[i].search;
	}
	return series.rows;
}

export async function selectSerieByName(name) {
	return await db().query(yesql(sql.getSerieByName)({$name: name}));
}

export async function insertSerie(serieObj) {
	let aliases;
	Array.isArray(serieObj.aliases) ? aliases = serieObj.aliases.join(',') : aliases = null;
	const res = await db().query(yesql(sql.insertSerie)({
		name: serieObj.name,
		aliases: aliases,
		sid: serieObj.sid,
		seriefile: serieObj.seriefile
	}));
	await refreshSeries();
	return res.rows[0].pk_id_serie;
}

export async function insertSeriei18n(serie_id, serieObj) {
	for (const lang of Object.keys(serieObj.i18n)) {
		await db().query(yesql(sql.insertSeriei18n)({
			id_serie: serie_id,
			lang: lang,
			name: serieObj.i18n[lang]
		}));
	}
	await refreshSeries();
}

export async function updateSerie(serie_id, serie) {
	let aliases;
	Array.isArray(serie.aliases) ? aliases = serie.aliases.join(',') : aliases = null;
	await db().query(yesql(sql.updateSerie)({
		serie_id: serie_id,
		name: serie.name,
		aliases: aliases,
		seriefile: serie.seriefile
	}));
	await db().query(sql.deleteSeriesi18n, [serie_id]);
	await refreshSeries();
	return await insertSeriei18n(serie_id, serie);
}

export async function updateKaraSeries(kara_id, series) {
	await db().query(sql.deleteSeriesByKara, [kara_id]);
	for (const serie of series) {
		await db().query(yesql(sql.insertKaraSeries)({
			kara_id: kara_id,
			serie_id: serie
		}));
	}
}

export async function selectSerie(serie_id, lang) {
	const query = sql.getSerieByID(langSelector(lang));
	const series = await db().query(query, [serie_id]);
	return series.rows[0];
}

export async function removeSerie(serie_id) {
	return await Promise.all([
		db().query(sql.deleteSeries, [serie_id]),
		db().query(sql.deleteSeriesi18n, [serie_id])
	]);
}