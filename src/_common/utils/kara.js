/**
 * Tools used to manipulate .kara files : reading, extracting info, etc.
 * These functions do not resolve paths. Arguments should be resolved already.
 */

import timestamp from 'unix-timestamp';
import uuidV4 from 'uuid/v4';
import logger from 'winston';
import {extname, resolve} from 'path';
import {parse as parseini, stringify} from 'ini';
import {createHash} from 'crypto';
import {trim} from 'lodash';
import {asyncReadFile, asyncStat, asyncWriteFile, resolveFileInDirs} from './files';
import {resolvedPathSubs, resolvedPathTemp, resolvedPathVideos} from './config';
import {extractSubtitles, getVideoDuration, getVideoGain} from './ffmpeg';

export async function getKara(karafile) {

	const karaData = await parseKara(karafile);
	karaData.isKaraModified = false;

	verifyRequiredInfos(karaData);

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
		if (subFile) {
			karaData.ass = await asyncReadFile(subFile, {encoding: 'utf8'});
			karaData.ass_checksum = checksum(karaData.ass);
			// TODO Delete any temporary file
		} else {
			karaData.ass = '';
		}
		const videoStats = await asyncStat(videoFile);
		if (videoStats.size !== +karaData.videosize) {
			karaData.isKaraModified = true;
			karaData.videosize = videoStats.size;

			const [videogain, videoduration] = await Promise.all([getVideoGain(videoFile), getVideoDuration(videoFile)]);

			karaData.videogain = videogain;
			karaData.videoduration = videoduration;
		}
	}

	karaData.rating = 0;
	karaData.viewcount = 0;
	karaData.checksum = checksum(stringify(karaData));

	return karaData;
}


export async function writeKara(karafile, karaData) {

	if (karaData.isKaraModified === false) {
		return;
	}

	verifyRequiredInfos(karaData);
	timestamp.round = true;

	const infosToWrite = {
		videofile: karaData.videofile,
		subfile: karaData.subfile,
		year: karaData.year || '',
		singer: karaData.singer || '',
		tags: karaData.tags || '',
		songwriter: karaData.songwriter || '',
		creator: karaData.creator || '',
		author: karaData.author || '',
		series: karaData.series || '',
		title: karaData.title || '',
		type: karaData.type || '',
		order: karaData.order || 0,
		version: 1,
		lang: karaData.lang || '',
		KID: karaData.KID || uuidV4(),
		dateadded: karaData.dateadded || timestamp.now(),
		datemodif: karaData.datemodif || timestamp.now(),
		videosize: karaData.videosize || 0,
		videogain: karaData.videogain || 0,
		videoduration: karaData.videoduration || 0
	};

	await asyncWriteFile(karafile, stringify(infosToWrite));
}

export async function parseKara(karaFile) {
	const data = await asyncReadFile(karaFile, 'utf-8');
	return parseini(data);
}

export function verifyRequiredInfos(karaData) {
	if (!karaData.videofile || karaData.videofile.trim() === '') {
		throw 'Karaoke video file empty!';
	}
	if (!karaData.subfile || karaData.subfile.trim() === '') {
		throw 'Karaoke sub file empty!';
	}
}

async function findSubFile(videoFile, kara) {
	const videoExt = extname(videoFile);
	if (kara.subfile === 'dummy.ass') {
		if (videoExt === '.mkv' || videoExt === '.mp4') {
			const extractFile = resolve(resolvedPathTemp(), `kara_extract.${kara.KID}.ass`);
			try {
				return await extractSubtitles(videoFile, extractFile);
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