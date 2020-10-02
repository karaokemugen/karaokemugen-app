// DO NOT RUN THIS ON PRODUCTION
// This is used for CI/CD to drop the database contents and start anew.
// DO NOT DO THIS AT HOME.

import {readFileSync} from 'fs';
import {safeLoad} from 'js-yaml';
import {Pool} from 'pg';


async function main() {
	const configFile = readFileSync('../app/config.yml', 'utf-8');
	const config: any = safeLoad(configFile);
	const dbConfig = {
		host: config.System.Database.host,
		user: config.System.Database.username,
		port: config.System.Database.port,
		password: config.System.Database.password,
		database: config.System.Database.database
	};
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
