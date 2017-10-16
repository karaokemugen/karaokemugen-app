import {exists, mkdir, readFile} from 'fs';
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

export function asyncMkdir(...args) {
	return promisify(mkdir)(...args);
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
		return await asyncMkdir(resolvedDir);
	}
}
