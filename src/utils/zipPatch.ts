import { ipcMain } from 'electron';
import execa from 'execa';
import extract from 'extract-zip';
import { move, remove } from 'fs-extra';
import { resolve } from 'path';

import { zipWorker } from '../electron/electron';
import { resolvedPathTemp } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { downloadFiles } from '../services/download';
import { getState } from './state';

// This is only used in cli mode, without a worker available
async function extractZip(path: string, outDir: string): Promise<string>  {
	let firstDir: string;
	await extract(path, {
		dir: outDir,
		onEntry: (entry) => {
			if (entry.crc32 === 0 && !firstDir) {
				firstDir = entry.fileName.slice(0, entry.fileName.length - 1);
			}
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
	const target = resolve(resolvedPathTemp(), `base-${repo}.zip`);
	await downloadFiles(null, [{ filename: target, url: zipURL, id: repo }], task);
	task.end();
	logger.debug(`Extracting ${repo} archive to ${outDir}`, {service: 'Zip'});
	if (getState().opt.cli) {
		const tempDir = resolvedPathTemp();
		const dir = await extractZip(target, tempDir);
		await remove(outDir);
		await move(resolve(tempDir, dir), outDir);
	} else {
		return new Promise<void>((resolvePromise, reject) => {
			const options = { path: target, outDir: resolvedPathTemp() };
			const task = new Task({
				text: 'EXTRACTING_ZIP',
				data: repo
			});
			const updateTask = (payload) => {
				if (payload.zip === target) {
					task.update({
						subtext: payload.filename,
						value: payload.current,
						total: payload.total
					});
				}
			};
			ipcMain.on('unzipProgress', (_event, data) => updateTask(data));
			ipcMain.on('unzipEnd', (_event, data) => {
				if (data.error) {
					reject(data.error);
				} else {
					remove(outDir).then(() => {
						move(resolve(options.outDir, data.outDir), outDir).then(resolvePromise, reject);
					});
				}
				task.end();
			});
			zipWorker.webContents.send('unzip', options);
		});
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
		throw err;
	}
}
