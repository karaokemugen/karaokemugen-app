ALTER TABLE playlist_content RENAME COLUMN pk_id_plcontent TO pk_plcid;
ALTER TABLE upvote RENAME COLUMN fk_id_plcontent TO fk_plcid;
ALTER TABLE playlist RENAME COLUMN fk_id_plcontent_playing TO fk_plcid_playing;
ALTER TABLE playlist RENAME COLUMN pk_id_playlist TO pk_plaid;
ALTER TABLE playlist_content RENAME COLUMN fk_id_playlist TO fk_plaid;
ALTER TABLE playlist_criteria RENAME COLUMN fk_id_playlist TO fk_plaid;
