// DO NOT RUN THIS ON PRODUCTION
// This is used for CI/CD to drop the database contents and start anew.
// DO NOT DO THIS AT HOME.

const dbConfigFile = require('../database.json');
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
	await client.query(`
        CREATE EXTENSION unaccent;
    `);
}

main().then(() => {
	console.log('unaccent extension installed');
	process.exit(0);
}).catch(err => {
	console.log(err);
	process.exit(1);
});