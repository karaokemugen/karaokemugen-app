import {selectRepos} from '../_dao/repo';

export async function getRepos() {
	return await selectRepos();
}