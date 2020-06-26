DROP INDEX idx_played_seid_kid_playedat;
CREATE UNIQUE INDEX idx_played_startedat_kid_playedat ON played (fk_kid, played_at);