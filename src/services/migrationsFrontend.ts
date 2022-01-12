import { selectMigrationsFrontend, updateMigrationsFrontend } from '../dao/migrationsFrontend';
import { MigrationsFrontend } from '../types/database/migrationsFrontend';

export async function getMigrationsFrontend() {
	return selectMigrationsFrontend();
}

export async function setMigrationsFrontend(mig: MigrationsFrontend) {
	return updateMigrationsFrontend(mig);
}
