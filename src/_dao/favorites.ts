import {db, transaction, langSelector, buildClauses} from './database';
import {pg as yesql} from 'yesql';
import { FavParams } from '../_types/favorites';
const sql = require('./sql/favorites');

interface Filter {
	sql: any[],
	params: {
		username?: string
	}
}

export async function selectFavorites(params: FavParams) {
	const filterClauses: Filter = params.filter ? buildClauses(params.filter) : {sql: [], params: {}};
	filterClauses.params.username = params.username;
	let limitClause = '';
	let offsetClause = '';
	//Disabled until frontend manages this
	//if (from > 0) offsetClause = `OFFSET ${from} `;
	//if (size > 0) limitClause = `LIMIT ${size} `;
	const query = sql.getFavorites(filterClauses.sql, langSelector(params.lang), limitClause, offsetClause);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

export async function removeAllFavorites(username: string) {
	return await db().query(sql.emptyFavorites, [username]);
}

export async function removeFavorites(fList: string[], username: string) {
	const karas = fList.map(kara => ([
		kara,
		username
	]));
	return await transaction([{params: karas, sql: sql.removeFavorites}]);
}

export async function insertFavorites(karaList: string[], username: string) {
	const karas = karaList.map(kara => ([
		kara,
		username
	]));
	return await transaction([{params: karas, sql: sql.insertFavorites}]);
}

