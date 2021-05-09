import { promises as fs } from 'fs';
import { copy, emptyDir } from 'fs-extra';
import { basename,resolve } from 'path';

import { compareKarasChecksum, generateDB } from '../dao/database';
import { editKaraInStore } from '../dao/dataStore';
import { updateDownloaded } from '../dao/download';
import { deleteRepo, insertRepo,selectRepos, updateRepo } from '../dao/repo';
import { refreshAll } from '../lib/dao/database';
import { refreshKaras } from '../lib/dao/kara';
import { writeKara } from '../lib/dao/karafile';
import { readAllKaras,readAllTags } from '../lib/services/generation';
import { Kara,KaraFileV4,KaraTag } from '../lib/types/kara';
import { Repository } from '../lib/types/repo';
import { Tag, TagFile } from '../lib/types/tag';
import { getConfig, resolvedPathRepos } from '../lib/utils/config';
import { tagTypes } from '../lib/utils/constants';
import { asyncCheckOrMkdir, asyncMoveAll, extractAllFiles, getFreeSpace, relativePath, resolveFileInDirs } from '../lib/utils/files';
import HTTP from '../lib/utils/http';
import logger, { profile } from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { DifferentChecksumReport } from '../types/repo';
import GitInstance from '../utils/git';
import sentry from '../utils/sentry';
import { getState } from '../utils/state';
import { createProblematicBLCSet } from './blacklist';
import { updateGitMedias } from './downloadUpdater';
import { getKaras } from './kara';
import { deleteKara, editKaraInDB, integrateKaraFile } from './karaManagement';
import { sendPayload } from './stats';
import { deleteTag, getTag, integrateTagFile } from './tag';

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
	if (!getRepo(name)) throw {code: 404};
	deleteRepo(name);
	logger.info(`Removed ${name}`, {service: 'Repo'});
}

/** Add a repository. Folders will be created if necessary */
export async function addRepo(repo: Repository) {
	if (repo.Online && !repo.MaintainerMode) {
		// Testing if repository is reachable
		try {
			const onlineInfo = await getRepoMetadata(repo.Name);		// This is the only info we need for now.
			repo.Git = onlineInfo?.Git;
		} catch(err) {
			throw {code: 404, msg: 'Repository unreachable. Did you mispell its name?'};
		}
	}
	insertRepo(repo);
	await checkRepoPaths(repo);
	// Let's git clone it if it has a git.
	if (repo.Git) await updateGitRepo(repo.Name);
	logger.info(`Added ${repo.Name}`, {service: 'Repo'});
}

export async function migrateReposToGit() {
	// Shut up typescript.
	const repos: any = getRepos().filter((r: any) => r.Path.Karas?.length > 0);
	for (const repo of repos) {
		// Determine basedir by going up one folder
		const git = new GitInstance({
			dir: resolve(getState().dataPath, repo.Path.Karas, '..'),
			url: null,
			branch: null,
			repo: repo.Name
		});
		if (await git.isGitRepo()) {
			//Already a git repo, put maintainer mode on
			repo.MaintainerMode = true;
		}
		const extraPath = repo.Online && !repo.MaintainerMode
			? '../git'
			: '..';
		repo.BaseDir = relativePath(getState().dataPath, resolve(getState().dataPath, repo.Path.Karas[0], extraPath));
		delete repo.Path.Karas;
		delete repo.Path.Lyrics;
		delete repo.Path.Tags;
		delete repo.Path.Series;
		await editRepo(repo.Name, repo, false)
			.catch(err => {
				logger.error(`Unable to migrate repo ${repo.Name} to git : ${err}`, {service: 'Repo', obj: err});
			});
	}
}

export async function updateAllGitRepos() {
	const repos = getRepos().filter(r => r.Online && !r.MaintainerMode);
	let doGenerate = false;
	logger.info('Updating all repositories', {service: 'Repo'});
	for (const repo of repos) {
		// Try to update metadata by editing the repo with itself
		try {
			await editRepo(repo.Name, repo, false);
			if (await updateGitRepo(repo.Name, false)) doGenerate = true;
		} catch(err) {
			logger.error(`Failed to update git repository for ${repo.Name}`, {service: 'Repo', object: err});
		}
	}
	logger.info('Finished updating all repositories', {service: 'Repo'});
	if (doGenerate) await generateDB();
	if (getConfig().App.FirstRun) {
		createProblematicBLCSet();
	}
}

export async function checkDownloadStatus(kids?: string[]) {
	profile('checkDownloadStatus');
	const karas = await getKaras({
		q: kids ? `k:${kids.join(',')}` : undefined
	});
	const mediasMissing = [];
	const mediasExisting = [];
	for (const kara of karas.content) {
		try {
			await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository));
			mediasExisting.push(kara.kid);

		} catch(err) {
			// Not found, switching to missing
			mediasMissing.push(kara.kid);
		}
	}
	if (mediasMissing.length > 0) {
		updateDownloaded(mediasMissing, 'MISSING');
	}
	if (mediasExisting.length > 0) {
		updateDownloaded(mediasExisting, 'DOWNLOADED');
	}
	profile('checkDownloadStatus');
}

export async function deleteMedia(kids?: string[], repo?: string, cleanRarelyUsed = false) {
	let q: string;
	if (kids?.length > 0) {
		q = `k:${kids.join(',')}`;
	} else if (repo) {
		q = `r:${repo}`;
	} else {
		throw {code: 400};
	}
	const karas = await getKaras({
		q: q
	});
	const deletedFiles: Set<string> = new Set();
	const deletePromises = [];
	for (const kara of karas.content) {
		let fullPath: string;
		try {
			fullPath = (await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository)))[0];
			let deleteFile = true;
			if (cleanRarelyUsed) {
				const oneMonthAgo = new Date();
				oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
				if (kara.lastplayed_at < oneMonthAgo) {
					logger.info(`Removing ${fullPath} because it's too old (${kara.lastplayed_at.toISOString()})`, {service: 'Repo'});
				} else {
					deleteFile = false;
				}
			}
			if (deleteFile) {
				deletePromises.push(fs.unlink(fullPath));
				deletedFiles.add(kara.mediafile);
			}
		} catch {
			// No file, let's continue.
			continue;
		}
	}
	await Promise.all(deletePromises);
	updateDownloaded(karas.content.map(k => k.kid), 'MISSING');
}

export async function updateGitRepo(name: string, refresh = true) {
	const repo = getRepo(name);
	if (!repo.Online || !repo.Git) throw 'Repository is not online/git!';
	logger.info(`Updating git repository for ${name}`, {service: 'Repo'});
	const git = new GitInstance({
		url: repo.Git.split('#')[0],
		branch: repo.Git.split('#')[1] || 'master',
		dir: resolve(getState().dataPath, repo.BaseDir),
		repo: name
	});
	if (!await git.isGitRepo()) {
		await newGitRepo(git, refresh);
		return true;
	} else {
		const commitA = await git.status();
		await git.checkout(['.']);
		await git.clean();
		try {
			await git.pull();
		} catch(err) {
			// Let's remove everything if git pull fails and start over
			await emptyDir(git.dir);
			await newGitRepo(git, refresh);
			return true;
		}
		const commitB = await git.status();
		if (commitA.oid === commitB.oid) return;
		const diff = await git.diff(commitA.oid, commitB.oid);
		// Now that we have our diff, let's work with what's changed.
		const tagFiles = diff.filter(f => f.path.endsWith('.tag.json'));
		const karaFiles = diff.filter(f => f.path.endsWith('.kara.json'));
		const TIDsToDelete = [];
		const tagPromises = [];
		for (const tagFile of tagFiles) {
			if (tagFile.type === 'add' || tagFile.type === 'modify') {
				tagPromises.push(integrateTagFile(resolve(resolvedPathRepos('Tags', name)[0], basename(tagFile.path)), false));
			} else {
				// Delete.
				const tag: TagFile = JSON.parse(tagFile.content);
				TIDsToDelete.push(tag.tag.tid);
			}
		}
		await Promise.all(tagPromises);
		const KIDsToDelete = [];
		for (const karaFile of karaFiles) {
			if (karaFile.type === 'add' || karaFile.type === 'modify') {
				await integrateKaraFile(resolve(resolvedPathRepos('Karaokes', name)[0], basename(karaFile.path)));
			} else {
				// Delete.
				const kara: KaraFileV4 = JSON.parse(karaFile.content);
				KIDsToDelete.push(kara.data.kid);
			}
		}
		const deletePromises = [];
		if (KIDsToDelete.length > 0) deletePromises.push(deleteKara(KIDsToDelete, false));
		if (TIDsToDelete.length > 0) {
			// Let's not remove tags in karas : it's already done anyway
			deletePromises.push(deleteTag(TIDsToDelete, {refresh: false, removeTagInKaras: false}));
		}
		await Promise.all(deletePromises);
		if ((KIDsToDelete.length > 0 ||
			TIDsToDelete.length > 0 ||
			tagFiles.length > 0 ||
			karaFiles.length > 0
		)) await refreshAll();
		if (getConfig().Online.AllowDownloads) await updateGitMedias(name);
	}
}

async function newGitRepo(git: GitInstance, refresh = true) {
	await git.clone();
	// We refresh only for clones as it's easier. For pulls however items are added individually.
	if (refresh) await generateDB();
}

/** Edit a repository. Folders will be created if necessary */
export async function editRepo(name: string, repo: Repository, refresh?: boolean) {
	const oldRepo = getRepo(name);
	if (!oldRepo) throw {code: 404};
	if (repo.Online && !repo.MaintainerMode) {
		// Testing if repository is reachable
		try {
			const onlineInfo = await getRepoMetadata(repo.Name);
			// This is the only info we need for now.
			if (!repo.MaintainerMode) {
				repo.Git = onlineInfo?.Git;
			}
		} catch(err) {
			throw {code: 404, msg: 'Repository unreachable. Did you mispell its name?'};
		}
	}
	updateRepo(repo, name);
	await checkRepoPaths(repo);
	if (oldRepo.Enabled !== repo.Enabled || refresh) {
		if (await compareKarasChecksum()) generateDB();
	}
	if (!oldRepo.SendStats && repo.SendStats) {
		sendPayload(repo.Name, repo.Name === getConfig().Online.Host);
	}
	logger.info(`Updated ${name}`, {service: 'Repo'});
}

export async function compareLyricsChecksums(repo1Name: string, repo2Name: string): Promise<DifferentChecksumReport[]> {
	if (!getRepo(repo1Name) || !getRepo(repo2Name)) throw {code: 404};
	// Get all files
	const task = new Task({
		text: 'COMPARING_LYRICS_IN_REPOS'
	});
	try {
		const [repo1Files, repo2Files] = await Promise.all([
			extractAllFiles('Karaokes', repo1Name),
			extractAllFiles('Karaokes', repo2Name)
		]);
		const [karas1, karas2] = await Promise.all([
			readAllKaras(repo1Files, false, task),
			readAllKaras(repo2Files, false, task)
		]);
		type KaraMap = Map<string, Kara>;
		const karas1Map: KaraMap = new Map();
		const karas2Map: KaraMap = new Map();
		karas1.forEach(k => karas1Map.set(k.kid, k));
		karas2.forEach(k => karas2Map.set(k.kid, k));
		const differentChecksums = [];
		karas1Map.forEach(kara1 => {
			const kara2 = karas2Map.get(kara1.kid);
			if (kara2) {
				if (kara2.subchecksum !== kara1.subchecksum) differentChecksums.push({
					kara1: kara1,
					kara2: kara2
				});
			}
		});
		return differentChecksums;
	} catch(err) {
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

export async function copyLyricsRepo(report: DifferentChecksumReport[]) {
	const task = new Task({
		text: 'COPYING_LYRICS_IN_REPOS',
		total: report.length
	});
	try {
		for (const karas of report) {
			task.update({
				subtext: karas.kara2.subfile
			});
			// Copying kara1 data to kara2
			karas.kara2.subchecksum = karas.kara1.subchecksum;
			karas.kara2.isKaraModified = true;
			const writes = [];
			writes.push(writeKara(karas.kara2.karafile, karas.kara2));
			const sourceLyrics = await resolveFileInDirs(karas.kara1.subfile, resolvedPathRepos('Lyrics', karas.kara1.repository));
			const destLyrics = await resolveFileInDirs(karas.kara2.subfile, resolvedPathRepos('Lyrics', karas.kara2.repository));
			writes.push(copy(sourceLyrics[0], destLyrics[0], { overwrite: true }));
			writes.push(editKaraInDB(karas.kara2, { refresh: false }));
			await Promise.all(writes);
			editKaraInStore(karas.kara2.karafile);
			task.incr();
		}
		refreshKaras();
	} catch(err) {
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

function checkRepoPaths(repo: Repository) {
	const checks = [];
	for (const path of Object.keys(repo.Path)) {
		repo.Path[path].forEach((dir: string) => checks.push(asyncCheckOrMkdir(resolve(getState().dataPath, dir))));
	}
	checks.push(asyncCheckOrMkdir(resolve(getState().dataPath, repo.BaseDir)));
	return Promise.all(checks);
}

/** Find any unused medias in a repository */
export async function findUnusedMedias(repo: string): Promise<string[]> {
	if (!getRepo(repo)) throw {code: 404};
	const task = new Task({
		text: 'FINDING_UNUSED_MEDIAS'
	});
	try {
		const [karaFiles, mediaFiles] = await Promise.all([
			extractAllFiles('Karaokes', repo),
			extractAllFiles('Medias', repo)
		]);
		const karas = await (readAllKaras(karaFiles, false, task));
		const mediasFilesKaras: string[] = karas.map(k => k.mediafile);
		return mediaFiles.filter(file => !mediasFilesKaras.includes(basename(file)));
	} catch(err) {
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

/** Get metadata. Returns null if KM Server is not up to date */
export async function getRepoMetadata(repo: string): Promise<Repository> {
	const ret = await HTTP.get(`https://${repo}/api/karas/repository`);
	if (ret.statusCode === 404) return null;
	return JSON.parse(ret.body);
}

/** Find any unused tags in a repository */
export async function findUnusedTags(repo: string): Promise<Tag[]> {
	if (!getRepo(repo)) throw {code: 404};
	const task = new Task({
		text: 'FINDING_UNUSED_TAGS'
	});
	try {
		const [karaFiles, tagFiles] = await Promise.all([
			extractAllFiles('Karaokes', repo),
			extractAllFiles('Tags', repo)
		]);
		task.update({
			total: karaFiles.length + tagFiles.length
		});
		const karas = await readAllKaras(karaFiles, false, task);
		const tags = await readAllTags(tagFiles, task);
		task.update({
			total: 0
		});
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
			const tag = await getTag(tid);
			if (tag) {
				tag.tagfile = tagFiles.filter(path => path.includes(tag.tagfile))[0];
				tagsToDelete.push(tag);
			}
		}
		// Return all valid tags
		return tagsToDelete;
	} catch(err) {
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

export async function consolidateRepo(repoName: string, newPath: string) {
	const task = new Task({
		text: 'CONSOLIDATING_REPO',
		subtext:  repoName
	});
	try {
		const repo = getRepo(repoName);
		const state = getState();
		if (!repo) throw 'Unknown repository';
		await asyncCheckOrMkdir(newPath);
		logger.info(`Moving ${repoName} repository to ${newPath}...`, {service: 'Repo'});
		const moveTasks = [];
		const git = new GitInstance({
			url: null,
			branch: null,
			repo: null,
			dir: resolve(state.dataPath, repo.BaseDir)
		});
		let newDataPath = newPath;
		if (await git.isGitRepo()) {
			newDataPath = resolve(newPath, 'git');
		}
		moveTasks.push(asyncMoveAll(resolve(state.dataPath, repo.BaseDir), newDataPath));
		repo.BaseDir = relativePath(state.dataPath, newDataPath);
		for (const dir of repo.Path.Medias) {
			moveTasks.push(asyncMoveAll(resolve(state.dataPath, dir), resolve(newPath, 'medias/')));
		}
		await Promise.all(moveTasks);
		repo.Path.Medias = [relativePath(state.dataPath, resolve(newPath, 'medias/'))];
		await editRepo(repoName, repo, true);
	} catch(err) {
		logger.error(`Failed to move repo ${repoName}`, {service: 'Repo', obj: err});
		throw err;
	} finally {
		task.end();
	}
}

export async function getRepoFreeSpace(repoName: string) {
	const repo = getRepo(repoName);
	return getFreeSpace(resolve(getState().dataPath, repo.Path.Medias[0]));
}