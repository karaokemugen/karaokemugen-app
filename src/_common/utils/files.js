import {exists, readFile, rename, unlink} from 'fs';
import {remove, mkdirp} from 'fs-extra';
import {promisify} from 'util';
import {resolve} from 'path';
import logger from './logger';

/** Fonction de vérification d'existence d'un fichier renvoyant une Promise.*/
export function asyncExists(file) {
	return promisify(exists)(file);
}

/** Fonction de lecture d'un fichier renvoyant une Promise.*/
export function asyncReadFile(...args) {
	return promisify(readFile)(...args);
}

export function asyncMkdirp(...args) {
	return promisify(mkdirp)(...args);
}

export function asyncRemove(...args) {
	return promisify(remove)(...args);
}

export function asyncRename(...args) {
	return promisify(rename)(...args);
}

export function asyncUnlink(...args) {
	return promisify(unlink)(...args);
}


/** Fonction vérifiant la présence d'un fichier requis, levant une exception s'il n'est pas trouvé. */
export async function asyncRequired(file) {
	const exists = await asyncExists(file);
	if (!exists) {
		throw 'File \'' + file + '\' does not exist';
	}
}

export async function asyncCheckOrMkdir(...dir) {
	const resolvedDir = resolve(...dir);
	if (!await asyncExists(resolvedDir)) {
		logger.warn('Creating folder ' + resolvedDir);
		return await asyncMkdirp(resolvedDir);
	}
}
