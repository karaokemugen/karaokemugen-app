-- Up

CREATE TABLE songpoll (
	pk_id_poll	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	created_at	INTEGER NOT NULL,
	open 	INTEGER NOT NULL DEFAULT(1)
);

CREATE TABLE songpoll_playlistcontent (
	fk_id_poll INTEGER NOT NULL,
	fk_id_plcontent	INTEGER NOT NULL
);

CREATE TABLE songpoll_user (
	fk_id_poll INTEGER NOT NULL,
	fk_id_plcontent	INTEGER NOT NULL,
	fk_id_user INTEGER NOT NULL
);

-- Down

DROP TABLE songpoll;
DROP TABLE songpoll_playlistcontent;
DROP TABLE songpoll_user;