// This script changes a user's password

const dbConfigFile = require('../database.json');
const {Pool} = require('pg');
const {hash, genSalt} = require('bcrypt');

async function hashPassword(password: string): Promise<string> {
	return hash(password, await genSalt(10));
}


const dbConfig = {
	host: dbConfigFile.prod.host,
	user: dbConfigFile.prod.user,
	port: dbConfigFile.prod.port,
	password: dbConfigFile.prod.password,
	database: dbConfigFile.prod.database
};

async function main() {
	const client = new Pool(dbConfig);
	const user = process.argv[2];
	const password = await hashPassword(process.argv[3]);
	try {
		await client.connect();
		await client.query(`
        UPDATE users SET password = '${password}' WHERE pk_login = '${user}';
	`);
	} catch(err) {
		// Do nothing here.
	}
}

main().then(() => {
	console.log('User modified');
	process.exit(0);
}).catch(err => {
	console.log(err);
	process.exit(1);
});