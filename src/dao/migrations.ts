import { Migration } from 'postgrator';
import { generateDB } from './database';

export async function postMigrationTasks(migrations: Migration[]) {
	let doGenerate = false;
	// Add code here to do stuff when migrations occur
	if (migrations) {
		// This is just so typescript stops being a jerk.
	}
	if (doGenerate) await generateDB();
}
