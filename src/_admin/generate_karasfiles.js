/**
 * Génération de fichiers kara.
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
 * Génération de fichiers karaokés en mode batch. Le répertoire d'import est scanné à la recherche de fichiers
 * vidéo, respectant la convention de nommage KM. Si un tel fichier est trouvé, le kara associé est créé, et les
 * fichiers vidéo/sous-titre déplacés dans leurs répertoires respectifs.
 */
export async function karaGenerationBatch() {

	const importFiles = await asyncReadDir(resolvedPathImport());
	const importPromises = filterVideos(importFiles).map(videoFile => importVideoFile(videoFile));
	await Promise.all(importPromises);
}

async function importVideoFile(videoFile) {

	logger.info('[KaraGen] Génération du fichier kara pour la vidéo ' + videoFile);

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
		// Fichier ne respectant pas la convention de nommage.
		logger.warn('[KaraGen] Bad kara file name: ' + err);
	}
	return {};
}

async function findSubFile(videoPath, karaData) {
	// Remplacement de l'extension de la vidéo par .ass (dans le même répertoire).
	const assFile = replaceExt(videoPath, '.ass');

	if (await asyncExists(assFile)) {
		// Si un fichier de sous-titres est trouvé, on met à jour karaData en conséquence.
		karaData.subfile = replaceExt(karaData.videofile, '.ass');
		return assFile;
	} else if (videoPath.endsWith('.mkv') || videoPath.endsWith('.mp4')) {
		try {
			return await extractVideoSubtitles(videoPath, karaData.KID);
		} catch (err) {
			// Non bloquant.
			logger.debug('[KaraGen] Could not extract subtitles from video file ' + videoPath);
		}
	} else {
		return '';
	}
}


async function generateAndMoveFiles(videoPath, subPath, karaData) {
	// Génération du fichier kara dans le premier répertoire kara.
	const karaFilename = replaceExt(karaData.videofile, '.kara');
	const karaPath = resolve(resolvedPathKaras()[0], karaFilename);
	await writeKara(karaPath, karaData);

	// Déplacement de la vidéo dans le premier répertoire vidéo.
	const videoDest = resolve(resolvedPathVideos()[0], karaData.videofile);
	await asyncMove(videoPath, videoDest);

	// Déplacement du fichier de sous-titres dans le premier répertoire de sous-titres.
	if (subPath && karaData.subfile !== 'dummy.ass') {
		const subDest = resolve(resolvedPathSubs()[0], karaData.subfile);
		await asyncMove(subPath, subDest);
	}
}