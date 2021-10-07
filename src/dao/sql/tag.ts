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
	nolivedownload AS "noLiveDownload",
	priority,
	karafile_tag
FROM tag
WHERE pk_tid = $1
`;

export const sqlgetTag = `
SELECT t.pk_tid AS tid,
	t.name,
	t.types,
	t.short,
	t.aliases,
	t.i18n,
	t.modified_at,
	t.tagfile,
	t.repository,
	t.problematic,
	t.nolivedownload AS "noLiveDownload",
	t.priority,
	t.karafile_tag,
	at.karacount
FROM tag t
LEFT JOIN all_tags at ON at.pk_tid = $1
WHERE t.pk_tid = $1
`;

export const sqlselectDuplicateTags = `
SELECT pk_tid AS tid, name, types, short, aliases, i18n, modified_at, tagfile, repository, problematic, nolivedownload, karafile_tag AS "noLiveDownload", priority FROM tag ou
WHERE name in (select name FROM tag GROUP BY name HAVING COUNT(name) > 1)
`;

export const sqlgetAllTags = (
	filterClauses: string[],
	typeClauses: string,
	limitClause: string,
	offsetClause: string,
	orderClauses: string,
	additionnalFrom: string[],
	joinClauses: string,
	stripClause: string,
	probClause: string
) => `
SELECT t.pk_tid AS tid,
	t.types,
	t.name,
	t.short,
	t.aliases,
	t.i18n,
	at.karacount AS karacount,
	t.tagfile,
	t.modified_at,
	t.repository,
	t.problematic,
	t.nolivedownload AS "noLiveDownload",
	t.priority,
	t.karafile_tag,
	count(t.pk_tid) OVER()::integer AS count
FROM tag t
LEFT JOIN all_tags at ON at.pk_tid = t.pk_tid
${additionnalFrom.join()}
${joinClauses}
WHERE 1 = 1
  ${filterClauses.map((clause) => 'AND (' + clause + ')').reduce((a, b) => a + ' ' + b, '')}
  ${typeClauses}
  ${stripClause}
  ${probClause}
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
	nolivedownload,
	priority,
	karafile_tag
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
	$12,
	$13
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
	nolivedownload = $11,
	priority = $12,
	karafile_tag = $13
`;

export const sqlupdateKaraTagsTID = `
UPDATE kara_tag SET fk_tid = $2 WHERE fk_tid = $1 AND fk_kid NOT IN (
	SELECT fk_kid FROM kara_tag WHERE fk_tid = $2
);
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
	nolivedownload = $11,
	priority = $12,
	karafile_tag = $13
WHERE pk_tid = $7;
`;

export const sqldeleteTag = 'DELETE FROM tag WHERE pk_tid = ANY ($1)';
