import { promises as fs } from 'fs';
import { copy, remove } from 'fs-extra';
import { basename, resolve } from 'path';

import { compareKarasChecksum, DBReady, generateDB } from '../dao/database';
import { baseChecksum, editKaraInStore, getStoreChecksum, sortKaraStore } from '../dao/dataStore';
import { updateDownloaded } from '../dao/download';
import { deleteRepo, insertRepo, selectRepos, updateRepo } from '../dao/repo';
import { getSettings, refreshAll, saveSetting } from '../lib/dao/database';
import { initHooks, stopWatchingHooks } from '../lib/dao/hook';
import { refreshKaras } from '../lib/dao/kara';
import { parseKara, writeKara } from '../lib/dao/karafile';
import { readAllKaras } from '../lib/services/generation';
import { DBTag } from '../lib/types/database/tag';
import { Kara, KaraFileV4 } from '../lib/types/kara';
import { DiffChanges, Repository, RepositoryManifest } from '../lib/types/repo';
import { TagFile } from '../lib/types/tag';
import { getConfig, resolvedPathRepos } from '../lib/utils/config';
import {
	asyncCheckOrMkdir,
	getFreeSpace,
	listAllFiles,
	moveAll,
	relativePath,
	resolveFileInDirs,
} from '../lib/utils/files';
import HTTP from '../lib/utils/http';
import logger, { profile } from '../lib/utils/logger';
import { topologicalSort } from '../lib/utils/objectHelpers';
import { computeFileChanges } from '../lib/utils/patch';
import Task from '../lib/utils/taskManager';
import { emitWS } from '../lib/utils/ws';
import { Change, Commit, DifferentChecksumReport, ModifiedMedia, Push } from '../types/repo';
import { pathIsContainedInAnother } from '../utils/files';
import FTP from '../utils/ftp';
import Git, { isGit } from '../utils/git';
import { applyPatch, cleanFailedPatch, downloadAndExtractZip, writeFullPatchedFiles } from '../utils/patch';
import sentry from '../utils/sentry';
import { getState } from '../utils/state';
import { updateMedias } from './downloadMedias';
import { getAllKaras, getKara, getKaras } from './kara';
import { deleteKara, editKaraInDB, integrateKaraFile } from './karaManagement';
import { createProblematicSmartPlaylist, updateAllSmartPlaylists } from './smartPlaylist';
import { sendPayload } from './stats';
import { getTags, integrateTagFile, removeTag } from './tag';

const windowsDriveRootRegexp = /^[a-zA-Z]:\\$/;

let updateRunning = false;

/** Get all repositories in database */
export function getRepos() {
	return selectRepos();
}

/** Get single repository */
export function getRepo(name: string) {
	return selectRepos().filter((r: Repository) => r.Name === name)[0];
}

/** Remove a repository */
export async function removeRepo(name: string) {
	if (!getRepo(name)) throw { code: 404 };
	deleteRepo(name);
	await generateDB();
	logger.info(`Removed ${name}`, { service: 'Repo' });
}

/** Add a repository. Folders will be created if necessary */
export async function addRepo(repo: Repository) {
	if (windowsDriveRootRegexp.test(repo.BaseDir))
		throw { code: 400, msg: 'Repository cannot be installed at the root of a Windows drive.' };
	if (repo.Online && !repo.MaintainerMode) {
		// Testing if repository is reachable
		try {
			await getRepoMetadata(repo.Name);
		} catch (err) {
			throw { code: 404, msg: 'Repository unreachable. Did you misspell its name?' };
		}
	}
	await checkRepoPaths(repo);
	insertRepo(repo);
	// Let's download zip if it's an online repository
	if (repo.Online) {
		if (repo.MaintainerMode) {
			if (repo.Git?.URL)
				updateGitRepo(repo.Name)
					.then(() => generateDB())
					.catch(() => {
						logger.warn('Repository was added, but initializing it failed', { service: 'Repo' });
					});
		} else {
			updateZipRepo(repo.Name)
				.then(() => generateDB())
				.catch(() => {
					logger.warn('Repository was added, but initializing it failed', { service: 'Repo' });
				});
		}
	}
	logger.info(`Added ${repo.Name}`, { service: 'Repo' });
}

export async function updateAllRepos() {
	const repos = getRepos().filter(r => r.Online && r.Enabled);
	let doGenerate = false;
	logger.info('Updating all repositories', { service: 'Repo' });
	for (const repo of repos) {
		try {
			if (repo.MaintainerMode) {
				if (repo.Git?.URL) {
					if (await updateGitRepo(repo.Name)) doGenerate = true;
				}
			} else {
				// updateZipRepo returns true when the function has downloaded the entire base (either because it's new or because an error happened during the patch)
				if (await updateZipRepo(repo.Name)) doGenerate = true;
			}
		} catch (err) {
			logger.error(`Failed to update repository ${repo.Name}`, { service: 'Repo', obj: err });
		}
	}
	logger.info('Finished updating all repositories', { service: 'Repo' });
	if (doGenerate) await generateDB();
	if (getConfig().App.FirstRun) {
		createProblematicSmartPlaylist();
	}
}

export async function checkDownloadStatus(kids?: string[]) {
	profile('checkDownloadStatus');
	logger.info(`Checking downloaded status of ${kids ? kids.length : 'all'} songs`, { service: 'Repo' });
	const karas = await getKaras({
		q: kids ? `k:${kids.join(',')}` : undefined,
	});
	const mediasMissing = [];
	const mediasExisting = [];
	for (const kara of karas.content) {
		try {
			await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository));
			mediasExisting.push(kara.kid);
		} catch (err) {
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
	logger.info('Finished checking downloaded status', { service: 'Repo' });
	profile('checkDownloadStatus');
}

export async function deleteMedias(kids?: string[], repo?: string, cleanRarelyUsed = false) {
	let q: string;
	if (kids?.length > 0) {
		q = `k:${kids.join(',')}`;
	} else if (repo) {
		q = `r:${repo}`;
	} else {
		throw { code: 400 };
	}
	const karas = await getKaras({
		q: q,
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
					logger.info(`Removing ${fullPath} because it's too old (${kara.lastplayed_at.toISOString()})`, {
						service: 'Repo',
					});
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
	updateDownloaded(
		karas.content.map(k => k.kid),
		'MISSING'
	);
}

export async function updateZipRepo(name: string) {
	if (updateRunning) throw 'An update is already on the way, wait for it to finish.';
	updateRunning = true;
	const repo = getRepo(name);
	if (!repo.Online || repo.MaintainerMode || !repo.Enabled) {
		updateRunning = false;
		throw 'Repository is not online, disabled or is in Maintainer Mode!';
	}
	const LocalCommit = await getLocalRepoLastCommit(repo);
	logger.info(`Updating repository from ${name}, our commit is ${LocalCommit}`, { service: 'Repo' });
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
		logger.debug(`Update ${repo.Name}: ours is ${LocalCommit}, theirs is ${LatestCommit}`, { service: 'Repo' });
		if (LatestCommit !== LocalCommit) {
			try {
				const patch = await HTTP.get(
					`https://${repo.Name}/api/karas/repository/diff?commit=${encodeURIComponent(LocalCommit)}`,
					{
						responseType: 'text',
					}
				);
				let changes: DiffChanges[];
				try {
					changes = await applyPatch(patch.data as string, repo.BaseDir);
				} catch (err) {
					// If patch fails, we need to try the other way around and get all modified files
					// Need to remove .orig files if any
					await cleanFailedPatch(repo);
					logger.info('Trying to download full files instead', { service: 'Repo' });
					const fullFiles = await HTTP.get(
						`https://${repo.Name}/api/karas/repository/diff/full?commit=${encodeURIComponent(LocalCommit)}`
					);
					await writeFullPatchedFiles(fullFiles.data as DiffChanges[], repo);
					changes = computeFileChanges(patch.data as string);
				}
				await applyChanges(changes, repo);
				await saveSetting(`commit-${repo.Name}`, LatestCommit);
				return false;
			} catch (err) {
				logger.warn('Cannot use patch method to update repository, downloading full zip again.', {
					service: 'Repo',
				});
				await saveSetting(`commit-${repo.Name}`, null);
				updateRunning = false;
				await updateZipRepo(name);
				sentry.addErrorInfo('initialCommit', LocalCommit);
				sentry.error(err);
			}
		}
	}
}

async function getLocalRepoLastCommit(repo: Repository): Promise<string | null> {
	const settings = await getSettings();
	return settings[`commit-${repo.Name}`] || null;
}

async function newZipRepo(repo: Repository): Promise<string> {
	const { FullArchiveURL, LatestCommit } = await getRepoMetadata(repo.Name);
	await downloadAndExtractZip(FullArchiveURL, resolve(getState().dataPath, repo.BaseDir), repo.Name);
	if (repo.AutoMediaDownloads === 'all')
		updateMedias(repo.Name).catch(e => {
			if (e?.code === 409) {
				// Do nothing. It's okay.
			} else {
				throw e;
			}
		});
	return LatestCommit;
}

/** Edit a repository. Folders will be created if necessary
 * This is another cursed function of Karaoke Mugen.
 */
export async function editRepo(name: string, repo: Repository, refresh?: boolean, onlineCheck = true) {
	const oldRepo = getRepo(name);
	if (!oldRepo) throw { code: 404 };
	if (repo.Online && !repo.MaintainerMode && onlineCheck) {
		// Testing if repository is reachable
		try {
			await getRepoMetadata(repo.Name);
		} catch (err) {
			throw { code: 404, msg: 'Repository unreachable. Did you misspell its name?' };
		}
	}
	if (repo.Enabled) await checkRepoPaths(repo);
	updateRepo(repo, name);
	// Delay repository actions after edit
	hookEditedRepo(oldRepo, repo, refresh, onlineCheck).catch();
	logger.info(`Updated ${name}`, { service: 'Repo' });
}

async function hookEditedRepo(oldRepo: Repository, repo: Repository, refresh = false, onlineCheck = true) {
	let doGenerate = false;
	if (!oldRepo.SendStats && repo.SendStats && DBReady && onlineCheck) {
		sendPayload(repo.Name, repo.Name === getConfig().Online.Host).catch();
	}
	if (repo.Enabled && repo.Online && !oldRepo.MaintainerMode && repo.MaintainerMode && repo.Git?.URL) {
		saveSetting(`commit-${repo.Name}`, null);
		try {
			await updateGitRepo(repo.Name);
		} catch (err) {
			logger.warn('Repository was edited, but updating it failed', { service: 'Repo' });
		}
		if (refresh) doGenerate = true;
	}
	if (repo.Enabled && repo.Online && oldRepo.MaintainerMode && !repo.MaintainerMode) {
		try {
			await updateZipRepo(repo.Name);
			if (refresh) doGenerate = true;
		} catch (err) {
			logger.warn('Repository was edited, but updating it failed', { service: 'Repo' });
		}
	}
	if (repo.Git) {
		try {
			await setupGit(repo, true);
		} catch (err) {
			// Non-fatal. Probably that the repository isn't set
			logger.warn(`Could not update Git settings for repository : ${err}`, { service: 'Repo', obj: err });
		}
	}
	if (oldRepo.Enabled !== repo.Enabled || (refresh && DBReady)) {
		await compareKarasChecksum();
		doGenerate = true;
	}
	if (doGenerate) await generateDB();
	if (oldRepo.Path.Medias !== repo.Path.Medias && DBReady && onlineCheck) {
		getKaras({ q: `r:${repo.Name}` }).then(karas => {
			checkDownloadStatus(karas.content.map(k => k.kid));
		});
	}
}

export async function listRepoStashes(name: string) {
	const repo = getRepo(name);
	if (!repo) throw { code: 404 };
	const git = await setupGit(repo);
	return git.stashList();
}

export async function unstashInRepo(name: string, stash: number) {
	const repo = getRepo(name);
	if (!repo) throw { code: 404 };
	const git = await setupGit(repo);
	const stashes = await git.stashList();
	if (stash > stashes.all.length || stash < 0) {
		throw { message: 'This stash does not exist!', code: 404 };
	}
	await git.stashPop(stash);
	if ((await git.status()).conflicted.length > 0) {
		await git.wipeChanges();
		throw { message: 'Cannot unstash because of conflicts', code: 500 };
	}
	const diff = await git.diff();
	const changes = computeFileChanges(diff);
	await applyChanges(changes, repo);
	return true;
}

export async function dropStashInRepo(name: string, stash: number) {
	const repo = getRepo(name);
	if (!repo) throw { code: 404 };
	const git = await setupGit(repo);
	const stashes = await git.stashList();
	if (stash > stashes.all.length || stash < 0) {
		throw { message: 'This stash does not exist!', code: 404 };
	}
	await git.stashDrop(stash);
	return true;
}

export async function resetRepo(name: string) {
	const repo = getRepo(name);
	if (!repo) throw { code: 404 };
	const git = await setupGit(repo);
	return git.reset();
}

export async function updateGitRepo(name: string) {
	if (updateRunning) throw 'An update is already on the way, wait for it to finish.';
	updateRunning = true;
	const repo = getRepo(name);
	if (!repo.Online || !repo.MaintainerMode) {
		updateRunning = false;
		throw 'Repository is not online or is not in Maintainer Mode!';
	}
	logger.info(`Update ${repo.Name}: Starting`, { service: 'Repo' });
	try {
		if (!(await isGit(repo))) {
			logger.info(`Update ${repo.Name}: not a git repo, cloning now`, { service: 'Repo' });
			await newGitRepo(repo);
			await saveSetting('baseChecksum', await baseChecksum());
			return true;
		} else {
			const git = await setupGit(repo);
			logger.info(`Update ${repo.Name}: is a git repo, pulling`, { service: 'Repo' });
			await git.fetch();
			const originalCommit = await git.getCurrentCommit();
			try {
				const status = await git.status();
				if (status.behind === 0) {
					// Repository is up-to-date
					logger.info(`Update ${repo.Name}: repo is up-to-date`, { service: 'Repo' });
					return false;
				}
				if (!status.isClean()) {
					// Repository is not clean, we'll generate commits and do some magic
					const push = await generateCommits(repo.Name);
					for (const stash of push.commits) {
						await git.stash(stash);
					}
				}
				await git.pull();
				// Once pulled, let's check if we have KM Stashes to pop
				const stashes = await git.stashList();
				const KMStashes = stashes.all.filter(s => s.message.includes('[KMStash]'));
				// We'll add all stashes to a commit that we'll amend on each stash until we get it right
				if (KMStashes.length > 0) {
					let firstCommit = true;
					let offset = 0;
					for (const stash of KMStashes) {
						try {
							await git.stashPop(stash.id - offset);
							if ((await git.status()).conflicted.length > 0) {
								throw 'Cannot unstash: merge conflict';
							}
							offset++;
							await git.addAll();
							if (firstCommit) {
								await git.commit('Temp commit');
								firstCommit = false;
							} else {
								await git.commit('Temp commit', { '--amend': null });
							}
						} catch (err) {
							// Stash pop likely failed, we'll leave it be but we need to clean up
							logger.warn(`Unstashing modification ${stash.id} (${stash.message}) failed`, {
								service: 'Repo',
								obj: err,
							});
							await git.wipeChanges();
						}
					}
					// We cancel the commit we just made so all files in it are now marked as new/modified
					if (!firstCommit) await git.reset('HEAD~');
				}
			} catch (err) {
				logger.info(`${repo.Name} pull failed`, { service: 'Repo', obj: err });
				// This failed miserably because there was a conflict. Or something. We can test this out.
				const status = await git.status();
				// Else it means we're having disturbances in the Force.
				emitWS('gitRepoPullFailed', {
					...status,
					repoName: repo.Name,
				});
				throw 'Pull failed (conflicts)';
			}
			const newCommit = await git.getCurrentCommit();
			const diff = await git.diff(originalCommit, newCommit);
			const changes = computeFileChanges(diff);
			await applyChanges(changes, repo);
			return false;
		}
	} catch (err) {
		logger.error(`Failed to update repo ${repo.Name}: ${err}`, { service: 'Repo', obj: err });
		sentry.error(err);
		throw err;
	} finally {
		updateRunning = false;
		logger.info(`Update ${repo.Name}: Finished`, { service: 'Repo' });
	}
}

async function applyChanges(changes: Change[], repo: Repository) {
	const tagFiles = changes.filter(f => f.path.endsWith('.tag.json'));
	const karaFiles = changes.filter(f => f.path.endsWith('.kara.json'));
	const TIDsToDelete = [];
	const tagPromises = [];
	for (const match of tagFiles) {
		if (match.type === 'new') {
			tagPromises.push(
				integrateTagFile(resolve(resolvedPathRepos('Tags', repo.Name)[0], basename(match.path)), false)
			);
		} else {
			// Delete.
			TIDsToDelete.push(match.uid);
		}
	}
	await Promise.all(tagPromises);
	const KIDsToDelete = [];
	const KIDsToUpdate = [];
	let karas = [];
	const task = new Task({ text: 'UPDATING_REPO', total: karaFiles.length });
	for (const match of karaFiles) {
		if (match.type === 'new') {
			const file = resolve(resolvedPathRepos('Karaokes', repo.Name)[0], basename(match.path));
			const karaFileData = await parseKara(file);
			karas.push({
				file: file,
				data: karaFileData,
			});
		} else {
			// Delete.
			KIDsToDelete.push(match.uid);
		}
		task.update({ value: task.item.value + 1, subtext: match.path });
	}
	const deletePromises = [];
	if (KIDsToDelete.length > 0)
		deletePromises.push(deleteKara(KIDsToDelete, false, { media: true, kara: false }, true));
	if (TIDsToDelete.length > 0) {
		// Let's not remove tags in karas : it's already done anyway
		deletePromises.push(removeTag(TIDsToDelete, { refresh: false, removeTagInKaras: false, deleteFile: false }));
	}
	try {
		console.log(
			JSON.stringify(
				karas.map(k => {
					return {
						file: k.file,
						kid: k.data.data.kid,
						parents: k.data.data.parents,
					};
				}),
				null,
				2
			)
		);
		karas = topologicalSort(karas);
		console.log(
			JSON.stringify(
				karas.map(k => {
					return {
						file: k.file,
						kid: k.data.data.kid,
						parents: k.data.data.parents,
					};
				}),
				null,
				2
			)
		);
	} catch (err) {
		logger.error('Topological sort failed', { service: 'Repo', obj: karas });
		throw err;
	}
	for (const kara of karas) {
		KIDsToUpdate.push(await integrateKaraFile(kara.file, kara.data, false));
	}
	await Promise.all(deletePromises);
	task.update({ text: 'REFRESHING_DATA', subtext: '', total: 0, value: 0 });
	// Yes it's done in each action individually but since we're doing them asynchronously we need to re-sort everything and get the store checksum once again to make sure it doesn't re-generate database on next startup
	await saveSetting('baseChecksum', await baseChecksum());
	if (tagFiles.length > 0 || karaFiles.length > 0) await refreshAll();
	await checkDownloadStatus(KIDsToUpdate);
	await updateAllSmartPlaylists();
	task.end();
	updateRunning = false;
}

export async function checkGitRepoStatus(repoName: string) {
	const repo = getRepo(repoName);
	const git = await setupGit(repo);
	return git.status();
}

export async function stashGitRepo(repoName: string) {
	const repo = getRepo(repoName);
	const git = await setupGit(repo);
	await git.abortPull();
	return git.stash();
}

/** Helper function to setup git in other functions */
async function setupGit(repo: Repository, configChanged = false) {
	const baseDir = resolve(getState().dataPath, repo.BaseDir);
	if (!repo.Git) throw 'Git not configured for this repository';
	const git = new Git({
		baseDir: baseDir,
		url: repo.Git.URL,
		username: repo.Git.Username,
		password: repo.Git.Password,
		repoName: repo.Name,
	});
	await git.setup(configChanged);
	return git;
}

export async function newGitRepo(repo: Repository) {
	//Hello, we're going to lift stuff.
	//First, let's empty the basedir folder
	const state = getState();
	//Only testing first media folder because I'm lazy.
	const baseDir = resolve(state.dataPath, repo.BaseDir);
	const mediaDir = resolve(state.dataPath, repo.Path.Medias[0]);
	if (pathIsContainedInAnother(baseDir, mediaDir)) throw 'Media folder is contained in base dir, move it first!';
	await stopWatchingHooks();
	await remove(baseDir);
	await asyncCheckOrMkdir(baseDir);
	const git = await setupGit(repo);
	await git.clone();
	git.setRemote().catch();
	if (repo.AutoMediaDownloads === 'all')
		updateMedias(repo.Name).catch(e => {
			if (e?.code === 409) {
				// Do nothing. It's okay.
			} else {
				throw e;
			}
		});
	await initHooks();
}

export async function compareLyricsChecksums(repo1Name: string, repo2Name: string): Promise<DifferentChecksumReport[]> {
	if (!getRepo(repo1Name) || !getRepo(repo2Name)) throw { code: 404 };
	// Get all files
	const task = new Task({
		text: 'COMPARING_LYRICS_IN_REPOS',
	});
	try {
		const [repo1Files, repo2Files] = await Promise.all([
			listAllFiles('Karaokes', repo1Name),
			listAllFiles('Karaokes', repo2Name),
		]);
		const [karas1, karas2] = await Promise.all([
			readAllKaras(repo1Files, false, task),
			readAllKaras(repo2Files, false, task),
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
					fs.readFile(lyricsPath2, 'utf-8'),
				]);
				if (lyrics1 !== lyrics2)
					differentChecksums.push({
						kara1: kara1,
						kara2: kara2,
					});
			}
		}
		return differentChecksums;
	} catch (err) {
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
		total: report.length,
	});
	try {
		for (const karas of report) {
			task.update({
				subtext: karas.kara2.subfile,
			});
			// Copying kara1 data to kara2
			karas.kara2.isKaraModified = true;
			const writes = [];
			writes.push(writeKara(karas.kara2.karafile, karas.kara2));
			const sourceLyrics = await resolveFileInDirs(
				karas.kara1.subfile,
				resolvedPathRepos('Lyrics', karas.kara1.repository)
			);
			const destLyrics = await resolveFileInDirs(
				karas.kara2.subfile,
				resolvedPathRepos('Lyrics', karas.kara2.repository)
			);
			writes.push(copy(sourceLyrics[0], destLyrics[0], { overwrite: true }));
			writes.push(editKaraInDB(karas.kara2, { refresh: false }));
			await Promise.all(writes);
			await editKaraInStore(karas.kara2.karafile);
			task.incr();
		}
		sortKaraStore();
		saveSetting('baseChecksum', getStoreChecksum());
		refreshKaras();
	} catch (err) {
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

function checkRepoPaths(repo: Repository) {
	if (windowsDriveRootRegexp.test(repo.BaseDir))
		throw { code: 400, msg: 'Repository cannot be installed at the root of a Windows drive.' };
	if (repo.Online && !repo.MaintainerMode) {
		for (const path of repo.Path.Medias) {
			// Fix for KM-APP-1W5 because someone thought it would be funny to put all its medias in the folder KM's exe is in. Never doubt your users' creativity.
			if (getState().appPath === resolve(getState().dataPath, path)) {
				throw { code: 400, msg: "Sanity check: A media path is KM's executable directory." };
			}
			if (
				pathIsContainedInAnother(resolve(getState().dataPath, repo.BaseDir), resolve(getState().dataPath, path))
			) {
				throw { code: 400, msg: 'Sanity check: A media path is contained in the base directory.' };
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
	if (!getRepo(repo)) throw { code: 404 };
	const task = new Task({
		text: 'FINDING_UNUSED_MEDIAS',
	});
	try {
		const [karas, mediaFiles] = await Promise.all([getKaras({}), listAllFiles('Medias', repo)]);
		const mediasFilesKaras: string[] = karas.content.map(k => k.mediafile);
		return mediaFiles.filter(file => !mediasFilesKaras.includes(basename(file)));
	} catch (err) {
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

/** Get metadata. Throws if KM Server is not up to date */
export async function getRepoMetadata(repo: string) {
	const ret = await HTTP.get(`https://${repo}/api/karas/repository`);
	if (ret.status === 404) throw false;
	return ret.data as RepositoryManifest;
}

/** Find any unused tags in a repository */
export async function findUnusedTags(repo: string): Promise<DBTag[]> {
	if (!getRepo(repo)) throw { code: 404 };
	try {
		const tags = await getTags({});
		const tagsToDelete = tags.content.filter(t => !t.karacount && t.repository === repo);
		// Return all valid tags
		return tagsToDelete;
	} catch (err) {
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	}
}

export async function movingMediaRepo(repoName: string, newPath: string) {
	const task = new Task({
		text: 'MOVING_MEDIAS_REPO',
		subtext: repoName,
	});
	try {
		const repo = getRepo(repoName);
		const state = getState();
		if (!repo) throw 'Unknown repository';
		await checkRepoPaths(repo);
		logger.info(`Moving ${repoName} medias repository to ${newPath}...`, { service: 'Repo' });
		const moveTasks = [];
		for (const dir of repo.Path.Medias) {
			if (resolve(state.dataPath, dir) === newPath) return;
			moveTasks.push(moveAll(resolve(state.dataPath, dir), newPath));
		}
		await Promise.all(moveTasks);
		repo.Path.Medias = [relativePath(state.dataPath, newPath)];
		await editRepo(repoName, repo, true, false);
	} catch (err) {
		logger.error(`Failed to move repo ${repoName}`, { service: 'Repo', obj: err });
		throw err;
	} finally {
		task.end();
	}
}

export async function getRepoFreeSpace(repoName: string) {
	const repo = getRepo(repoName);
	return getFreeSpace(resolve(getState().dataPath, repo.Path.Medias[0]));
}

export async function generateCommits(repoName: string) {
	const task = new Task({
		text: 'PREPARING_CHANGES',
		value: 0,
		total: 100,
	});
	try {
		const repo = getRepo(repoName);
		const git = await setupGit(repo);
		const status = await git.status();
		const deletedSongs = status.deleted.filter(f => f.endsWith('kara.json'));
		const deletedTags = status.deleted.filter(f => f.endsWith('tag.json'));
		const addedSongs = status.not_added.filter(f => f.endsWith('kara.json'));
		const modifiedSongs = status.modified.filter(f => f.endsWith('kara.json'));
		let addedTags = status.not_added.filter(f => f.endsWith('tag.json'));
		let modifiedTags = status.modified.filter(f => f.endsWith('tag.json'));
		let modifiedLyrics = status.modified.filter(f => f.endsWith('.ass'));
		let deletedLyrics = status.deleted.filter(f => f.endsWith('.ass'));
		let addedLyrics = status.not_added.filter(f => f.endsWith('.ass'));
		let commits: Commit[] = [];
		// These are to keep track of if files have been renamed or not
		const deletedTIDFiles = new Map<string, string>();
		const deletedKIDFiles = new Map<string, string>();
		const deletedTIDData = new Map<string, TagFile>();
		const deletedKIDData = new Map<string, KaraFileV4>();

		task.update({
			total:
				deletedSongs.length +
				deletedTags.length +
				addedSongs.length +
				modifiedSongs.length +
				addedTags.length +
				modifiedTags.length +
				modifiedLyrics.length +
				deletedLyrics.length +
				addedLyrics.length,
		});
		let modifiedMedias: ModifiedMedia[] = [];

		// Deleted songs
		// For deleted songs, not much we can do other than delete them from the index and search for associated deleted lyrics.
		for (const file of deletedSongs) {
			const song = basename(file, '.kara.json');
			const commit: Commit = {
				addedFiles: [],
				removedFiles: [],
				message: `🔥 🎤 Delete ${song}`,
			};
			// Find out if we have a deleted lyrics as well (we should have one but you never know, it could be a zxx song!)
			const lyricsFile = deletedLyrics.find(f => basename(f) === `${song}.ass`);
			if (lyricsFile) {
				commit.removedFiles.push(lyricsFile);
			}
			commit.removedFiles.push(file);
			deletedLyrics = deletedLyrics.filter(f => f !== lyricsFile);
			commits.push(commit);
			// Let's add the song to the deleted KIDs
			const karaFile = await git.show(`HEAD:${file}`);
			const karaFileData: KaraFileV4 = JSON.parse(karaFile);
			deletedKIDFiles.set(karaFileData.data.kid, file);
			deletedKIDData.set(karaFileData.data.kid, karaFileData);
			// We're doing a delete of the file
			modifiedMedias.push({
				old: karaFileData.medias[0].filename,
				new: null,
				commit: commit.message,
			});
			task.incr();
		}
		// Deleted tags
		for (const file of deletedTags) {
			const tag = basename(file, '.tag.json');
			const commit: Commit = {
				addedFiles: [],
				removedFiles: [file],
				message: `🔥 🏷️ Delete ${tag}`,
			};
			commits.push(commit);
			// Let's add the tag to the deleted TIDs
			const tagFile = await git.show(`HEAD:${file}`);
			const tagFileData: TagFile = JSON.parse(tagFile);
			deletedTIDFiles.set(tagFileData.tag.tid, file);
			deletedTIDData.set(tagFileData.tag.tid, tagFileData);
			task.incr();
		}
		// Added songs
		const [karas, tags] = await Promise.all([getAllKaras(), getTags({})]);
		for (const file of addedSongs) {
			const song = basename(file, '.kara.json');
			const commit: Commit = {
				addedFiles: [file],
				removedFiles: [],
				message: `🆕 🎤 Add ${song}`,
			};
			// We need to find out if some tags have been added or modified and add them to our commit
			const kara = karas.content.find(k => k.karafile === basename(file));
			if (!kara) {
				logger.warn(`File "${file}" does not seem to be in database? Skipping`, { service: 'Repo' });
				continue;
			}
			// Let's check if the kara has been renamed and is actually a modified kara.
			let oldMediaFile = null;
			let sizeDifference = null;
			const oldKaraFile = deletedKIDFiles.get(kara.kid);
			if (oldKaraFile) {
				// If an oldKarafile is present, then this is a rename.
				// We have to determine if the media has also been simply renamed or we need to reupload it.
				const oldMediaSize = deletedKIDData.get(kara.kid).medias[0].filesize;
				const newMediaSize = kara.mediasize;
				if (oldMediaSize !== newMediaSize) {
					// By default this is going to be the same as a rename but with sizeDifference set to true so the ftp is forced to delete the old file and reupload the new one
					oldMediaFile = kara.mediafile;
					sizeDifference = true;
				}
				if (oldKaraFile !== file) {
					// This is actually modified kara.
					commit.message = `📝 🎤 Modify ${song}`;
					// Let's remove the commit containing our song deletion and add the deletion in this commit
					commits = commits.filter(c => !c.removedFiles.includes(oldKaraFile));
					commit.removedFiles = [oldKaraFile];
					// If the karafile has been modified, chances are the media has been as well.
					oldMediaFile = deletedKIDData.get(kara.kid).medias[0].filename;
					// We need to remove from modifiedMedias our delete
					modifiedMedias = modifiedMedias.filter(m => m.new !== null && m.old !== oldMediaFile);
					// We need to do the same with lyrics
					// Problems is that lyrics have already been deleted so we're going to pick the ass from the status itself
					const oldSong = basename(oldKaraFile, '.kara.json');
					const lyricsFile = status.deleted.find(f => f.includes(`${oldSong}.ass`));
					if (lyricsFile) {
						commit.removedFiles.push(lyricsFile);
					}
				}
			}
			// If oldMediaFile is still null, this is a new media that will be pushed later to the FTP.
			modifiedMedias.push({
				old: oldMediaFile,
				new: kara.mediafile,
				sizeDifference,
				commit: commit.message,
			});
			for (const tid of kara.tid) {
				const tag = tags.content.find(t => t.tid === tid.split('~')[0]);
				if (!tag) throw `Tag ${tid} not found in database. Please regenerate and try again`;
				const tagfile = tag.tagfile;
				const addedTag = addedTags.find(f => basename(f) === tagfile);
				if (addedTag) {
					commit.addedFiles.push(addedTag);
					addedTags = addedTags.filter(f => basename(f) !== tagfile);
				}
				// Let's do the same for modified tags. For example if a new song uses a tag previously used else where in another category, then the tag has been modified and should be added with the kara
				const modifiedTag = modifiedTags.find(f => basename(f) === tagfile);
				if (modifiedTag) {
					commit.addedFiles.push(modifiedTag);
					modifiedTags = modifiedTags.filter(f => basename(f) !== tagfile);
				}
			}
			if (kara.subfile) {
				const lyricsFile = addedLyrics.find(f => basename(f) === kara.subfile);
				addedLyrics = addedLyrics.filter(f => f !== lyricsFile);
				commit.addedFiles.push(lyricsFile);
			}
			commits.push(commit);
			task.incr();
		}
		// Modified songs
		for (const file of modifiedSongs) {
			const song = basename(file, '.kara.json');
			const commit: Commit = {
				addedFiles: [file],
				removedFiles: [],
				message: `📝 🎤 Update ${song}`,
			};
			// Modified songs can be ernamed so we need to find out how it was named before
			// We need to find out if some tags have been added or modified and add them to our commit
			const kara = karas.content.find(k => k.karafile === basename(file));
			if (!kara) {
				logger.warn(`File "${file}" does not seem to be in database? Skipping`, { service: 'Repo' });
				continue;
			}
			const oldKaraFile = await git.show(`HEAD:${file}`);
			const oldKara: KaraFileV4 = JSON.parse(oldKaraFile);
			// Let's check if the kara has a renamed media file or media size.
			// For example a format change which does not change its basename but its extension.
			if (oldKara.medias[0].filename !== kara.mediafile) {
				// This is a simple rename
				modifiedMedias.push({
					old: oldKara.medias[0].filename,
					new: kara.mediafile,
					sizeDifference: oldKara.medias[0].filesize === kara.mediasize,
					commit: commit.message,
				});
			} else {
				// Names are the same, but filesizes might differ. In that case it's considered a new upload
				if (oldKara.medias[0].filesize !== kara.mediasize) {
					modifiedMedias.push({
						old: null,
						new: kara.mediafile,
						commit: commit.message,
					});
				}
				// If filesizes are the same, no medias are pushed to the ftp
			}

			for (const tid of kara.tid) {
				const tag = tags.content.find(t => t.tid === tid.split('~')[0]);
				const tagfile = tag.tagfile;
				const addedTag = addedTags.find(f => basename(f) === tagfile);
				if (addedTag) {
					commit.addedFiles.push(addedTag);
					addedTags = addedTags.filter(f => basename(f) !== tagfile);
				}
				// Let's do the same for modified tags. For example if a new song uses a tag previously used else where in another category, then the tag has been modified and should be added with the kara
				const modifiedTag = modifiedTags.find(f => basename(f) === tagfile);
				if (modifiedTag) {
					commit.addedFiles.push(modifiedTag);
					modifiedTags = modifiedTags.filter(f => basename(f) !== tagfile);
				}
			}
			if (kara.subfile) {
				// For modified songs, we check first for added lyrics, then for modified lyrics.
				let lyricsFile = addedLyrics.find(f => basename(f) === kara.subfile);
				if (lyricsFile) {
					addedLyrics = addedLyrics.filter(f => f !== lyricsFile);
					commit.addedFiles.push(lyricsFile);
				} else {
					// Checking modified lyrics. If none is found then lyrics have not been modified
					lyricsFile = modifiedLyrics.find(f => basename(f) === kara.subfile);
					if (lyricsFile) {
						modifiedLyrics = modifiedLyrics.filter(f => f !== lyricsFile);
						commit.addedFiles.push(lyricsFile);
					}
				}
			}
			commits.push(commit);
			task.incr();
		}
		// Added Tags
		for (const file of addedTags) {
			const tag = basename(file, '.tag.json');
			const commit: Commit = {
				addedFiles: [file],
				removedFiles: [],
				message: `🆕 🏷️ Add ${tag}`,
			};
			commits.push(commit);
			task.incr();
		}
		// Modified Tags
		for (const file of modifiedTags) {
			const tag = basename(file, '.tag.json');
			const commit: Commit = {
				addedFiles: [file],
				removedFiles: [],
				message: `📝 🏷️ Modify ${tag}`,
			};
			commits.push(commit);
			task.incr();
		}
		// Modified lyrics (they don't trigger modified songs)
		for (const file of modifiedLyrics) {
			const lyrics = basename(file, '.ass');
			const commit: Commit = {
				addedFiles: [file],
				removedFiles: [],
				message: `📝 ✏️ Modify ${lyrics}`,
			};
			commits.push(commit);
			task.incr();
		}
		// Deleted lyrics (you never know)
		for (const file of deletedLyrics) {
			const lyrics = basename(file, '.ass');
			const commit: Commit = {
				addedFiles: [],
				removedFiles: [file],
				message: `🔥 ✏️ Delete ${lyrics}`,
			};
			commits.push(commit);
			task.incr();
		}

		logger.debug(`Preparing ${commits.length} commits`, { service: 'Repo', obj: commits });
		logger.debug(`You have ${modifiedMedias.length} modified medias`, { service: 'Repo', obj: modifiedMedias });
		if (commits.length === 0) return;
		return { commits, modifiedMedias };
	} catch (err) {
		logger.error('Failed to prepare commits', { service: 'Repo', obj: err });
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

export async function uploadMedia(kid: string) {
	const kara = await getKara(kid, { role: 'admin', username: 'admin' });
	const repo = getRepo(kara.repository);
	const ftp = new FTP({ repoName: repo.Name });
	await ftp.connect();
	const path = await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', repo.Name));
	await ftp.upload(path[0]);
}

/** Commit and Push all modifications */
export async function pushCommits(repoName: string, push: Push, ignoreFTP?: boolean) {
	try {
		const repo = getRepo(repoName);
		const git = await setupGit(repo);
		if (!ignoreFTP && push.modifiedMedias.length > 0) {
			// Before making any commits, we have to send stuff via FTP
			const ftp = new FTP({ repoName: repoName });
			await ftp.connect();
			for (const media of push.modifiedMedias) {
				// New or updated file
				if (media.old === null || media.old === media.new) {
					const path = await resolveFileInDirs(media.new, resolvedPathRepos('Medias', repoName));
					await ftp.upload(path[0]);
				} else if (media.new === null) {
					// Deleted file
					try {
						await ftp.delete(media.old);
					} catch (err) {
						logger.warn(`File ${media.old} could not be deleted on FTP`, { service: 'Repo' });
					}
				} else if (media.new !== media.old) {
					// Renamed file or new upload with different sizes, let's find out!
					if (media.sizeDifference) {
						const path = await resolveFileInDirs(media.new, resolvedPathRepos('Medias', repoName));
						await ftp.upload(path[0]);
						try {
							await ftp.delete(media.old);
						} catch (err) {
							logger.warn(`File ${media.old} could not be deleted on FTP`, { service: 'Repo' });
						}
					} else {
						await ftp.rename(basename(media.old), basename(media.new));
					}
				}
			}
			await ftp.disconnect();
		}
		// Let's work on our commits
		const task = new Task({
			text: 'COMMITING_CHANGES',
			total: push.commits.length,
		});
		try {
			for (const commit of push.commits) {
				if (commit.addedFiles)
					for (const addedFile of commit.addedFiles) {
						await git.add(addedFile);
					}
				if (commit.removedFiles)
					for (const removedFile of commit.removedFiles) {
						await git.rm(removedFile);
					}
				await git.commit(commit.message);
				task.incr();
			}
			// All our commits are hopefully done. Just inc ase we'll update repository now.
			await updateGitRepo(repoName);
			await git.push();
			emitWS('pushComplete', repoName);
		} catch (err) {
			throw err;
		} finally {
			task.end();
		}
	} catch (err) {
		logger.error(`Pushing to repository ${repoName} failed: ${err}`, { service: 'Repo', obj: err });
		// No need to throw here, this is called asynchronously.
	}
}
