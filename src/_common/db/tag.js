// SQL for tags

export const getTag = `SELECT name
					FROM karasdb.tag
					WHERE pk_id_tag = $id
					`;

export const getAllTags = `SELECT pk_id_tag AS tag_id, 
							tagtype AS type, 
							name
						FROM karasdb.tag
						ORDER BY type, name
						`;

export const getTagByNameAndType = `SELECT pk_id_tag AS tag_id
						FROM karasdb.tag
						WHERE name = $name AND tagtype = $type
						`;

export const insertTag = `INSERT INTO karasdb.tag(name, NORM_name, tagtype) 
						VALUES($name, $NORM_name, $type)
						`;

export const deleteTagsByKara = 'DELETE FROM karasdb.kara_tag WHERE fk_id_kara = $kara_id';

export const insertKaraTags = `INSERT INTO karasdb.kara_tag(fk_id_kara,fk_id_tag) 
							VALUES($kara_id, $tag_id);
							`;