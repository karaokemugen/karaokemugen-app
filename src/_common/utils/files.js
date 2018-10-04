import {exists, readFile, readdir, rename, unlink, stat, writeFile} from 'fs';
import {remove, mkdirp, copy, move} from 'fs-extra';
import {promisify} from 'util';
import {resolve} from 'path';
import logger from './logger';
import {mediaFileRegexp, imageFileRegexp} from '../../_services/constants';
import fileType from 'file-type';
import readChunk from 'read-chunk';
import {getConfig} from './config';
import {createHash} from 'crypto';
import sanitizeFilename from 'sanitize-filename';
import deburr from 'lodash.deburr';

export function sanitizeFile(file) {
	const replaceMap = {
		'·': '.',
		'・': '.',
		'Λ': 'A',
		'Я': 'R',
		'³': '3',
		'²': '2',
		'°': '0',
		'θ': '0',
		'Ø': '0',
		'○': 'O',
		'×': 'X',
		'Φ': 'O',
		'±': '+',
		'∀': 'A'
	};
	const replaceRegExp = new RegExp('[' + Object.keys(replaceMap).join('') + ']', 'ig');
	// Romanizing japanese characters by their romanization
	// Also making some obvious replacements of things we often find in japanese names.
	file = file.replace(/ô/g,'ou')
		.replace(/Ô/g,'Ou')
		.replace(/û/g,'uu')
		.replace(/µ's/g,'Mu\'s')
		.replace(/®/g,'(R)')
		.replace(/∆/g,'Delta')
		.replace(/;/g,' ')
		.replace(/\[/g,' ')
		.replace(/\]/g,' ')
		.replace(/[△:\/☆★+×†↑½♪＊*∞♥❤♡⇄♬]/g, ' ')
		.replace(/…/,'...')
		.replace(replaceRegExp, input => {
			return replaceMap[input];
		})
	;
	// Remove all diacritics and other non-ascii characters we might have left
	// Also, remove useless spaces.
	file = deburr(file)
		.replace(/[^\x00-\xFF]/g, ' ' )
		.replace(/ [ ]+/,' ')
	;
	// One last go using sanitizeFilename just in case.
	file = sanitizeFilename(file);
	return file;
}

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
	if (!await asyncExists(file)) throw `File "${file}" does not exist`;
}

export async function asyncCheckOrMkdir(...dir) {
	const resolvedDir = resolve(...dir);
	if (!await asyncExists(resolvedDir)) {
		if (logger) logger.debug(`[File] Creating folder ${resolvedDir}`);
		return await asyncMkdirp(resolvedDir);
	}
}

export async function isGitRepo(dir) {
	const dirContents = await asyncReadDir(dir);
	return dirContents.includes('.git');
}

/**
 * Searching file in a list of folders. If the file is found, we return its complete path with resolve.
 */
export async function resolveFileInDirs(filename, dirs) {
	for (const dir of dirs) {
		const resolved = resolve(getConfig().appPath, dir, filename);
		if (await asyncExists(resolved)) {
			return resolved;
		}
	}
	throw `File "${filename}" not found in any listed directory: ${dirs}`;
}

export function filterMedias(files) {
	return files.filter(file => !file.startsWith('.') && isMediaFile(file));
}

export function isMediaFile(filename) {
	return new RegExp(mediaFileRegexp).test(filename);
}

export function filterImages(files) {
	return files.filter(file => !file.startsWith('.') && isImageFile(file));
}

export function isImageFile(filename) {
	return new RegExp(imageFileRegexp).test(filename);
}

/** Replacing extension in filename */
export function replaceExt(filename, newExt) {
	return filename.replace(/\.[^.]+$/, newExt);
}

export function checksum(str, algorithm, encoding) {
	return createHash(algorithm || 'md5')
		.update(str, 'utf8')
		.digest(encoding || 'hex');
}

export async function compareFiles(file1, file2) {
	if (!await asyncExists(file1) || !await asyncExists(file2)) return false;
	const [file1data, file2data] = await Promise.all([
		asyncReadFile(file1, 'utf-8'),
		asyncReadFile(file2, 'utf-8')
	]);
	return file1data === file2data;
}

async function compareAllFiles(files, dir1, dir2) {
	let updatedFiles = [];
	for (const file of files) {
		if (!await compareFiles(resolve(dir1, file), resolve(dir2, file))) updatedFiles.push(file);
	}
	return updatedFiles;
}

export async function compareDirs(dir1, dir2) {
	let newFiles = [];
	let removedFiles = [];
	let commonFiles = [];
	const [dir1List, dir2List] = await Promise.all([
		asyncReadDir(dir1),
		asyncReadDir(dir2)
	]);
	for (const file of dir2List) {
		if (!dir1List.includes(file)) {
			newFiles.push(file);
		} else {
			commonFiles.push(file);
		}
	}
	for (const file of dir1List) {
		if (!dir2List.includes(file)) {
			removedFiles.push(file);
		}
	}
	const updatedFiles = await compareAllFiles(commonFiles, dir1, dir2);
	return {
		updatedFiles: updatedFiles,
		commonFiles: commonFiles,
		removedFiles: removedFiles,
		newFiles: newFiles
	};
}