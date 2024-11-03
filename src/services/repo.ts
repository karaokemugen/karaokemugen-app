import { shell } from 'electron';
import { promises as fs } from 'fs';
import { copy, remove } from 'fs-extra';
import parallel from 'p-map';
import { basename, parse, resolve } from 'path';
import { TopologicalSort } from 'topological-sort';

import { compareKarasChecksum, generateDB } from '../dao/database.js';
import { baseChecksum, editKaraInStore, getStoreChecksum, sortKaraStore } from '../dao/dataStore.js';
import { updateDownloaded } from '../dao/download.js';
import { deleteRepo, insertRepo, updateRepo } from '../dao/repo.js';
import { getSettings, refreshAll, saveSetting } from '../lib/dao/database.js';
import { initHooks } from '../lib/dao/hook.js';
import { refreshKaras } from '../lib/dao/kara.js';
import { parseKara, writeKara } from '../lib/dao/karafile.js';
import { selectRepos } from '../lib/dao/repo.js';
import { APIMessage } from '../lib/services/frontend.js';
import { readAllKaras } from '../lib/services/generation.js';
import { DBTag } from '../lib/types/database/tag.js';
import { KaraMetaFile } from '../lib/types/downloads.js';
import { KaraFileV4 } from '../lib/types/kara.js';
import { DiffChanges, Repository, RepositoryBasic, RepositoryManifest } from '../lib/types/repo.js';
import { TagFile } from '../lib/types/tag.js';
import { getConfig, resolvedPathRepos } from '../lib/utils/config.js';
import { ErrorKM } from '../lib/utils/error.js';
import { asyncCheckOrMkdir, listAllFiles, moveAll, relativePath, resolveFileInDirs } from '../lib/utils/files.js';
import HTTP, { fixedEncodeURIComponent } from '../lib/utils/http.js';
import logger, { profile } from '../lib/utils/logger.js';
import { computeFileChanges } from '../lib/utils/patch.js';
import Task from '../lib/utils/taskManager.js';
import { emitWS } from '../lib/utils/ws.js';
import { Change, Commit, DifferentChecksumReport, ModifiedMedia, Push } from '../types/repo.js';
import { adminToken } from '../utils/constants.js';
import { getFreeSpace, pathIsContainedInAnother } from '../utils/files.js';
import FTP from '../utils/ftp.js';
import Git, { checkGitInstalled, isGit } from '../utils/git.js';
import { oldFilenameFormatKillSwitch } from '../utils/hokutoNoCode.js';
import { applyPatch, cleanFailedPatch, downloadAndExtractZip, writeFullPatchedFiles } from '../utils/patch.js';
import sentry from '../utils/sentry.js';
import { getState } from '../utils/state.js';
import { updateMedias } from './downloadMedias.js';
import { addFont, deleteFont, initFonts } from './fonts.js';
import { getKara, getKaras } from './kara.js';
import { createKaraInDB, integrateKaraFile, removeKara } from './karaManagement.js';
import { createProblematicSmartPlaylist, updateAllSmartPlaylists } from './smartPlaylist.js';
import { sendPayload } from './stats.js';
import { getTags, integrateTagFile, removeTag } from './tag.js';
import { getRepoManifest } from '../lib/services/repo.js';
import { ASSFileCleanup } from '../lib/utils/ass.js';

const service = 'Repo';

const windowsDriveRootRegexp = /^[a-zA-Z]:\\$/;

let updateRunning = false;

/** Get all repositories in database */
export function getRepos(publicView: false): Repository[];
export function getRepos(publicView: true): RepositoryBasic[];
export function getRepos(publicView: boolean): Repository[] | RepositoryBasic[];
export function getRepos(): Repository[];
export function getRepos(publicView = false): Repository[] | RepositoryBasic[] {
	try {
		return selectRepos(publicView);
	} catch (err) {
		logger.error(`Error getting repos : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_LIST_ERROR');
	}
}

/** Get single repository */
export function getRepo(name: string) {
	try {
		const repo = selectRepos(false).filter((r: Repository) => r.Name === name)[0];
		if (!repo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		return repo;
	} catch (err) {
		logger.error(`Error getting repo : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GET_ERROR');
	}
}

/** Remove a repository */
export async function removeRepo(name: string) {
	try {
		const repos = getRepos();
		if (!repos.find(r => r.Name === name)) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		// Forbid people from removing the last repo
		if (repos.length === 1) throw new ErrorKM('CANNOT_DELETE_LAST_REPOSITORY', 403, false);
		deleteRepo(name);
		await generateDB();
		logger.info(`Removed ${name}`, { service });
	} catch (err) {
		logger.error(`Error deleting repos : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_DELETE_ERROR');
	}
}

/** Add a repository. Folders will be created if necessary */
export async function addRepo(repo: Repository) {
	try {
		if (windowsDriveRootRegexp.test(repo.BaseDir)) {
			throw new ErrorKM('CANNOT_INSTALL_REPO_AT_WINDOWS_ROOT_DRIVE', 400, false);
		}
		if (repo.Online) {
			// Testing if repository is reachable
			try {
				const manifest = await getRepoMetadata(repo);
				if (repo.MaintainerMode && repo.Git) {
					repo.Git.ProjectID = manifest.ProjectID;
				}
			} catch (err) {
				throw new ErrorKM('REPOSITORY_UNREACHABLE', 404, false);
			}
		}
		if (repo.MaintainerMode && repo.Git?.URL) await checkGitInstalled();
		await checkRepoPaths(repo);
		insertRepo(repo);
		// Let's download zip if it's an online repository
		if (repo.Online && repo.Update) {
			if (repo.MaintainerMode) {
				if (repo.Git?.URL) {
					updateGitRepo(repo.Name)
						.then(() => generateDB())
						.catch(err => {
							logger.warn('Repository was added, but initializing it failed', { service, err });
							emitWS(
								'operatorNotificationError',
								APIMessage(
									err instanceof ErrorKM
										? `ERROR_CODES.${err.message}`
										: 'NOTIFICATION.OPERATOR.ERROR.UPDATE_GIT_REPO_ERROR'
								)
							);
						});
				}
			} else {
				updateZipRepo(repo.Name)
					.then(() => generateDB())
					.catch(err => {
						logger.warn('Repository was added, but initializing it failed', { service, err });
					});
			}
		}
		logger.info(`Added ${repo.Name}`, { service });
	} catch (err) {
		logger.error(`Error getting repos : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_CREATE_ERROR');
	}
}

export async function updateAllRepos() {
	try {
		const repos = getRepos().filter(r => r.Online && r.Enabled && r.Update);
		let doGenerate = false;
		let allReposUpdated = true;
		logger.info('Updating all repositories', { service });
		for (const repo of repos) {
			try {
				if (repo.MaintainerMode) {
					if (repo.Git?.URL) {
						if (await updateGitRepo(repo.Name)) doGenerate = true;
						initFonts();
					}
				} else if (await updateZipRepo(repo.Name)) {
					// updateZipRepo returns true when the function has downloaded the entire base (either because it's new or because an error happened during the patch)
					doGenerate = true;
					initFonts();
				}
			} catch (err) {
				logger.error(`Failed to update repository ${repo.Name}`, { service, obj: err });
				if (err instanceof ErrorKM)
					emitWS('operatorNotificationError', APIMessage(`ERROR_CODES.${err.message}`));
				allReposUpdated = false;
			}
		}
		logger.info('Finished updating all repositories', { service });
		if (allReposUpdated) emitWS('operatorNotificationSuccess', APIMessage('SUCCESS_CODES.REPOS_ALL_UPDATED'));
		if (doGenerate) await generateDB();
		if (getConfig().App.FirstRun) {
			createProblematicSmartPlaylist();
		}
		emitWS('statsRefresh');
	} catch (err) {
		logger.error(`Error updating all repositories : ${err}`, { service });
		sentry.error(err);
		emitWS('operatorNotificationError', APIMessage('ERROR_CODES.UPDATE_ALL_REPOS_ERROR'));
		throw err;
	}
}

export async function checkDownloadStatus(kids?: string[]) {
	profile('checkDownloadStatus');
	// Avoid spamming logs if we're only checking one song at a time
	if (kids?.length > 1) logger.info(`Checking downloaded status of ${kids ? kids.length : 'all'} songs`, { service });
	const karas = await getKaras({
		q: kids ? `k:${kids.join(',')}` : undefined,
		ignoreCollections: true,
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
	// Avoid spamming logs if we're only checking one song at a time
	if (kids?.length > 1) logger.info('Finished checking downloaded status', { service });
	profile('checkDownloadStatus');
}

export async function deleteMedias(kids?: string[], repo?: string, cleanRarelyUsed = false) {
	let errorMsg = '';
	try {
		let q: string;
		if (kids?.length > 0) {
			q = `k:${kids.join(',')}`;
			errorMsg = 'MEDIA_DELETE_ERROR';
		} else if (repo) {
			q = `r:${repo}`;
			errorMsg = cleanRarelyUsed ? 'REPO_DELETE_OLD_MEDIAS_ERROR' : 'REPO_DELETE_ALL_MEDIAS_ERROR';
		} else {
			throw new ErrorKM('INVALID_DATA', 400, false);
		}
		const karas = await getKaras({
			q,
			ignoreCollections: true,
		});
		const deletedFiles: Set<string> = new Set();
		const deletePromises = [];
		for (const kara of karas.content) {
			try {
				const fullPath = (
					await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository))
				)[0];
				let deleteFile = true;
				if (cleanRarelyUsed) {
					const oneMonthAgo = new Date();
					oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
					if (kara.lastplayed_at < oneMonthAgo) {
						logger.info(`Removing ${fullPath} because it's too old (${kara.lastplayed_at.toISOString()})`, {
							service,
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
		emitWS(
			'KIDUpdated',
			karas.content.map(kara => {
				return { kid: kara.kid, download_status: 'MISSING' };
			})
		);
	} catch (err) {
		logger.error(`Error getting repos : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM(errorMsg);
	}
}

export async function updateZipRepo(name: string) {
	if (updateRunning) throw 'An update is already on the way, wait for it to finish.';
	updateRunning = true;
	const repo = getRepo(name);
	if (!repo.Online || repo.MaintainerMode || !repo.Enabled || !repo.Update) {
		updateRunning = false;
		throw 'Repository is not online, disabled, is in Maintainer Mode, or updates are disabled!';
	}
	// Checking if folder is empty. This can happen if someone moved their repo elsewhere or deleted everything. In this case the local commit
	try {
		let localCommit = await getLocalRepoLastCommit(repo);
		const baseDir = resolve(getState().dataPath, repo.BaseDir);
		const dir = await fs.readdir(baseDir);
		if (dir.length === 0) {
			// Folder is empty.
			logger.info('Folder is empty, resetting local commit to null', { service });
			localCommit = null;
		}
		try {
			const karaDir = await fs.readdir(resolve(baseDir, 'karaokes/'));
			if (karaDir.length === 0) {
				throw 'Empty';
			}
		} catch (err) {
			logger.info('Karaoke folder is empty or non-existant, resetting local commit to null', { service });
			localCommit = null;
		}
		logger.info(`Updating repository from ${name}, our commit is ${localCommit}`, { service });
		if (!localCommit) {
			// If local commit doesn't exist, we have to start by retrieving one
			const LatestCommit = await newZipRepo(repo);
			// Once this is done, we store the last commit in settings DB
			await saveSetting(`commit-${name}`, LatestCommit);
			await saveSetting('baseChecksum', await baseChecksum());
			updateRunning = false;
			return true;
		}
		// Check if update is necessary by fetching the remote last commit sha
		const { LatestCommit } = await getRepoMetadata(repo);
		logger.debug(`Update ${repo.Name}: ours is ${localCommit}, theirs is ${LatestCommit}`, { service });
		if (LatestCommit !== localCommit) {
			try {
				const patch = await HTTP.get(
					`${repo.Secure ? 'https' : 'http'}://${repo.Name}/api/karas/repository/diff?commit=${fixedEncodeURIComponent(localCommit)}`,
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
					logger.info('Trying to download full files instead', { service });
					const fullFiles = await HTTP.get(
						`${repo.Secure ? 'https' : 'http'}://${repo.Name}/api/karas/repository/diff/full?commit=${fixedEncodeURIComponent(
							localCommit
						)}`
					);
					await writeFullPatchedFiles(fullFiles.data as DiffChanges[], repo);
					changes = computeFileChanges(patch.data as string);
				}
				logger.debug('Applying changes', { service, obj: { changes } });
				await applyChanges(changes, repo);
				await saveSetting(`commit-${repo.Name}`, LatestCommit);
				return false;
			} catch (err) {
				logger.warn('Cannot use patch method to update repository, downloading full zip again.', {
					service,
				});
				sentry.addErrorInfo('initialCommit', localCommit);
				sentry.addErrorInfo('toCommit', LatestCommit);
				sentry.error(err, 'warning');
				await saveSetting(`commit-${repo.Name}`, null);
				updateRunning = false;
				await updateZipRepo(name);
			}
		}
	} catch (err) {
		throw err;
	} finally {
		updateRunning = false;
	}
}

async function getLocalRepoLastCommit(repo: Repository): Promise<string | null> {
	const settings = await getSettings();
	return settings[`commit-${repo.Name}`] || null;
}

async function newZipRepo(repo: Repository): Promise<string> {
	const { FullArchiveURL, LatestCommit } = await getRepoMetadata(repo);
	await downloadAndExtractZip(FullArchiveURL, resolve(getState().dataPath, repo.BaseDir), repo.Name);
	await oldFilenameFormatKillSwitch(repo.Name);
	if (repo.AutoMediaDownloads === 'all') {
		updateMedias(repo.Name).catch(e => {
			if (e?.code === 409) {
				// Do nothing. It's okay.
			} else {
				throw e;
			}
		});
	}
	return LatestCommit;
}

/** Edit a repository. Folders will be created if necessary
 * This is another cursed function of Karaoke Mugen.
 */
export async function editRepo(
	name: string,
	repo: Repository,
	refresh?: boolean,
	onlineCheck = true
): Promise<Repository> {
	try {
		const oldRepo = getRepo(name);
		if (!oldRepo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		if (repo.Online && onlineCheck) {
			// Testing if repository is reachable
			try {
				const manifest = await getRepoMetadata(repo);
				if (repo.MaintainerMode && repo.Git) repo.Git.ProjectID = manifest.ProjectID;
			} catch (err) {
				throw new ErrorKM('REPOSITORY_UNREACHABLE', 404, false);
			}
		}
		if (repo.MaintainerMode && repo.Git?.URL) await checkGitInstalled();
		if (repo.Enabled) await checkRepoPaths(repo);
		updateRepo(repo, name);
		// Delay repository actions after edit
		hookEditedRepo(oldRepo, repo, refresh, onlineCheck).catch();
		logger.info(`Updated ${name}`, { service });
		return repo;
	} catch (err) {
		logger.error(`Error editing repo : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_EDIT_ERROR');
	}
}

async function hookEditedRepo(oldRepo: Repository, repo: Repository, refresh = false, onlineCheck = true) {
	let doGenerate = false;
	if (!oldRepo.SendStats && repo.Online && repo.Enabled && repo.SendStats && getState().DBReady && onlineCheck) {
		sendPayload(repo.Name, repo.Name === getConfig().Online.Host, repo.Secure).catch();
	}
	// Repo is online so we have stuff to do
	if (repo.Enabled && repo.Online && repo.Update) {
		// Maintainer mode got enabled
		if (!oldRepo.MaintainerMode && repo.MaintainerMode) {
			// Git URL exists so we're trying to update git repo
			if (repo.Git?.URL && getState().DBReady) {
				saveSetting(`commit-${repo.Name}`, null);
				try {
					await updateGitRepo(repo.Name);
				} catch (err) {
					logger.warn('Repository was edited, but updating it failed', { service, err });
					emitWS(
						'operatorNotificationError',
						APIMessage(
							err instanceof ErrorKM
								? `ERROR_CODES.${err.message}`
								: 'NOTIFICATION.OPERATOR.ERROR.UPDATE_GIT_REPO_ERROR'
						)
					);
				}
				if (refresh) doGenerate = true;
			}
		}
		// Maintainer mode got DISABLED
		if (oldRepo.MaintainerMode && !repo.MaintainerMode && getState().DBReady) {
			// We turn the repository back into a zip repository
			try {
				await updateZipRepo(repo.Name);
				if (refresh) doGenerate = true;
			} catch (err) {
				logger.warn('Repository was edited, but updating it failed', { service });
			}
		}
	}
	// Repo is git but has only been modified
	if (repo.Enabled && repo.MaintainerMode && repo.Git) {
		try {
			await setupGit(repo, true);
		} catch (err) {
			// Non-fatal. Probably that the repository isn't set
			logger.warn(`Could not update Git settings for repository : ${err}`, { service, obj: err });
		}
	}
	if (oldRepo.Enabled !== repo.Enabled || (refresh && getState().DBReady)) {
		await compareKarasChecksum();
		doGenerate = true;
	}
	if (doGenerate) await generateDB();
	if (oldRepo.Path.Medias !== repo.Path.Medias && getState().DBReady && onlineCheck) {
		getKaras({ q: `r:${repo.Name}`, ignoreCollections: true }).then(karas => {
			checkDownloadStatus(karas.content.map(k => k.kid));
		});
	}
}

export async function listRepoStashes(name: string) {
	try {
		const repo = getRepo(name);
		if (!repo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		const git = await setupGit(repo);
		return await git.stashList();
	} catch (err) {
		logger.error(`Error listing repo stashes for  ${name} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GIT_CHECK_ERROR');
	}
}

export async function unstashInRepo(name: string, stash: number) {
	try {
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
	} catch (err) {
		logger.error(`Error unstashing for ${name} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GIT_UNSTASH_ERROR');
	}
}

export async function dropStashInRepo(name: string, stash: number) {
	try {
		const repo = getRepo(name);
		if (!repo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		const git = await setupGit(repo);
		const stashes = await git.stashList();
		if (stash > stashes.all.length || stash < 0) {
			throw new ErrorKM('UNKNOWN_STASH', 404, false);
		}
		return await git.stashDrop(stash);
	} catch (err) {
		logger.error(`Error dropping stashes for  ${name} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GIT_DROP_STASH_ERROR');
	}
}

/** Completely reset repository to initial state */
export async function resetRepo(name: string) {
	try {
		const repo = getRepo(name);
		if (!repo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		const git = await setupGit(repo);
		await git.reset(['--hard', 'origin/master']);
		await git.wipeChanges();
	} catch (err) {
		logger.error(`Error git resetting ${name} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GIT_RESET_ERROR');
	}
}

export async function updateGitRepo(name: string) {
	try {
		if (updateRunning) {
			logger.error(`Unable to update repository ${name} : update already in progress`, { service });
			throw new ErrorKM('UPDATE_REPO_ALREADY_IN_PROGRESS', 409, false);
		}
		updateRunning = true;
		const repo = getRepo(name);
		if (!repo.Online || !repo.Enabled || !repo.MaintainerMode || !repo.Update) {
			updateRunning = false;
			logger.error(
				`Unable to update repository ${name} : Repo is disabled or not in maintainer mode or not online, or updates are disabled`,
				{ service }
			);
			throw new ErrorKM('REPO_NOT_UPDATEABLE', 400, false);
		}
		logger.info(`Update ${repo.Name}: Starting`, { service });

		if (!(await isGit(repo))) {
			logger.info(`Update ${repo.Name}: not a git repo, cloning now`, { service });
			await newGitRepo(repo);
			await saveSetting('baseChecksum', await baseChecksum());
			return true;
		}
		const git = await setupGit(repo, true);
		logger.info(`Update ${repo.Name}: is a git repo, pulling`, { service });
		await git.fetch();
		const originalCommit = await git.getCurrentCommit();
		try {
			const status = await git.status();
			if (status.behind === 0) {
				// Repository is up-to-date
				logger.info(`Update ${repo.Name}: repo is up-to-date`, { service });
				return false;
			}
			if (!status.isClean()) {
				// Repository is not clean, we'll generate commits and do some magic
				const push = await generateCommits(repo.Name);
				if (push) {
					for (const stash of push.commits) {
						await git.stash(stash);
					}
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
						offset += 1;
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
							service,
							obj: err,
						});
						await git.wipeChanges();
					}
				}
				// We cancel the commit we just made so all files in it are now marked as new/modified
				if (!firstCommit) await git.reset(['HEAD~']);
			}
		} catch (err) {
			logger.info(`${repo.Name} pull failed`, { service, obj: err });
			// This failed miserably because there was a conflict. Or something. We can test this out.
			const status = await git.status();
			// Else it means we're having disturbances in the Force.
			emitWS('gitRepoPullFailed', {
				...status,
				repoName: repo.Name,
			});
			throw new ErrorKM('GIT_PULL_FAILED');
		}
		const newCommit = await git.getCurrentCommit();
		logger.debug(`Original commit : ${originalCommit} and new commit : ${newCommit}`, { service });
		const diff = await git.diff(originalCommit, newCommit);
		const changes = computeFileChanges(diff);
		await applyChanges(changes, repo);
		return false;
	} catch (err) {
		logger.error(`Failed to update repo ${name}: ${err}`, { service, obj: err });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GIT_UPDATE_ERROR');
	} finally {
		updateRunning = false;
		logger.info(`Update ${name}: Finished`, { service });
	}
}

async function applyChanges(changes: Change[], repo: Repository) {
	let task: Task;
	try {
		await oldFilenameFormatKillSwitch(repo.Name);
		const tagFiles = changes.filter(f => f.path.endsWith('.tag.json'));
		const karaFiles = changes.filter(f => f.path.endsWith('.kara.json'));
		const fontFiles = changes.filter(f => f.path.startsWith('fonts/'));
		// If maintenance mode is disabled and fonts are detected we'll throw so the .zip gets downloaded instead. We *might* want to do it better sometime.
		// Like you know, actually downloading the fonts from KMServer or something.
		if (fontFiles.length > 0 && !repo.MaintainerMode) {
			logger.warn('Changes include new font(s). Throwing so the .zip is downloaded instead.');
			throw 'fonts? izok.';
		}
		const TIDsToDelete = [];
		task = new Task({ text: 'UPDATING_REPO', total: karaFiles.length + tagFiles.length });
		const tagFilesToProcess = [];
		for (const match of tagFiles) {
			if (match.type === 'new') {
				tagFilesToProcess.push(resolve(resolvedPathRepos('Tags', repo.Name)[0], basename(match.path)));
			} else {
				// Delete.
				TIDsToDelete.push(match.uid);
				task.update({ value: task.item.value + 1, subtext: match.path });
			}
		}
		const tagMapper = async (file: string) => {
			await integrateTagFile(file, false);
			task.update({ value: task.item.value + 1, subtext: basename(file) });
		};
		try {
			await parallel(tagFilesToProcess, tagMapper, {
				stopOnError: true,
				concurrency: 32,
			});
		} catch (err) {
			throw err;
		}
		const KIDsToDelete = [];
		const KIDsToUpdate = [];
		let karas: KaraMetaFile[] = [];
		const karaFilesToProcessBeforeSort = [];
		for (const match of karaFiles) {
			if (match.type === 'new') {
				karaFilesToProcessBeforeSort.push(
					resolve(resolvedPathRepos('Karaokes', repo.Name)[0], basename(match.path))
				);
			} else {
				// Delete.
				KIDsToDelete.push(match.uid);
				task.update({ value: task.item.value + 1, subtext: match.path });
			}
		}
		const karaMapper = async file => {
			const karaFileData = await parseKara(file);
			karas.push({
				file,
				data: karaFileData,
			});
		};
		try {
			await parallel(karaFilesToProcessBeforeSort, karaMapper, {
				stopOnError: true,
				concurrency: 32,
			});
		} catch (err) {
			throw err;
		}
		try {
			/* Uncomment this when you need to debug stuff.
			fs.writeFile('sort.json', JSON.stringify(karas.map(k => {
				return {
					file: k.file,
					kid: k.data.data.kid,
					parents: k.data.data.parents
				};
			}), null, 2), 'utf-8');
			*/
			const karasBeforeSort = {
				karas: karas.map(k => {
					return {
						file: k.file,
						kid: k.data.data.kid,
						parents: k.data.data.parents,
					};
				}),
			};
			logger.debug('Songs to add before sort', { service, obj: karasBeforeSort });
			karas = topologicalSort(karas);
			const karasAfterSort = {
				karas: karas.map(k => {
					return {
						file: k.file,
						kid: k.data.data.kid,
						parents: k.data.data.parents,
					};
				}),
			};
			sentry.addErrorInfo('KarasToAdd', JSON.stringify(karasAfterSort, null, 2));
			logger.debug('Songs to add after sort', { service, obj: karasAfterSort });
		} catch (err) {
			logger.error('Topological sort failed', { service, obj: karas });
			throw err;
		}
		for (const kara of karas) {
			KIDsToUpdate.push(await integrateKaraFile(kara.file, kara.data, false));
			task.update({ value: task.item.value + 1, subtext: basename(kara.file) });
		}
		const deletePromises = [];
		if (KIDsToDelete.length > 0)
			deletePromises.push(removeKara(KIDsToDelete, false, { media: true, kara: false }, true));
		if (TIDsToDelete.length > 0) {
			// Let's not remove tags in karas : it's already done anyway
			deletePromises.push(
				removeTag(TIDsToDelete, { refresh: false, removeTagInKaras: false, deleteFile: false })
			);
		}
		await Promise.all(deletePromises);
		// Font downloads
		for (const fontFile of fontFiles) {
			if (fontFile.type === 'delete') {
				deleteFont(fontFile.path, repo.Name).catch();
			}
			if (fontFile.type === 'new') {
				await addFont(fontFile.path, repo.Name);
			}
		}
		task.update({ text: 'REFRESHING_DATA', subtext: '', total: 0, value: 0 });
		// Yes it's done in each action individually but since we're doing them asynchronously we need to re-sort everything and get the store checksum once again to make sure it doesn't re-generate database on next startup
		if (fontFiles.length > 0) {
			initFonts();
		}
		await saveSetting('baseChecksum', await baseChecksum());
		if (tagFiles.length > 0 || karaFiles.length > 0) await refreshAll();
		await checkDownloadStatus(KIDsToUpdate);
		await updateAllSmartPlaylists();
	} catch (err) {
		logger.error(`Applying changes failed, please regenerate your database : ${err}`, {
			service,
			obj: err,
		});
		throw err;
	} finally {
		task.end();
		updateRunning = false;
	}
}

export async function checkGitRepoStatus(repoName: string) {
	try {
		const repo = getRepo(repoName);
		const git = await setupGit(repo);
		return await git.status();
	} catch (err) {
		logger.error(`Error checking git for repo ${repoName} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GIT_CHECK_ERROR');
	}
}

export async function stashGitRepo(repoName: string) {
	try {
		const repo = getRepo(repoName);
		const git = await setupGit(repo, true);
		try {
			await git.abortPull();
		} catch (err) {
			// rebase not in progress is normal
		}
		return await git.stash();
	} catch (err) {
		logger.error(`Error stashing commits for repo ${repoName} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GIT_STASH_ERROR');
	}
}

/** Helper function to setup git in other functions */
async function setupGit(repo: Repository, configChanged = false, clone = false) {
	if (!repo.BaseDir) throw 'BaseDir is empty! This could be trouble!';
	const baseDir = resolve(getState().dataPath, repo.BaseDir);
	if (!repo.MaintainerMode) throw 'Maintainer mode disabled for this repository';
	if (!clone && !(await isGit(repo))) throw 'Not a git repository. Has it been cloned properly?';
	const git = new Git({
		baseDir,
		url: repo.Git.URL,
		username: repo.Git.Username,
		password: repo.Git.Password,
		repoName: repo.Name,
	});
	await git.setup(configChanged);
	return git;
}

export async function generateSSHKey(repoName: string) {
	const repo = getRepo(repoName);
	const git = await setupGit(repo);
	await git.generateSSHKey();
	await git.setup(true);
}

export async function removeSSHKey(repoName: string) {
	const repo = getRepo(repoName);
	const git = await setupGit(repo);
	await git.removeSSHKey();
	await git.setup(true);
}

export async function getSSHPubKey(repoName: string) {
	const repo = getRepo(repoName);
	const git = await setupGit(repo);
	try {
		return await git.getSSHPubKey();
	} catch (err) {
		throw new ErrorKM('SSH_PUBLIC_KEY_NOT_FOUND', 404, false);
	}
}

export async function newGitRepo(repo: Repository) {
	// Hello, we're going to lift stuff.
	// First, let's empty the basedir folder
	const state = getState();
	// Only testing first media folder because I'm lazy.
	const baseDir = resolve(state.dataPath, repo.BaseDir);
	const mediaDir = resolve(state.dataPath, repo.Path.Medias[0]);
	if (pathIsContainedInAnother(baseDir, mediaDir)) throw 'Media folder is contained in base dir, move it first!';
	await remove(baseDir);
	await asyncCheckOrMkdir(baseDir);
	const git = await setupGit(repo, false, true);
	await git.clone();
	git.setup(true);
	await oldFilenameFormatKillSwitch(repo.Name);
	if (repo.AutoMediaDownloads === 'all') {
		updateMedias(repo.Name).catch(e => {
			if (e?.code === 409) {
				// Do nothing. It's okay.
			} else {
				throw e;
			}
		});
	}
	await initHooks();
}

export async function compareLyricsChecksums(repo1Name: string, repo2Name: string): Promise<DifferentChecksumReport[]> {
	// Get all files
	const task = new Task({
		text: 'COMPARING_LYRICS_IN_REPOS',
	});
	try {
		if (!getRepo(repo1Name) || !getRepo(repo2Name)) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);

		const [repo1Files, repo2Files] = await Promise.all([
			listAllFiles('Karaokes', repo1Name),
			listAllFiles('Karaokes', repo2Name),
		]);
		const [karas1, karas2] = await Promise.all([
			readAllKaras(repo1Files, false, task),
			readAllKaras(repo2Files, false, task),
		]);
		type KaraMap = Map<string, KaraFileV4>;
		const karas1Map: KaraMap = new Map();
		const karas2Map: KaraMap = new Map();
		karas1.forEach(k => karas1Map.set(k.data.kid, k));
		karas2.forEach(k => karas2Map.set(k.data.kid, k));
		const differentChecksums = [];
		for (const kara1 of karas1Map.values()) {
			const kara2 = karas2Map.get(kara1.data.kid);
			if (kara2) {
				// read both lyrics and then decide if they're different
				const lyricsPath1 = resolve(
					resolvedPathRepos('Lyrics', kara1.data.repository)[0],
					kara1.medias[0].lyrics?.[0]?.filename
				);
				const lyricsPath2 = resolve(
					resolvedPathRepos('Lyrics', kara2.data.repository)[0],
					kara2.medias[0].lyrics?.[0]?.filename
				);
				const [lyrics1, lyrics2] = await Promise.all([
					fs.readFile(lyricsPath1, 'utf-8'),
					fs.readFile(lyricsPath2, 'utf-8'),
				]);
				if (lyrics1 !== lyrics2) {
					differentChecksums.push({
						kara1,
						kara2,
					});
				}
			}
		}
		return differentChecksums;
	} catch (err) {
		logger.error(`Error comparing lyrics between ${repo1Name} and ${repo2Name} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_COMPARE_LYRICS_ERROR');
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
		logger.info('Copying lyrics between repositories', { service });
		for (const karas of report) {
			logger.info(`Copying lyrics for ${karas.kara1.meta.karaFile}`, { service });
			task.update({
				subtext: karas.kara2.medias[0].lyrics?.[0]?.filename,
			});
			// Copying kara1 data to kara2
			karas.kara2.meta.isKaraModified = true;
			const writes = [];
			writes.push(writeKara(karas.kara2.meta.karaFile, karas.kara2));
			if (karas.kara1.medias[0].lyrics?.[0]) {
				const sourceLyrics = await resolveFileInDirs(
					karas.kara1.medias[0].lyrics[0]?.filename,
					resolvedPathRepos('Lyrics', karas.kara1.data.repository)
				);
				const destLyrics = await resolveFileInDirs(
					karas.kara2.medias[0].lyrics[0].filename,
					resolvedPathRepos('Lyrics', karas.kara2.data.repository)
				);
				writes.push(copy(sourceLyrics[0], destLyrics[0], { overwrite: true }));
			}
			writes.push(createKaraInDB(karas.kara2, { refresh: false }));
			await Promise.all(writes);
			await editKaraInStore(karas.kara2.meta.karaFile);
			task.incr();
		}
		sortKaraStore();
		saveSetting('baseChecksum', getStoreChecksum());
		refreshKaras();
	} catch (err) {
		logger.error(`Error getting repos : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_COPY_LYRICS_ERROR');
	} finally {
		task.end();
	}
}

export function checkRepoMediaPaths(repo?: Repository) {
	const reposWithPath = getConfig().System.Repositories.map(r => ({
		...(repo && repo.Name === r.Name ? repo : r),
		mediasPath: resolvedPathRepos('Medias', r.Name)[0],
	}));
	const enabledRepos = reposWithPath.filter(r => r.Enabled);
	const reposWithSameMediaPath = enabledRepos
		.map(or => ({
			repo: or,
			repoWithSameMediaPath: reposWithPath.find(r => r.Name !== or.Name && r.mediasPath === or.mediasPath),
		}))
		.filter(or => !!or.repoWithSameMediaPath);
	return {
		reposWithSameMediaPath,
		reposWithSameMediaPathText:
			reposWithSameMediaPath.length > 0 &&
			reposWithSameMediaPath.map(r => `${r.repo.Name}, ${r.repoWithSameMediaPath.Name}`).join(', '),
	};
}

function checkRepoPaths(repo: Repository) {
	if (windowsDriveRootRegexp.test(repo.BaseDir)) {
		throw new ErrorKM('REPO_PATH_ERROR_IN_WINDOWS_ROOT_DIR', 400, false);
	}
	if (!getState().portable) {
		// The Mutsui Fix.
		// If not in portable mode, prevent repo paths from being in the app folder
		if (pathIsContainedInAnother(resolve(getState().appPath), resolve(getState().dataPath, repo.BaseDir))) {
			throw new ErrorKM('REPO_PATH_ERROR_IN_APP_PATH', 400, false);
		}
	}
	for (const path of repo.Path.Medias) {
		// Fix for KM-APP-1W5 because someone thought it would be funny to put all its medias in the folder KM's exe is in. Never doubt your users' creativity.
		if (
			!getState().portable &&
			pathIsContainedInAnother(resolve(getState().appPath), resolve(getState().dataPath, path))
		) {
			throw new ErrorKM('REPO_PATH_ERROR_IN_APP_PATH', 400, false);
		}
		if (pathIsContainedInAnother(resolve(getState().dataPath, repo.BaseDir), resolve(getState().dataPath, path))) {
			throw new ErrorKM('REPO_PATH_ERROR_IN_BASE_PATH', 400, false);
		}
		if (windowsDriveRootRegexp.test(path)) {
			throw new ErrorKM('REPO_PATH_ERROR_IN_WINDOWS_ROOT_DIR', 400, false);
		}
	}

	const mediaPathErrors = checkRepoMediaPaths(repo);
	if (mediaPathErrors.reposWithSameMediaPath.length > 0) {
		logger.error(
			`Multiple repositories share the same media path, which will cause sync errors: ${mediaPathErrors.reposWithSameMediaPathText}`,
			{ service }
		);
		throw new ErrorKM('REPOS_MULTIPLE_USED_MEDIA_PATH_ERROR', 400, false);
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
	const task = new Task({
		text: 'FINDING_UNUSED_MEDIAS',
	});
	try {
		if (!getRepo(repo)) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		const [karas, mediaFiles] = await Promise.all([
			getKaras({ ignoreCollections: true }),
			listAllFiles('Medias', repo),
		]);
		const mediasFilesKaras: string[] = karas.content.map(k => k.mediafile);
		return mediaFiles.filter(file => !mediasFilesKaras.includes(basename(file)));
	} catch (err) {
		logger.error(`Error getting unused media for repository ${repo} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GET_UNUSEDMEDIA_ERROR');
	} finally {
		task.end();
	}
}

/** Get metadata. Throws if KM Server is not up to date */
export async function getRepoMetadata(repo: Repository) {
	try {
		// FIXME : This should be depracted in KM 9.0
		// Repository metadata will have to come from the manifest file provided by each repository, not from their online server.
		// Only LastCommit will need to be fetched from KM Server.
		const ret = await HTTP.get(`${repo.Secure ? 'https' : 'http'}://${repo.Name}/api/karas/repository`);
		return ret.data as RepositoryManifest;
	} catch (err) {
		throw err;
	}
}

/** Find any unused tags in a repository */
export async function findUnusedTags(repo: string): Promise<DBTag[]> {
	try {
		if (!getRepo(repo)) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		const tags = await getTags({});
		const tagsToDelete = tags.content.filter(t => !t.karacount && t.repository === repo);
		// Return all valid tags
		return tagsToDelete;
	} catch (err) {
		logger.error(`Error getting unused tags in repository ${repo} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GET_UNUSEDTAGS_ERROR');
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
		if (!repo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		await checkRepoPaths(repo);
		logger.info(`Moving ${repoName} medias repository to ${newPath}...`, { service });
		const moveTasks = [];
		for (const dir of repo.Path.Medias) {
			if (resolve(state.dataPath, dir) === newPath) return;
			moveTasks.push(moveAll(resolve(state.dataPath, dir), newPath));
		}
		await Promise.all(moveTasks);
		repo.Path.Medias = [relativePath(state.dataPath, newPath)];
		await editRepo(repoName, repo, true, false);
	} catch (err) {
		logger.error(`Error moving medias for repo ${repoName} : ${err}`, { service });
		sentry.error(err);
		emitWS('operatorNotificationError', APIMessage('ERROR_CODES.MOVING_MEDIAS_ERROR'));
		throw err instanceof ErrorKM ? err : new ErrorKM('MOVING_MEDIAS_ERROR');
	} finally {
		task.end();
	}
}

export async function getRepoFreeSpace(repoName: string) {
	try {
		const repo = getRepo(repoName);
		return await getFreeSpace(resolve(getState().dataPath, repo.Path.Medias[0]));
	} catch (err) {
		logger.error(`Error getting repos : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GET_FREE_SPACE_ERROR');
	}
}

export async function generateCommits(repoName: string) {
	const task = new Task({
		text: 'PREPARING_CHANGES',
		value: 0,
		total: 100,
	});
	try {
		const repo = getRepo(repoName);
		const repoManifest = getRepoManifest(repoName);
		const git = await setupGit(repo, true);
		await git.reset();
		const status = await git.status();
		const deletedSongs = status.deleted.filter(f => f.endsWith('kara.json'));
		const deletedTags = status.deleted.filter(f => f.endsWith('tag.json'));
		const addedSongs = status.not_added.filter(f => f.endsWith('kara.json'));
		const modifiedSongs = status.modified.filter(f => f.endsWith('kara.json'));
		let addedTags = status.not_added.filter(f => f.endsWith('tag.json'));
		let modifiedTags = status.modified.filter(f => f.endsWith('tag.json'));
		let modifiedLyrics = status.modified.filter(f => f.includes('lyrics/'));
		let deletedLyrics = status.deleted.filter(f => f.includes('lyrics/'));
		let addedLyrics = status.not_added.filter(f => f.includes('lyrics/'));
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
			const lyricsFile = deletedLyrics.find(f => parse(basename(f)).name === song);
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
		const [karas, tags] = await Promise.all([getKaras({ ignoreCollections: true }), getTags({})]);
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
				logger.warn(`File "${file}" does not seem to be in database? Skipping`, { service });
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
					// Problems is that lyrics have already been deleted so we're going to pick the lyrics from the status itself
					const oldSong = basename(oldKaraFile, '.kara.json');
					const lyricsFile = status.deleted.find(f => parse(basename(f)).name === oldSong);
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
			// Modified songs can be renamed so we need to find out how it was named before
			// We need to find out if some tags have been added or modified and add them to our commit
			const kara = karas.content.find(k => k.karafile === basename(file));
			if (!kara) {
				logger.warn(`File "${file}" does not seem to be in database? Skipping`, { service });
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
					sizeDifference: oldKara.medias[0].filesize !== kara.mediasize,
					commit: commit.message,
				});
			} else if (oldKara.medias[0].filesize !== kara.mediasize) {
				// Names are the same, but filesizes might differ. In that case it's considered a new upload
				modifiedMedias.push({
					old: null,
					new: kara.mediafile,
					commit: commit.message,
				});
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
						if (repoManifest?.rules?.lyrics?.cleanup) {
							const lyricsPath = resolve(repo.BaseDir, lyricsFile);
							ASSFileCleanup(lyricsPath, kara);
						}
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
			const lyrics = parse(file).name;
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
			const lyrics = parse(file).name;
			const commit: Commit = {
				addedFiles: [],
				removedFiles: [file],
				message: `🔥 ✏️ Delete ${lyrics}`,
			};
			commits.push(commit);
			task.incr();
		}

		logger.debug(`Preparing ${commits.length} commits`, { service, obj: commits });
		logger.debug(`You have ${modifiedMedias.length} modified medias`, { service, obj: modifiedMedias });
		if (commits.length === 0) return;
		return { commits, modifiedMedias };
	} catch (err) {
		logger.error(`Error getting commits for ${repoName} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GIT_GET_COMMITS_ERROR');
	} finally {
		task.end();
	}
}

export async function uploadMedia(kid: string) {
	try {
		const kara = await getKara(kid, adminToken);
		const repo = getRepo(kara.repository);
		const ftp = new FTP({ repoName: repo.Name });
		await ftp.connect();
		const path = await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', repo.Name));
		await ftp.upload(path[0]);
	} catch (err) {
		logger.error(`Error uploading media for ${kid} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_UPLOAD_MEDIA_ERROR');
	}
}

/** Commit and Push all modifications */
export async function pushCommits(repoName: string, push: Push, ignoreFTP?: boolean) {
	let ftp: FTP;
	try {
		const repo = getRepo(repoName);
		const git = await setupGit(repo, true);
		if (!ignoreFTP && push.modifiedMedias.length > 0) {
			// Before making any commits, we have to send stuff via FTP
			ftp = new FTP({ repoName });
			await ftp.connect();
			for (const media of push.modifiedMedias) {
				// New or updated file
				if (media.old === null || media.old === media.new) {
					const path = await resolveFileInDirs(media.new, resolvedPathRepos('Medias', repoName));
					await ftp.upload(path[0]);
				} else if (media.new !== media.old && media.sizeDifference) {
					const path = await resolveFileInDirs(media.new, resolvedPathRepos('Medias', repoName));
					await ftp.upload(path[0]);
					try {
						await ftp.delete(media.old);
					} catch (err) {
						logger.warn(`File ${media.old} could not be deleted on FTP`, { service });
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
				if (commit.addedFiles) {
					for (const addedFile of commit.addedFiles) {
						await git.add(addedFile).catch(err => {
							logger.error(`Failed to add file ${addedFile} : ${err}`, { service });
							throw err;
						});
					}
				}
				if (commit.removedFiles) {
					for (const removedFile of commit.removedFiles) {
						await git.rm(removedFile);
					}
				}
				if (!push.squash) await git.commit(commit.message);
				task.incr();
			}
			if (push.squash) {
				await git.commit(push.squash);
			}
			// All our commits are hopefully done. Just in case we'll update repository now.
			await updateGitRepo(repoName);
			await git.push();
			// Let's do deletes and renames on FTP now. And pray it doesn't fail.
			if (!ignoreFTP && push.modifiedMedias.length > 0) {
				await ftp.connect();
				for (const media of push.modifiedMedias) {
					if (media.old === null || media.old === media.new) {
						// Upload, do nothing
					} else if (media.new === null) {
						// Deleted file
						try {
							await ftp.delete(media.old);
						} catch (err) {
							logger.warn(`File ${media.old} could not be deleted on FTP`, { service });
						}
					} else if (media.new !== media.old) {
						// Renamed file or new upload with different sizes, let's find out!
						if (!media.sizeDifference) {
							await ftp.rename(basename(media.old), basename(media.new));
						}
					}
				}
				await ftp.disconnect();
			}
			emitWS('pushComplete', repoName);
		} catch (err) {
			throw err;
		} finally {
			task.end();
		}
	} catch (err) {
		logger.error(`Pushing to repository ${repoName} failed: ${err}`, { service, obj: err });
		sentry.error(err);
		emitWS(
			'operatorNotificationError',
			APIMessage(err instanceof ErrorKM ? `ERROR_CODES.${err.message}` : 'ERROR_CODES.REPO_GIT_PUSH_ERROR')
		);
	} finally {
		if (ftp) ftp.disconnect().catch(() => {});
	}
}

/** Return a diff of a specified file using git */
export async function getFileDiff(file: string, repoName: string) {
	try {
		const repo = getRepo(repoName);
		if (!repo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		const git = await setupGit(repo);
		return await git.diffFile(file);
	} catch (err) {
		logger.error(`Unable to diff file ${file} for repo ${repoName}`, { service, obj: err });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_GIT_DIFF_ERROR');
	}
}

function topologicalSort(karas: KaraMetaFile[]): KaraMetaFile[] {
	const nodes = new Map();

	const sortOp = new TopologicalSort(nodes);

	for (const kara of karas) {
		sortOp.addNode(kara.data.data.kid, kara);
	}

	for (const kara of karas) {
		if (kara.data.data.parents?.length > 0) {
			for (const parent of kara.data.data.parents) {
				// We need to make sure parent exists in the list. If not we don't add it as an edge or else the sort will fail.
				if (karas.find(k => k.data.data.kid === parent)) {
					try {
						sortOp.addEdge(parent, kara.data.data.kid);
					} catch (_err) {
						// Non-fatal, probably a song has the same parent twice
					}
				}
			}
		}
	}
	const sorted = [];
	for (const kara of sortOp.sort().values()) {
		sorted.push(kara.node);
	}

	return sorted;
}

export async function openMediaFolder(repoName: string) {
	try {
		const mediaFolders = resolvedPathRepos('Medias', repoName);
		for (const mediaFolder of mediaFolders) {
			shell.openPath(mediaFolder);
		}
	} catch (err) {
		logger.error(`Unable to open media folders : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('OPEN_MEDIA_FOLDER_ERROR');
	}
}
