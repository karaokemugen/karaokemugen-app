import AdmZip from 'adm-zip';
import { execa } from 'execa';
import { promises as fs } from 'fs';
import { move, remove } from 'fs-extra';
import parallel from 'p-map';
import { resolve } from 'path';

import { DiffChanges, Repository } from '../lib/types/repo.js';
import { resolvedPath } from '../lib/utils/config.js';
import { downloadFile } from '../lib/utils/downloader.js';
import { getFilesRecursively } from '../lib/utils/files.js';
import logger from '../lib/utils/logger.js';
import { computeFileChanges } from '../lib/utils/patch.js';
import Task from '../lib/utils/taskManager.js';
import { getState } from './state.js';

const service = 'Patch';

async function extractZip(path: string, outDir: string, task: Task): Promise<string> {
	let firstDir: string;
	const zip = new AdmZip(path);
	zip.getEntries().forEach((entry, entriesRead, { length: entryCount }) => {
		if (entry.isDirectory) {
			if (!firstDir) {
				firstDir = entry.entryName.slice(0, -1);
			}
		} else {
			zip.extractEntryTo(entry, outDir);
		}
		task.update({
			subtext: entry.entryName,
			value: entriesRead,
			total: entryCount,
		});
	});
	return firstDir;
}

export async function downloadAndExtractZip(zipURL: string, outDir: string, repo: string) {
	const task = new Task({
		text: 'DOWNLOADING_ZIP',
		data: repo,
	});
	try {
		logger.debug(`Downloading ${repo} archive`, { service });
		const target = resolve(resolvedPath('Temp'), `base-${repo}.zip`);
		await downloadFile({ filename: target, url: zipURL }, task, `${repo} zip:`);
		logger.debug(`Extracting ${repo} archive to ${outDir}`, { service });
		const tempDir = resolvedPath('Temp');
		task.update({
			text: 'EXTRACTING_ZIP',
			data: repo,
		});
		const dir = await extractZip(target, tempDir, task);
		await remove(outDir);
		await move(resolve(tempDir, dir), outDir);
	} catch (err) {
		logger.error(`Unable to download and extract ${repo} zip`, { service, obj: err });
		throw err;
	} finally {
		task.end();
	}
}

export async function writeFullPatchedFiles(fullFiles: DiffChanges[], repo: Repository) {
	const path = resolve(getState().dataPath, repo.BaseDir);
	const filePromises = [];
	const filesModified = {
		unlinked: 0,
		written: 0,
	};
	const changes = [];
	for (const change of fullFiles) {
		const file = resolve(path, change.path);
		if (change.type === 'delete') {
			filePromises.push(
				fs.unlink(file).catch(err => {
					logger.warn(`Non fatal: Removing file ${file} failed`, { service, obj: err });
				})
			);
			filesModified.unlinked += 1;
		} else {
			changes.push({
				file,
				contents: change.contents,
			});
			filesModified.written += 1;
		}
	}
	await Promise.all(filePromises);
	const mapper = async (data: { file: string; contents: string }) => {
		return fs.writeFile(data.file, data.contents, 'utf-8');
	};
	await parallel(changes, mapper, {
		stopOnError: true,
		concurrency: 32,
	});
	logger.info(`Wrote ${filesModified.written} and deleted ${filesModified.unlinked} files`, { service });
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
		logger.warn('Cannot apply patch from server, fallback to other means', { service, obj: err });
		try {
			const rejectedPatch = await fs.readFile(resolve(resolvedPath('Temp'), 'patch.rej'), 'utf-8');
			logger.debug(`Rejected patch : ${rejectedPatch}`, { service });
		} catch (err2) {
			logger.debug(`Could not get rejected patch : ${err2}`, { service, obj: err2 });
		}
		throw err;
	}
}

/** Removes all .orig files after a failed patch attempt */
export async function cleanFailedPatch(repo: Repository) {
	logger.info("Removing .orig files from repository's base dir", { service });
	const deletePromises = [];
	const files = await getFilesRecursively(resolve(getState().dataPath, repo.BaseDir), '.orig');
	// We want to clean the .orig files. The damaged ones will get replaced anyway.
	for (const file of files) {
		deletePromises.push(fs.unlink(file));
	}
	await Promise.all(deletePromises);
	logger.info(`Removed ${files.length} .orig files`, { service });
}
