/**
 * Tools used to manipulate .kara files : reading, extracting info, etc.
 * These functions do not resolve paths. Arguments should be resolved already.
 */

import {now} from '../_utils/date';
import uuidV4 from 'uuid/v4';
import logger from 'winston';
import {extname, resolve} from 'path';
import {parse as parseini, stringify} from 'ini';
import {checksum, asyncReadFile, asyncStat, asyncWriteFile, resolveFileInDirs} from '../_utils/files';
import {resolvedPathKaras, resolvedPathSubs, resolvedPathTemp, resolvedPathMedias} from '../_utils/config';
import {extractSubtitles, getMediaInfo} from '../_utils/ffmpeg';
import {formatKara} from '../_services/kara';
import {selectAllKaras} from './kara';
import {getState} from '../_utils/state';
import { KaraFile, Kara, MediaInfo } from '../_types/kara';

let error = false;

function strictModeError(karaData: KaraFile, data: string) {
	delete karaData.ass;
	logger.error(`[Kara] STRICT MODE ERROR : ${data} - Kara data read : ${JSON.stringify(karaData,null,2)}`);
	error = true;
}

export async function getDataFromKaraFile(karafile: string): Promise<Kara> {
	const state = getState();
	const karaData: KaraFile = await parseKara(karafile);

	karaData.error = false;
	karaData.isKaraModified = false;

	if (!karaData.KID) {
		karaData.isKaraModified = true;
		karaData.KID = uuidV4();
		if (state.opt.strict) strictModeError(karaData, 'kid is missing');
	}

	if (!karaData.dateadded) {
		karaData.isKaraModified = true;
		karaData.dateadded = now(true);
		if (state.opt.strict) strictModeError(karaData, 'dateadded is missing');
	}
	if (!karaData.datemodif) {
		karaData.isKaraModified = true;
		karaData.datemodif = now(true);
		if (state.opt.strict) strictModeError(karaData, 'datemodif is missing');
	}


	let mediaFile: string;
	try {
		mediaFile = await resolveFileInDirs(karaData.mediafile, resolvedPathMedias());
	} catch (err) {
		logger.debug(`[Kara] Media file not found : ${karaData.mediafile}`);
		if (state.opt.strict) strictModeError(karaData, 'mediafile');
		if (!karaData.mediagain) karaData.mediagain = 0;
		if (!karaData.mediasize) karaData.mediasize = 0;
		if (!karaData.mediaduration) karaData.mediaduration = 0;
		karaData.ass = '';
	}

	if (mediaFile || state.opt.noMedia) {
		const subFile = await findSubFile(mediaFile, karaData.subfile, karaData.KID);
		if (!subFile && getState().opt.strict) strictModeError(karaData, 'extracting subtitles failed');
		const subChecksum = await extractAssInfos(subFile);
		if (subChecksum !== karaData.subchecksum) {
			karaData.isKaraModified = true;
			karaData.subchecksum = subChecksum;
			if (getState().opt.strict) strictModeError(karaData, 'subchecksum is missing or invalid');
		}
		const mediaInfo = await extractMediaTechInfos(mediaFile, karaData.mediasize);
		if (mediaInfo.size === null && getState().opt.strict) strictModeError(karaData, `Media file "${mediaFile} not found`);
		if (mediaInfo.size !== null && mediaInfo.size !== karaData.mediasize) {
			karaData.isKaraModified = true;
			karaData.mediasize = mediaInfo.size;
		}
		if (mediaInfo.error) {
			strictModeError(karaData, 'ffmpeg failed');
		} else {
			karaData.mediagain = mediaInfo.gain,
			karaData.mediasize = mediaInfo.size,
			karaData.mediaduration = mediaInfo.duration
		}
	}
	if (karaData.order = '') karaData.order = null;
	return {
		kid: karaData.KID,
		karafile: karafile,
		mediafile: karaData.mediafile,
		mediagain: karaData.mediagain,
		mediaduration: karaData.mediaduration,
		mediasize: karaData.mediasize,
		subfile: karaData.subfile,
		title: karaData.title,
		datemodif: new Date(karaData.datemodif * 1000),
		dateadded: new Date(karaData.dateadded * 1000),
		error: error,
		subchecksum: karaData.subchecksum,
		isKaraModified: karaData.isKaraModified,
		year: karaData.year,
		order: karaData.order,
		series: karaData.series.split(','),
		tags: karaData.tags.split(','),
		type: karaData.type,
		singer: karaData.singer.split(','),
		songwriter: karaData.songwriter.split(','),
		creator: karaData.creator.split(','),
		groups: karaData.groups.split(','),
		author: karaData.author.split(','),
		lang: karaData.lang.split(',')
	};
}

export async function extractAssInfos(subFile: string): Promise<string> {
	let ass: string;
	let subChecksum: string;
	if (subFile) {
		ass = await asyncReadFile(subFile, {encoding: 'utf8'});
		ass = ass.replace(/\r/g, '');
		subChecksum = checksum(ass);
	} else {
		throw 'Subfile is empty';
	}
	return subChecksum;
}

export async function extractMediaTechInfos(mediaFile: string, size: number): Promise<MediaInfo> {
	if (!getState().opt.noMedia) {
		let mediaStats: any;
		try {
			mediaStats = await asyncStat(mediaFile);
		} catch(err) {
			// Return early if file isn't found
			return {
				size: null,
				error: true,
				gain: null,
				duration: null
			};
		}

		if (mediaStats.size !== size) {
			const mediaData = await getMediaInfo(mediaFile);
			if (mediaData.error) return {
					size: null,
					error: true,
					duration: null,
					gain: null,
				}
			return {
				error: false,
				size: mediaStats.size,
				gain: mediaStats.audiogain,
				duration: mediaStats.duration
			};
		}
	}
}

export async function writeKara(karafile: string, karaData: Kara) {
	const infosToWrite: KaraFile = formatKara(karaData);
	if (karaData.isKaraModified === false) {
		return;
	}
	infosToWrite.datemodif = now(true);
	delete infosToWrite.karafile;
	karaData.datemodif = new Date(infosToWrite.datemodif * 1000);
	await asyncWriteFile(karafile, stringify(infosToWrite));
}

export async function parseKara(karaFile: string): Promise<any> {
	let data = await asyncReadFile(karaFile, 'utf-8');
	data = data.replace(/\r/g, '');
	return parseini(data);
}

export async function extractVideoSubtitles(videoFile: string, kid: string): Promise<string> {
	const extractFile = resolve(resolvedPathTemp(), `kara_extract.${kid}.ass`);
	try {
		await extractSubtitles(videoFile, extractFile);
		return extractFile;
	} catch (err) {
		throw err;
	}
}

async function findSubFile(videoFile: string, subFile: string, kid: string) {
	if (subFile === '' && !getState().opt.noMedia) {
		if (extname(videoFile) === '.mkv') {
			try {
				return await extractVideoSubtitles(videoFile, kid);
			} catch (err) {
				// Not blocking.
				logger.warn(`[Kara] Could not extract subtitles from video file ${videoFile}`);
				return null;
			}
		}
	} else {
		try {
			if (subFile !== 'dummy.ass') return await resolveFileInDirs(subFile, resolvedPathSubs());
		} catch (err) {
			logger.warn(`[Kara] Could not find subfile '${subFile}' (in ${JSON.stringify(resolvedPathSubs())}).`);
			return null;
		}
	}
	// Non-blocking case if file isn't found
	return '';
}

export async function replaceSerieInKaras(oldSerie: string, newSerie: string) {
	logger.info(`[Kara] Replacing serie "${oldSerie}" by "${newSerie}" in .kara files`);
	const karas = await selectAllKaras({
		filter: null,
		lang: null
	});
	const karasWithSerie = karas.map((k: any) => {
		if (k.serie_orig && k.serie_orig.split(',').includes(oldSerie)) return k.karafile;
	})
	if (karasWithSerie.length > 0) logger.info(`[Kara] Replacing in ${karasWithSerie.length} files`);
	for (const karaFile of karasWithSerie) {
		logger.info(`[Kara] Replacing in ${karaFile}...`);
		const karaPath = await resolveFileInDirs(karaFile, resolvedPathKaras());
		const kara = await parseKara(karaPath);
		let series = kara.series.split(',');
		const index = series.indexOf(oldSerie);
		if (index > -1)	series[index] = newSerie;
		kara.series = series.join(',');
		kara.datemodif = now(true);
		await asyncWriteFile(karaFile, stringify(kara));
	}
}

export async function removeSerieInKaras(serie: string) {
	logger.info(`[Kara] Removing serie ${serie} in .kara files`);
	const karas = await selectAllKaras({
		filter: null,
		lang: null
	});
	const karasWithSerie = karas.map((k: any) => {
		if (k.serie_orig && k.serie_orig.split(',').includes(serie)) return k.karafile;
	})
	if (karasWithSerie.length > 0) logger.info(`[Kara] Removing in ${karasWithSerie.length} files`);
	for (const karaFile of karasWithSerie) {
		logger.info(`[Kara] Removing in ${karaFile}...`);
		const karaPath = await resolveFileInDirs(karaFile, resolvedPathKaras());
		const kara = await parseKara(karaPath);
		const series = kara.series.split(',');
		const newSeries = series.filter(s => s !== serie);
		kara.series = newSeries.join(',');
		kara.datemodif = now(true);
		await asyncWriteFile(karaFile, stringify(kara));
	}
}