import { Repository } from '../lib/types/repo';
import { getConfig, setConfig } from '../lib/utils/config';

export function selectRepos() {
	return getConfig().System.Repositories;
}

export function insertRepo(repo: Repository) {
	const repos = getConfig().System.Repositories;
	const i = repos.findIndex(r => r.Name === repo.Name);
	if (i > 0) throw 'Repository with this name already exists';
	repos.push(repo);
	setConfig({ System: { Repositories: repos }
	});
}

export function updateRepo(repo: Repository, name: string) {
	const conf = getConfig();
	const repos = conf.System.Repositories;
	if (repo.Name !== name) {
		const i = repos.findIndex(r => r.Name === repo.Name);
		if (i > 0) throw 'Repository with this new name already exists';
	}
	const i = repos.findIndex(r => r.Name === name);
	if (i < 0) throw 'Repository not found';
	repos[i] = repo;
	setConfig({ System: { Repositories: repos}});
}

export function deleteRepo(name: string) {
	const conf = getConfig();
	const repos = conf.System.Repositories;
	const repoIndex = repos.findIndex(r => r.Name === name);
	delete repos[repoIndex];
	setConfig({ System: { Repositories: repos}});
}