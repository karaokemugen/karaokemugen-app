// SQL for tags

export const sqlgetTagMini = `
SELECT pk_tid AS tid,
	name,
	i18n,
	types,
	tagfile,
	repository,
	short,
	aliases,
	modified_at,
	problematic,
	noLiveDownload,
	priority
FROM tag
WHERE pk_tid = $1
`;

export const sqlgetTag = `
SELECT tid, name, types, short, aliases, i18n, modified_at, karacount, tagfile, repository, problematic, noLiveDownload, priority
FROM all_tags
WHERE tid = $1
`;

export const sqlselectDuplicateTags = `
SELECT * FROM all_tags ou
WHERE (SELECT COUNT(*) FROM all_tags inr WHERE inr.name = ou.name) > 1
`;

export const sqlgetAllTags = (
	filterClauses: string[],
	typeClauses: string,
	limitClause: string,
	offsetClause: string,
	orderClauses: string,
	additionnalFrom: string[],
	joinClauses: string,
	stripClause: string
) => `
SELECT tid,
	types,
	name,
	short,
	aliases,
	i18n,
	karacount,
	tagfile,
	modified_at,
	repository,
	problematic,
	noLiveDownload,
	priority,
	count(tid) OVER()::integer AS count
FROM all_tags
${additionnalFrom.join()}
${joinClauses}
WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
  ${typeClauses}
  ${stripClause}
ORDER BY name${orderClauses}
${limitClause}
${offsetClause}
`;

export const sqlinsertTag = `
INSERT INTO tag(
	pk_tid,
	name,
	types,
	short,
	i18n,
	aliases,
	tagfile,
	repository,
	modified_at,
	problematic,
	noLiveDownload,
	priority
)
VALUES(
	$1,
	$2,
	$3,
	$4,
	$5,
	$6,
	$7,
	$8,
	$9,
	$10,
	$11,
	$12
)
ON CONFLICT (pk_tid) DO UPDATE SET
	types = $3,
	name = $2,
	short = $4,
	i18n = $5,
	aliases = $6,
	tagfile = $7,
	repository = $8,
	modified_at = $9,
	problematic = $10,
	noLiveDownload = $11,
	priority = $12
`;

export const sqlupdateKaraTagsTID = `
UPDATE kara_tag SET fk_tid = $2 WHERE fk_tid = $1;
`;

export const sqldeleteTagsByKara = 'DELETE FROM kara_tag WHERE fk_kid = $1';

export const sqlinsertKaraTags = `
INSERT INTO kara_tag(
	fk_kid,
	fk_tid,
	type
)
VALUES(
	:kid,
	:tid,
	:type
);
`;

export const sqlgetTagByNameAndType = `
SELECT
	name,
	pk_tid AS tid,
	types
FROM tag
WHERE name = $1
  AND types @> $2
;`;

export const sqlupdateTag = `
UPDATE tag
SET
	name = $1,
	aliases = $2,
	tagfile = $3,
	short = $4,
	types = $5,
	i18n = $6,
	repository = $8,
	modified_at = $9,
	problematic = $10,
	noLiveDownload = $11,
	priority = $12
WHERE pk_tid = $7;
`;

export const sqldeleteTag = 'DELETE FROM tag WHERE pk_tid = $1';
