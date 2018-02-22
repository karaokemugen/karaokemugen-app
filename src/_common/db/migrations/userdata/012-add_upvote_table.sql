-- Up

CREATE TABLE upvote (
	fk_id_plcontent	INTEGER NOT NULL,
	fk_id_user	INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS index_upvote ON upvote (fk_id_plcontent,fk_id_user);

-- Down

DROP INDEX index_upvote;
DROP TABLE upvote;