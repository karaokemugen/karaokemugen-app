import { selectRepos } from '../dao/repo';

/** Get all repositories in database */
export async function getRepos() {
	return await selectRepos();
}