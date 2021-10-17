ALTER TABLE playlist DROP COLUMN flag_smartlimit;
ALTER TABLE playlist DROP COLUMN smart_limit_number;
ALTER TABLE playlist DROP COLUMN smart_limit_order;
ALTER TABLE playlist DROP COLUMN smart_limit_type;

DROP TYPE playlist_smart_order;
DROP TYPE playlist_smart_limit_type;
