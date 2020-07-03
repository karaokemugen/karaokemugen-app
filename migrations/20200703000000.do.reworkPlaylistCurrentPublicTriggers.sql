DROP TRIGGER playlist_only_one_current_trigger ON playlist;
DROP TRIGGER playlist_only_one_public_trigger ON playlist;

DROP INDEX playlist_flag_current_idx;
DROP INDEX playlist_flag_public_idx;

ALTER TABLE playlist DROP CONSTRAINT current_not_false;
ALTER TABLE playlist DROP CONSTRAINT public_not_false;

UPDATE playlist SET flag_current = FALSE WHERE flag_current = NULL;
UPDATE playlist SET flag_public = FALSE WHERE flag_current = NULL;

CREATE OR REPLACE FUNCTION ensure_only_one_enabled_public_trigger()
 RETURNS trigger
AS $function$
BEGIN
    -- nothing to do if updating the row currently enabled
    IF (TG_OP = 'UPDATE' AND OLD.flag_public = true) THEN
        RETURN NEW;
    END IF;

    -- disable the currently enabled row
    EXECUTE format('UPDATE %I.%I SET flag_public = false WHERE flag_public = true;', TG_TABLE_SCHEMA, TG_TABLE_NAME);

    -- enable new row
    NEW.flag_public := true;
    RETURN NEW;
END;
$function$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ensure_only_one_enabled_current_trigger()
 RETURNS trigger
AS $function$
BEGIN
    -- nothing to do if updating the row currently enabled
    IF (TG_OP = 'UPDATE' AND OLD.flag_current = true) THEN
        RETURN NEW;
    END IF;

    -- disable the currently enabled row
    EXECUTE format('UPDATE %I.%I SET flag_current = false WHERE flag_current = true;', TG_TABLE_SCHEMA, TG_TABLE_NAME);

    -- enable new row
    NEW.flag_current := true;
    RETURN NEW;
END;
$function$
LANGUAGE plpgsql;

CREATE TRIGGER playlist_only_one_public_trigger
BEFORE INSERT OR UPDATE OF flag_public ON playlist
FOR EACH ROW WHEN (NEW.flag_public = true)
EXECUTE PROCEDURE ensure_only_one_enabled_public_trigger();

CREATE TRIGGER playlist_only_one_current_trigger
BEFORE INSERT OR UPDATE OF flag_current ON playlist
FOR EACH ROW WHEN (NEW.flag_current = true)
EXECUTE PROCEDURE ensure_only_one_enabled_current_trigger();

