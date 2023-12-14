ALTER TABLE kara ADD COLUMN IF NOT EXISTS announce_position_x TEXT check (announce_position_x in ('Left', 'Center', 'Right'));
ALTER TABLE kara ADD COLUMN IF NOT EXISTS announce_position_y TEXT check (announce_position_y in ('Top', 'Center', 'Bottom'));
