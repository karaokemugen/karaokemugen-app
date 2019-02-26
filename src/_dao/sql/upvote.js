// SQL for favorites management

export const insertUpvote = `
INSERT INTO upvote(
	fk_id_plcontent,
	fk_login
)
VALUES(
	:plc_id,
	:username
);
`;

export const deleteUpvote = `
DELETE FROM upvote
WHERE fk_id_plcontent = :plc_id
	AND fk_login = :username
`;

export const selectUpvoteByPLC = `
SELECT fk_login AS username
FROM upvote
WHERE fk_id_plcontent = $1;
`;

