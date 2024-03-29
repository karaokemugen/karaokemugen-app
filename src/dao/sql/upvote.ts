// SQL for favorites management

export const sqlinsertUpvote = `
INSERT INTO upvote(
	fk_plcid,
	fk_login
)
VALUES(
	:plc_id,
	:username
);
`;

export const sqldeleteUpvote = `
DELETE FROM upvote
WHERE fk_plcid = :plc_id
	AND fk_login = :username
`;

export const sqlselectUpvoteByPLC = `
SELECT u.fk_login AS username, us.nickname
FROM upvote u
LEFT JOIN users us ON us.pk_login = u.fk_login
WHERE u.fk_plcid = $1;
`;
