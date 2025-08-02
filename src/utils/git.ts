import i18next from 'i18next';
import { resolve } from 'path';
import { DefaultLogFields, ListLogLine, SimpleGit, simpleGit, SimpleGitProgressEvent } from 'simple-git';

import { Repository } from '../lib/types/repo.js';
import { ErrorKM } from '../lib/utils/error.js';
import { fileExists } from '../lib/utils/files.js';
import logger from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import { getRepo } from '../services/repo.js';
import { Commit } from '../types/repo.js';
import { getKeyFileName, getKnownHostsFileName, updateKnownHostsFile } from './ssh.js';
import { getState } from './state.js';

const service = 'Git';

/** Determine if folder is a git repository */
export function isGit(repo: Repository) {
	return fileExists(resolve(getState().dataPath, repo.BaseDir, '.git'));
}

interface GitOptions {
	baseDir: string;
	url?: string;
	username?: string;
	password?: string;
	repoName?: string;
}

type LogFieldsWithId = DefaultLogFields & { id: number };

interface LogResult<T = LogFieldsWithId> {
	all: ReadonlyArray<T & ListLogLine>;
	total: number;
	latest: (T & ListLogLine) | null;
}

export default class Git {
	git: SimpleGit;

	opts: GitOptions;

	keyFile: string;
	knownHostsFile: string;

	task: Task;

	constructor(opts: GitOptions) {
		this.opts = {
			baseDir: opts.baseDir,
			url: opts.url,
			username: opts.username,
			password: opts.password,
			repoName: opts.repoName,
		};
	}

	progressHandler({ method, stage, progress }: SimpleGitProgressEvent) {
		// Yeah we're redifining the text because we have to use method or else typescript is screaming at me and I don't like its voice.
		if (this.task) {
			this.task.update({
				text: `${this.opts.repoName}: ${i18next.t('GIT.CURRENT_ACTION')} - ${i18next.t(
					`GIT.METHODS.${method}`
				)}`,
				subtext: `${i18next.t(`GIT.STAGES.${stage}`)}`,
				value: progress,
			});
		}
	}

	isSshUrl() {
		/* eslint security/detect-unsafe-regex: 0 */
		return /^(?:([a-z_][a-z0-9_]{0,30})@)?((?:[a-z0-9-_]+\.)+[a-z0-9]+)(?::([0-9]{0,5}))?([^\0\n]+)?$/.test(
			this.opts.url.toLowerCase()
		);
	}

	private getFormattedURL() {
		if (this.isSshUrl()) {
			return this.opts.url;
		} else {
			const url = new URL(this.opts.url);
			url.username = this.opts.username;
			url.password = this.opts.password;
			return url.href;
		}
	}

	/** Prepare git instance */
	async setup(configChanged = false) {
		const repo = getRepo(this.opts.repoName);
		const simpleGitOpts = {
			baseDir: this.opts.baseDir,
			unsafe: {
				allowUnsafeCustomBinary: true,
			},
			progress: this.progressHandler.bind(this),
			config: ['core.autocrlf=true', `user.name=${repo.Git.Author}`, `user.email=${repo.Git.Email}`],
		};
		const url = this.getFormattedURL();
		if (this.isSshUrl()) {
			this.keyFile = getKeyFileName(this.opts.repoName);
			this.knownHostsFile = getKnownHostsFileName(this.opts.repoName);
			await updateKnownHostsFile(url, this.opts.repoName);
			// We're adding stricthostkeychecking=no here because it causes problems for some users. This is not safe but with gitlab.com or github.com it should be safe to trust and avoid future issues.
			// We might consider making it an option in the future.
			// As a result the known hosts file is not needed anymore for now, we can clean this up later by remove code if we don't make it an option.
			simpleGitOpts.config.push(
				`core.sshCommand=ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile="${this.knownHostsFile}" -i "${this.keyFile}"`
			);
		}
		logger.debug(`Git options: ${JSON.stringify(simpleGitOpts)}`, { service, obj: simpleGitOpts });
		this.git = simpleGit(simpleGitOpts);
		if (configChanged) {
			logger.info('Setting remotes', { service });
			// Check if Remote is correctly configured
			const remotes = await this.git.getRemotes(true);
			const origin = remotes.find(r => r.name === 'origin');
			if (!origin) await this.git.addRemote('origin', url);
			if (origin && (origin.refs.fetch !== url || origin.refs.push !== url)) {
				logger.debug(`${this.opts.repoName}: Rebuild remote`, { service });
				await this.setRemote();
				await this.git.branch([`--set-upstream-to=origin/${repo.Git.Branch}`, repo.Git.Branch]);
			}
		}
	}

	/** Returns the second word of the first line of a git show to determine latest commit */
	async getCurrentCommit() {
		const show = await this.git.show();
		return show.split('\n')[0].split(' ')[1];
	}

	async wipeChanges() {
		await this.git.checkout(['--force', 'HEAD']);
		await this.git.clean('f');
	}

	async diffFile(file: string) {
		return this.git.diff(['--ignore-cr-at-eol', 'HEAD', file]);
	}

	reset(ref?: string[]) {
		const options = ref || [];
		return this.git.reset(options);
	}

	async stashList(): Promise<LogResult> {
		// We need to add a ref number to all stashes because simple-git doesn't.
		// That would be... too simple.
		const stashes = await this.git.stashList();
		stashes.all = stashes.all.map((obj, i) => {
			return { ...obj, id: i };
		});
		return stashes as LogResult;
	}

	diff(fromCommit?: string, toCommit?: string) {
		const options = ['-p', '--minimal', '--no-renames', '-U0', '--ignore-cr-at-eol'];
		if (fromCommit && toCommit) options.push(`${fromCommit}..${toCommit}`);
		return this.git.diff(options);
	}

	abortPull() {
		return this.git.rebase(['--abort']);
	}

	stash(commit?: Commit) {
		logger.debug('Stashing stuff', { service });
		// -u = stash untracked files as well
		const options = ['push', '-u'];
		if (commit) {
			options.push(`-m [KMStash] ${commit.message}`);
			options.push('--');
			for (const file of commit.addedFiles) {
				options.push(`${file}`);
			}
			for (const file of commit.removedFiles) {
				options.push(`${file}`);
			}
		}
		return this.git.stash(options);
	}

	stashPop(ref: number) {
		logger.debug('Unstashing stuff', { service });
		return this.git.stash(['pop', `stash@{${ref}}`]);
	}

	stashDrop(ref: number) {
		logger.debug('Dropping stash', { service });
		return this.git.stash(['drop', `stash@{${ref}}`]);
	}

	fetch() {
		logger.debug('Fetching...', { service });
		return this.git.fetch();
	}

	pull() {
		logger.debug('Pulling...', { service });
		return this.git.pull(['--rebase']);
	}

	async push(branch: string) {
		logger.debug('Pushing...', { service });
		this.task = new Task({
			text: `${this.opts.repoName}: ${i18next.t('GIT.CURRENT_ACTION')} - ${i18next.t('GIT.METHODS.push')}`,
			value: 0,
			total: 100,
		});
		try {
			await this.git.push('origin', branch);
		} catch (err) {
			throw err;
		} finally {
			this.task.end();
		}
	}

	async clone() {
		logger.debug(`Cloning ${this.opts.url} into ${this.opts.baseDir}`, { service });
		this.task = new Task({
			text: `${this.opts.repoName}: ${i18next.t('GIT.CURRENT_ACTION')} - ${i18next.t('GIT.METHODS.clone')}`,
			value: 0,
			total: 100,
		});
		try {
			const cmdlineOpts = { '--depth': 1 };
			const ret = await this.git.clone(this.opts.url, '.', cmdlineOpts);
			return ret;
		} catch (err) {
			throw err;
		} finally {
			this.task.end();
		}
	}

	// Call when user changes their name/mail.
	async configUser(author: string, email: string) {
		await this.git.addConfig('user.name', author);
		await this.git.addConfig('user.email', email);
	}

	/** Call this when repo has changed its settings */
	async setRemote() {
		if (!this.isSshUrl() && (!this.opts.username || !this.opts.password)) throw 'Username and/or password empty';
		return this.git.remote(['set-url', 'origin', this.getFormattedURL()]);
	}

	async rm(file: string) {
		logger.debug(`Removing ${file}`, { service });
		// We use rmKeepLocal but the files have already been deleted, this is just to remove them from the index
		return this.git.rmKeepLocal(file);
	}

	// Add all files (including untracked)
	async addAll() {
		logger.debug('Staging all files', { service });
		return this.git.raw(['add', '-A']);
	}

	async add(file: string) {
		logger.debug(`Adding ${file}`, { service });
		return this.git.add(file);
	}

	async commit(message: string, extraOptions?: any) {
		logger.debug(`Creating commit "${message}"`, { service, obj: extraOptions });
		return this.git.commit(message, undefined, extraOptions);
	}

	async show(path: string) {
		return this.git.show(path);
	}

	async status() {
		const status = await this.git.status();
		// Who thought it was a good idea to surround filenames with " ?
		status.not_added.forEach((s, i) => (status.not_added[i] = s.replace(/"/g, '')));
		status.modified.forEach((s, i) => (status.modified[i] = s.replace(/"/g, '')));
		status.created.forEach((s, i) => (status.created[i] = s.replace(/"/g, '')));
		status.deleted.forEach((s, i) => (status.deleted[i] = s.replace(/"/g, '')));
		status.conflicted.forEach((s, i) => (status.conflicted[i] = s.replace(/"/g, '')));
		return status;
	}
}

export async function checkGitInstalled() {
	// Throws an error if git not installed
	const git = simpleGit();
	const version = await git.version();
	if (version.installed) {
		logger.debug(`Git installed as version : ${JSON.stringify(version)}`, { service });
	} else {
		logger.error('Git NOT installed (not foudn in path', { service });
		throw new ErrorKM('GIT_BINARY_NOT_FOUND', 500, false);
	}
}
