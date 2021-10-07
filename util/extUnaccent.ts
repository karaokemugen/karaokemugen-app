// This script installs the unaccent extension in a database.
// It requires superuser access.

const { Pool } = require('pg');
const { load } = require('js-yaml');
const { readFileSync } = require('fs');

async function main() {
	const configFile = readFileSync('app/config.yml', 'utf-8');
	const config: any = load(configFile);
	const dbConfig = {
		host: config.System.Database.host,
		user: config.System.Database.username,
		port: config.System.Database.port,
		password: config.System.Database.password,
		database: config.System.Database.database,
	};
	const client = new Pool(dbConfig);
	await client.connect();
	try {
		await client.query(`
        CREATE EXTENSION unaccent;
		`);
	} catch (err) {
		// Do nothing here.
	}
}

main()
	.then(() => {
		console.log('unaccent extension installed');
		process.exit(0);
	})
	.catch((err) => {
		console.log(err);
		process.exit(1);
	});
