-- Up

CREATE TABLE upvote (
	fk_id_plcontent	INTEGER NOT NULL REFERENCES playlist_content ON DELETE CASCADE,
	fk_id_user	INTEGER NOT NULL REFERENCES user ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS index_upvote ON upvote (fk_id_plcontent,fk_id_user);

-- Down

DROP INDEX index_upvote;
DROP TABLE upvote;