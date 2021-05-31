import { app, ipcMain } from 'electron';
import execa from 'execa';
import { move, remove } from 'fs-extra';
import { resolve } from 'path';
import { Worker } from 'worker_threads';

import { zipWorker } from '../electron/electron';
import { resolvedPathTemp } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import Downloader from './downloader';
import { getState } from './state';

export async function downloadAndExtractZip(zipURL: string, outDir: string, repo: string) {
	logger.debug(`Downloading ${repo} archive to ${outDir}`, {service: 'Zip'});
	await remove(outDir);
	let worker: Worker;
	const task = new Task({
		text: 'DOWNLOADING_ZIP',
		data: repo
	});
	const downloader = new Downloader({ task });
	const target = resolve(resolvedPathTemp(), `base-${repo}.zip`);
	const errors = await downloader.download([{ filename: target, url: zipURL }]);
	task.end();
	if (errors.length > 0) {
		throw new Error('ZIP Download failed');
	}
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
		if (app) {
			ipcMain.on('unzipProgress', (_event, data) => updateTask(data));
			ipcMain.on('unzipEnd', (_event, data) => {
				if (data.error) {
					reject(new Error('Cannot unzip archive, please see zip worker logs.'));
				} else {
					task.end();
					move(resolve(options.outDir, data.outDir), outDir).then(resolvePromise, reject);
				}
			});
			zipWorker.webContents.send('unzip', options);
		} else {
			worker = new Worker(resolve(getState().resourcePath, 'zipWorker/zipWorker.js'));
			worker.on('message', data => {
				if (data.type === 'unzipProgress') {
					updateTask(data.message);
				} else if (data.type === 'unzipEnd') {
					task.end();
					move(resolve(options.outDir, data.message), resolve(options.outDir, repo)).then(resolvePromise, reject);
				} else if (data.type === 'unzipError') {
					task.end();
					reject(data.message);
				}
			});
			worker.postMessage({ type: 'unzip', data: options });
		}
	});
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
		logger.warn('Cannot apply patch from server, fallback to zip full download', {service: 'DiffPatch', obj: err});
		// throw err;
	}
}
