// DO NOT RUN THIS ON PRODUCTION
// This is used for CI/CD to drop the database contents and start anew.
// DO NOT DO THIS AT HOME.

import {readFileSync} from 'fs';
import {load} from 'js-yaml';
import merge from 'lodash.merge';
import {Pool} from 'pg';

import {dbConfig} from '../src/utils/defaultSettings';

async function main() {
	const configFile = readFileSync('app/config.yml', 'utf-8');
	const configData: any = load(configFile);
	const config = merge(dbConfig, configData.System.Database);
	const databaseConfig = {
		host: config.host,
		user: config.username,
		port: config.port,
		password: config.password,
		database: config.database
	};
	const client = new Pool(databaseConfig);
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
