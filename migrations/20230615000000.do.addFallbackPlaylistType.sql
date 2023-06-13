ALTER TABLE playlist ADD COLUMN IF NOT EXISTS flag_fallback BOOLEAN;
UPDATE playlist SET flag_fallback = false;


CREATE OR REPLACE FUNCTION ensure_only_one_enabled_fallback_trigger()
 RETURNS trigger
AS $function$
BEGIN
    -- nothing to do if updating the row currently enabled
    IF (TG_OP = 'UPDATE' AND OLD.flag_fallback = true) THEN
        RETURN NEW;
    END IF;

    -- disable the currently enabled row
    EXECUTE format('UPDATE %I.%I SET flag_fallback = false WHERE flag_fallback = true;', TG_TABLE_SCHEMA, TG_TABLE_NAME);

    -- enable new row
    NEW.flag_fallback := true;
    RETURN NEW;
END;
$function$
LANGUAGE plpgsql;


CREATE TRIGGER playlist_only_one_fallback_trigger
BEFORE INSERT OR UPDATE OF flag_fallback ON playlist
FOR EACH ROW WHEN (NEW.flag_fallback = true)
EXECUTE PROCEDURE ensure_only_one_enabled_fallback_trigger();