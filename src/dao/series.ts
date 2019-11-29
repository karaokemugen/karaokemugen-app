import {langSelector, paramWords, db} from '../lib/dao/database';
import {pg as yesql} from 'yesql';
import { KaraParams } from '../lib/types/kara';
import { Series } from '../lib/types/series';
import { WhereClause } from '../types/database';
import { DBSeries } from '../types/database/series';

const sql = require('./sql/series');

export function buildClausesSeries(words: string): WhereClause {
	const params = paramWords(words);
	let sql = [];
	for (const word of Object.keys(params)) {
		sql.push(` (lower(unaccent(aseries.name)) LIKE :${word}
				OR lower(unaccent(aseries.search)) LIKE :${word}
		 		OR lower(unaccent(aseries.search_aliases)) LIKE :${word})`
		);
	}
	return {
		sql: sql,
		params: params
	};
}

export async function selectAllSeries(params: KaraParams): Promise<DBSeries[]> {

	const filterClauses = params.filter ? buildClausesSeries(params.filter) : {sql: [], params: {}};
	let offsetClause = '';
	let limitClause = '';
	//Disabled until frontend manages this
	//if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	//if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	const query = sql.getSeries(filterClauses.sql, langSelector(params.lang, -1, {main: null, fallback: null}, true), limitClause, offsetClause);
	const q = yesql(query)(filterClauses.params);
	const series = await db().query(q);
	for (const i in series.rows) {
		delete series.rows[i].search;
		delete series.rows[i].search_aliases;
	}
	return series.rows;
}

export async function selectSerieByName(name: string): Promise<DBSeries> {
	const res = await db().query(yesql(sql.getSeriesByName)({
		name: name
	}));
	return res.rows[0];
}

export async function insertSerie(serieObj: Series) {
	await db().query(yesql(sql.insertSerie)({
		name: serieObj.name,
		aliases: JSON.stringify(serieObj.aliases || []),
		sid: serieObj.sid,
		seriefile: serieObj.seriefile
	}));
}

export async function insertSeriei18n(serieObj: Series) {
	for (const lang of Object.keys(serieObj.i18n)) {
		await db().query(yesql(sql.insertSeriei18n)({
			sid: serieObj.sid,
			lang: lang,
			name: serieObj.i18n[lang]
		}));
	}
}

export async function updateSerie(serie: Series) {
	await db().query(yesql(sql.updateSerie)({
		sid: serie.sid,
		name: serie.name,
		aliases: JSON.stringify(serie.aliases || []),
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

export async function testSerie(sid: string): Promise<Series> {
	const serie = await db().query(sql.testSerie, [sid]);
	if (serie.rows.length > 0) return serie.rows[0];
	return null;
}

export async function selectSerie(sid: string, lang?: string): Promise<Series> {
	const query = sql.getSerieByID(langSelector(lang, -1, {main: null, fallback: null}, true));
	const series = await db().query(query, [sid]);
	return series.rows[0];
}

export async function removeSerie(sid: string) {
	await db().query(sql.deleteSeries, [sid]);
}