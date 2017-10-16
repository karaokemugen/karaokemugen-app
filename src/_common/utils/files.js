import {exists, existsSync, readFile, mkdir} from 'fs';
import {promisify} from 'util';
import {parse, resolve, sep} from 'path';
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

/** Chemin de l'application. */
export const appPath = locateAppPath();

/**
 * Détermine le chemin de l'application :
 * - Si l'application est compilée, on utilise le répertoire de "process.argv[0]".
 * - Si l'application est lancée depuis les sources, on remonte "__dirname" jusqu'à trouver le fichier 'package.json'.
 */
function locateAppPath() {
	if (process.pkg) {
		const execInfos = parse(process.argv[0]);
		return resolve(execInfos.dir);
	}

	let path = __dirname;
	let packageFile = resolve(path, 'package.json');
	while ((!existsSync(packageFile)) && path !== '' && path !== sep) {
		path = resolve(path, '..');
		packageFile = resolve(path, 'package.json');
	}

	return path;
}

export async function asyncCheckOrMkdir(dir) {
	const resolvedDir = resolve(appPath, dir);
	if (!await asyncExists(resolvedDir)) {
		logger.warn('Creating folder ' + resolvedDir);
		return await asyncMkdir(resolvedDir);
	}
}
