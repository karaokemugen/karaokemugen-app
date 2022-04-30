import { promises as fs } from 'fs';
import { basename, extname, resolve } from 'path';

import { applyKaraHooks } from '../lib/dao/hook';
import { extractVideoSubtitles, verifyKaraData, writeKara } from '../lib/dao/karafile';
import { defineFilename, determineMediaAndLyricsFilenames, processSubfile } from '../lib/services/karaCreation';
import { EditedKara, KaraFileV4 } from '../lib/types/kara.d';
import { resolvedPath, resolvedPathRepos } from '../lib/utils/config';
import { resolveFileInDirs, smartMove } from '../lib/utils/files';
import logger, { profile } from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { adminToken } from '../utils/constants';
import sentry from '../utils/sentry';
import { getKara } from './kara';
import { integrateKaraFile } from './karaManagement';
import { consolidateTagsInRepo } from './tag';

const service = 'KaraCreation';

export async function editKara(editedKara: EditedKara) {
	const task = new Task({
		text: 'EDITING_SONG',
		subtext: editedKara.kara.data.titles[editedKara.kara.data.titles_default_language],
	});
	const kara = editedKara.kara;
	// Validation here, processing stuff later
	// No sentry triggered if validation fails
	try {
		verifyKaraData(kara);
		if (kara.data.parents && kara.data.parents.includes(kara.data.kid)) {
			throw 'Did you just try to make a song its own parent?';
		}
	} catch (err) {
		throw { code: 400, msg: err };
	}
	try {
		profile('editKaraFile');
		const oldKara = await getKara(kara.data.kid, adminToken);
		if (!kara.data.ignoreHooks) await applyKaraHooks(kara);
		const karaFile = await defineFilename(kara);
		const filenames = determineMediaAndLyricsFilenames(kara, karaFile);
		const mediaDest = resolve(resolvedPathRepos('Medias', kara.data.repository)[0], filenames.mediafile);
		let oldMediaPath: string;
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
			try {
				const extractFile = await extractVideoSubtitles(mediaPath, kara.data.kid);
				if (extractFile) {
					kara.medias[0].lyrics[0] = {
						filename: basename(extractFile),
						version: 'Default',
						default: true,
					};
					filenames.lyricsfile = karaFile + extname(kara.medias[0].lyrics[0].filename);
					editedKara.modifiedLyrics = true;
				}
			} catch (err) {
				// Not lethal
			}
			if (oldMediaPath) await fs.unlink(oldMediaPath);
		}
		const subDest = filenames.lyricsfile
			? resolve(resolvedPathRepos('Lyrics', kara.data.repository)[0], filenames.lyricsfile)
			: undefined;
		// Retesting modified media because we needed original media in place for toyunda stuff.
		// Maybe we could actually refactor this somehow.
		if (editedKara.modifiedMedia) {
			kara.medias[0].filename = filenames.mediafile;
			await smartMove(mediaPath, mediaDest, { overwrite: true });
		} else if (oldKara.mediafile !== filenames.mediafile && oldMediaPath) {
			// Check if media name has changed BECAUSE WE'RE NOT USING UUIDS AS FILENAMES GRRRR.
			kara.medias[0].filename = filenames.mediafile;
			try {
				await smartMove(oldMediaPath, mediaDest);
			} catch (err) {
				// Most probable error is that media is unmovable since busy
				throw { code: 409, msg: 'KARA_EDIT_ERROR_UNMOVABLE_MEDIA' };
			}
		}
		if (editedKara.modifiedLyrics) {
			if (kara.medias[0].lyrics[0]) {
				const subPath = resolve(resolvedPath('Temp'), kara.medias[0].lyrics[0].filename);
				await processSubfile(subPath, mediaPath);
				if (oldKara.subfile) {
					const oldSubPath = (
						await resolveFileInDirs(oldKara.subfile, resolvedPathRepos('Lyrics', oldKara.repository))
					)[0];
					await fs.unlink(oldSubPath);
				}
				kara.medias[0].lyrics[0].filename = filenames.lyricsfile;
				try {
					await smartMove(subPath, subDest, { overwrite: true });
				} catch (err) {
					throw { code: 409, msg: 'KARA_EDIT_ERROR_UNMOVABLE_LYRICS' };
				}
			}
		} else if (kara.medias[0].lyrics[0] && oldKara.subfile !== filenames.lyricsfile) {
			// Check if lyric name has changed BECAUSE WE'RE NOT USING UUIDS AS FILENAMES GRRRR.
			kara.medias[0].lyrics[0].filename = filenames.lyricsfile;
			const oldSubPath =
				filenames.lyricsfile && oldKara.subfile
					? (await resolveFileInDirs(oldKara.subfile, resolvedPathRepos('Lyrics', oldKara.repository)))[0]
					: undefined;
			try {
				await smartMove(oldSubPath, subDest, { overwrite: true });
			} catch (err) {
				throw { code: 409, msg: 'KARA_EDIT_ERROR_UNMOVABLE_LYRICS' };
			}
		}
		const karaPath = resolve(resolvedPathRepos('Karaokes', oldKara.repository)[0], oldKara.karafile);
		const karaDest = resolve(resolvedPathRepos('Karaokes', kara.data.repository)[0], `${karaFile}.kara.json`);
		await fs.unlink(karaPath);
		await writeKara(karaDest, kara);
		await integrateKaraFile(karaDest, kara, false, true);
		await consolidateTagsInRepo(kara);
	} catch (err) {
		logger.error('Error while editing kara', { service, obj: err });
		if (!err.msg) {
			sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
			sentry.error(err);
		}
		throw err;
	} finally {
		task.end();
	}
}

export async function createKara(kara: KaraFileV4) {
	const task = new Task({
		text: 'CREATING_SONG',
		subtext: kara.data.titles[kara.data.titles_default_language],
	});
	// Validation here, processing stuff later
	// No sentry triggered if validation fails
	try {
		// Write kara file in place
		verifyKaraData(kara);
		if (!kara.data.ignoreHooks) await applyKaraHooks(kara);
		const karaFile = await defineFilename(kara);
		const mediaPath = resolve(resolvedPath('Temp'), kara.medias[0].filename);
		try {
			const extractFile = await extractVideoSubtitles(mediaPath, kara.data.kid);
			if (extractFile) {
				kara.medias[0].lyrics[0] = {
					filename: basename(extractFile),
					version: 'Default',
					default: true,
				};
			}
		} catch (err) {
			// Not lethal
		}
		const filenames = determineMediaAndLyricsFilenames(kara, karaFile);
		const mediaDest = resolve(resolvedPathRepos('Medias', kara.data.repository)[0], filenames.mediafile);
		if (kara.medias[0].lyrics[0]) {
			const subPath = resolve(resolvedPath('Temp'), kara.medias[0].lyrics[0].filename);
			const subDest = resolve(resolvedPathRepos('Lyrics', kara.data.repository)[0], filenames.lyricsfile);
			await processSubfile(subPath, mediaPath);
			await smartMove(subPath, subDest, { overwrite: true });
			kara.medias[0].lyrics[0].filename = filenames.lyricsfile;
		}
		await smartMove(mediaPath, mediaDest, { overwrite: true });
		kara.medias[0].filename = filenames.mediafile;
		const karaDest = resolve(resolvedPathRepos('Karaokes', kara.data.repository)[0], `${karaFile}.kara.json`);
		await writeKara(karaDest, kara);
		await integrateKaraFile(karaDest, kara, false, true);
		await consolidateTagsInRepo(kara);
	} catch (err) {
		logger.error('Error while creating kara', { service, obj: err });
		if (!err.msg) {
			sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
			sentry.addErrorInfo('kara', JSON.stringify(kara, null, 2));
			sentry.error(err);
		}
		throw err;
	} finally {
		task.end();
	}
}
