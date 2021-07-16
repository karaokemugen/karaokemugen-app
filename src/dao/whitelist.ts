import {pg as yesql} from 'yesql';

import {buildClauses, db,transaction} from '../lib/dao/database';
import { WhereClause } from '../lib/types/database';
import { KaraParams } from '../lib/types/kara';
import { DBWhitelist } from '../types/database/whitelist';
import { sqladdKaraToWhitelist,sqlemptyWhitelist, sqlgetWhitelistContents, sqlremoveKaraFromWhitelist } from './sql/whitelist';

export async function getWhitelistContents(params: KaraParams): Promise<DBWhitelist[]> {
	const filterClauses: WhereClause = params.filter
		? buildClauses(params.filter)
		: {sql: [], params: {}, additionalFrom: []};
	let limitClause = '';
	let offsetClause = '';
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	const query = sqlgetWhitelistContents(filterClauses.sql, limitClause, offsetClause, filterClauses.additionalFrom);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

export function emptyWhitelist() {
	return db().query(sqlemptyWhitelist);
}

export function removeKaraFromWhitelist(wlcList: string[]) {
	const karas = wlcList.map(kara => ([
		kara
	]));
	return transaction({params: karas, sql: sqlremoveKaraFromWhitelist});
}

export function addKaraToWhitelist(karaList: string[], reason: string) {
	const karas = karaList.map((kara) => ([
		kara,
		new Date(),
		reason
	]));
	return transaction({params: karas, sql: sqladdKaraToWhitelist});
}
