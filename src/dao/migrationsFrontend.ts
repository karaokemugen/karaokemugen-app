import { db } from '../lib/dao/database';
import { MigrationsFrontend } from '../types/database/migrationsFrontend';
import { sqlMarkAllMigrationsAsDone, sqlSelectAllMigrations, sqlUpdateMigrations } from './sql/migrationsFrontend';

export async function selectMigrationsFrontend(): Promise<MigrationsFrontend[]> {
	const migs = await db().query(sqlSelectAllMigrations);
	return migs.rows;
}

export async function updateMigrationsFrontend(mig: MigrationsFrontend) {
	await db().query(sqlUpdateMigrations, [mig.name, mig.flag_done]);
}

export async function markAllMigrationsFrontendAsDone() {
	await db().query(sqlMarkAllMigrationsAsDone);
}
