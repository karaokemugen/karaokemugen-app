// DO NOT RUN THIS ON PRODUCTION
// This is used for CI/CD to drop the database contents and start anew.
// DO NOT DO THIS AT HOME.

import dbConfigFile from '../app/database.json';
import {Pool} from 'pg';

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
	const res = await client.query(`
	select 'drop table if exists "' || tablename || '" cascade;' as command
  from pg_tables
 where schemaname = 'public';
 `);
	for (const row of res.rows) {
		console.log(row.command);
		await client.query(row.command);
	}
}

main().then(() => {
	console.log('Database wiped');
	process.exit(0);
}).catch(err => {
	console.log(err);
	process.exit(1);
});
