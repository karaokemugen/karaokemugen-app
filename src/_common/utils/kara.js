/**
 * Tools used to manipulate .kara files : reading, extracting info, etc.
 * These functions do not resolve paths. Arguments should be resolved already.
 */

import timestamp from 'unix-timestamp';
import uuidV4 from 'uuid/v4';
import logger from 'winston';
import {parse, extname, resolve} from 'path';
import {parse as parseini, stringify} from 'ini';
import {createHash} from 'crypto';
import {trim} from 'lodash';
import {asyncReadFile, asyncStat, asyncWriteFile, resolveFileInDirs} from './files';
import {resolvedPathSubs, resolvedPathTemp, resolvedPathVideos} from './config';
import {extractSubtitles, getVideoDuration, getVideoGain} from './ffmpeg';
import {getKara} from '../domain/kara';

export function karaFilenameInfos(karaFile) {
	const karaFileName = parse(karaFile).name;
	const infos = karaFileName.split(/\s+-\s+/); // LANGUE - SERIE - NUMERO - TITRE

	if (infos.length < 3) {
		throw 'Kara filename \'' + karaFileName + '\' does not respect naming convention';
	}
	// On ajoute en 5ème position le numéro extrait du champ type.
	const orderInfos = infos[2].match(/^([a-zA-Z0-9 ]{2,30}?)(\d*)$/);
	infos.push(orderInfos[2] ? +orderInfos[2] : 0);

	// On renvoie un objet avec les champs explicitement nommés.
	return {
		lang: infos[0],
		serie: infos[1],
		type: orderInfos[1],
		order: orderInfos[2] ? +orderInfos[2] : 0,
		title: infos[3] || ''
	};
}

export async function getDataFromKaraFile(karafile) {

	const karaData = await parseKara(karafile);
	karaData.isKaraModified = false;

	if (!karaData.KID) {
		karaData.isKaraModified = true;
		karaData.KID = uuidV4();
	}
	timestamp.round = true;
	if (!karaData.dateadded) {
		karaData.isKaraModified = true;
		karaData.dateadded = timestamp.now();
	}
	karaData.datemodif = timestamp.now();

	karaData.karafile = karafile;

	karaData.lang = trim(karaData.lang, '"'); // Nettoyage du champ lang du fichier kara.

	let videoFile;

	try {
		videoFile = await resolveFileInDirs(karaData.videofile, resolvedPathVideos());
	} catch (err) {
		logger.warn('[Kara] Video file not found : ' + karaData.videofile);
		karaData.videogain = 0;
		karaData.videosize = 0;
		karaData.videoduration = 0;
		karaData.ass = '';
	}

	if (videoFile) {
		const subFile = await findSubFile(videoFile, karaData);
		await extractAssInfos(subFile, karaData);
		await extractVideoTechInfos(videoFile, karaData);
	}

	karaData.rating = 0;
	karaData.viewcount = 0;
	karaData.checksum = checksum(stringify(karaData));

	return karaData;
}

export async function extractAssInfos(subFile, karaData) {
	if (subFile) {
		karaData.ass = await asyncReadFile(subFile, {encoding: 'utf8'});
		karaData.ass_checksum = checksum(karaData.ass);
		// TODO Delete any temporary file.
	} else {
		karaData.ass = '';
	}
}

export async function extractVideoTechInfos(videoFile, karaData) {
	const videoStats = await asyncStat(videoFile);
	if (videoStats.size !== +karaData.videosize) {
		karaData.isKaraModified = true;
		karaData.videosize = videoStats.size;

		const [videogain, videoduration] = await Promise.all([getVideoGain(videoFile), getVideoDuration(videoFile)]);

		karaData.videogain = videogain;
		karaData.videoduration = videoduration;
	}
}

export async function writeKara(karafile, karaData) {

	if (karaData.isKaraModified === false) {
		return;
	}

	const infosToWrite = getKara(karaData);
	await asyncWriteFile(karafile, stringify(infosToWrite));
}

export async function parseKara(karaFile) {
	const data = await asyncReadFile(karaFile, 'utf-8');
	return parseini(data);
}

export async function extractVideoSubtitles(videoFile, kid) {
	const extractFile = resolve(resolvedPathTemp(), `kara_extract.${kid}.ass`);
	return await extractSubtitles(videoFile, extractFile);
}

async function findSubFile(videoFile, kara) {
	const videoExt = extname(videoFile);
	if (kara.subfile === 'dummy.ass') {
		if (videoExt === '.mkv' || videoExt === '.mp4') {
			try {
				return await extractVideoSubtitles(videoFile, kara.KID);
			} catch (err) {
				// Not blocking.
				logger.debug('[Kara] Could not extract subtitles from video file ' + videoFile);
			}
		}
	} else {
		try {
			return await resolveFileInDirs(kara.subfile, resolvedPathSubs());
		} catch (err) {
			logger.warn(`[Kara] Could not find subfile '${kara.subfile}'.`);
		}
	}
	// Non-blocking case if file isn't found
	return '';
}

function checksum(str, algorithm, encoding) {
	return createHash(algorithm || 'md5')
		.update(str, 'utf8')
		.digest(encoding || 'hex');
}