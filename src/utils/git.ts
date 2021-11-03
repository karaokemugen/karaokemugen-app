import i18next from 'i18next';
import { resolve } from 'path';
import simpleGit, { SimpleGit, SimpleGitProgressEvent } from 'simple-git';
import { DefaultLogFields } from 'simple-git/src/lib/tasks/log';
import { ListLogLine } from 'simple-git/typings/response';
import which from 'which';

import { asyncExists } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { Commit } from '../types/repo';

interface GitOptions {
	baseDir: string,
	url?: string,
	username?: string,
	password?: string,
	repoName?: string
}

type LogFieldsWithId = DefaultLogFields & {id: number};

interface LogResult<T = LogFieldsWithId> {
	all: ReadonlyArray<T & ListLogLine>;
	total: number;
	latest: (T & ListLogLine) | null;
}

export default class Git {
	git: SimpleGit
	opts: GitOptions
	task: Task
	repoName: string

	constructor(opts: GitOptions) {
		this.opts = {
			baseDir: opts.baseDir,
			url: opts.url,
			username: opts.username,
			password: opts.password,
			repoName: opts.repoName
		};
	}

	progressHandler({method, stage, progress}: SimpleGitProgressEvent) {
		// Yeah we're redifining the text because we have to use method or else typescript is screaming at me and I don't like its voice.
		if (this.task) this.task.update({
			text: `${this.repoName}: ${i18next.t('GIT.CURRENT_ACTION')} - ${i18next.t('GIT.METHODS.'+method)}`,
			subtext: `${i18next.t('GIT.STAGES.'+stage)}`,
			value: progress
		});
	}

	private getFormattedURL() {
		const url = new URL(this.opts.url);
		url.username = this.opts.username;
		url.password = this.opts.password;
		return url.href;
	}

	async setup() {
		const gitPath = await which(`git${process.platform === 'win32' ? '.exe':''}`);
		this.git = simpleGit({
			baseDir: this.opts.baseDir,
			binary: gitPath,
			progress: this.progressHandler.bind(this)
		});
		// Check if Remote is correctly configured
		const remotes = await this.git.getRemotes(true);
		const origin = remotes.find(r => r.name === 'origin');
		const url = this.getFormattedURL();
		if (!origin) await this.git.addRemote('origin', url);
		if (origin && (origin.refs.fetch !== url || origin.refs.push !== url)) {
			console.log('rebuild remote');
			await this.git.removeRemote('origin');
			await this.git.addRemote('origin', url);
			await this.git.branch(['--set-upstream-to=origin/master', 'master']);
		}
	}

	isGit() {
		return asyncExists(resolve(this.opts.baseDir, '.git'));
	}

	async getCurrentCommit() {
		const show = await this.git.show();
		const commit = show.split('\n')[0].split(' ')[1];
		return commit;
	}

	async wipeChanges() {
		await this.git.checkout(['--force', 'HEAD']);
		await this.git.clean('f');
	}

	reset(ref?: string) {
		const options = ref ? [ref] : ['--hard', 'origin/master'];
		return this.git.reset(options);
	}

	async stashList(): Promise<LogResult> {
		// We need to add a ref number to all stashes because simple-git doesn't.
		// That would be... too simple.
		const stashes = await this.git.stashList();
		stashes.all = stashes.all.map((obj, i) => {
			return {...obj, id: i};
		});
		return stashes as LogResult;
	}

	diff(fromCommit?: string, toCommit?: string) {
		const options = [
			'-p',
			'--minimal',
			'--no-renames',
			'-U0'
		];
		if (fromCommit && toCommit) options.push(`${fromCommit}..${toCommit}`);
		return this.git.diff(options);
	}

	abortPull() {
		return this.git.rebase(['--abort']);
	}

	stash(commit?: Commit) {
		logger.debug('Stashing stuff', {service: 'Git'});
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
		logger.debug('Unstashing stuff', {service: 'Git'});
		return this.git.stash([
			'pop',
			`stash@{${ref}}`
		]);
	}

	stashDrop(ref: number) {
		logger.debug('Dropping stash', {service: 'Git'});
		return this.git.stash([
			'drop',
			`stash@{${ref}}`
		]);
	}

	fetch() {
		logger.debug('Fetching...', {service: 'Git'});
		return this.git.fetch();
	}

	pull() {
		logger.debug('Pulling...', {service: 'Git'});
		return this.git.pull('origin', 'master', ['--rebase']);
	}

	async push() {
		logger.debug('Pushing...', {service: 'Git'});
		this.task = new Task({
			text: `${this.repoName}: ${i18next.t('GIT.CURRENT_ACTION')} - ${i18next.t('GIT.METHODS.push')}`,
			value: 0,
			total: 100
		});
		await this.git.push('origin','master');
		this.task.end();
	}

	async clone() {
		logger.debug(`Cloning ${this.opts.url} into ${this.opts.baseDir}`, {service: 'Git'});
		this.task = new Task({
			text: `${this.repoName}: ${i18next.t('GIT.CURRENT_ACTION')} - ${i18next.t('GIT.METHODS.clone')}`,
			value: 0,
			total: 100
		});
		const ret = await this.git.clone(this.opts.url, '.');
		this.task.end();
		return ret;
	}

	/** Call this when user */
	async configUser(author: string, email: string) {
		await this.git.addConfig('user.name', author);
		await this.git.addConfig('user.email', email);
	}

	/** Call this when repo has changed its settings */
	async setRemote() {
		if (!this.opts.username || !this.opts.password) throw 'Username and/or password empty';
		return this.git.remote([
			'set-url',
			'origin',
			this.getFormattedURL()
		]);
	}

	async rm(file: string) {
		logger.debug(`Removing ${file}`, {service: 'Git'});
		// We use rmKeepLocal but the files have already been deleted, this is just to remove them from the index
		return this.git.rmKeepLocal(file);
	}

	// Add all files (including untracked)
	async addAll() {
		logger.debug('Staging all files', {service: 'Git'});
		return this.git.raw(['add', '-A']);
	}

	async add(file: string) {
		logger.debug(`Adding ${file}`, {service: 'Git'});
		return this.git.add(file);
	}

	async commit(message: string, extraOptions?: any) {
		logger.debug(`Creating commit "${message}"`, {service: 'Git', obj: extraOptions});
		return this.git.commit(message, undefined, extraOptions);
	}

	async show(path: string) {
		return this.git.show(path);
	}

	async status() {
		const status = await this.git.status();
		// Who thought it was a good idea to surround filenames with " ?
		status.not_added.forEach((s, i) => status.not_added[i] = s.replace(/"/g, ''));
		status.modified.forEach((s, i) => status.modified[i] = s.replace(/"/g, ''));
		status.created.forEach((s, i) => status.created[i] = s.replace(/"/g, ''));
		status.deleted.forEach((s, i) => status.deleted[i] = s.replace(/"/g, ''));
		status.conflicted.forEach((s, i) => status.conflicted[i] = s.replace(/"/g, ''));
		return status;
		/**
		 * Example return, putting this here for reference later, did a quick test and it returned this
StatusSummary {
  not_added: [ 'tools/checknew_bakaclub/package.json' ],
  conflicted: [],
  created: [],
  deleted: [],
  modified: [],
  renamed: [],
  files: [
    FileStatusSummary {
      path: 'tools/checknew_bakaclub/package.json',
      index: '?',
      working_dir: '?'
    }
  ],
  staged: [],
  ahead: 0,
  behind: 0,
  current: 'master',
  tracking: 'origin/master'
}
	*/
	}
}
