// This script installs the unaccent extension in a database.
// It requires superuser access.

const dbConfigFile = require('../app/database.json');
const {Pool} = require('pg');

const dbConfig = {
	host: dbConfigFile.prod.host,
	user: dbConfigFile.prod.user,
	port: dbConfigFile.prod.port,
	password: dbConfigFile.prod.password,
	database: dbConfigFile.prod.database
};
async function main() {
	const client = new Pool(dbConfig);
	await client.connect();
	try {
		await client.query(`
        CREATE EXTENSION unaccent;
	`);
	} catch(err) {
		// Do nothing here.
	}
}

main().then(() => {
	console.log('unaccent extension installed');
	process.exit(0);
}).catch(err => {
	console.log(err);
	process.exit(1);
});