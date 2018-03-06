import {exists, readFile, readdir, rename, unlink, stat, writeFile} from 'fs';
import {remove, mkdirp, copy, move} from 'fs-extra';
import {promisify} from 'util';
import {resolve} from 'path';
import logger from 'winston';
import {videoFileRegexp, imageFileRegexp} from '../../_services/constants';
import fileType from 'file-type';
import readChunk from 'read-chunk';

/** Function used to verify a file exists with a Promise.*/
export function asyncExists(file) {
	return promisify(exists)(file);
}

export async function detectFileType(file) {
	const buffer = await readChunk(file, 0, 4100);
	const detected = fileType(buffer);
	return detected.ext;	
}

/** Function used to read a file with a Promise */
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

/** Function used to verify if a required file exists. It throws an exception if not. */
export async function asyncRequired(file) {
	const exists = await asyncExists(file);
	if (!exists) {
		throw 'File \'' + file + '\' does not exist';
	}
}

export async function asyncCheckOrMkdir(...dir) {
	const resolvedDir = resolve(...dir);
	if (!await asyncExists(resolvedDir)) {
		logger.warn('[Launcher] Creating folder ' + resolvedDir);
		return await asyncMkdirp(resolvedDir);
	}
}

/**
 * Searching file in a list of folders. If the file is found, we return its complete path with resolve.
 * Beware: we believe the paths sent as arguments are already resolved.
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
	return new RegExp(videoFileRegexp).test(filename);
}

export function filterImages(files) {
	return files.filter(file => !file.startsWith('.') && isImageFile(file));
}

export function isImageFile(filename) {
	return new RegExp(imageFileRegexp).test(filename);
}

/** Remplacement de l'extension dans un nom de fichier. */
export function replaceExt(filename, newExt) {
	return filename.replace(/\.[^.]+$/, newExt);
}
