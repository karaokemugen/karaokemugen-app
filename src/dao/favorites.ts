import {db, transaction, buildClauses} from '../lib/dao/database';
import {pg as yesql} from 'yesql';
import { FavParams } from '../types/favorites';
import { DBKara } from '../lib/types/database/kara';
const sql = require('./sql/favorites');

interface Filter {
	sql: any[],
	params: {
		username?: string
	}
}

export async function selectFavorites(params: FavParams): Promise<DBKara[]> {
	const filterClauses: Filter = params.filter ? buildClauses(params.filter) : {sql: [], params: {}};
	filterClauses.params.username = params.username;
	let limitClause = '';
	let offsetClause = '';
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	const query = sql.getFavorites(filterClauses.sql, limitClause, offsetClause);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
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

