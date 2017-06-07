CREATE TABLE `tag` (
	`PK_id_tag`	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
	`tagtype`	INTEGER,
	`name`	TEXT COLLATE NOCASE
);
CREATE TABLE `series` (
	`PK_id_series`	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
	`name`	TEXT COLLATE NOCASE,
	`altname`	TEXT COLLATE NOCASE
);
CREATE TABLE `kara_tag` (
	`PK_id_kara_tag`	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
	`FK_id_kara`	INTEGER,
	`FK_id_tag`	INTEGER
);
CREATE TABLE `kara_series` (
	`PK_id_kara_series`	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
	`FK_id_kara`	INTEGER,
	`FK_id_series`	INTEGER
);
CREATE TABLE `kara` (
	`PK_id_kara` INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
	`kid`	TEXT UNIQUE,
	`title`	TEXT COLLATE NOCASE,
	`year`	TEXT,
	`songorder`	INTEGER,
	`videofile`	TEXT,
	`subfile`	TEXT,
	`videolength`	INTEGER,
	`date_added`	TEXT,
	`date_last_modified`	INTEGER,
	`rating`	REAL,
	`viewcount`	INTEGER
);
CREATE INDEX `index_kara_tag_id_tag` ON `kara_tag` (`FK_id_tag` );
CREATE INDEX `index_kara_tag_id_kara` ON `kara_tag` (`FK_id_kara` );
CREATE INDEX `index_kara_series_id_series` ON `kara_series` (`FK_id_series` );
CREATE INDEX `index_kara_series_id_kara` ON `kara_series` (`FK_id_kara` );