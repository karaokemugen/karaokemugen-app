// This code doesn't know it yet but it's already dead.
// More seriously, we're centralizing all code bound to be removed at some point due to various migrations through KM's versions.
//
// When removing code here, remember to go see if all functions called are still useful.

import { app, dialog } from 'electron';
import { existsSync, readdirSync, rmdirSync } from 'fs';
import fs, { rename } from 'fs/promises';
import { moveSync } from 'fs-extra';
import fsExtra from 'fs-extra/esm';
import i18next from 'i18next';
import { extname, resolve } from 'path';
import semver from 'semver';

import { getSettings, saveSetting } from '../lib/dao/database.js';
import { readRepoManifest, selectRepositoryManifest } from '../lib/dao/repo.js';
import { readAllKaras } from '../lib/services/generation.js';
import { Repository } from '../lib/types/repo.js';
import { getConfig, resolvedPath, resolvedPathRepos, setConfig } from '../lib/utils/config.js';
import { uuidRegexp } from '../lib/utils/constants.js';
import { listAllFiles, sanitizeFile } from '../lib/utils/files.js';
import logger from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import { medias } from '../services/playlistMedias.js';
import { editRepo, getRepo, getRepos } from '../services/repo.js';
import { resolvedMediaPath } from './config.js';
import { getState, setState } from './state.js';

const service = 'YouAreAlreadyDeadCode';

/** Remove when we ship KM 10 */
export function decoupleOnlineConfig() {
	try {
		const conf = getConfig();
		setConfig({
			Online: {
				RemoteAccess: {
					Enabled: conf.Online.Remote,
					Token: conf.Online.RemoteToken,
					Domain: conf.Online.Host,
					Secure: conf.Online.Secure,
				},
				RemoteUsers: {
					Enabled: conf.Online.Users,
					DefaultHost: conf.Online.Host,
					Secure: conf.Online.Secure,
				},
			},
		});
	} catch (err) {
		logger.warn(`Failed to decouple online config. Should not be too bad : ${err}`, { service });
	}
}

/** Remove when we ship KM 10 */
export async function removeKaraokeMugenFolderInPlaylistMedias() {
	try {
		const conf = getConfig();
		for (const type of Object.keys(medias)) {
			fsExtra.remove(resolve(resolvedMediaPath(type)[0], 'KaraokeMugen'));
			conf.System.MediaPath[type] = conf.System.MediaPath[type].filter(p => !p.endsWith('KaraokeMugen'));
		}
		setConfig({
			System: {
				MediaPath: conf.System.MediaPath,
			},
		});
	} catch (err) {
		logger.warn(`Failed to remove old PL intermission folder. Should not be too bad : ${err}`, { service });
	}
}

/** Remove when we drop support for mpv <0.38.0 */
export function mpvIsRecentEnough() {
	const mpvVersion = getState().player?.version;
	if (mpvVersion && !semver.satisfies(mpvVersion, '>=0.38.0')) {
		return false;
	}
	return true;
}

/** Remove when we drop support for mpv <0.39.0 */
export function isMpvGreaterThan39() {
	const mpvVersion = getState().player?.version;
	if (mpvVersion && !semver.satisfies(mpvVersion, '>=0.39.0')) {
		return false;
	}
	return true;
}

/** Remove in KM 10.0 */
export async function checkMovedUserDir() {
	if (getState().movedUserDir) {
		await dialog.showMessageBox({
			type: 'warning',
			title: i18next.t('MOVED_USER_DIR_DIALOG.TITLE'),
			message: process.platform === 'darwin' ? i18next.t('MOVED_USER_DIR_DIALOG.TITLE') : undefined,
			detail: `${i18next.t('MOVED_USER_DIR_DIALOG.DETAIL', { newDir: getState().dataPath, oldDir: resolve(app.getPath('home'), 'KaraokeMugen/') })}`,
			buttons: [i18next.t('MOVED_USER_DIR_DIALOG.UNDERSTOOD')],
		});
		if (process.env.container) {
			await dialog.showMessageBox({
				type: 'info',
				title: i18next.t('MOVED_USER_DIR_FLATPAK_DIALOG.TITLE'),
				message: process.platform === 'darwin' ? i18next.t('MOVED_USER_DIR_FLATPAK_DIALOG.TITLE') : undefined,
				detail: `${i18next.t('MOVED_USER_DIR_FLATPAK_DIALOG.DETAIL', { oldDir: resolve(app.getPath('home'), 'KaraokeMugen/') })}`,
				buttons: [i18next.t('MOVED_USER_DIR_FLATPAK_DIALOG.UNDERSTOOD')],
			});
		}
	}
	if (getState().errorMovingUserDir) {
		const buttons = await dialog.showMessageBox({
			type: 'error',
			title: i18next.t('MOVING_USER_DIR_ERROR_DIALOG.TITLE'),
			message: process.platform === 'darwin' ? i18next.t('MOVING_USER_DIR_ERROR_DIALOG.TITLE') : undefined,
			detail: `${i18next.t('MOVING_USER_DIR_ERROR_DIALOG.DETAIL', { newDir: getState().dataPath, oldDir: resolve(app.getPath('home'), 'KaraokeMugen/') })}`,
			buttons: [
				i18next.t('MOVING_USER_DIR_ERROR_DIALOG.CONTINUE'),
				i18next.t('MOVING_USER_DIR_ERROR_DIALOG.QUIT'),
			],
		});
		if (buttons.response === 1) {
			app.exit(0);
		}
	}
}

/** Remove in KM 10.0 */
export async function oldFilenameFormatKillSwitch(repoName: string) {
	const task = new Task({
		// This is only used for a test in init page
		text: 'UPDATING_MEDIAS',
		value: 0,
	});
	const service = 'GloryToUUIDs';
	try {
		await readRepoManifest(repoName);
		const manifest = selectRepositoryManifest(repoName);
		if (manifest.oldFormatKillSwitch === true) {
			// The fun begins here.
			const mediaDir = resolvedPathRepos('Medias', repoName)[0];
			const mediaFiles = await fs.readdir(mediaDir);
			// Doing nothing if no mediafiles found or if one mediafile isn't a UUID
			if (mediaFiles.length === 0) return;
			task.update({
				total: mediaFiles.length,
			});
			if (mediaFiles.every(m => m.split('.')[0].match(uuidRegexp))) return;
			// Same if the setting is set in database.
			const settings = await getSettings();
			if (settings[`oldFormatKillSwitchDone-${repoName}`]) return;
			logger.info(`Kill switch for old format detected for ${repoName}, renaming medias...`, { service });

			const UUIDMediaMap = new Map();
			const karaFiles = await listAllFiles('Karaokes');
			const karas = await readAllKaras(karaFiles, false);
			for (const kara of karas) {
				if (!kara.data.songname) {
					logger.warn(`No songname set for ${kara.data.kid}!`, { service });
					continue;
				}
				const mediafile = `${kara.data.songname}${extname(kara.medias[0].filename)}`;
				UUIDMediaMap.set(sanitizeFile(mediafile), kara.data.kid);
			}
			let mediasRenamed = 0;
			for (const mediaFile of mediaFiles) {
				// If we encounter mediafiles being UUIDs, they're ignored.
				if (mediaFile.split('.')[0].match(uuidRegexp)) continue;
				const UUID = UUIDMediaMap.get(mediaFile);
				// If a UUID is found for the mediafile in the folder, we rename it.
				task.incr();
				if (UUID) {
					try {
						await fs.rename(
							resolve(mediaDir, mediaFile),
							resolve(mediaDir, `${UUID}${extname(mediaFile)}`)
						);
						mediasRenamed += 1;
					} catch (err) {
						logger.warn(`UUID found for ${mediaFile} but renaming failed : ${err}`, { service });
					}
				} else {
					logger.warn(`No UUID found for ${mediaFile}, no action taken`, { service });
				}
			}
			logger.info(`Renamed ${mediasRenamed} medias`, { service });
			await saveSetting(`oldFormatKillSwitchDone-${repoName}`, 'true');
		}
	} catch (err) {
		logger.error(`Media rename failed: ${err}`, { service, obj: err });
	} finally {
		task.end();
	}
}

/** Remove in KM 10.0
 * While you're at it, also remove the non-user-specific key file name check in ssh.ts
 */
export async function renameSSHKeys() {
	const repos = getRepos();
	for (const repo of repos.filter(r => r.Online && r.MaintainerMode)) {
		const oldKey = `id_rsa_KaraokeMugen_${repo.Name}`;
		const newKey = `KaraokeMugen_${repo.Name}`;
		const dir = resolvedPath('SSHKeys');
		try {
			await rename(resolve(dir, oldKey), resolve(dir, newKey));
			await rename(resolve(dir, `${oldKey}.pub`), resolve(dir, `${newKey}.pub`));
		} catch (_) {
			// Non-fatal
		}
	}
}

/** Remove in KM 10.0 */
export function moveUserDir(newDir: string) {
	const oldDir = resolve(app.getPath('home'), 'KaraokeMugen');
	if (existsSync(oldDir) && readdirSync(newDir).length === 0 && oldDir !== newDir) {
		// Removing dir first so moveSync stops complaining destination exists. It has to be empty anyways.
		rmdirSync(newDir);
		const files = readdirSync(oldDir);
		for (const file of files) {
			moveSync(resolve(oldDir, file), resolve(newDir, file));
		}
		// Remove folder if not in a flatpak, because we can't do that with flatpaks
		if (!process.env.container) {
			rmdirSync(oldDir);
		}
		setState({ movedUserDir: true });
	}
}

/** Remove in KM 10.0 */
export function updateKaraMoeSecureConfig() {
	let repo: Repository;
	try {
		repo = getRepo('kara.moe');
	} catch (err) {
		// No repository found. It's daijoubou.
		return;
	}
	if (repo && repo.Secure === undefined) {
		repo.Secure = true;
		editRepo('kara.moe', repo, false, false);
	}
}

/** Remove in KM 9.0 */
export function updateKaraMoeRepoConfig() {
	// Because we're idiots who didn't push the default Update=true to kara.moe repository (it's in the default for new installs but not for existing ones)
	// Also, we're idiots for not realizing BaseDir might be missing
	let repo: Repository;
	try {
		repo = getRepo('kara.moe');
	} catch (err) {
		// No repository found. It's daijoubou.
		return;
	}
	if (repo && repo.Update === undefined) {
		repo.Update = true;
		editRepo('kara.moe', repo, false, false);
	}
	if (repo && !repo.BaseDir) {
		repo.BaseDir = process.platform === 'win32' ? 'repos\\kara.moe\\json' : 'repos/kara.moe/json';
		editRepo('kara.moe', repo, false, false);
	}
}

/** Remove in KM 10.0 */
export async function branchRepositoryIsNowMandatory() {
	const repos = getRepos();
	for (const repository of repos) {
		if (repository.Git) {
			repository.Git.Branch = 'master';
		}
		editRepo(repository.Name, repository, false, false);
	}
}
