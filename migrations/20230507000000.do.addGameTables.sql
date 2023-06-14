DROP TABLE IF EXISTS game_possible_answers CASCADE;
DROP TABLE IF EXISTS game_scores CASCADE;
DROP TABLE IF EXISTS game CASCADE;
CREATE TABLE game (
	pk_gamename CHARACTER VARYING PRIMARY KEY,
	settings JSONB,
	state JSONB,
	date TIMESTAMPTZ,
	flag_active BOOLEAN
);
CREATE TABLE game_scores (
	fk_login CHARACTER VARYING,
	answer CHARACTER VARYING,
	points INTEGER,
	points_detailed JSONB,
	fk_kid UUID,
	fk_gamename CHARACTER VARYING,
	CONSTRAINT fk_game_kid FOREIGN KEY(fk_kid) REFERENCES kara(pk_kid) ON DELETE CASCADE,
	CONSTRAINT fk_game_gamename FOREIGN KEY(fk_gamename) REFERENCES game(pk_gamename) ON DELETE CASCADE,
	PRIMARY KEY (fk_login, fk_kid, fk_gamename)
);

CREATE INDEX idx_game_date ON game(date);
CREATE INDEX idx_game_scores_fk_login ON game_scores(fk_login);
-- CREATE UNIQUE INDEX idx_game_scores_gamename_song ON game_scores(fk_gamename, fk_kid, fk_login);

CREATE OR REPLACE FUNCTION ensure_only_one_active_game_trigger()
 RETURNS trigger
AS $function$
BEGIN
    -- nothing to do if updating the row currently enabled
    IF (TG_OP = 'UPDATE' AND OLD.flag_active = true) THEN
        RETURN NEW;
    END IF;

    -- disable the currently enabled row
    EXECUTE format('UPDATE %I.%I SET flag_active = false WHERE flag_active = true;', TG_TABLE_SCHEMA, TG_TABLE_NAME);

    -- enable new row
    NEW.flag_active := true;
    RETURN NEW;
END;
$function$
LANGUAGE plpgsql;

CREATE TRIGGER game_only_one_game_trigger
BEFORE INSERT OR UPDATE OF flag_active ON game
FOR EACH ROW WHEN (NEW.flag_active = true)
EXECUTE PROCEDURE ensure_only_one_active_game_trigger();

CREATE TABLE game_possible_answers(
	default_name CHARACTER VARYING,
	i18n JSONB,
	default_language CHARACTER VARYING,
	type INTEGER,
	search_vector TSVECTOR,
	fk_ktid UUID
);

create index idx_gpa_search_vector
	on game_possible_answers using gin (search_vector);
