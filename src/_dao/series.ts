import {langSelector, paramWords, db} from './database';
import {pg as yesql} from 'yesql';
import {profile} from '../_utils/logger';
import {Serie} from '../_services/series';

const sql = require('./sql/series');

export async function refreshSeries() {
	profile('RefreshSeries');
	await db().query('REFRESH MATERIALIZED VIEW all_series');
	profile('RefreshSeries');
}

export async function refreshKaraSeries() {
	profile('RefreshSeriesi18n');
	await db().query('REFRESH MATERIALIZED VIEW series_i18n');
	profile('RefreshSeriesi18n');
	profile('RefreshKaraSeries');
	await db().query('REFRESH MATERIALIZED VIEW all_kara_series');
	profile('RefreshKaraSeries');
}

export async function refreshKaraSeriesLang() {
	profile('RefreshKaraSeriesLang');
	await db().query('REFRESH MATERIALIZED VIEW all_kara_serie_langs');
	profile('RefreshKaraSeriesLang');
}

export function buildClausesSeries(words) {
	const params = paramWords(words);
	let sql = [];
	for (const i in words.split(' ').filter(s => !('' === s))) {
		sql.push(` (lower(unaccent(aseries.name)) LIKE :word${i}
				OR lower(unaccent(aseries.search)) LIKE :word${i}
		 		OR lower(unaccent(aseries.search_aliases)) LIKE :word${i})`
		);
	}
	return {
		sql: sql,
		params: params
	};
}

export async function selectAllSeries(filter, lang) {
	// from?: number, size?: number

	const filterClauses = filter ? buildClausesSeries(filter) : {sql: [], params: {}};
	let offsetClause = '';
	let limitClause = '';
	//Disabled until frontend manages this
	//if (from && from > 0) offsetClause = `OFFSET ${from} `;
	//if (size && size > 0) limitClause = `LIMIT ${size} `;
	const query = sql.getSeries(filterClauses.sql, langSelector(lang, true), limitClause, offsetClause);
	const q = yesql(query)(filterClauses.params);
	const series = await db().query(q);
	for (const i in series.rows) {
		delete series.rows[i].search;
		delete series.rows[i].search_aliases;
	}
	return series.rows;
}

export async function selectSerieByName(name) {
	const res = await db().query(yesql(sql.getSeriesByName)({
		name: name
	}));
	return res.rows[0];
}

export async function insertSerie(serieObj) {
	let aliases;
	Array.isArray(serieObj.aliases) ? aliases = JSON.stringify(serieObj.aliases) : aliases = null;
	await db().query(yesql(sql.insertSerie)({
		name: serieObj.name,
		aliases: aliases,
		sid: serieObj.sid,
		seriefile: serieObj.seriefile
	}));
}

export async function insertSeriei18n(serieObj) {
	for (const lang of Object.keys(serieObj.i18n)) {
		await db().query(yesql(sql.insertSeriei18n)({
			sid: serieObj.sid,
			lang: lang,
			name: serieObj.i18n[lang]
		}));
	}
}

export async function updateSerie(serie) {
	let aliases;
	Array.isArray(serie.aliases) ? aliases = JSON.stringify(serie.aliases) : aliases = null;
	await db().query(yesql(sql.updateSerie)({
		sid: serie.sid,
		name: serie.name,
		aliases: aliases,
		seriefile: serie.seriefile
	}));
	await db().query(sql.deleteSeriesi18n, [serie.sid]);
	await insertSeriei18n(serie);
}

export async function updateKaraSeries(kid: string, sids: string[]) {
	await db().query(sql.deleteSeriesByKara, [kid]);
	for (const sid of sids) {
		await db().query(yesql(sql.insertKaraSeries)({
			kid: kid,
			sid: sid
		}));
	}
}

export async function selectSerie(sid: string, lang?: string): Promise<Serie> {
	const query = sql.getSerieByID(langSelector(lang, true));
	const series = await db().query(query, [sid]);
	return series.rows[0];
}

export async function removeSerie(sid) {
	await db().query(sql.deleteSeries, [sid]);
}