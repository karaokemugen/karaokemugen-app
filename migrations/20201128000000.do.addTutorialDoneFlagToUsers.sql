ALTER TABLE users ADD COLUMN flag_tutorial_done BOOLEAN DEFAULT false;
UPDATE users SET flag_tutorial_done = true;