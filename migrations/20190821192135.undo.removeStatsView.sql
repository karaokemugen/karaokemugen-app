CREATE VIEW stats AS
SELECT
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[2]) AS singers,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[8]) AS songwriters,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[4]) AS creators,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[6]) AS authors,
(SELECT COUNT(pk_kid) FROM kara) AS karas,
(SELECT COUNT(pk_tid) FROM tag WHERE types @> ARRAY[5]) AS languages,
(SELECT COUNT(pk_sid) FROM serie) AS series,
(SELECT COUNT(*) FROM played) AS played,
(SELECT COUNT(pk_id_playlist) FROM playlist) AS playlists,
(SELECT SUM(duration) FROM kara) AS duration;
