import { pg as yesql } from 'yesql';

import { db, paramWords } from '../lib/dao/database.js';
import { WhereClause } from '../lib/types/database.js';
import { DBTag } from '../lib/types/database/tag.js';
import { Tag, TagAndType, TagParams } from '../lib/types/tag.js';
import { uuidRegexp } from '../lib/utils/constants.js';
import logger from '../lib/utils/logger.js';
import {
	sqldeleteTag,
	sqldeleteTagsByKara,
	sqlgetAllTags,
	sqlinsertKaraTags,
	sqlinsertTag,
	sqlupdateKaraTagsTID,
	sqlupdateTag,
} from './sql/tag.js';

const service = 'DBTag';

export async function selectAllTags(params: TagParams): Promise<DBTag[]> {
	const filterClauses: WhereClause = params.filter
		? buildTagClauses(params.filter)
		: { sql: [], params: {}, additionalFrom: [] };
	const typeClauses = params.type ? ` AND t.types @> ARRAY[${params.type}]` : '';
	let limitClause = '';
	let offsetClause = '';
	const orderClause = '';
	let stripClause = '';
	let joinClauses = '';
	let whereClause = '';
	if (params.from > 0) offsetClause = `OFFSET ${params.from} `;
	if (params.size > 0) limitClause = `LIMIT ${params.size} `;
	if (params.type && params.stripEmpty) {
		joinClauses = `LEFT   JOIN LATERAL (
			SELECT elem->>'count' AS karacounttype
			FROM   jsonb_array_elements(at.karacount::jsonb) a(elem)
			WHERE  elem->>'type' = '${params.type}'
			) a ON true
		 `;
		stripClause = ' AND karacounttype::int2 > 0';
	}
	if (params.duplicates) whereClause = ' AND t.name IN (SELECT name FROM tag GROUP BY name HAVING COUNT(name) > 1)';
	if (params.tid) {
		if (!params.tid.match(uuidRegexp)) throw 'Invalid TID';
		whereClause = `AND t.pk_tid = '${params.tid}'`;
	}
	const query = sqlgetAllTags(
		filterClauses.sql,
		typeClauses,
		limitClause,
		offsetClause,
		orderClause,
		filterClauses.additionalFrom,
		joinClauses,
		stripClause,
		whereClause
	);
	const res = await db().query(yesql(query)(filterClauses.params));
	return res.rows;
}

function buildTagClauses(words: string): WhereClause {
	const sql = ['t.tag_search_vector @@ query'];
	return {
		sql,
		params: { tsquery: paramWords(words).join(' & ') },
		additionalFrom: [
			", to_tsquery('public.unaccent_conf', :tsquery) as query, ts_rank_cd(t.tag_search_vector, query) as relevance",
		],
	};
}

export async function insertTag(tag: Tag) {
	await db().query(sqlinsertTag, [
		tag.tid,
		tag.name,
		tag.types,
		tag.short || null,
		tag.i18n || {},
		JSON.stringify(tag.aliases || []),
		tag.tagfile,
		tag.repository,
		tag.noLiveDownload || false,
		tag.priority || 10,
		tag.karafile_tag || null,
		tag.description || {},
		tag.external_database_ids || null,
	]);
}

export function updateKaraTagsTID(oldTID: string, newTID: string) {
	return db().query(sqlupdateKaraTagsTID, [oldTID, newTID]);
}

export async function updateKaraTags(kid: string, tags: TagAndType[]) {
	await db().query(sqldeleteTagsByKara, [kid]);
	// Remove these logs once the updat_kara_tag issue is resolved
	logger.debug(`Updating tags ${tags.map(t => t.tid).join(', ')} for KID ${kid}`, { service });
	for (const tag of tags) {
		try {
			await db().query(
				yesql(sqlinsertKaraTags)({
					kid,
					tid: tag.tid,
					type: tag.type,
				})
			);
		} catch (err) {
			logger.error(`Error adding TID ${tag.tid} for KID ${kid}`, { service });
			throw err;
		}
	}
}

export async function updateTag(tag: Tag) {
	await db().query(sqlupdateTag, [
		tag.name,
		JSON.stringify(tag.aliases || []),
		tag.tagfile,
		tag.short || null,
		tag.types,
		tag.i18n || {},
		tag.tid,
		tag.repository,
		tag.noLiveDownload || false,
		tag.priority || 10,
		tag.karafile_tag || null,
		tag.description || {},
		tag.external_database_ids || null,
	]);
}

export async function deleteTag(tids: string[]) {
	await db().query(sqldeleteTag, [tids]);
}
