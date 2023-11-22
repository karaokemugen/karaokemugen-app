import fs from 'fs/promises';
import { load as yamlLoad } from 'js-yaml';
import { resolve } from 'path';

import { saveSetting } from '../lib/dao/database.js';
import { Repository, RepositoryBasic, RepositoryManifestV2 } from '../lib/types/repo.js';
import { getConfig } from '../lib/utils/config.js';
import logger from '../lib/utils/logger.js';
import { editSetting } from '../utils/config.js';
import { getState } from '../utils/state.js';

const service = 'RepoDAO';

const repoManifests: Map<string, RepositoryManifestV2> = new Map();

export function selectRepos(publicView: false): Repository[];
export function selectRepos(publicView: true): RepositoryBasic[];
export function selectRepos(publicView: boolean): Repository[] | RepositoryBasic[];
export function selectRepos(): Repository[];
export function selectRepos(publicView = false): Repository[] | RepositoryBasic[] {
	const repos = getConfig().System.Repositories;
	if (publicView) {
		return repos.map<RepositoryBasic>(r => {
			return {
				Name: r.Name,
				Online: r.Online,
				Enabled: r.Enabled,
			};
		});
	}
	return repos;
}

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
	const conf = getConfig();
	const repos = conf.System.Repositories;
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

export async function readRepoManifest(repoName: string) {
	const repo = selectRepos().filter(e => e.Name === repoName)[0];
	const manifestFile = resolve(getState().dataPath, repo.BaseDir, 'repo.yml');
	let manifest: RepositoryManifestV2;
	try {
		const repoyml = await fs.readFile(manifestFile, 'utf-8');
		manifest = yamlLoad(repoyml) as RepositoryManifestV2;
	} catch (err) {
		logger.warn(`No manifest found for ${repoName}`, { service });
		manifest = {
			name: repoName,
			description: null,
		};
	}
	repoManifests.set(repoName, manifest);
}

export function selectRepositoryManifest(repoName: string) {
	return repoManifests.get(repoName);
}
