// SQL for tags

export const getTag = `
SELECT name
FROM karasdb.tag
WHERE pk_id_tag = $1
`;

export const getAllTags = `
SELECT pk_id_tag AS tag_id,
	tagtype AS type,
	name,
	slug,
	i18n
FROM tag
ORDER BY type, name
`;

export const getTagByNameAndType = `
SELECT pk_id_tag AS tag_id
FROM tag
WHERE name = :name
	AND tagtype = :type
`;

export const insertTag = `
INSERT INTO karasdb.tag(
	name,
	tagtype
)
VALUES(
	:name,
	:type
) RETURNING *
`;

export const deleteTagsByKara = 'DELETE FROM kara_tag WHERE fk_id_kara = $1';

export const insertKaraTags = `
INSERT INTO karasdb.kara_tag(
	fk_id_kara,
	fk_id_tag
)
VALUES(
	:kara_id,
	:tag_id
);
`;