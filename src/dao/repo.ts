import { cloneDeep } from 'lodash';
import { saveSetting } from '../lib/dao/database.js';
import { Repository } from '../lib/types/repo.js';
import { getConfig } from '../lib/utils/config.js';
import { editSetting } from '../utils/config.js';
import { getState } from '../utils/state.js';

export function insertRepo(repo: Repository) {
	const repos = getConfig().System.Repositories;
	const i = repos.findIndex(r => r.Name === repo.Name);
	if (i > 0) throw 'Repository with this name already exists';
	repos.push(repo);
	editSetting({ System: { Repositories: repos } });
	// Reset the last commit setting in DB for the repo
	saveSetting(`commit-${repo.Name}`, null);
}

export function updateRepo(repo: Repository, name: string) {
	const repos = cloneDeep(getConfig().System.Repositories);
	if (repo.Name !== name) {
		const i = repos.findIndex(r => r.Name === repo.Name);
		if (i > 0) throw 'Repository with this new name already exists';
	}
	const i = repos.findIndex(r => r.Name === name);
	if (getState().DBReady) {
		// Reset the last commit setting in DB for the repo (for both names)
		saveSetting(`commit-${name}`, null);
		saveSetting(`commit-${repo.Name}`, null);
	}
	if (i < 0) throw 'Repository not found';
	repos[i] = repo;
	editSetting({ System: { Repositories: repos } });
}

export function deleteRepo(name: string) {
	const repos = getConfig().System.Repositories;
	const repoIndex = repos.findIndex(r => r.Name === name);
	repos[repoIndex] = null;
	// Reset the last commit setting in DB for the repo
	saveSetting(`commit-${name}`, null);
	editSetting({ System: { Repositories: repos } });
}
