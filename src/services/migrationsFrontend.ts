import { selectMigrationsFrontend, updateMigrationsFrontend } from '../dao/migrationsFrontend.js';
import { MigrationsFrontend } from '../types/database/migrationsFrontend.js';

export async function getMigrationsFrontend() {
	return selectMigrationsFrontend();
}

export async function setMigrationsFrontend(mig: MigrationsFrontend) {
	return updateMigrationsFrontend(mig);
}
