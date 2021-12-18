ALTER TABLE users ADD COLUMN flag_parentsonly BOOLEAN DEFAULT(TRUE);
UPDATE users SET flag_parentsonly = TRUE;