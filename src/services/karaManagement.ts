import { shell } from 'electron';
import { promises as fs } from 'fs';
import { copy } from 'fs-extra';
import { basename, extname, resolve } from 'path';

import { getStoreChecksum, removeKaraInStore } from '../dao/dataStore';
import { deleteKara as deleteKaraDB, insertKara, selectAllKaras, updateKaraParents } from '../dao/kara';
import { removeParentInKaras } from '../dao/karafile';
import { selectPlaylistContentsMicro } from '../dao/playlist';
import { saveSetting } from '../lib/dao/database';
import { refreshKarasDelete } from '../lib/dao/kara';
import { formatKaraV4, getDataFromKaraFile, writeKara } from '../lib/dao/karafile';
import { refreshTags } from '../lib/dao/tag';
import { writeTagFile } from '../lib/dao/tagfile';
import { refreshKarasAfterDBChange, updateTags } from '../lib/services/karaManagement';
import { DBKara, DBKaraTag } from '../lib/types/database/kara';
import { DBTag } from '../lib/types/database/tag';
import { KaraFileV4, KaraTag } from '../lib/types/kara';
import { TagTypeNum } from '../lib/types/tag';
import { resolvedPathRepos } from '../lib/utils/config';
import { audioFileRegexp, getTagTypeName } from '../lib/utils/constants';
import { fileExists, resolveFileInDirs } from '../lib/utils/files';
import logger, { profile } from '../lib/utils/logger';
import { createImagePreviews } from '../lib/utils/previews';
import Task from '../lib/utils/taskManager';
import { adminToken } from '../utils/constants';
import sentry from '../utils/sentry';
import { getState } from '../utils/state';
import { checkMediaAndDownload } from './download';
import { getKara, getKaras } from './kara';
import { editKara } from './karaCreation';
import { getRepo, getRepos } from './repo';
import { updateAllSmartPlaylists } from './smartPlaylist';
import { getTag } from './tag';

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

export async function deleteKara(
	kids: string[],
	refresh = true,
	deleteFiles = { media: true, kara: true },
	batch = false
) {
	const parents: Family[] = [];
	const karas = await selectAllKaras({
		q: `k:${kids.join(',')}`,
	});
	if (karas.length === 0) throw { code: 404, msg: `Unknown kara IDs in ${kids.join(',')}` };
	for (const kara of karas) {
		// Remove files
		if (kara.download_status === 'DOWNLOADED' && deleteFiles.media) {
			try {
				await fs.unlink(
					(
						await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository))
					)[0]
				);
			} catch (err) {
				logger.warn(`Non fatal: Removing mediafile ${kara.mediafile} failed`, { service, obj: err });
			}
		}
		if (deleteFiles.kara) {
			try {
				await fs.unlink(
					(
						await resolveFileInDirs(kara.karafile, resolvedPathRepos('Karaokes', kara.repository))
					)[0]
				);
			} catch (err) {
				logger.warn(`Non fatal: Removing karafile ${kara.karafile} failed`, { service, obj: err });
			}
			if (kara.subfile) {
				try {
					await fs.unlink(
						(
							await resolveFileInDirs(kara.subfile, resolvedPathRepos('Lyrics', kara.repository))
						)[0]
					);
				} catch (err) {
					logger.warn(`Non fatal: Removing subfile ${kara.subfile} failed`, { service, obj: err });
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
	await deleteKaraDB(karas.map(k => k.kid));
	if (refresh) {
		await refreshKarasDelete(karas.map(k => k.kid));
		refreshTags();
		updateAllSmartPlaylists();
	}
}

export async function copyKaraToRepo(kid: string, repoName: string) {
	try {
		const kara = await getKara(kid, adminToken);
		if (!kara) throw { code: 404 };
		const repo = getRepo(repoName);
		if (!repo) throw { code: 404 };
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
		if (kara.subfile) {
			const lyricsFiles = await resolveFileInDirs(kara.subfile, resolvedPathRepos('Lyrics', oldRepoName));
			tasks.push(
				copy(lyricsFiles[0], resolve(resolvedPathRepos('Lyrics', repoName)[0], kara.subfile), {
					overwrite: true,
				})
			);
		}
		for (const tid of kara.tid) {
			const tag = await getTag(tid.split('~')[0]);
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
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	}
}

export async function batchEditKaras(plaid: string, action: 'add' | 'remove', tid: string, type: TagTypeNum) {
	// Checks
	const task = new Task({
		text: 'EDITING_KARAS_BATCH_TAGS',
	});
	try {
		const tagType = getTagTypeName(type);
		if (!tagType) throw 'Type unknown';
		const pl = await selectPlaylistContentsMicro(plaid);
		if (pl.length === 0) throw 'Playlist unknown or empty';
		task.update({
			value: 0,
			total: pl.length,
		});
		if (action !== 'add' && action !== 'remove') throw 'Unkown action';
		const tag = await getTag(tid);
		if (!tag) throw 'Unknown tag';
		logger.info(`Batch tag edit starting : adding ${tid} in type ${type} for all songs in playlist ${plaid}`, {
			service,
		});
		for (const plc of pl) {
			profile('getKaraBatch');
			const kara = await getKara(plc.kid, adminToken);
			profile('getKaraBatch');
			if (!kara) {
				logger.warn(`Batch tag edit : kara ${plc.kid} unknown. Ignoring.`, { service });
				continue;
			}
			task.update({
				subtext: kara.karafile,
			});
			let modified = false;
			if (kara[tagType].length > 0 && action === 'remove') {
				if (kara[tagType].find((t: KaraTag) => t.tid === tid)) modified = true;
				kara[tagType] = kara[tagType].filter((t: KaraTag) => t.tid !== tid);
			}
			if (action === 'add' && !kara[tagType].find((t: KaraTag) => t.tid === tid)) {
				modified = true;
				kara[tagType].push({
					tid: tag.tid,
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
		await refreshKarasAfterDBChange('ALL');
		updateAllSmartPlaylists();
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
	const karaFile = basename(file);
	logger.debug(`Integrating kara ${kara.data.kid} (${basename(karaFile)})`, {
		service,
		obj: kara.data.tags,
	});
	const karaData = await getDataFromKaraFile(karaFile, kara, { media: true, lyrics: true });
	const mediaDownload = getRepo(karaData.data.repository).AutoMediaDownloads;
	const oldKara = await createKaraInDB(karaData, { refresh });
	if (deleteOldFiles && oldKara.old_karafile) {
		try {
			const oldKaraFile = (
				await resolveFileInDirs(oldKara.old_karafile, resolvedPathRepos('Karaokes', oldKara.old_repository))
			)[0];
			if (oldKara.old_karafile !== karaData.meta.karaFile) {
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
		if (oldKara.old_subfile && oldKara.old_subfile !== karaData.medias[0].lyrics[0]?.filename) {
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
		createImagePreviews(await getKaras({ q: `k:${karaData.data.kid}`, ignoreCollections: true }), 'single');
	return karaData.data.kid;
}

export async function deleteMediaFile(file: string, repo: string) {
	// Just to make sure someone doesn't send a full path file
	const mediaFile = basename(file);
	const mediaPaths = await resolveFileInDirs(mediaFile, resolvedPathRepos('Medias', repo));
	await fs.unlink(mediaPaths[0]);
}

export async function openLyricsFile(kid: string) {
	try {
		const { subfile, repository, mediafile } = await getKara(kid, adminToken);
		const lyricsPath = resolve(resolvedPathRepos('Lyrics', repository)[0], subfile);
		if (extname(lyricsPath) === '.ass' && mediafile) {
			for (const repo of resolvedPathRepos('Medias', repository)) {
				const mediaPath = resolve(repo, mediafile);
				if (await fileExists(mediaPath, true)) {
					const garbageBlock = `[Aegisub Project Garbage]
Audio File: ${mediaPath}
${!mediafile.match(audioFileRegexp) ? `Video File: ${mediaPath}` : ''}
`;

					let content: string = await fs.readFile(lyricsPath, { encoding: 'utf8' });
					const blocks = content.split(/(?:\n)(?=^\[)/gm);
					const index = blocks.findIndex(block => block.startsWith('[Aegisub Project Garbage]'));
					if (index >= 0) {
						// replace the existing garbage
						blocks[index] = garbageBlock;
					} else {
						// add the garbage at the second position (default behavior)
						blocks.splice(1, 0, garbageBlock);
					}
					content = blocks.join('\n');
					await fs.writeFile(lyricsPath, content);
				}
			}
		}
		await shell.openPath(lyricsPath);
	} catch (err) {
		throw err;
	}
}
