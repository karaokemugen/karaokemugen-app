// SQL for tags

export const getTag = `
SELECT name, tagtype, slug, i18n
FROM tag
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

export const deleteTagsByKara = 'DELETE FROM kara_tag WHERE fk_id_kara = $1';

export const insertKaraTags = `
INSERT INTO kara_tag(
	fk_id_kara,
	fk_id_tag
)
VALUES(
	:kara_id,
	:tag_id
);
`;