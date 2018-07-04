/**
 * .kara files generation
 */

import logger from 'winston';
import {resolve} from 'path';
import {resolvedPathImport, resolvedPathKaras, resolvedPathSubs, resolvedPathMedias} from '../_common/utils/config';
import {asyncExists, asyncMove, asyncReadDir, filterMedias, replaceExt} from '../_common/utils/files';
import {
	extractAssInfos, extractVideoSubtitles, extractMediaTechInfos, karaFilenameInfos, writeKara
} from '../_dao/karafile';
import {getType} from '../_services/constants';
import {getKara} from '../_services/kara';

/**
 * Generating kara files in batch mode. The import folder is scanned for video files
 * which respect the KM naming convention. If such a file is found, the associated 
 * karaoke file is created, and subtitle files are moved to their own directories.
 */
export async function karaGenerationBatch() {
	const importFiles = await asyncReadDir(resolvedPathImport());
	const importPromises = filterMedias(importFiles).map(mediaFile => importMediaFile(mediaFile));
	await Promise.all(importPromises);
}

async function importMediaFile(mediaFile) {

	logger.info('[KaraGen] Generating kara file for media ' + mediaFile);

	let karaData = getKara({ mediafile: mediaFile, subfile: 'dummy.ass' });

	karaData = {...karaData, ...karaDataInfosFromFilename(mediaFile)};

	const mediaPath = resolve(resolvedPathImport(), mediaFile);
	const subPath = await findSubFile(mediaPath, karaData);
	await extractAssInfos(subPath, karaData);
	await extractMediaTechInfos(mediaPath, karaData);

	await generateAndMoveFiles(mediaPath, subPath, karaData);

}

function karaDataInfosFromFilename(mediaFile) {
	try {
		const filenameInfos = karaFilenameInfos(mediaFile);
		const common = {
			title: filenameInfos.title,
			type: getType(filenameInfos.type),
			order: filenameInfos.order
		};

		if (filenameInfos.type === 'LIVE' || filenameInfos.type === 'MV') {
			return { ...common, singer: filenameInfos.serie };
		} else {
			return { ...common, series: filenameInfos.serie };
		}
	} catch (err) {
		// File not named correctly
		logger.warn('[KaraGen] Bad kara file name: ' + err);
	}
	return {};
}

async function findSubFile(mediaPath, karaData) {
	// Replacing file extension by .ass in the same directory
	const assFile = replaceExt(mediaPath, '.ass');

	if (await asyncExists(assFile)) {
		// If a subfile is found, adding it to karaData
		karaData.subfile = replaceExt(karaData.mediafile, '.ass');
		return assFile;
	} else if (mediaPath.endsWith('.mkv') || mediaPath.endsWith('.mp4')) {
		try {
			return await extractVideoSubtitles(mediaPath, karaData.KID);
		} catch (err) {
			// Non-blocking.
			logger.debug( '[KaraGen] Could not extract subtitles from video file ' + mediaPath);
		}
	} else {
		return '';
	}
}


async function generateAndMoveFiles(mediaPath, subPath, karaData) {
	// Generating kara file in the first kara folder
	const karaFilename = replaceExt(karaData.mediafile, '.kara');
	const karaPath = resolve(resolvedPathKaras()[0], karaFilename);
	await writeKara(karaPath, karaData);

	// Moving media in the first media folder.
	const mediaDest = resolve(resolvedPathMedias()[0], karaData.mediafile);
	await asyncMove(mediaPath, mediaDest);

	// Moving subfile in the first lyrics folder.
	if (subPath && karaData.subfile !== 'dummy.ass') {
		const subDest = resolve(resolvedPathSubs()[0], karaData.subfile);
		await asyncMove(subPath, subDest);
	}
}