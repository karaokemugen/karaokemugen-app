import execa from 'execa';
import extract from 'extract-zip';
import { move, remove } from 'fs-extra';
import { resolve } from 'path';

import { resolvedPathTemp } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { downloadFiles } from '../services/download';
import Sentry from './sentry';
import { getState } from './state';

// This is only used in cli mode, without a worker available
async function extractZip(path: string, outDir: string, task: Task): Promise<string>  {
	let firstDir: string;
	await extract(path, {
		dir: outDir,
		onEntry: (entry, zipFile) => {
			if (entry.crc32 === 0 && !firstDir) {
				firstDir = entry.fileName.slice(0, entry.fileName.length - 1);
			}
			task.update({
				subtext: entry.fileName,
				value: zipFile.entriesRead,
				total: zipFile.entryCount
			});
		}
	});
	return firstDir;
}

export async function downloadAndExtractZip(zipURL: string, outDir: string, repo: string) {
	logger.debug(`Downloading ${repo} archive`, {service: 'Zip'});
	const task = new Task({
		text: 'DOWNLOADING_ZIP',
		data: repo
	});
	try {
		const target = resolve(resolvedPathTemp(), `base-${repo}.zip`);
		await downloadFiles(null, [{ filename: target, url: zipURL, id: repo }], task);
		logger.debug(`Extracting ${repo} archive to ${outDir}`, {service: 'Zip'});
		const tempDir = resolvedPathTemp();
		task.update({
			text: 'EXTRACTING_ZIP',
			data: repo
		});
		const dir = await extractZip(target, tempDir, task);
		await remove(outDir);
		await move(resolve(tempDir, dir), outDir);
	} catch(err) {
		logger.error('Unable to download and extract ${repo} zip : ${err}', {service: 'Zip', obj: err});
		throw err;
	} finally {
		task.end();
	}
}

const patchRegex = /^a\/.+ b\/(.+)\n(index|new file|deleted file)/m;
const KTidRegex = /"[kt]id": *"(.+)"/;

function computeFileChanges(patch: string) {
	const patches = patch.split('diff --git ')
		.slice(1)
		.map<{ type: 'new' | 'delete', path: string, uid?: string }>((v) => {
			const result = v.match(patchRegex);
			const uid = v.match(KTidRegex);
			if (!result) {
				throw new Error('Cannot find diff header, huh.');
			}
			return {
				type: result[2] === 'deleted file' ? 'delete':'new',
				path: result[1],
				uid: uid ? uid[1]:undefined
			};
		});
	// Remove delete patches that have a corresponding new entry (renames)
	const newPatches = patches.filter(p => p.type === 'new');
	return patches.filter(p => !(p.type === 'delete' && newPatches.findIndex(p2 => p.uid === p2.uid) !== -1));
}

export async function applyPatch(patch: string, dir: string) {
	try {
		const patchProcess = execa(getState().binPath.patch, [
			'-p1', '-N', '-f',
			`--directory=${resolve(getState().dataPath, dir)}`,
			`--reject-file=${resolve(resolvedPathTemp(), 'patch.rej')}`
		], {stdio: 'pipe'});
		patchProcess.stdin.write(`${patch}\n`);
		patchProcess.stdin.end();
		await patchProcess;
		return computeFileChanges(patch);
	} catch (err) {
		logger.warn('Cannot apply patch from server, fallback to zip full 	download', {service: 'DiffPatch', obj: err});
		Sentry.addErrorInfo('patch', patch);
		Sentry.error(err, 'Warning');
		throw err;
	}
}
