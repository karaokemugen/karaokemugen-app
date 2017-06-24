BEGIN TRANSACTION;
CREATE TABLE `viewcount` (
	`id_viewcount`	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
	`kid`	TEXT,
	`datetime`	TEXT
);
CREATE TABLE "rating" (
	`id_rating`	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
	`kid`	TEXT,
	`rating`	INTEGER,
	`session`	INTEGER,
	`datetime`	TEXT
);
COMMIT;
