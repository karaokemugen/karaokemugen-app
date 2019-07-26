import {db, transaction, langSelector, buildClauses} from '../lib/dao/database';
import {pg as yesql} from 'yesql';
import { FavParams } from '../types/favorites';
import { User } from '../lib/types/user';
import { getUser } from './user';
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
	//Disabled until frontend manages this
	//if (from > 0) offsetClause = `OFFSET ${from} `;
	//if (size > 0) limitClause = `LIMIT ${size} `;
	let user: User = {};
	let userMode = -1;
	let userLangs = {main: null, fallback: null};
	if (params.username) user = await getUser(params.username);
	if (user) {
		userMode = user.series_lang_mode;
		userLangs = {main: user.main_series_lang, fallback: user.fallback_series_lang};
	}
	const query = sql.getFavorites(filterClauses.sql, langSelector(params.lang, userMode, userLangs), limitClause, offsetClause);
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

