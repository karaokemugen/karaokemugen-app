import {pg as yesql} from 'yesql';

import {buildClauses,db, transaction} from '../lib/dao/database';
import { DBKara } from '../lib/types/database/kara';
import { FavParams } from '../types/favorites';
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

export function removeFavorites(fList: string[], username: string) {
	const karas = fList.map(kara => ([
		kara,
		username
	]));
	return transaction([{params: karas, sql: sql.removeFavorites}]);
}

export function insertFavorites(karaList: string[], username: string) {
	const karas = karaList.map(kara => ([
		kara,
		username
	]));
	return transaction([{params: karas, sql: sql.insertFavorites}]);
}

