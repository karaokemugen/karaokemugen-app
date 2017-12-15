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