import logger from 'winston/lib/winston';
import {open} from 'sqlite';
import {getConfig} from '../_common/utils/config';
import {resolve} from 'path';

let karaDb;
let userDb;

export function openDatabases(config) {
	const conf = config || getConfig();
	return Promise.all([openKaraDatabase(conf), openUserDatabase(conf)]);
}

async function openKaraDatabase(config) {
	const conf = config || getConfig();
	const karaDbFile = resolve(conf.appPath, conf.PathDB, conf.PathDBKarasFile);

	if (!karaDb) {
		logger.debug('[DB] Opening kara database');
		karaDb = await open(karaDbFile, {verbose: true});
	} else {
		throw 'Kara database already opened';
	}
}

async function openUserDatabase(config) {
	const conf = config || getConfig();
	const userDbFile = resolve(conf.appPath, conf.PathDB, conf.PathDBUserFile);

	if (!userDb) {
		logger.debug('[DB] Opening user database');
		userDb = await open(userDbFile, {verbose: true});
	} else {
		throw 'User database already opened';
	}
}

export function closeDatabases() {
	return Promise.all([closeKaraDatabase(), closeUserDatabase()]);
}

async function closeKaraDatabase() {
	if (!karaDb) {
		logger.warn('[DB] Kara database already closed');
	} else {
		await karaDb.close();
		karaDb = null;
	}
}

async function closeUserDatabase() {
	if (!userDb) {
		logger.warn('[DB] User database already closed');
	} else {
		await userDb.close();
		userDb = null;
	}
}

/* Opened DB are exposed to be used by DAO objects. */

export function getKaraDb() {
	return karaDb;
}

export function getUserDb() {
	return userDb;
}
