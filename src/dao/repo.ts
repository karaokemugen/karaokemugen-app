import { cloneDeep } from 'lodash';
import { saveSetting } from '../lib/dao/database.js';
import { Repository } from '../lib/types/repo.js';
import { getConfig } from '../lib/utils/config.js';
import { editConfig } from '../utils/config.js';
import { getState } from '../utils/state.js';

export async function insertRepo(repo: Repository) {
	const repos = getConfig().System.Repositories;
	if (repos.some(r => r.Name === repo.Name)) throw 'Repository with this name already exists';
	await editConfig({ System: { Repositories: [...repos, repo] } });
	// Reset the last commit setting in DB for the repo
	saveSetting(`commit-${repo.Name}`, null);
}

export async function updateRepo(repo: Repository, name: string) {
	const repos = cloneDeep(getConfig().System.Repositories);
	if (repo.Name !== name && repos.some(r => r.Name === repo.Name)) {
		throw 'Repository with this new name already exists';
	}
	const i = repos.findIndex(r => r.Name === name);
	if (getState().DBReady) {
		// Reset the last commit setting in DB for the repo (for both names)
		saveSetting(`commit-${name}`, null);
		saveSetting(`commit-${repo.Name}`, null);
	}
	if (i < 0) throw 'Repository not found';
	repos[i] = repo;
	await editConfig({ System: { Repositories: repos } });
}

export async function deleteRepo(name: string) {
	const repos = getConfig().System.Repositories.filter(r => r.Name !== name);
	// Reset the last commit setting in DB for the repo
	saveSetting(`commit-${name}`, null);
	await editConfig({ System: { Repositories: repos } });
}
