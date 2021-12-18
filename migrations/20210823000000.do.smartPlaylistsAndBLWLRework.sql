CREATE TABLE IF NOT EXISTS playlist_criteria (
	fk_id_playlist UUID,
	type INTEGER,
	value VARCHAR,
	FOREIGN KEY(fk_id_playlist) REFERENCES playlist(pk_id_playlist) ON DELETE CASCADE
);

DROP TABLE IF EXISTS blacklist;
--Whitelist will be dropped later once we've converted it to a playlist
--Same with blacklist_criteria

ALTER TABLE playlist ADD COLUMN IF NOT EXISTS flag_whitelist BOOLEAN;
ALTER TABLE playlist ADD COLUMN IF NOT EXISTS flag_blacklist BOOLEAN;
ALTER TABLE playlist ADD COLUMN IF NOT EXISTS flag_smart BOOLEAN;
ALTER TABLE playlist_content ADD COLUMN IF NOT EXISTS comment TEXT;

UPDATE playlist SET flag_whitelist = false, flag_blacklist = false, flag_smart = false;

CREATE OR REPLACE FUNCTION ensure_only_one_enabled_whitelist_trigger()
 RETURNS trigger
AS $function$
BEGIN
    -- nothing to do if updating the row currently enabled
    IF (TG_OP = 'UPDATE' AND OLD.flag_whitelist = true) THEN
        RETURN NEW;
    END IF;

    -- disable the currently enabled row
    EXECUTE format('UPDATE %I.%I SET flag_whitelist = false WHERE flag_whitelist = true;', TG_TABLE_SCHEMA, TG_TABLE_NAME);

    -- enable new row
    NEW.flag_whitelist := true;
    RETURN NEW;
END;
$function$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ensure_only_one_enabled_blacklist_trigger()
 RETURNS trigger
AS $function$
BEGIN
    -- nothing to do if updating the row currently enabled
    IF (TG_OP = 'UPDATE' AND OLD.flag_blacklist = true) THEN
        RETURN NEW;
    END IF;

    -- disable the currently enabled row
    EXECUTE format('UPDATE %I.%I SET flag_blacklist = false WHERE flag_blacklist = true;', TG_TABLE_SCHEMA, TG_TABLE_NAME);

    -- enable new row
    NEW.flag_blacklist := true;
    RETURN NEW;
END;
$function$
LANGUAGE plpgsql;

CREATE TRIGGER playlist_only_one_whitelist_trigger
BEFORE INSERT OR UPDATE OF flag_whitelist ON playlist
FOR EACH ROW WHEN (NEW.flag_whitelist = true)
EXECUTE PROCEDURE ensure_only_one_enabled_whitelist_trigger();

CREATE TRIGGER playlist_only_one_blacklist_trigger
BEFORE INSERT OR UPDATE OF flag_blacklist ON playlist
FOR EACH ROW WHEN (NEW.flag_blacklist = true)
EXECUTE PROCEDURE ensure_only_one_enabled_blacklist_trigger();

