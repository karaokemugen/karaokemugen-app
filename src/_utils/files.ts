import {createWriteStream, exists, readFile, readdir, rename, unlink, stat, writeFile} from 'fs';
import {remove, mkdirp, copy, move} from 'fs-extra';
import {promisify} from 'util';
import {resolve} from 'path';
import logger from './logger';
import {mediaFileRegexp, imageFileRegexp} from '../_services/constants';
import fileType from 'file-type';
import readChunk from 'read-chunk';
import {createHash, HexBase64Latin1Encoding} from 'crypto';
import sanitizeFilename from 'sanitize-filename';
import deburr from 'lodash.deburr';
import { getState } from './state';

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
		'×': 'x',
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
		.replace(/[△:\/☆★†↑½♪＊*∞♥❤♡⇄♬]/g, ' ')
		.replace(/…/,'...')
		.replace(/\+/,' Plus ')
		.replace(/\?\?/,' question_mark 2')
		.replace(/\?/,' question_mark ')
		.replace(/^\./,'')
		.replace(/♭/,' Flat ')
		.replace(replaceRegExp, input => {
			return replaceMap[input];
		})
	;
	// Remove all diacritics and other non-ascii characters we might have left
	// Also, remove useless spaces.
	file = deburr(file)
		.replace(/[^\x00-\xFF]/g, ' ' )
		.replace(/ [ ]+/g,' ')
	;
	// One last go using sanitizeFilename just in case.
	file = sanitizeFilename(file);
	return file;
}

export async function detectFileType(file) {
	const buffer = await readChunk(file, 0, 4100);
	const detected = fileType(buffer);
	return detected.ext;
}

const passThroughFunction = (fn, args) => {
	if(!Array.isArray(args)) args = [args];
	return promisify(fn)(...args);
};

export const asyncExists = (file) => passThroughFunction(exists, file);
export const asyncReadFile = (...args) => passThroughFunction(readFile, args);
export const asyncReadDir = (...args) => passThroughFunction(readdir, args);
export const asyncMkdirp = (...args) => passThroughFunction(mkdirp, args);
export const asyncRemove = (...args) => passThroughFunction(remove, args);
export const asyncRename = (...args) => passThroughFunction(rename, args);
export const asyncUnlink = (...args) => passThroughFunction(unlink, args);
export const asyncCopy = (...args) => passThroughFunction(copy, args);
export const asyncStat = (...args) => passThroughFunction(stat, args);
export const asyncWriteFile = (...args) => passThroughFunction(writeFile, args);
export const asyncMove = (...args) => passThroughFunction(move, args);

export const isImageFile = (fileName) => new RegExp(imageFileRegexp).test(fileName);
export const isMediaFile = (fileName) => new RegExp(mediaFileRegexp).test(fileName);

const filterValidFiles = (files) => files.filter(file => !file.startsWith('.') && isMediaFile(file));
export const filterMedias = (files) => filterValidFiles(files);
export const filterImages = (files) => filterValidFiles(files);

export const checksum = (str: string, algorithm: string = 'md5', encoding: HexBase64Latin1Encoding = 'hex') => createHash(algorithm)
	.update(str, 'utf8')
	.digest(encoding);

/** Function used to verify if a required file exists. It throws an exception if not. */
export async function asyncRequired(file: string) {
	if (!await asyncExists(file)) throw `File "${file}" does not exist`;
}

export async function asyncCheckOrMkdir(...dir: string[]) {
	const resolvedDir = resolve(...dir);
	if (!await asyncExists(resolvedDir)) {
		if (logger) logger.debug(`[File] Creating folder ${resolvedDir}`);
		return await asyncMkdirp(resolvedDir);
	}
}

export async function isGitRepo(dir: string) {
	const dirContents = await asyncReadDir(dir);
	return dirContents.includes('.git');
}

/**
 * Searching file in a list of folders. If the file is found, we return its complete path with resolve.
 */
export async function resolveFileInDirs(filename: string, dirs: string[]) {
	const resolvedFile = dirs
		.map((dir) => resolve(getState().appPath, dir, filename))
		.find((resolvedFile) => asyncExists(resolvedFile));

	if (!resolvedFile) throw `File "${filename}" not found in any listed directory: ${dirs}`;

	return resolvedFile;
}

/** Replacing extension in filename */
export function replaceExt(filename: string, newExt: string) {
	return filename.replace(/\.[^.]+$/, newExt);
}

async function compareFiles(file1: string, file2: string) {
	const files = [file1, file2];

	let [file1exists, file2exists] = await Promise.all(files.map(file => asyncExists(file)));
	if (!file1exists || !file2exists) {
		return false;
	}

	const [file1data, file2data] = await Promise.all(files.map((file) => asyncReadFile(file, 'utf-8')));

	return file1data === file2data;
}

async function compareAllFiles(files: string[], dir1: string, dir2: string) {
	return await Promise.all(files.filter((file) => !compareFiles(resolve(dir1, file), resolve(dir2, file))));
}

export async function compareDirs(dir1: string, dir2: string) {

	const [dir1List, dir2List] = await Promise.all([
		asyncReadDir(dir1),
		asyncReadDir(dir2)
	]);

	const newFiles = dir2List.filter((file) => !dir1List.includes(file));
	const commonFiles = dir2List.filter((file) => dir1List.includes(file));
	const removedFiles = dir1List.filter((file) => !dir2List.includes(file));

	const updatedFiles = await compareAllFiles(commonFiles, dir1, dir2);
	return {
		newFiles,
		commonFiles,
		removedFiles,
		updatedFiles
	};
}

export async function asyncReadDirFilter(dir: string, ext: string) {
	const dirListing = await asyncReadDir(dir);
	return dirListing.filter(file => file.endsWith(ext) && !file.startsWith('.')).map(file => resolve(dir, file));
}

export function writeStreamToFile(stream, filePath: string) {
	return new Promise((resolve, reject) => {
		const file = createWriteStream(filePath);
		stream.pipe(file);
		stream.on('end', () => resolve());
		stream.on('error', (err) => reject(err));
	});
}
