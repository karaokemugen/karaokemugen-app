import {selectRepos} from '../dao/repo';

export async function getRepos() {
	return await selectRepos();
}