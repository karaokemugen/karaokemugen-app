/**
 * Tools used to manipulate .kara files : reading, extracting info, etc.
 * These functions do not resolve paths. Arguments should be resolved already.
 */

import timestamp from 'unix-timestamp';
import uuidV4 from 'uuid/v4';
import logger from 'winston';
import {parse, extname, resolve} from 'path';
import {parse as parseini, stringify} from 'ini';
import {checksum, asyncReadFile, asyncStat, asyncWriteFile, resolveFileInDirs} from '../_common/utils/files';
import {resolvedPathSubs, resolvedPathTemp, resolvedPathVideos} from '../_common/utils/config';
import {extractSubtitles, getVideoInfo} from '../_common/utils/ffmpeg';
import {getKara} from '../_services/kara';
import {getConfig} from '../_common/utils/config';
let error = false;

export function karaFilenameInfos(karaFile) {
	const karaFileName = parse(karaFile).name;
	const infos = karaFileName.split(/\s+-\s+/); // LANGUAGE - SERIES - ORDER - TITLE

	if (infos.length < 3) {
		throw 'Kara filename \'' + karaFileName + '\' does not respect naming convention';
	}
	// Addming in 5th position the number extracted from the type field.
	const orderInfos = infos[2].match(/^([a-zA-Z0-9 ]{2,30}?)(\d*)$/);
	infos.push(orderInfos[2] ? +orderInfos[2] : 0);

	// Let's return an object with our data correctly positionned.
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
	if (!karaData.datemodif) {
		karaData.isKaraModified = true;
		karaData.datemodif = timestamp.now();
	}
	karaData.karafile = karafile;

	let videoFile;

	try {
		videoFile = await resolveFileInDirs(karaData.videofile, resolvedPathVideos());
	} catch (err) {
		logger.warn('[Kara] Video file not found : ' + karaData.videofile);
		error = true;
		if (!karaData.videogain) karaData.videogain = 0;
		if (!karaData.videosize) karaData.videosize = 0;
		if (!karaData.videoduration) karaData.videoduration = 0;
		karaData.ass = '';
	}

	if (videoFile || getConfig().optNoVideo) {
		const subFile = await findSubFile(videoFile, karaData);
		await extractAssInfos(subFile, karaData);
		await extractVideoTechInfos(videoFile, karaData);		
		if (karaData.error) error = true;
	}

	karaData.viewcount = 0;
	
	if (error) karaData.error = true;

	return karaData;
}

export async function extractAssInfos(subFile, karaData) {
	if (subFile) {
		karaData.ass = await asyncReadFile(subFile, {encoding: 'utf8'});
		const subChecksum = checksum(karaData.ass);
		// Disable checking the checksum for now
		if (subChecksum != karaData.subchecksum) {
			karaData.isKaraModified = true;
			karaData.subchecksum = subChecksum;
		}		
	} else {
		karaData.ass = '';
	}
}

export async function extractVideoTechInfos(videoFile, karaData) {
	if (!getConfig().optNoVideo) {
		const videoStats = await asyncStat(videoFile);
		if (videoStats.size !== +karaData.videosize) {
			karaData.isKaraModified = true;
			karaData.videosize = videoStats.size;

			const videoData = await getVideoInfo(videoFile);
			if (videoData.error) error = true;

			karaData.videogain = videoData.audiogain;
			karaData.videoduration = videoData.duration;
		}
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
	const conf = getConfig();
	if (kara.subfile === 'dummy.ass' && !conf.optNoVideo) {
		const videoExt = extname(videoFile);
		if (videoExt === '.mkv') {
			try {
				return await extractVideoSubtitles(videoFile, kara.KID);
			} catch (err) {
				// Not blocking.
				logger.warn('[Kara] Could not extract subtitles from video file ' + videoFile);
				error = true;	
			}
		}
	} else {
		try {
			if (kara.subfile != 'dummy.ass') return await resolveFileInDirs(kara.subfile, resolvedPathSubs());
		} catch (err) {
			logger.warn(`[Kara] Could not find subfile '${kara.subfile}'.`);
			error = true;
		}
	}
	// Non-blocking case if file isn't found
	return '';
}