import { promises as fs } from 'fs';
import { copy } from 'fs-extra';
import i18next from 'i18next';
import clonedeep from 'lodash.clonedeep';
import { basename,resolve } from 'path';

import { compareKarasChecksum, DBReady, generateDB } from '../dao/database';
import { baseChecksum, editKaraInStore, getStoreChecksum, sortKaraStore } from '../dao/dataStore';
import { updateDownloaded } from '../dao/download';
import { deleteRepo, insertRepo,selectRepos, updateRepo } from '../dao/repo';
import {getSettings, refreshAll, saveSetting} from '../lib/dao/database';
import { refreshKaras } from '../lib/dao/kara';
import { writeKara } from '../lib/dao/karafile';
import { readAllKaras } from '../lib/services/generation';
import { DBTag } from '../lib/types/database/tag';
import { Kara } from '../lib/types/kara';
import {Repository, RepositoryManifest} from '../lib/types/repo';
import {getConfig, resolvedPathRepos} from '../lib/utils/config';
import {
	asyncCheckOrMkdir,
	asyncExists,
	asyncMoveAll,
	extractAllFiles,
	getFreeSpace,
	relativePath,
	resolveFileInDirs
} from '../lib/utils/files';
import HTTP from '../lib/utils/http';
import logger, { profile } from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import {DifferentChecksumReport, OldRepository} from '../types/repo';
import {backupConfig} from '../utils/config';
import {pathIsContainedInAnother} from '../utils/files';
import sentry from '../utils/sentry';
import { getState } from '../utils/state';
import {applyPatch, downloadAndExtractZip} from '../utils/zipPatch';
import { createProblematicBLCSet, generateBlacklist } from './blacklist';
import { updateMedias } from './downloadUpdater';
import { getKaras } from './kara';
import { deleteKara, editKaraInDB, integrateKaraFile } from './karaManagement';
import { addSystemMessage } from './proxyFeeds';
import { sendPayload } from './stats';
import { deleteTag, getTags, integrateTagFile } from './tag';

const windowsDriveRootRegexp = new RegExp(/^[a-zA-Z]:\\$/);

let updateRunning = false;

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
	if (windowsDriveRootRegexp.test(repo.BaseDir)) throw {code: 400, msg: 'Repository cannot be installed at the root of a Windows drive.'};
	if (repo.Online && !repo.MaintainerMode) {
		// Testing if repository is reachable
		try {
			await getRepoMetadata(repo.Name);
		} catch(err) {
			throw {code: 404, msg: 'Repository unreachable. Did you misspell its name?'};
		}
	}
	await checkRepoPaths(repo);
	insertRepo(repo);
	// Let's download zip if it's an online repository
	if (repo.Online) {
		updateZipRepo(repo.Name).then(() => generateDB());
	}
	logger.info(`Added ${repo.Name}`, {service: 'Repo'});
}

export async function migrateReposToZip() {
	// Find unmigrated repositories
	const repos: OldRepository[] = clonedeep((getRepos() as any as OldRepository[]).filter((r) => r.Path.Karas?.length > 0));
	if (repos.length > 0) {
		// Create a config backup, just in case
		await backupConfig();
	}
	for (const oldRepo of repos) {
		// Determine basedir by going up one folder
		const dir = resolve(getState().dataPath, oldRepo.Path.Karas[0], '..');
		const newRepo: Repository = {
			Name: oldRepo.Name,
			Online: oldRepo.Online,
			Enabled: oldRepo.Enabled,
			SendStats: oldRepo.SendStats || true,
			Path: {
				Medias: oldRepo.Path.Medias
			},
			MaintainerMode: false,
			AutoMediaDownloads: 'updateOnly',
			BaseDir: dir
		};
		if (await asyncExists(resolve(dir, '.git'))) {
			// It's a git repo, put maintainer mode on.
			newRepo.MaintainerMode = true;
		}
		const extraPath = newRepo.Online && !newRepo.MaintainerMode
			? './json'
			: '';
		newRepo.BaseDir = relativePath(getState().dataPath, resolve(getState().dataPath, dir, extraPath));
		await editRepo(newRepo.Name, newRepo, false)
			.catch(err => {
				logger.error(`Unable to migrate repo ${oldRepo.Name} to zip-based: ${err}`, {service: 'Repo', obj: err});
				sentry.error(err);
				addSystemMessage({
					type: 'system_error',
					date: new Date().toString(),
					dateStr: new Date().toLocaleDateString(),
					link: '#',
					html: `<p>${i18next.t('SYSTEM_MESSAGES.ZIP_MIGRATION_FAILED.BODY', { repo: oldRepo.Name })}</p>`,
					title: i18next.t('SYSTEM_MESSAGES.ZIP_MIGRATION_FAILED.TITLE')
				});
				// Disable the repo and bypass stealth checks
				updateRepo({...oldRepo, Enabled: false} as any, oldRepo.Name);
			});
	}
}

export async function updateAllZipRepos() {
	const repos = getRepos().filter(r => r.Online && !r.MaintainerMode);
	let doGenerate = false;
	logger.info('Updating all repositories', {service: 'Repo'});
	for (const repo of repos) {
		try {
			// updateZipRepo returns true when the function has downloaded the entire base (either because it's new or because an error happened during the patch)
			if (await updateZipRepo(repo.Name)) doGenerate = true;
		} catch(err) {
			logger.error(`Failed to update zip repository from ${repo.Name}`, {service: 'Repo', object: err});
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
	logger.info(`Checking downloaded status of ${kids ? kids.length : 'all'} songs`, {service: 'Repo'});
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
	logger.info('Finished checking downloaded status', {service: 'Repo'});
	profile('checkDownloadStatus');
}

export async function deleteMedias(kids?: string[], repo?: string, cleanRarelyUsed = false) {
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
		try {
			const fullPath = (await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository)))[0];
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
		}
	}
	await Promise.all(deletePromises);
	updateDownloaded(karas.content.map(k => k.kid), 'MISSING');
}

export async function updateZipRepo(name: string) {
	if (updateRunning) throw 'An update is already on the way, wait for it to finish.';
	updateRunning = true;
	const repo = getRepo(name);
	if (!repo.Online || repo.MaintainerMode) {
		updateRunning = false;
		throw 'Repository is not online or is in Maintainer Mode!';
	}
	const LocalCommit = await getLocalRepoLastCommit(repo);
	logger.info(`Updating repository from ${name}, our commit is ${LocalCommit}`, {service: 'Repo'});
	if (!LocalCommit) {
		// If local commit doesn't exist, we have to start by retrieving one
		const LatestCommit = await newZipRepo(repo);
		// Once this is done, we store the last commit in settings DB
		await saveSetting(`commit-${name}`, LatestCommit);
		await saveSetting('baseChecksum', await baseChecksum());
		updateRunning = false;
		return true;
	} else {
		// Check if update is necessary by fetching the remote last commit sha
		const { LatestCommit } = await getRepoMetadata(repo.Name);
		logger.debug(`Update ${repo.Name}: ours is ${LocalCommit}, theirs is ${LatestCommit}`, {service: 'Repo'});
		if (LatestCommit !== LocalCommit) {
			try {
				const patch = await HTTP.get(`https://${repo.Name}/api/karas/repository/diff?commit=${encodeURIComponent(LocalCommit)}`);
				const changes = await applyPatch(patch.body, repo.BaseDir);
				const tagFiles = changes.filter(f => f.path.endsWith('.tag.json'));
				const karaFiles = changes.filter(f => f.path.endsWith('.kara.json'));
				const TIDsToDelete = [];
				const tagPromises = [];
				for (const match of tagFiles) {
					if (match.type === 'new') {
						tagPromises.push(integrateTagFile(resolve(resolvedPathRepos('Tags', name)[0], basename(match.path)), false));
					} else {
						// Delete.
						TIDsToDelete.push(match.uid);
					}
				}
				await Promise.all(tagPromises);
				const KIDsToDelete = [];
				const KIDsToUpdate = [];
				const task = new Task({ text: 'UPDATING_REPO', total: karaFiles.length });
				for (const match of karaFiles) {
					if (match.type === 'new') {
						KIDsToUpdate.push(await integrateKaraFile(resolve(resolvedPathRepos('Karaokes', name)[0], basename(match.path))));
					} else {
						// Delete.
						KIDsToDelete.push(match.uid);
					}
					task.update({value: task.item.value + 1, subtext: match.path});
				}
				const deletePromises = [];
				if (KIDsToDelete.length > 0) deletePromises.push(deleteKara(KIDsToDelete, false, {media: true, kara: false}));
				if (TIDsToDelete.length > 0) {
					// Let's not remove tags in karas : it's already done anyway
					deletePromises.push(deleteTag(TIDsToDelete, {refresh: false, removeTagInKaras: false, deleteFile: false}));
				}
				await Promise.all(deletePromises);
				task.update({text: 'REFRESHING_DATA', subtext: '', total: 0, value: 0});
				// Yes it's done in each action individually but since we're doing them asynchronously we need to re-sort everything and get the store checksum once again to make sure it doesn't re-generate database on next startup
				await saveSetting('baseChecksum', await baseChecksum());
				await saveSetting(`commit-${repo.Name}`, LatestCommit);
				if (tagFiles.length > 0 || karaFiles.length > 0) await refreshAll();
				await generateBlacklist();
				await checkDownloadStatus(KIDsToUpdate);
				task.end();
				updateRunning = false;
				return false;
			} catch (err) {
				logger.warn('Cannot use patch method to update repository, downloading full zip again.', {service: 'Repo'});
				await saveSetting(`commit-${repo.Name}`, null);
				updateRunning = false;
				await updateZipRepo(name);
				sentry.addErrorInfo('initialCommit', LocalCommit);
				sentry.error(err);
			}
		}
	}
}

async function getLocalRepoLastCommit(repo: Repository): Promise<string|null> {
	const settings = await getSettings();
	return settings[`commit-${repo.Name}`] || null;
}

async function newZipRepo(repo: Repository): Promise<string> {
	const { FullArchiveURL, LatestCommit } = await getRepoMetadata(repo.Name);
	await downloadAndExtractZip(FullArchiveURL, resolve(getState().dataPath, repo.BaseDir), repo.Name);
	if (repo.AutoMediaDownloads === 'all') updateMedias(repo.Name).catch(e => {
		if (e?.code === 409) {
			// Do nothing. It's okay.
		} else {
			throw e;
		}
	});
	return LatestCommit;
}

/** Edit a repository. Folders will be created if necessary */
export async function editRepo(name: string, repo: Repository, refresh?: boolean) {
	const oldRepo = getRepo(name);
	if (!oldRepo) throw {code: 404};
	if (windowsDriveRootRegexp.test(repo.BaseDir)) throw {code: 400, msg: 'Repository cannot be installed at the root of a Windows drive.'};
	if (repo.Online && !repo.MaintainerMode) {
		// Testing if repository is reachable
		try {
			await getRepoMetadata(repo.Name);
		} catch(err) {
			throw {code: 404, msg: 'Repository unreachable. Did you misspell its name?'};
		}
	}
	await checkRepoPaths(repo);
	updateRepo(repo, name);
	//DBReady is needed as this can happen before the database is ready
	if (oldRepo.Path.Medias !== repo.Path.Medias && DBReady) {
		getKaras({q: `r:${repo.Name}`}).then(karas => {
			checkDownloadStatus(karas.content.map(k => k.kid));
		});
	}
	if (oldRepo.Enabled !== repo.Enabled || refresh) {
		compareKarasChecksum().then(res => {
			if (res) generateDB();
		});
	}
	if (!oldRepo.SendStats && repo.SendStats && DBReady) {
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
		for (const kara1 of karas1Map.values()) {
			const kara2 = karas2Map.get(kara1.kid);
			if (kara2) {
				// read both lyrics and then decide if they're different
				const lyricsPath1 = resolve(resolvedPathRepos('Lyrics', kara2.repository)[0], kara1.subfile);
				const lyricsPath2 = resolve(resolvedPathRepos('Lyrics', kara2.repository)[0], kara2.subfile);
				const [lyrics1, lyrics2] = await Promise.all([
					fs.readFile(lyricsPath1, 'utf-8'),
					fs.readFile(lyricsPath2, 'utf-8')
				]);
				if (lyrics1 !== lyrics2) differentChecksums.push({
					kara1: kara1,
					kara2: kara2
				});
			}
		}
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
			karas.kara2.isKaraModified = true;
			const writes = [];
			writes.push(writeKara(karas.kara2.karafile, karas.kara2));
			const sourceLyrics = await resolveFileInDirs(karas.kara1.subfile, resolvedPathRepos('Lyrics', karas.kara1.repository));
			const destLyrics = await resolveFileInDirs(karas.kara2.subfile, resolvedPathRepos('Lyrics', karas.kara2.repository));
			writes.push(copy(sourceLyrics[0], destLyrics[0], { overwrite: true }));
			writes.push(editKaraInDB(karas.kara2, { refresh: false }));
			await Promise.all(writes);
			await editKaraInStore(karas.kara2.karafile);
			task.incr();
		}
		sortKaraStore();
		saveSetting('baseChecksum', getStoreChecksum());
		refreshKaras();
	} catch(err) {
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

function checkRepoPaths(repo: Repository) {
	if (repo.Online && !repo.MaintainerMode) {
		for (const path of repo.Path.Medias) {
			if (pathIsContainedInAnother(resolve(getState().dataPath, repo.BaseDir), resolve(getState().dataPath, path))) {
				throw {code: 400, msg: 'Sanity check: A media path is contained in the base directory.'};
			}
		}
	}
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
		const [karas, mediaFiles] = await Promise.all([
			getKaras({}),
			extractAllFiles('Medias', repo)
		]);
		const mediasFilesKaras: string[] = karas.content.map(k => k.mediafile);
		return mediaFiles.filter(file => !mediasFilesKaras.includes(basename(file)));
	} catch(err) {
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

/** Get metadata. Throws if KM Server is not up to date */
export async function getRepoMetadata(repo: string): Promise<RepositoryManifest> {
	const ret = await HTTP.get(`https://${repo}/api/karas/repository`);
	if (ret.statusCode === 404) throw false;
	return JSON.parse(ret.body);
}

/** Find any unused tags in a repository */
export async function findUnusedTags(repo: string): Promise<DBTag[]> {
	if (!getRepo(repo)) throw {code: 404};
	try {
		const tags = await getTags({});
		const tagsToDelete = tags.content.filter(t => !t.karacount && t.repository === repo);
		// Return all valid tags
		return tagsToDelete;
	} catch(err) {
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	}
}

export async function movingMediaRepo(repoName: string, newPath: string) {
	const task = new Task({
		text: 'MOVING_MEDIAS_REPO',
		subtext:  repoName
	});
	try {
		const repo = getRepo(repoName);
		const state = getState();
		if (!repo) throw 'Unknown repository';
		repo.Path.Medias = [relativePath(state.dataPath, newPath)];
		await checkRepoPaths(repo);
		logger.info(`Moving ${repoName} medias repository to ${newPath}...`, {service: 'Repo'});
		const moveTasks = [];
		for (const dir of repo.Path.Medias) {
			if (resolve(state.dataPath, dir) === resolve(newPath, 'medias')) return;
			moveTasks.push(asyncMoveAll(resolve(state.dataPath, dir), resolve(newPath, 'medias/')));
		}
		await Promise.all(moveTasks);
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
