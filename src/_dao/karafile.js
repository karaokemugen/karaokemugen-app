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
import {resolvedPathSubs, resolvedPathTemp, resolvedPathMedias} from '../_common/utils/config';
import {extractSubtitles, getMediaInfo} from '../_common/utils/ffmpeg';
import {getKara} from '../_services/kara';
import {getConfig} from '../_common/utils/config';

let error = false;


export function karaFilenameInfos(karaFile) {
	const karaFileName = parse(karaFile).name;
	const infos = karaFileName.split(/\s+-\s+/); // LANGUAGE - SERIES - ORDER - TITLE

	if (infos.length < 3) {
		throw 'Kara filename \'' + karaFileName + '\' does not respect naming convention';
	}
	// Adding in 5th position the number extracted from the type field.
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

function strictModeError(karaData, data) {	
	logger.error(`[Gen] STRICT MODE ERROR : One kara's ${data} is going to be modified : ${JSON.stringify(karaData,null,2)}`);
	error = true;
}

export async function getDataFromKaraFile(karafile) {
	const conf = getConfig();
	const karaData = await parseKara(karafile);
	
	// Code to keep compatibility with v2 kara files. Remove this in a few months or so.
	karaData.mediafile = karaData.mediafile || karaData.videofile;
	karaData.mediasize = karaData.mediasize || karaData.videosize;
	karaData.mediagain = karaData.mediagain || karaData.videogain;
	karaData.mediaduration = karaData.mediaduration || karaData.videoduration;

	karaData.isKaraModified = false;

	if (!karaData.KID) {
		karaData.isKaraModified = true;
		karaData.KID = uuidV4();
		if (conf.optStrict) strictModeError(karaData, 'kid');
	}
	timestamp.round = true;
	if (!karaData.dateadded) {
		karaData.isKaraModified = true;
		karaData.dateadded = timestamp.now();
		if (conf.optStrict) strictModeError(karaData, 'dateadded');
	}
	if (!karaData.datemodif) {
		karaData.isKaraModified = true;
		karaData.datemodif = timestamp.now();
		if (conf.optStrict) strictModeError(karaData, 'datemodif');
	}
	karaData.karafile = karafile;

	let mediaFile;	

	try {
		mediaFile = await resolveFileInDirs(karaData.mediafile, resolvedPathMedias());
	} catch (err) {
		logger.warn('[Kara] Media file not found : ' + karaData.mediafile);
		error = true;
		if (!karaData.mediagain) karaData.mediagain = 0;
		if (!karaData.mediasize) karaData.mediasize = 0;
		if (!karaData.mediaduration) karaData.mediaduration = 0;
		karaData.ass = '';
	}

	if (mediaFile || getConfig().optNoMedia) {
		const subFile = await findSubFile(mediaFile, karaData);
		await extractAssInfos(subFile, karaData);
		await extractMediaTechInfos(mediaFile, karaData);		
		if (karaData.error) error = true;
	}

	karaData.viewcount = 0;
	
	if (error) karaData.error = true;

	return karaData;
}

export async function extractAssInfos(subFile, karaData) {
	if (subFile) {
		karaData.ass = await asyncReadFile(subFile, {encoding: 'utf8'});
		karaData.ass = karaData.ass.replace(/\r/g, '');
		const subChecksum = checksum(karaData.ass);
		if (subChecksum !== karaData.subchecksum) {			
			karaData.isKaraModified = true;
			karaData.subchecksum = subChecksum;
			if (getConfig().optStrict) strictModeError(karaData, 'subchecksum');
		}
	} else {
		karaData.ass = '';
	}
	return karaData;
}

export async function extractMediaTechInfos(mediaFile, karaData) {
	const conf = getConfig();
	if (!conf.optNoMedia) {
		const mediaStats = await asyncStat(mediaFile);
		if (mediaStats.size !== +karaData.mediasize) {
			karaData.isKaraModified = true;			
			karaData.mediasize = mediaStats.size;

			const mediaData = await getMediaInfo(mediaFile);
			if (mediaData.error) error = true;

			karaData.mediagain = mediaData.audiogain;
			karaData.mediaduration = mediaData.duration;
			if (conf.optStrict) strictModeError(karaData, 'mediasize/gain/duration');			
		}
	}
}

export async function writeKara(karafile, karaData) {
	const infosToWrite = (getKara(karaData));	
	if (karaData.isKaraModified === false) {		
		return;
	}	
	infosToWrite.datemodif = timestamp.now();
	// Transforming medias -> videos for now
	// Delete this when the .kara format update goes live
	infosToWrite.videofile = infosToWrite.mediafile;
	infosToWrite.videogain = infosToWrite.mediagain;
	infosToWrite.videosize = infosToWrite.mediasize;
	infosToWrite.videoduration = infosToWrite.mediaduration;
	delete infosToWrite.mediaduration;
	delete infosToWrite.mediasize;
	delete infosToWrite.mediagain;
	delete infosToWrite.mediafile;
	karaData.datemodif = infosToWrite.datemodif;
	await asyncWriteFile(karafile, stringify(infosToWrite));
}

export async function parseKara(karaFile) {
	let data = await asyncReadFile(karaFile, 'utf-8');
	data = data.replace(/\r/g, '');
	return parseini(data);	
}

export async function extractVideoSubtitles(videoFile, kid) {
	const extractFile = resolve(resolvedPathTemp(), `kara_extract.${kid}.ass`);	
	try {
		await extractSubtitles(videoFile, extractFile);
		return extractFile;
	} catch (err) {
		throw err;
	}
}

async function findSubFile(videoFile, kara) {
	const conf = getConfig();
	if (kara.subfile === '' && !conf.optNoMedia) {
		if (extname(videoFile) === '.mkv') {
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
			if (kara.subfile !== 'dummy.ass') return await resolveFileInDirs(kara.subfile, resolvedPathSubs());
		} catch (err) {
			logger.warn(`[Kara] Could not find subfile '${kara.subfile}' (in ${JSON.stringify(resolvedPathSubs())}).`);
			error = true;
		}
	}
	// Non-blocking case if file isn't found
	return '';
}