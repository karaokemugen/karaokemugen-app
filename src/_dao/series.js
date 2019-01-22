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
		sql.push(`lower(unaccent(as.search_aliases)) LIKE :word${i}`);
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
		delete series.rows[i].search_aliases;
	}
	return series.rows;
}

export async function insertSerie(serieObj) {
	let aliases;
	Array.isArray(serieObj.aliases) ? aliases = serieObj.aliases.join(',') : aliases = null;
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
	await db().query(yesql(sql.updateSerie)({
		sid: serie.sid,
		name: serie.name,
		aliases: aliases,
		seriefile: serie.seriefile
	}));
	await db().query(sql.deleteSeriesi18n, [serie.sid]);
	await insertSeriei18n(serie);
}

export async function updateKaraSeries(kid, sids) {
	await db().query(sql.deleteSeriesByKara, [kid]);
	for (const sid of sids) {
		await db().query(yesql(sql.insertKaraSeries)({
			kid: kid,
			sid: sid
		}));
	}
}

export async function selectSerie(sid, lang) {
	const query = sql.getSerieByID(langSelector(lang));
	const series = await db().query(query, [sid]);
	return series.rows[0];
}

export async function removeSerie(sid) {
	await db().query(sql.deleteSeries, [sid]);
}