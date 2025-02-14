import { promises as fs } from 'fs';
import { exists } from 'fs-extra';
import { basename, extname, resolve } from 'path';

import { applyKaraHooks } from '../lib/dao/hook.js';
import { extractVideoSubtitles, trimKaraData, verifyKaraData, writeKara } from '../lib/dao/karafile.js';
import { getKaraFamily } from '../lib/services/kara.js';
import { defineSongname, determineMediaAndLyricsFilenames, processSubfile } from '../lib/services/karaCreation.js';
import {
	checkKaraMetadata,
	checkKaraParents,
	convertDBKarasToKaraFiles,
	createKarasMap,
} from '../lib/services/karaValidation.js';
import { consolidateTagsInRepo } from '../lib/services/tag.js';
import { EditedKara } from '../lib/types/kara.d.js';
import { ASSFileCleanup } from '../lib/utils/ass.js';
import { resolvedPath, resolvedPathRepos } from '../lib/utils/config.js';
import { ErrorKM } from '../lib/utils/error.js';
import { replaceExt, resolveFileInDirs, smartMove } from '../lib/utils/files.js';
import logger, { profile } from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import { adminToken } from '../utils/constants.js';
import sentry from '../utils/sentry.js';
import { getKara, getKaras } from './kara.js';
import { integrateKaraFile } from './karaManagement.js';
import { checkDownloadStatus } from './repo.js';

const service = 'KaraCreation';

export async function editKara(editedKara: EditedKara, refresh = true) {
	console.log(editedKara);
	const task = new Task({
		text: 'EDITING_SONG',
		subtext: editedKara.kara.data.titles[editedKara.kara.data.titles_default_language],
	});
	const kara = trimKaraData(editedKara.kara);
	// Validation here, processing stuff later
	// No sentry triggered if validation fails
	try {
		verifyKaraData(kara);
		try {
			checkKaraMetadata([kara]);
		} catch (err) {
			throw new ErrorKM('REPOSITORY_MANIFEST_KARA_METADATA_RULE_VIOLATION_ERROR', 400, false);
		}
		// Let's find out which songs are in our family.
		// Since we have possibly new parents we'll add them to the mix
		const karas = await getAllKarasInFamily(
			kara.data.parents ? [...kara.data.parents, kara.data.kid] : [kara.data.kid]
		);
		if (kara.data.parents) {
			if (kara.data.parents.includes(kara.data.kid)) {
				// Did you just try to make a song its own parent?
				throw new ErrorKM('TIME_PARADOX', 409, false);
			}
			// We need to update the edited kara's parents in our set.
			const DBKaraIndex = karas.content.findIndex(k => k.kid === kara.data.kid);
			karas.content[DBKaraIndex].parents = kara.data.parents;
			const DBKara = karas.content[DBKaraIndex];
			if (DBKara.children.some(k => kara.data.parents.includes(k))) {
				// Did you just try to destroy the universe by making a circular dependency?
				throw new ErrorKM('PIME_TARADOX', 409, false);
			}
			const karaFiles = convertDBKarasToKaraFiles(karas.content);
			try {
				checkKaraParents(createKarasMap(karaFiles));
			} catch (err) {
				throw new ErrorKM('REPOSITORY_MANIFEST_KARA_PARENTS_RULE_VIOLATION_ERROR', 400, false);
			}
		}
		profile('editKaraFile');
		// Karas should contain our old kara.
		const oldKara = karas.content.find(k => k.kid === kara.data.kid);
		if (!oldKara) {
			logger.error(`Old Kara not found when editing! KID: ${kara.data.kid}`, { service });
			throw new ErrorKM('UNKNOWN_SONG', 404, false);
		}
		if (!kara.data.ignoreHooks) await applyKaraHooks(kara);
		const { sanitizedFilename, songname } = await defineSongname(kara);
		kara.data.songname = songname;
		const karaJsonFileOld = resolve(resolvedPathRepos('Karaokes', oldKara.repository)[0], oldKara.karafile);
		const karaJsonFileDest = resolve(
			resolvedPathRepos('Karaokes', kara.data.repository)[0],
			`${sanitizedFilename}.kara.json`
		);
		const filenames = determineMediaAndLyricsFilenames(kara);
		const mediaDest = resolve(resolvedPathRepos('Medias', kara.data.repository)[0], filenames.mediafile);
		let oldMediaPath: string;
		// I wanted to remove this since we switched to UUIDs BUT WHAT ABOUT FILE EXTENSIONS.
		// They can be different when you change mediafiles!
		// We're doomed. This function is never going to be simplified.
		if (editedKara.modifiedMedia || oldKara.mediafile !== filenames.mediafile) {
			try {
				oldMediaPath = (
					await resolveFileInDirs(oldKara.mediafile, resolvedPathRepos('Medias', oldKara.repository))
				)[0];
			} catch (_err) {
				// Non fatal, it means there's no oldMediaPath. Maybe the maintainer doesn't have the original video
			}
		}

		let mediaPath: string;
		if (editedKara.modifiedMedia) {
			// Redefine mediapath as coming from temp
			mediaPath = resolve(resolvedPath('Temp'), kara.medias[0].filename);
			if (editedKara.useEmbeddedLyrics) {
				try {
					const { extractFile, mediasize } = await extractVideoSubtitles(mediaPath, kara.data.kid);
					if (extractFile) {
						if (kara.medias[0] && !kara.medias[0].lyrics) {
							kara.medias[0].lyrics = [];
						}
						kara.medias[0].filesize = mediasize;
						kara.medias[0].lyrics[0] = {
							filename: basename(extractFile),
							default: true,
							version: 'Default',
						};
						filenames.lyricsfiles[0] = sanitizedFilename + extname(kara.medias[0].lyrics[0].filename);
						editedKara.modifiedLyrics = true;
					}
				} catch (err) {
					// Not lethal
				}
			}
			if (oldMediaPath) await fs.unlink(oldMediaPath);
		}
		const subDest = filenames.lyricsfiles[0]
			? resolve(resolvedPathRepos('Lyrics', kara.data.repository)[0], filenames.lyricsfiles[0])
			: undefined;
		// Retesting modified media because we needed original media in place for toyunda stuff. Now that toyunda is gone...
		// Maybe we could actually refactor this somehow.
		if (editedKara.modifiedMedia) {
			kara.medias[0].filename = filenames.mediafile;
			await smartMove(mediaPath, mediaDest, { overwrite: true });
		} else if (oldKara.mediafile !== filenames.mediafile && oldMediaPath) {
			// Check if media name has changed BECAUSE WE'RE NOT USING UUIDS AS FILENAMES GRRRR.
			// *present-Axel bonks past-Axel* We still have that issue due to file extensions. Deal with it, boomer.
			try {
				await smartMove(oldMediaPath, mediaDest);
			} catch (err) {
				// Most probable error is that media is unmovable since busy
				logger.error('Error while moving file', { service, obj: err });
				throw new ErrorKM('KARA_EDIT_ERROR_UNMOVABLE_MEDIA', 409, false);
			}
		}
		kara.medias[0].filename = filenames.mediafile;
		if (editedKara.modifiedLyrics) {
			if (kara.medias[0].lyrics[0]) {
				const subPath = resolve(resolvedPath('Temp'), kara.medias[0].lyrics[0]?.filename);
				const ext = await processSubfile(subPath);
				if (oldKara.lyrics_infos) {
					const oldSubPath = (
						await resolveFileInDirs(
							oldKara.lyrics_infos[0].filename,
							resolvedPathRepos('Lyrics', oldKara.repository)
						)
					)[0];
					await fs.unlink(oldSubPath);
				}
				kara.medias[0].lyrics[0].filename = replaceExt(filenames.lyricsfiles[0], ext);
				try {
					await smartMove(subPath, subDest, { overwrite: true });
				} catch (err) {
					logger.error('Error while moving file', { service, obj: err });
					throw new ErrorKM('KARA_EDIT_ERROR_UNMOVABLE_LYRICS', 409, false);
				}
			}
		} else if (
			kara.medias[0].lyrics[0]?.filename &&
			oldKara.lyrics_infos[0].filename !== filenames.lyricsfiles[0]
		) {
			kara.medias[0].lyrics[0].filename = filenames.lyricsfiles[0];
			const oldSubPath =
				filenames.lyricsfiles[0] && oldKara.lyrics_infos[0].filename
					? (
							await resolveFileInDirs(
								oldKara.lyrics_infos[0].filename,
								resolvedPathRepos('Lyrics', oldKara.repository)
							)
						)[0]
					: undefined;
			if (filenames.lyricsfiles) {
				try {
					await smartMove(oldSubPath, subDest, { overwrite: true });
				} catch (err) {
					logger.error('Error while moving file', { service, obj: err });
					throw new ErrorKM('KARA_EDIT_ERROR_UNMOVABLE_LYRICS', 409, false);
				}
			}
		}
		await fs.unlink(karaJsonFileOld);
		await writeKara(karaJsonFileDest, kara);
		await integrateKaraFile(karaJsonFileDest, false, refresh);
		checkDownloadStatus([kara.data.kid]);
		await consolidateTagsInRepo(kara);

		// Get finished kara with all updated fields
		const newKara = await getKara(kara.data.kid, adminToken);

		// ASS file post processing
		if (kara.medias[0].lyrics[0]?.filename) await ASSFileCleanup(subDest, newKara);
	} catch (err) {
		logger.error('Error while editing kara', { service, obj: err });
		sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
		if (err! instanceof ErrorKM) sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('KARA_EDITED_ERROR');
	} finally {
		task.end();
	}
}

export async function createKara(editedKara: EditedKara) {
	const kara = trimKaraData(editedKara.kara);
	const task = new Task({
		text: 'CREATING_SONG',
		subtext: kara.data.titles[kara.data.titles_default_language],
	});
	// Validation here, processing stuff later
	// No sentry triggered if validation fails
	try {
		// Write kara file in place
		verifyKaraData(kara);
		try {
			checkKaraMetadata([kara]);
		} catch (err) {
			throw new ErrorKM('REPOSITORY_MANIFEST_KARA_METADATA_RULE_VIOLATION_ERROR', 400, false);
		}
		if (kara.data.parents) {
			// Let's find out which songs are in our family.
			// Since we don't have a KID we grab all parents.
			// We then only get karaoke data of these songs.
			const karas = await getAllKarasInFamily(kara.data.parents);
			const karaFiles = convertDBKarasToKaraFiles(karas.content);
			karaFiles.push(kara);
			try {
				checkKaraParents(createKarasMap(karaFiles));
			} catch (err) {
				throw new ErrorKM('REPOSITORY_MANIFEST_KARA_PARENTS_RULE_VIOLATION_ERROR', 400, false);
			}
		}
		if (!kara.data.ignoreHooks) await applyKaraHooks(kara);
		const { sanitizedFilename, songname } = await defineSongname(kara);
		kara.data.songname = songname;
		const karaJsonFileDest = resolve(
			resolvedPathRepos('Karaokes', kara.data.repository)[0],
			`${sanitizedFilename}.kara.json`
		);
		if (await exists(karaJsonFileDest)) throw new ErrorKM('KARA_FILE_EXISTS_ERROR', 409, false);

		const mediaPath = resolve(resolvedPath('Temp'), kara.medias[0].filename);
		if (kara.medias[0].lyrics && editedKara.useEmbeddedLyrics) {
			try {
				const { extractFile, mediasize } = await extractVideoSubtitles(mediaPath, kara.data.kid);
				if (extractFile) {
					if (kara.medias[0] && !kara.medias[0].lyrics) {
						kara.medias[0].lyrics = [];
					}
					kara.medias[0].filesize = mediasize;
					kara.medias[0].lyrics[0] = {
						filename: basename(extractFile),
						default: true,
						version: 'Default',
					};
				}
			} catch (err) {
				// Not lethal
			}
		}
		const filenames = determineMediaAndLyricsFilenames(kara);
		const mediaDest = resolve(resolvedPathRepos('Medias', kara.data.repository)[0], filenames.mediafile);
		let subDest: string;
		if (kara.medias[0].lyrics[0]?.filename) {
			const subPath = resolve(resolvedPath('Temp'), kara.medias[0].lyrics[0].filename);
			const ext = await processSubfile(subPath);
			filenames.lyricsfiles[0] = replaceExt(filenames.lyricsfiles[0], ext);
			kara.medias[0].lyrics[0].filename = filenames.lyricsfiles[0];
			subDest = resolve(resolvedPathRepos('Lyrics', kara.data.repository)[0], filenames.lyricsfiles[0]);
			await smartMove(subPath, subDest, { overwrite: true });
		}
		await smartMove(mediaPath, mediaDest, { overwrite: true });
		kara.medias[0].filename = filenames.mediafile;
		await writeKara(karaJsonFileDest, kara);
		await integrateKaraFile(karaJsonFileDest, false, true);
		checkDownloadStatus([kara.data.kid]);
		await consolidateTagsInRepo(kara);

		// Get finished kara with all fields
		const newKara = await getKara(kara.data.kid, adminToken);

		// ASS file post processing
		if (kara.medias[0].lyrics[0]?.filename) await ASSFileCleanup(subDest, newKara);
	} catch (err) {
		logger.error('Error while creating kara', { service, obj: err });
		sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
		sentry.addErrorInfo('kara', JSON.stringify(kara, null, 2));
		if (err! instanceof ErrorKM) sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('KARA_CREATED_ERROR');
	} finally {
		task.end();
	}
}

async function getAllKarasInFamily(kidsToSearch: string[]) {
	const family = await getKaraFamily(kidsToSearch);
	const kids = new Set();
	for (const relation of family) {
		kids.add(relation.kid);
		kids.add(relation.parent_kid);
	}
	// Flatten the result so we get it in a neat table
	const karas = await getKaras({
		ignoreCollections: true,
		q: `k:${[...kids.values()].join(',')}`,
	});
	return karas;
}
