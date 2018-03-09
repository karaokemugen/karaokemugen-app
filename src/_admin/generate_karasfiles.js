/**
 * .kara files generation
 */

import logger from 'winston';
import {resolve} from 'path';
import {resolvedPathImport, resolvedPathKaras, resolvedPathSubs, resolvedPathVideos} from '../_common/utils/config';
import {asyncExists, asyncMove, asyncReadDir, filterVideos, replaceExt} from '../_common/utils/files';
import {
	extractAssInfos, extractVideoSubtitles, extractVideoTechInfos, karaFilenameInfos, writeKara
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
	const importPromises = filterVideos(importFiles).map(videoFile => importVideoFile(videoFile));
	await Promise.all(importPromises);
}

async function importVideoFile(videoFile) {

	logger.info('[KaraGen] Generating kara file for video ' + videoFile);

	let karaData = getKara({ videofile: videoFile, subfile: 'dummy.ass' });

	karaData = {...karaData, ...karaDataInfosFromFilename(videoFile)};

	const videoPath = resolve(resolvedPathImport(), videoFile);
	const subPath = await findSubFile(videoPath, karaData);
	await extractAssInfos(subPath, karaData);
	await extractVideoTechInfos(videoPath, karaData);

	await generateAndMoveFiles(videoPath, subPath, karaData);

}

function karaDataInfosFromFilename(videoFile) {
	try {
		const filenameInfos = karaFilenameInfos(videoFile);
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

async function findSubFile(videoPath, karaData) {
	// Replacing file extension by .ass in the same directory
	const assFile = replaceExt(videoPath, '.ass');

	if (await asyncExists(assFile)) {
		// If a subfile is found, adding it to karaData
		karaData.subfile = replaceExt(karaData.videofile, '.ass');
		return assFile;
	} else if (videoPath.endsWith('.mkv') || videoPath.endsWith('.mp4')) {
		try {
			return await extractVideoSubtitles(videoPath, karaData.KID);
		} catch (err) {
			// Non-blocking.
			logger.debug('[KaraGen] Could not extract subtitles from video file ' + videoPath);
		}
	} else {
		return '';
	}
}


async function generateAndMoveFiles(videoPath, subPath, karaData) {
	// Generating kara file in the first kara folder
	const karaFilename = replaceExt(karaData.videofile, '.kara');
	const karaPath = resolve(resolvedPathKaras()[0], karaFilename);
	await writeKara(karaPath, karaData);

	// Moving video in the first video folder.
	const videoDest = resolve(resolvedPathVideos()[0], karaData.videofile);
	await asyncMove(videoPath, videoDest);

	// Moving subfile in the first lyrics folder.
	if (subPath && karaData.subfile !== 'dummy.ass') {
		const subDest = resolve(resolvedPathSubs()[0], karaData.subfile);
		await asyncMove(subPath, subDest);
	}
}