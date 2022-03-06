import { RepositoryMaintainerSettings } from '../lib/types/repo';
import HTTP from '../lib/utils/http';
import logger from '../lib/utils/logger';
import { editRepo, getRepo } from '../services/repo';

/** Assign someone to an issue */
export async function assignIssue(issue: number, repoName: string) {
	let repo = getRepo(repoName);
	if (!repo.MaintainerMode) throw 'Maintainer mode is not enabled for this repository';
	const url = new URL(repo.Git.URL);
	const userID = await getUserID(repoName);
	const params = {
		assignee_id: userID,
	};
	if (!repo.Git.ProjectID) {
		// Editing the repo should trigger
		repo = (await editRepo(repo.Name, repo)) as RepositoryMaintainerSettings;
	}
	await HTTP.put(`${url.protocol}//${url.hostname}/api/v4/projects/${repo.Git.ProjectID}/issues/${+issue}`, params, {
		headers: {
			'PRIVATE-TOKEN': repo.Git.Password,
			'Content-Type': 'application/json',
		},
		timeout: 25000,
	});
}

/** Get user ID from username */
export async function getUserID(repoName: string) {
	try {
		const repo = getRepo(repoName);
		if (!repo.MaintainerMode) throw 'Maintainer mode is not enabled for this repository';
		const url = new URL(repo.Git.URL);
		const res = await HTTP.get(`${url.protocol}//${url.hostname}/api/v4/users`, {
			params: {
				username: repo.Git.Username,
			},
			headers: {
				'PRIVATE-TOKEN': repo.Git.Password,
				'Content-Type': 'application/json',
			},
			timeout: 25000,
		});
		return res.data[0].id;
	} catch (err) {
		logger.error('Unable to get assign user to an issue', { service: 'Gitlab', obj: err });
		throw err;
	}
}

/** Close an issue */
export async function closeIssue(issue: number, repoName: string) {
	try {
		let repo = getRepo(repoName);
		const params = {
			state_event: 'close',
		};
		if (!repo.MaintainerMode) throw 'Maintainer mode is not enabled for this repository';
		const url = new URL(repo.Git.URL);
		if (!repo.Git.ProjectID) {
			// Editing the repo should trigger
			await editRepo(repo.Name, repo);
			repo = getRepo(repoName) as RepositoryMaintainerSettings;
		}
		const closeIssueURL = `${url.protocol}//${url.hostname}/api/v4/projects/${repo.Git.ProjectID}/issues/${issue}`;
		logger.debug(`Close Issue URL: ${closeIssueURL}`, { service: 'Gitlab' });
		await HTTP.put(closeIssueURL, params, {
			headers: {
				'PRIVATE-TOKEN': repo.Git.Password,
				'Content-Type': 'application/json',
			},
			timeout: 25000,
		});
	} catch (err) {
		logger.error('Unable to close issue', { service: 'Gitlab', obj: err });
		throw err;
	}
}
