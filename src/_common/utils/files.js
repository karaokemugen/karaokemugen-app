import {open, read, exists, readFile, readdir, rename, unlink, stat, writeFile} from 'fs';
import {remove, mkdirp, copy, move} from 'fs-extra';
import {promisify} from 'util';
import {resolve} from 'path';
import logger from 'winston';
import {videoFileRegexp} from '../../_services/kara';

/** Function used to verify a file exists with a Promise.*/
export function asyncExists(file) {
	return promisify(exists)(file);
}

export async function detectFileType(file) {
	const asyncOpen = promisify(open);
	const fd = await asyncOpen(file,'r');
	let buffer = new Buffer(8);
	const asyncRead = promisify(read);
	await asyncRead(fd, buffer, 0, 8, 0)
	const shortStart = buffer.toString('hex',0,4);
	const longStart = buffer.toString('hex',0,8);
	logger.debug(`[FileType] File ${file} signature : ${longStart}`);
	switch(shortStart) {
	case 'ffd8ffdb':
	case 'ffd8ffe0': 
	case 'ffd8ffe1': 
		return 'jpg';				
	case '89504e47': 
		return 'png';
	case '47494638': 
		return 'gif';
	case '1a45dfa3': 
		return 'mkv';
	case '52494646': 
		return 'avi';
	}
	switch(longStart) {
	case '0000001866747970': 
		return 'mp4';
	}
	// Unable to detect
	return false;	
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

/** Remplacement de l'extension dans un nom de fichier. */
export function replaceExt(filename, newExt) {
	return filename.replace(/\.[^.]+$/, newExt);
}
