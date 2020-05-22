import { selectRepos, deleteRepo, updateRepo, insertRepo } from '../dao/repo';
import { relativePath, asyncCheckOrMkdir, asyncExists, extractAllFiles, asyncMoveAll } from '../lib/utils/files';
import { resolve, basename } from 'path';
import { getState } from '../utils/state';
import { Repository } from '../lib/types/repo';
import { getConfig, setConfig, deleteOldPaths } from '../lib/utils/config';
import cloneDeep = require('lodash.clonedeep');
import { Tag } from '../lib/types/tag';
import { readAllTags, readAllKaras } from '../lib/services/generation';
import { tagTypes } from '../lib/utils/constants';
import { KaraTag } from '../lib/types/kara';
import { getTag } from './tag';
import logger from '../lib/utils/logger';
import { compareKarasChecksum, generateDB } from '../dao/database';
import { getRemoteKaras } from './download';

type UUIDSet = Set<string>

/** Get all repositories in database */
export function getRepos() {
	return selectRepos();
}

/** Get single repository */
export function getRepo(name: string) {
	return selectRepos()
		.filter((r: Repository) => r.Name === name)[0];
}

/** Remove a repository */
export function removeRepo(name: string) {
	deleteRepo(name);
	logger.info(`[Repo] Removed ${name}`);
}

/** Add a repository. Folders will be created if necessary */
export async function addRepo(repo: Repository) {
	if (repo.Online) {
		// Testing if repository is reachable
		const karas = await getRemoteKaras(repo.Name, {from: 1, size: 1});
		if (karas.content.length === 0) throw 'Repository unreachable. Did you mispell its name?';
	}
	insertRepo(repo);
	await checkRepoPaths(repo);
	logger.info(`[Repo] Added ${repo.Name}`);
}

/** Edit a repository. Folders will be created if necessary */
export async function editRepo(name: string, repo: Repository) {
	const oldRepo = getRepo(name);
	if (!oldRepo.Online && repo.Online) {
		// Testing if repository is reachable
		const karas = await getRemoteKaras(repo.Name, {from: 1, size: 1});
		if (karas.content.length === 0) throw 'Repository unreachable. Did you mispell its name?';
	}
	updateRepo(repo, name);
	await checkRepoPaths(repo);
	if (oldRepo.Enabled !== repo.Enabled) {
		generateDB(true);
		compareKarasChecksum(true);
	}
	logger.info(`[Repo] Updated ${name}`);
}

async function checkRepoPaths(repo: Repository) {
	const checks = [];
	for (const path of Object.keys(repo.Path)) {
		repo.Path[path].forEach((dir: string) => checks.push(asyncCheckOrMkdir(resolve(getState().dataPath, dir))));
	}
	return Promise.all(checks);
}

/** Find any unused medias in a repository */
export async function findUnusedMedias(repo: string): Promise<string[]> {
	let [karaFiles, mediaFiles] = await Promise.all([
		extractAllFiles('Karas', repo),
		extractAllFiles('Medias', repo)
	]);
	const karas = await readAllKaras(karaFiles, false);
	karas.forEach(k => {
		mediaFiles = mediaFiles.filter(file => basename(file) !== k.mediafile);
	});
	return mediaFiles;
}

/** Find any unused tags in a repository */
export async function findUnusedTags(repo: string): Promise<Tag[]> {
	const [karaFiles, tagFiles] = await Promise.all([
		extractAllFiles('Karas', repo),
		extractAllFiles('Tags', repo)
	]);
	const karas = await readAllKaras(karaFiles, false);
	const tags = await readAllTags(tagFiles);
	const tids: UUIDSet = new Set();
	tags.forEach(t => tids.add(t.tid));
	for (const kara of karas) {
		for (const tagType of Object.keys(tagTypes)) {
			if (kara[tagType]) kara[tagType].forEach((t: KaraTag) => tids.delete(t.tid));
		}
	}
	// Now tids only has tag IDs which aren't used anywhere
	const tagsToDelete: Tag[] = [];
	for (const tid of tids) {
		tagsToDelete.push(await getTag(tid));
	}
	return tagsToDelete;
}

/** Migrate old data architecture to the new one */
export async function migrateOldFoldersToRepo() {
	/* We're assuming that kara.moe is the standard repo everyone has
	1) This instance is fresh : no dataPath/data should exist, exit immediately
	2) There is something in config.Path.Karas, Medias, Lyrics, Series and/or Tags : assume we have a customized install
	3) dataPath/data exists, and there is nothing in config.Path.Karas => this is a standard KM instance, in this case we overwrite the kara.moe paths with these
	*/
	const conf = getConfig();
	const state = getState();
	// Case 1
	if (!await asyncExists(resolve(state.dataPath, 'data/')) &&
		!conf.System.Path.Karas &&
		!conf.System.Path.Medias &&
		!conf.System.Path.Lyrics &&
		!conf.System.Path.Series &&
		!conf.System.Path.Tags) {
		logger.info('[Repo] Initialization - Fresh start configuration');
		return;
	}
	// Case 2
	if ((conf.System.Path.Karas && conf.System.Path.Karas.length > 0) ||
		(conf.System.Path.Lyrics && conf.System.Path.Lyrics.length > 0) ||
		(conf.System.Path.Medias && conf.System.Path.Medias.length > 0) ||
		(conf.System.Path.Series && conf.System.Path.Series.length > 0) ||
		(conf.System.Path.Tags && conf.System.Path.Tags.length > 0)
	) {
		logger.info('[Repo] Initialization - Customized configuration');
		const repos = cloneDeep(conf.System.Repositories);
		repos[0].Path.Karas = [].concat(conf.System.Path.Karas);
		repos[0].Path.Lyrics = [].concat(conf.System.Path.Lyrics);
		repos[0].Path.Series = [].concat(conf.System.Path.Series);
		repos[0].Path.Tags = [].concat(conf.System.Path.Tags);
		repos[0].Path.Medias = [].concat(conf.System.Path.Medias);

		// Treat all secondary targets as local repository and remove them from first (kara.moe) repository
		for (const type of Object.keys(repos[0].Path)) {
			if (repos[0].Path[type].length > 1) {
				repos[1].Path[type] = repos[0].Path[type].filter((_: any, i: number) => i > 0);
				repos[0].Path[type] = repos[0].Path[type].filter((_: any, i: number) => i === 0);
			}
		}
		deleteOldPaths();
		setConfig({
			System: {
				Repositories: cloneDeep(repos),
			}
		});
	}
	// Case 3
	if (await asyncExists(resolve(state.dataPath, 'data/')) &&
		!await asyncExists(resolve(state.dataPath, conf.System.Repositories[0].Path.Karas[0]))) {
		logger.info('[Repo] Initialization - KM <3.2 configuration');
		const repos = cloneDeep(conf.System.Repositories);
		repos[0].Path.Karas = ['data/karaokes'];
		repos[0].Path.Lyrics = ['data/lyrics'];
		repos[0].Path.Series = ['data/series'];
		repos[0].Path.Tags = ['data/tags'];
		repos[0].Path.Medias = ['data/medias'];
		deleteOldPaths();
		setConfig({
			System: {
				Repositories: cloneDeep(repos),
			}
		});
	}
}

export async function consolidateRepo(repoName: string, newPath: string) {
	try {
		const repo = getRepo(repoName);
		const state = getState();
		if (!repo) throw 'Unknown repository';
		if (!await asyncExists(newPath)) throw 'Directory not found';
		logger.info(`[Repo] Moving ${repoName} repository to ${newPath}...`);
		for (const dir of repo.Path.Karas) {
			await asyncMoveAll(resolve(state.dataPath, dir), resolve(newPath, 'karaokes/'));
		}
		for (const dir of repo.Path.Lyrics) {
			await asyncMoveAll(resolve(state.dataPath, dir), resolve(newPath, 'lyrics/'));
		}
		for (const dir of repo.Path.Series) {
			await asyncMoveAll(resolve(state.dataPath, dir), resolve(newPath, 'series/'));
		}
		for (const dir of repo.Path.Tags) {
			await asyncMoveAll(resolve(state.dataPath, dir), resolve(newPath, 'tags/'));
		}
		for (const dir of repo.Path.Medias) {
			await asyncMoveAll(resolve(state.dataPath, dir), resolve(newPath, 'medias/'));
		}
		repo.Path.Karas = [relativePath(state.dataPath, resolve(newPath, 'karaokes/'))];
		repo.Path.Lyrics = [relativePath(state.dataPath, resolve(newPath, 'lyrics/'))];
		repo.Path.Medias = [relativePath(state.dataPath, resolve(newPath, 'medias/'))];
		repo.Path.Series = [relativePath(state.dataPath, resolve(newPath, 'series/'))];
		repo.Path.Tags = [relativePath(state.dataPath, resolve(newPath, 'tags/'))];
		await editRepo(repoName, repo);
	} catch(err) {
		logger.error(`[Repo] Failed to move repo ${name} : ${err}`);
		throw err;
	}
}
