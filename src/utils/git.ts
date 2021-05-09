import {app, ipcMain} from 'electron';
import {remove} from 'fs-extra';
import walkDir from 'ignore-walk';
import { ReadCommitResult } from 'isomorphic-git';
import { resolve } from 'path';
import { Worker } from 'worker_threads';

import { gitWorker } from '../electron/electron';
import { resolvedPathRepos } from '../lib/utils/config';
import { asyncExists } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { getRepo } from '../services/repo';
import { DiffResult, GitOptions } from '../types/git';
import { getState } from './state';

const gitPhases = {
	'Updating workdir': 'UPDATING_WORKDIR',
	'Receiving objects': 'DOWNLOADING',
	'Resolving deltas': 'RESOLVING_DELTAS',
	'Compressing objects': 'DECOMPRESSING',
	'Analyzing workdir': 'ANALYZING_WORKDIR'
};

export default class GitInstance {
	url: string
	dir: string
	branch: string
	repo: string
	task: Task
	unknownPhases: Set<string>
	worker: Worker
	constructor(options: GitOptions) {
		this.url = options.url;
		this.dir = options.dir;
		this.branch = options.branch;
		this.repo = options.repo;
		this.task = new Task({
			text: 'UPDATING_GIT_REPO',
			data: this.repo
		});
		this.unknownPhases = new Set();
		if (app) {
			ipcMain.on('gitProgress', (_event: any, data: any) => {
				this.gitProgress(data);
			});
		} else {
			this.worker = new Worker(resolve(getState().resourcePath, 'gitWorker/gitWorker.js'));
		}
	}

	private gitProgress(data: any) {
		if (data.repo === this.repo) {
			if (!gitPhases[data.phase]) {
				this.unknownPhases.add(data.phase);
			}
			this.task.update({
				subtext: gitPhases[data.phase] || data.phase,
				value: +data.loaded,
				total: +data.total
			});
		}
	}

	isGitRepo() {
		return asyncExists(resolve(this.dir, '.git'));
	}

	async status(): Promise<ReadCommitResult> {
		const res = await this.sendCommand('log', {
			dir: this.dir,
			depth: 1
		});
		return res[0];
	}

	private async sendCommand(command: string, options: any): Promise<any> {
		const data = {
			command,
			options: {
				...options,
				repo: this.repo
			}
		};
		if (app) {
			gitWorker.webContents.send('git', data);
		} else {
			this.worker.postMessage(data);
		}

		return new Promise((resolve, reject) => {
			if (app) {
				ipcMain.on('gitEnd', (_event, data) => {
					if (data.repo === this.repo) {
						this.task.end();
						if (data.error) {
							logger.error(`Error from git worker : ${data.error}`, {service: 'Git'});
							reject(data.error);
						} else {
							resolve(data.res);
						}
					}
				});
			} else {
				this.worker.on('message', data => {
					if (data.type === 'gitEnd') {
						if (data.message.repo === this.repo) {
							this.task.end();
							if (data.message.error) {
								logger.error(`Error from git worker : ${data.message.error}`, {service: 'Git'});
								reject(data.error);
							} else {
								resolve(data.res);
							}
						}
					} else if (data.type === 'gitProgress') {
						this.gitProgress(data.message);
					}
				});
			}
		});
	}

	async clone() {
		logger.info(`${this.repo}: Cloning a new repository into ${this.dir}`, {service: 'Git'});
		await this.sendCommand('clone', {
			url: this.url,
			dir: this.dir,
			ref: this.branch,
			depth: 1,
			singleBranch: true,
		});
		logger.info(`${this.repo}: Clone finished`, {service: 'Git'});
	}

	async diff(commitA: string, commitB: string, keepEquals = false): Promise<DiffResult[]> {
		logger.info(`${this.repo}: Making a differential between commits ${commitA} and ${commitB}`, {service: 'Git'});
		let res = await this.sendCommand('walk', {
			dir: this.dir,
			commitA,
			commitB
		});
		// Do we only return new/modified/deleted files?
		if (!keepEquals) {
			res = res.filter((f: DiffResult) => f.type !== 'equal');
		}
		return res;
	}

	async checkout(filepaths: string[]) {
		logger.info(`${this.repo}: Checking out branch`, {service: 'Git'});
		await this.sendCommand('checkout', {
			url: this.url,
			dir: this.dir,
			ref: this.branch,
			singleBranch: true,
			force: true,
			filepaths
		});
	}

	/* Removes ALL files not in the current commit snapshot. Use with care and love. */
	async clean() {
		logger.info(`${this.repo}: Cleaning unneeded files`, {service: 'Git'});
		const commit = await this.status();
		const [gitFiles, localFiles] = await Promise.all([
			this.diff(commit.oid, commit.oid, true),
			walkDir({
				path: this.dir,
				includeEmpty: true
			})
		]);
		// Remove this repository's media files if they're not in the .gitignore already
		const mediaDirs = resolvedPathRepos('Medias', this.repo);
		const state = getState();
		const repo = getRepo(this.repo);
		// Get all gitfiles in the current tree by getting all equal files.
		const baseFiles = gitFiles
			.filter(f => f.type === 'equal')
			.map(f => f.path);
		// Remove all media files in case they've not been already ignored by .gitignore
		const myFiles = localFiles
			.filter(f => {
				for (const mediaDir of mediaDirs) {
					if (resolve(state.dataPath, repo.BaseDir, f).includes(mediaDir)) return false;
				}
				return true;
			})
			// Remove .git files
			.filter(f => !f.startsWith('.git'));
		const gitSet = new Set(baseFiles);
		const filesToDelete = myFiles.filter(f => !gitSet.has(f));
		for (const file of filesToDelete) {
			try {
				const fullPath = resolve(getState().dataPath, getRepo(this.repo).BaseDir, file);
				await remove(fullPath);
				logger.warn(`${this.repo}: Cleaned file ${file}`, {service: 'Git'});
			} catch(err) {
				logger.warn(`${this.repo}: Unable to clean file ${file}`, {service: 'Git', obj: err});
				// Non fatal
			}
		}
	}

	async pull() {
		logger.info(`${this.repo}: Pulling updates`, {service: 'Git'});
		await this.sendCommand('fastForward', {
			url: this.url,
			dir: this.dir,
			ref: this.branch,
			singleBranch: true
		});
		logger.info(`${this.repo}: Pulled latest commit`, {service: 'Git'});
	}
}
