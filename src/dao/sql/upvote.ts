// SQL for favorites management

export const sqlinsertUpvote = `
INSERT INTO upvote(
	fk_id_plcontent,
	fk_login
)
VALUES(
	:plc_id,
	:username
);
`;

export const sqldeleteUpvote = `
DELETE FROM upvote
WHERE fk_id_plcontent = :plc_id
	AND fk_login = :username
`;

export const sqlselectUpvoteByPLC = `
SELECT fk_login AS username
FROM upvote
WHERE fk_id_plcontent = $1;
`;
