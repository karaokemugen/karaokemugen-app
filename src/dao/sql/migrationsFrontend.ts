export const sqlSelectAllMigrations = 'SELECT name, flag_done FROM migrations_frontend';

export const sqlUpdateMigrations = 'UPDATE migrations_frontend SET flag_done = $2 WHERE name = $1';