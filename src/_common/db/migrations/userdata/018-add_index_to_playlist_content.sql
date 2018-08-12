-- Up

CREATE INDEX index_playlist_content ON playlist_content (
	fk_id_playlist, fk_id_kara
);

-- Down

DROP INDEX index_playlist_content;