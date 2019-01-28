import {db, transaction, langSelector, buildClauses} from './database';
import {pg as yesql} from 'yesql';
const sql = require('./sql/favorites');

export async function selectFavorites(filter, lang, from = 0, size = 0, username) {
	const filterClauses = filter ? buildClauses(filter) : {sql: [], params: {}};
	filterClauses.params.username = username;
	let limitClause = '';
	let offsetClause = '';
	//Disabled until frontend manages this
	//if (from > 0) offsetClause = `OFFSET ${from} `;
	//if (size > 0) limitClause = `LIMIT ${size} `;
	const query = sql.getFavorites(filterClauses.sql, langSelector(lang), limitClause, offsetClause);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

export async function removeAllFavorites(username) {
	return await db().query(sql.emptyFavorites, [username]);
}

export async function removeFavorites(fList, username) {
	const karas = fList.map((kara) => ([
		kara,
		username
	]));
	return await transaction([{params: karas, sql: sql.removeFavorites}]);
}

export async function insertFavorites(karaList, username) {
	const karas = karaList.map((kara) => ([
		kara,
		username
	]));
	return await transaction([{params: karas, sql: sql.insertFavorites}]);
}

