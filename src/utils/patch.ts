import execa from 'execa';
import extract from 'extract-zip';
import { promises as fs } from 'fs';
import { move, remove } from 'fs-extra';
import { resolve } from 'path';

import { initHooks, stopWatchingHooks } from '../lib/dao/hook';
import { DiffChanges, Repository } from '../lib/types/repo';
import { resolvedPath } from '../lib/utils/config';
import { downloadFile } from '../lib/utils/downloader';
import { getFilesRecursively } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import { computeFileChanges } from '../lib/utils/patch';
import Task from '../lib/utils/taskManager';
import { getState } from './state';

async function extractZip(path: string, outDir: string, task: Task): Promise<string> {
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
				total: zipFile.entryCount,
			});
		},
	});
	return firstDir;
}

export async function downloadAndExtractZip(zipURL: string, outDir: string, repo: string) {
	const task = new Task({
		text: 'DOWNLOADING_ZIP',
		data: repo,
	});
	try {
		logger.debug(`Downloading ${repo} archive`, { service: 'Zip' });
		const target = resolve(resolvedPath('Temp'), `base-${repo}.zip`);
		await downloadFile({ filename: target, url: zipURL }, task, `${repo} zip:`);
		logger.debug(`Extracting ${repo} archive to ${outDir}`, { service: 'Zip' });
		const tempDir = resolvedPath('Temp');
		task.update({
			text: 'EXTRACTING_ZIP',
			data: repo,
		});
		const dir = await extractZip(target, tempDir, task);
		await stopWatchingHooks();
		await remove(outDir);
		await move(resolve(tempDir, dir), outDir);
		await initHooks();
	} catch (err) {
		logger.error(`Unable to download and extract ${repo} zip`, { service: 'Zip', obj: err });
		throw err;
	} finally {
		task.end();
	}
}

export async function writeFullPatchedFiles(fullFiles: DiffChanges[], repo: Repository) {
	const path = resolve(getState().dataPath, repo.BaseDir);
	const filePromises = [];
	for (const change of fullFiles) {
		const file = resolve(path, change.path);
		if (change.type === 'delete') {
			filePromises.push(
				fs.unlink(file).catch(err => {
					logger.warn(`Non fatal: Removing file ${file} failed`, { service: 'Patch', obj: err });
				})
			);
		} else {
			filePromises.push(fs.writeFile(file, change.contents, 'utf-8'));
		}
	}
	await Promise.all(filePromises);
}

export async function applyPatch(patch: string, dir: string) {
	try {
		const patchProcess = execa(
			getState().binPath.patch,
			[
				'-p1',
				'-N',
				'-f',
				`--directory=${resolve(getState().dataPath, dir)}`,
				`--reject-file=${resolve(resolvedPath('Temp'), 'patch.rej')}`,
			],
			{ stdio: 'pipe' }
		);
		patchProcess.stdin.write(`${patch}\n`);
		patchProcess.stdin.end();
		await patchProcess;
		return computeFileChanges(patch);
	} catch (err) {
		logger.warn('Cannot apply patch from server, fallback to other means', { service: 'DiffPatch', obj: err });
		try {
			const rejectedPatch = await fs.readFile(resolve(resolvedPath('Temp'), 'patch.rej'), 'utf-8');
			logger.debug(`Rejected patch : ${rejectedPatch}`, { service: 'DiffPatch' });
		} catch (err2) {
			logger.debug(`Could not get rejected patch : ${err2}`, { service: 'DiffPatch', obj: err2 });
		}
		throw err;
	}
}

/** Removes all .orig files after a failed patch attempt */
export async function cleanFailedPatch(repo: Repository) {
	logger.info("Removing .orig files from repository's base dir", { service: 'DiffPatch' });
	const deletePromises = [];
	const files = await getFilesRecursively(resolve(getState().dataPath, repo.BaseDir), '.orig');
	// We want to clean the .orig files. The damaged ones will get replaced anyway.
	for (const file of files) {
		deletePromises.push(fs.unlink(file));
	}
	await Promise.all(deletePromises);
	logger.info(`Removed ${files.length} .orig files`, { service: 'DiffPatch' });
}
