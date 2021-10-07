// This script changes a user's password

const {Pool} = require('pg');
const {hash, genSalt} = require('bcrypt');
const {load} = require('js-yaml');
const {readFileSync} = require('fs');

async function hashPassword(password: string): Promise<string> {
	return hash(password, await genSalt(10));
}

async function main() {
	const configFile = readFileSync('app/config.yml', 'utf-8');
	const config: any = load(configFile);
	const dbConfig = {
		host: config.System.Database.host,
		user: config.System.Database.username,
		port: config.System.Database.port,
		password: config.System.Database.password,
		database: config.System.Database.database
	};
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