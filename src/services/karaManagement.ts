import { shell } from 'electron';
import { promises as fs } from 'fs';
import { copy } from 'fs-extra';
import i18next from 'i18next';
import { basename, extname, resolve } from 'path';

import { getStoreChecksum, removeKaraInStore } from '../dao/dataStore.js';
import { deleteKara, insertKara, selectAllKaras, updateKaraParents } from '../dao/kara.js';
import { removeParentInKaras } from '../dao/karafile.js';
import { selectPlaylistContentsMicro } from '../dao/playlist.js';
import { saveSetting } from '../lib/dao/database.js';
import { refreshKarasDelete } from '../lib/dao/kara.js';
import { extractMediaTechInfos, formatKaraV4, getDataFromKaraFile, writeKara } from '../lib/dao/karafile.js';
import { refreshTags } from '../lib/dao/tag.js';
import { writeTagFile } from '../lib/dao/tagfile.js';
import { APIMessage } from '../lib/services/frontend.js';
import { refreshKarasAfterDBChange, updateTags } from '../lib/services/karaManagement.js';
import { getRepoManifest } from '../lib/services/repo.js';
import { DBKara, DBKaraTag } from '../lib/types/database/kara.js';
import { DBTag } from '../lib/types/database/tag.js';
import { KaraFileV4, KaraTag } from '../lib/types/kara.js';
import { TagTypeNum } from '../lib/types/tag.js';
import { ASSFileSetMediaFile } from '../lib/utils/ass.js';
import { resolvedPath, resolvedPathRepos } from '../lib/utils/config.js';
import { getTagTypeName } from '../lib/utils/constants.js';
import { ErrorKM } from '../lib/utils/error.js';
import { embedCoverImage } from '../lib/utils/ffmpeg.js';
import { fileExists, resolveFileInDirs } from '../lib/utils/files.js';
import logger, { profile } from '../lib/utils/logger.js';
import { encodeMediaToRepoDefault } from '../lib/utils/mediaInfoValidation.js';
import { createImagePreviews } from '../lib/utils/previews.js';
import Task from '../lib/utils/taskManager.js';
import { emitWS } from '../lib/utils/ws.js';
import { adminToken } from '../utils/constants.js';
import sentry from '../utils/sentry.js';
import { getState } from '../utils/state.js';
import { checkMediaAndDownload } from './download.js';
import { getKara, getKaras } from './kara.js';
import { editKara } from './karaCreation.js';
import { getRepo, getRepos } from './repo.js';
import { updateAllSmartPlaylists } from './smartPlaylist.js';
import { getTag } from './tag.js';

const service = 'KaraManager';

export async function createKaraInDB(kara: KaraFileV4, opts = { refresh: true }) {
	const oldData = await insertKara(kara);
	await Promise.all([updateKaraParents(kara.data), updateTags(kara.data)]);
	if (opts.refresh) {
		if (!oldData.old_modified_at) {
			await refreshKarasAfterDBChange('ADD', [kara.data]);
		} else {
			await refreshKarasAfterDBChange('UPDATE', [kara.data], oldData);
		}
		updateAllSmartPlaylists();
	}
	return oldData;
}

interface Family {
	parent: string;
	children: DBKara[];
}

export async function removeKara(
	kids: string[],
	refresh = true,
	deleteFiles = { media: true, kara: true },
	batch = false
) {
	try {
		const parents: Family[] = [];
		const karas = await selectAllKaras({
			q: `k:${kids.join(',')}`,
			ignoreCollections: true,
			blacklist: false,
		});
		if (karas.length === 0) throw new ErrorKM('UNKNOWN_SONG', 404, false);
		for (const kara of karas) {
			// Remove files
			if (kara.download_status === 'DOWNLOADED' && deleteFiles.media) {
				try {
					await fs.unlink(
						(await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository)))[0]
					);
				} catch (err) {
					logger.warn(`Non fatal: Removing mediafile ${kara.mediafile} failed`, { service, obj: err });
				}
			}
			if (deleteFiles.kara) {
				try {
					await fs.unlink(
						(await resolveFileInDirs(kara.karafile, resolvedPathRepos('Karaokes', kara.repository)))[0]
					);
				} catch (err) {
					logger.warn(`Non fatal: Removing karafile ${kara.karafile} failed`, { service, obj: err });
				}
				if (kara.lyrics_infos[0].filename) {
					try {
						await fs.unlink(
							(
								await resolveFileInDirs(
									kara.lyrics_infos[0].filename,
									resolvedPathRepos('Lyrics', kara.repository)
								)
							)[0]
						);
					} catch (err) {
						logger.warn(`Non fatal: Removing subfile ${kara.lyrics_infos[0].filename} failed`, {
							service,
							obj: err,
						});
					}
				}
			}
			logger.info(`Song files of ${kara.karafile} removed`, { service });
			removeKaraInStore(kara.kid);
			if (kara.children?.length > 0) {
				parents.push({
					parent: kara.kid,
					children: await selectAllKaras({
						q: `k:${kara.children.join(',')}`,
						ignoreCollections: true,
						blacklist: false,
					}),
				});
			}
		}
		saveSetting('baseChecksum', getStoreChecksum());
		// Remove kara from database only if not in a batch
		if (!batch) {
			for (const parent of parents) {
				await removeParentInKaras(parent.parent, parent.children);
			}
		}
		await deleteKara(karas.map(k => k.kid));
		if (refresh) {
			await refreshKarasDelete(karas.map(k => k.kid));
			refreshTags();
			updateAllSmartPlaylists();
		}
	} catch (err) {
		logger.error(`Error deleting song(s) ${kids} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('KARA_DELETED_ERROR');
	}
}

export async function copyKaraToRepo(kid: string, repoName: string) {
	try {
		const kara = await getKara(kid, adminToken);
		if (!kara) throw new ErrorKM('UNKNOWN_SONG', 404, false);
		const repo = getRepo(repoName);
		if (!repo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		const oldRepoName = kara.repository;
		kara.repository = repoName;
		const tasks = [];
		// Determine repository indexes so we know if we should edit our current database to change the kara's repository inside
		// Repositories are ordered by priority so if destination repo is lower, we don't edit the song in database.
		const repos = getRepos();
		const oldRepoIndex = repos.findIndex(r => r.Name === oldRepoName);
		const newRepoIndex = repos.findIndex(r => r.Name === repoName);
		// If the new repo has priority, edit kara so the database uses it.
		const karaFileData = formatKaraV4(kara);
		if (newRepoIndex < oldRepoIndex) {
			tasks.push(
				editKara({
					kara: karaFileData,
				})
			);
		}
		tasks.push(writeKara(resolve(resolvedPathRepos('Karaokes', repoName)[0], kara.karafile), karaFileData));
		const mediaFiles = await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', oldRepoName));
		tasks.push(
			copy(mediaFiles[0], resolve(resolvedPathRepos('Medias', repoName)[0], kara.mediafile), { overwrite: true })
		);
		if (kara.lyrics_infos[0].filename) {
			const lyricsFiles = await resolveFileInDirs(
				kara.lyrics_infos[0].filename,
				resolvedPathRepos('Lyrics', oldRepoName)
			);
			tasks.push(
				copy(lyricsFiles[0], resolve(resolvedPathRepos('Lyrics', repoName)[0], kara.lyrics_infos[0].filename), {
					overwrite: true,
				})
			);
		}
		for (const tid of kara.tid) {
			const tag = await getTag(tid.split('~')[0]).catch(() => {});
			// If for some reason tag couldn't be found, continue.
			if (!tag) continue;
			// Modify tag file we just copied to change its repo
			const newTag: DBTag = {
				...tag,
				repository: repoName,
			};
			tasks.push(writeTagFile(newTag, resolvedPathRepos('Tags', repoName)[0]));
		}
		await Promise.all(tasks);
	} catch (err) {
		logger.error(`Unable to copy kara ${kid} to ${repoName} repository : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('SONG_COPIED_ERROR');
	}
}

export async function batchEditKaras(
	plaid: string,
	action: 'add' | 'remove' | 'fromDisplayType',
	tid: string,
	type: TagTypeNum
) {
	// Checks
	const task = new Task({
		text: 'EDITING_KARAS_BATCH_TAGS',
	});
	try {
		const tagType = getTagTypeName(type);
		if (!tagType && action !== 'fromDisplayType') throw 'Type unknown';
		const pl = await selectPlaylistContentsMicro(plaid);
		if (pl.length === 0) throw 'Playlist unknown or empty';
		task.update({
			value: 0,
			total: pl.length,
		});
		if (action !== 'add' && action !== 'remove' && action !== 'fromDisplayType') throw 'Unkown action';
		const karas = [];
		logger.info(`Batch tag edit starting : adding ${tid} in type ${type} for all songs in playlist ${plaid}`, {
			service,
		});

		for (const plc of pl) {
			profile('getKaraBatch');
			const kara = await getKara(plc.kid, adminToken);
			karas.push(kara);
			profile('getKaraBatch');
			if (!kara) {
				logger.warn(`Batch tag edit : kara ${plc.kid} unknown. Ignoring.`, { service });
				continue;
			}
			task.update({
				subtext: kara.karafile,
			});
			let modified = false;
			// We also test if karaoke has elements in that tagtype when modifying the fromDisplayType
			if (action === 'fromDisplayType' && kara.from_display_type !== tagType && kara[tagType].length > 0) {
				modified = true;
				kara.from_display_type = tagType;
			}
			if (action === 'remove' && kara[tagType]?.length > 0) {
				if (kara[tagType].find((t: KaraTag) => t.tid === tid)) {
					modified = true;
					kara[tagType] = kara[tagType].filter((t: KaraTag) => t.tid !== tid);
					// We remove the from_display_type if kara[tagType] becomes empty
					if (kara.from_display_type === tagType && kara[tagType].length === 0) {
						kara.from_display_type = null;
					}
				}
			}
			if (action === 'add' && kara[tagType] && !kara[tagType].find((t: KaraTag) => t.tid === tid)) {
				modified = true;
				kara[tagType].push({
					tid,
				} as DBKaraTag);
			}
			if (modified) {
				profile('editKaraBatch');
				await editKara(
					{
						kara: formatKaraV4(kara),
					},
					false
				);
				profile('editKaraBatch');
			} else {
				logger.info(`Batch edit tag : skipping ${kara.karafile} since no actions taken`, { service });
			}
			task.incr();
		}
		logger.info('Batch tag edit finished', { service });
		await refreshKarasAfterDBChange('UPDATE', karas);
		updateAllSmartPlaylists();
		emitWS('operatorNotificationInfo', APIMessage('NOTIFICATION.OPERATOR.INFO.BATCH_EDIT_COMPLETE'));
		saveSetting('baseChecksum', getStoreChecksum());
	} catch (err) {
		logger.info('Batch tag edit failed', { service, obj: err });
	} finally {
		task.end();
	}
}

export async function integrateKaraFile(
	file: string,
	kara: KaraFileV4,
	deleteOldFiles = true,
	refresh = false,
	downloadVideo = true
): Promise<string> {
	logger.debug(`Integrating kara ${kara.data.kid} (${basename(file)})`, {
		service,
		obj: kara.data.tags,
	});
	const karaData = await getDataFromKaraFile(file, kara, { media: true, lyrics: true });
	const mediaDownload = getRepo(karaData.data.repository).AutoMediaDownloads;
	const oldKara = await createKaraInDB(karaData, { refresh });
	if (deleteOldFiles && oldKara.old_karafile) {
		try {
			const oldKaraFile = (
				await resolveFileInDirs(oldKara.old_karafile, resolvedPathRepos('Karaokes', oldKara.old_repository))
			)[0];
			if (oldKara.old_karafile !== basename(karaData.meta.karaFile)) {
				await fs.unlink(oldKaraFile);
			}
		} catch (err) {
			logger.warn(`Failed to remove ${oldKara.old_karafile}, does it still exist?`, { service });
		}
		if (oldKara.old_mediafile !== karaData.medias[0].filename && oldKara.old_download_status === 'DOWNLOADED') {
			try {
				await fs.unlink(
					(
						await resolveFileInDirs(
							oldKara.old_mediafile,
							resolvedPathRepos('Medias', oldKara.old_repository)
						)
					)[0]
				);
			} catch (err) {
				logger.warn(`Failed to remove ${oldKara.old_mediafile}, does it still exist?`, { service });
			}
		}
		if (oldKara.old_subfile && oldKara.old_subfile !== karaData.medias[0].lyrics?.[0]?.filename) {
			try {
				await fs.unlink(
					(
						await resolveFileInDirs(
							oldKara.old_subfile,
							resolvedPathRepos('Lyrics', oldKara.old_repository)
						)
					)[0]
				);
			} catch (err) {
				logger.warn(`Failed to remove ${oldKara.old_subfile}, does it still exist?`, { service });
			}
		}
	}
	if (downloadVideo && mediaDownload !== 'none') {
		checkMediaAndDownload(
			[
				{
					kid: karaData.data.kid,
					mediafile: karaData.medias[0].filename,
					repository: karaData.data.repository,
					mediasize: karaData.medias[0].filesize,
				},
			],
			mediaDownload === 'updateOnly'
		);
	}
	// Do not create image previews if running this from the command line.
	if (!getState().opt.generateDB)
		createImagePreviews(await getKaras({ q: `k:${karaData.data.kid}`, ignoreCollections: true }), 'single').catch(
			() => {}
		);
	return karaData.data.kid;
}

export async function deleteMediaFile(file: string, repo: string) {
	try {
		// Just to make sure someone doesn't send a full path file
		const mediaFile = basename(file);
		const mediaPaths = await resolveFileInDirs(mediaFile, resolvedPathRepos('Medias', repo));
		await fs.unlink(mediaPaths[0]);
	} catch (err) {
		logger.error(`Unable to delete media file ${file} from repository ${repo} : ${err}`, { service });
		sentry.error(err);
		throw new ErrorKM('MEDIA_DELETE_ERROR');
	}
}

export async function embedAudioFileCoverArt(coverFilename: string, source: { kid?: string; tempFileName?: string }) {
	if (!source.kid && !source.tempFileName)
		throw new Error('Neither kid nor mediaFilename has been received but atleast one needs to be set');
	const kara = source.kid && (await getKara(source.kid, adminToken));
	const mediaFilePaths =
		(source.tempFileName && [resolve(resolvedPath('Temp'), basename(source.tempFileName))]) ||
		(await resolveFileInDirs(kara?.mediafile, resolvedPathRepos('Medias', kara?.repository)));
	const coverFilePath = resolve(resolvedPath('Temp'), basename(coverFilename));
	const newMediaPath = await embedCoverImage(mediaFilePaths[0], coverFilePath, resolvedPath('Temp'));
	const mediaInfo = await extractMediaTechInfos(newMediaPath); // Shouldn't last long as it's audio only
	return mediaInfo;
}

export async function encodeMediaFileToRepoDefaults(
	kid?: string,
	tempFileName?: string,
	repo?: string,
	encodeOptions?: { trim?: boolean },
	task = new Task({
		value: 0,
	})
) {
	task.update({
		text: 'CALCULATING_MEDIA_ENCODING_PARAMETERS',
		value: 0,
	});

	try {
		// It's okay to not have a kid (when we get a new karaoke)
		const kara = kid ? await getKara(kid, adminToken) : null;
		const mediaFilePaths =
			(tempFileName && [resolve(resolvedPath('Temp'), basename(tempFileName))]) ||
			(await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository)));
		const mediaFileExists = mediaFilePaths.length > 0 && (await fileExists(mediaFilePaths[0]));
		if (!mediaFileExists) throw new Error('Mediafile not found');
		const currentMediaInfo =
			mediaFilePaths.length > 0 &&
			(await fileExists(mediaFilePaths[0])) &&
			(await extractMediaTechInfos(mediaFilePaths[0]));
		task.update({
			text: 'ENCODING_MEDIA',
			subtext: kid ? kara.titles[kara.titles_default_language] : i18next.t('UNKNOWN'),
			total: currentMediaInfo.duration,
		});
		const repoManifest = getRepoManifest(repo ?? kara.repository);
		const encodedFileInfo = await encodeMediaToRepoDefault(mediaFilePaths[0], currentMediaInfo, repoManifest, {
			trim: encodeOptions?.trim,
			outputFolder: resolvedPath('Temp'),
			onProgress: progress => {
				task.update({
					value: progress.timeSeconds,
				});
			},
		});
		const newMediaInfo = await extractMediaTechInfos(encodedFileInfo.newMediaFilePath, undefined, true);
		return newMediaInfo;
	} finally {
		task.end();
	}
}

export async function openLyricsFile(kid: string) {
	try {
		const { lyrics_infos, repository, mediafile } = await getKara(kid, adminToken);
		const lyricsPath = resolve(resolvedPathRepos('Lyrics', repository)[0], lyrics_infos[0]?.filename);
		if (extname(lyricsPath) === '.ass' && mediafile) {
			for (const repo of resolvedPathRepos('Medias', repository)) {
				const mediaPath = resolve(repo, mediafile);
				if (await fileExists(mediaPath, true)) {
					await ASSFileSetMediaFile(lyricsPath, mediaPath);
					break;
				}
			}
		}
		await shell.openPath(lyricsPath);
	} catch (err) {
		logger.error('Failed to open lyrics file', { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('LYRICS_FILE_OPEN_ERROR');
	}
}

export async function showLyricsInFolder(kid: string) {
	try {
		const { lyrics_infos, repository } = await getKara(kid, adminToken);
		const lyricsPath = resolve(resolvedPathRepos('Lyrics', repository)[0], lyrics_infos[0]?.filename);
		shell.showItemInFolder(lyricsPath);
	} catch (err) {
		logger.error('Failed to open lyrics folder', { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('LYRICS_FOLDER_OPEN_ERROR');
	}
}

export async function showMediaInFolder(kid: string) {
	try {
		const { mediafile, repository } = await getKara(kid, adminToken);
		const mediaPath = resolve(resolvedPathRepos('Medias', repository)[0], mediafile);
		shell.showItemInFolder(mediaPath);
	} catch (err) {
		logger.error('Failed to open media folder', { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('MEDIAS_FOLDER_OPEN_ERROR');
	}
}
