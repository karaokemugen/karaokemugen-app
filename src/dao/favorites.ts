import {pg as yesql} from 'yesql';

import { db, transaction} from '../lib/dao/database';
import { KaraParams } from '../lib/types/kara';
import {
	sqlclearFavorites,
	sqlgetFavoritesMicro,
	sqlinsertFavorites,
	sqlremoveFavorites
} from './sql/favorites';

export async function selectFavoritesMicro(params: KaraParams) {
	const finalParams = {username: params.username};
	let limitClause = '';
	let offsetClause = '';
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	const query = sqlgetFavoritesMicro(limitClause, offsetClause);
	const res = await db().query(yesql(query)(finalParams));
	return res.rows;
}

export function deleteFavorites(fList: string[], username: string) {
	const karas = fList.map(kara => ([
		kara,
		username
	]));
	return transaction({params: karas, sql: sqlremoveFavorites});
}

export function truncateFavorites(username: string) {
	return db().query(sqlclearFavorites, [username]);
}

export function insertFavorites(karaList: string[], username: string) {
	const karas = karaList.map(kara => ([
		kara,
		username
	]));
	return transaction({params: karas, sql: sqlinsertFavorites});
}

