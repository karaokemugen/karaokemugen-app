ALTER TABLE users ADD COLUMN IF NOT EXISTS flag_parentsonly BOOLEAN DEFAULT(TRUE);
UPDATE users SET flag_parentsonly = TRUE;