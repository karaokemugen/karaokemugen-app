import {exists, readFile, readdir, rename, unlink, stat, writeFile} from 'fs';
import {remove, mkdirp, copy, move} from 'fs-extra';
import {promisify} from 'util';
import {resolve} from 'path';
import logger from 'winston';

/** Fonction de vérification d'existence d'un fichier renvoyant une Promise.*/
export function asyncExists(file) {
	return promisify(exists)(file);
}

/** Fonction de lecture d'un fichier renvoyant une Promise.*/
export function asyncReadFile(...args) {
	return promisify(readFile)(...args);
}

export function asyncReadDir(...args) {
	return promisify(readdir)(...args);
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

export function asyncCopy(...args) {
	return promisify(copy)(...args);
}

export function asyncStat(...args) {
	return promisify(stat)(...args);
}

export function asyncWriteFile(...args) {
	return promisify(writeFile)(...args);
}

export function asyncMove(...args) {
	return promisify(move)(...args);
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

/**
 * Recherche d'un fichier dans une liste de répertoirs. Si le fichier est trouvé,
 * on renvoie son chemin complet (avec 'resolve').
 * Important: on suppose que les chemins des répertoires en paramètre sont eux-même déjà résolus.
 */
export async function resolveFileInDirs(filename, dirs) {
	for (const dir of dirs) {
		const resolved = resolve(dir, filename);
		if (await asyncExists(resolved)) {
			return resolved;
		}
	}
	throw 'File \'' + filename + '\' not found in any listed directory: ' + dirs;
}

export function filterVideos(files) {
	return files.filter(file => !file.startsWith('.') && isVideoFile(file));
}

export function isVideoFile(filename) {
	return filename.endsWith('.mp4') ||
		filename.endsWith('.webm') ||
		filename.endsWith('.avi') ||
		filename.endsWith('.mkv');
}

/** Remplacement de l'extension dans un nom de fichier. */
export function replaceExt(filename, newExt) {
	return filename.replace(/\.[^.]+$/, newExt);
}