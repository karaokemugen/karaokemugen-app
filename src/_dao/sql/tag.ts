// SQL for tags

export const getTag = `
SELECT name, tagtype, slug, i18n
FROM tag
WHERE pk_id_tag = $1
`;

export const getAllTags = (filterClauses, typeClauses, limitClause, offsetClause) => `
SELECT tag_id,
	tagtype AS type,
	name,
	slug,
	i18n,
	karacount
FROM all_tags
WHERE 1 = 1
  ${filterClauses.map(clause => 'AND (' + clause + ')').reduce((a, b) => (a + ' ' + b), '')}
  ${typeClauses}
ORDER BY tagtype, name
${limitClause}
${offsetClause}
`;

export const getTagByNameAndType = `
SELECT pk_id_tag AS tag_id
FROM tag
WHERE name = :name
	AND tagtype = :type
`;

export const insertTag = `
INSERT INTO tag(
	name,
	tagtype,
	slug,
	i18n
)
VALUES(
	:name,
	:type,
	:slug,
	:i18n
) RETURNING *
`;

export const deleteTagsByKara = 'DELETE FROM kara_tag WHERE fk_kid = $1';

export const insertKaraTags = `
INSERT INTO kara_tag(
	fk_kid,
	fk_id_tag
)
VALUES(
	:kid,
	:tag_id
);
`;