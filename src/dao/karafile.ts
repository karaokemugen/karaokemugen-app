/**
 * Tools used to manipulate .kara files : reading, extracting info, etc.
 * These functions do not resolve paths. Arguments should be resolved already.
 */

import {now} from '../utils/date';
import {karaTypes, karaTypesArray, subFileRegexp, uuidRegexp, mediaFileRegexp} from '../services/constants';
import uuidV4 from 'uuid/v4';
import logger from 'winston';
import {extname, resolve, basename} from 'path';
import {parse as parseini, stringify} from 'ini';
import {asyncUnlink, checksum, asyncReadFile, asyncStat, asyncWriteFile, resolveFileInDirs} from '../utils/files';
import {resolvedPathKaras, resolvedPathSubs, resolvedPathTemp, resolvedPathMedias} from '../utils/config';
import {extractSubtitles, getMediaInfo} from '../utils/ffmpeg';
import {getKara, selectAllKaras} from './kara';
import {getState} from '../utils/state';
import { KaraFile, Kara, MediaInfo } from '../types/kara';
import {check, initValidators} from '../utils/validators';
import {createKaraInDB, editKaraInDB} from '../services/kara';
import {getConfig} from '../utils/config';

let error = false;

function strictModeError(karaData: KaraFile, data: string) {
	delete karaData.ass;
	logger.error(`[Kara] STRICT MODE ERROR : ${data} - Kara data read : ${JSON.stringify(karaData,null,2)}`);
	error = true;
}

export async function integrateKaraFile(file: string) {
	const karaFileData = await parseKara(file);
	const karaFile = basename(file);
	const karaData = await getDataFromKaraFile(karaFile, karaFileData)
	const karaDB = await getKara(karaData.kid, 'admin', null, 'admin');
	if (karaDB.length > 0) {
		await editKaraInDB(karaData, { refresh: false });
		if (karaDB[0].karafile !== karaData.karafile) await asyncUnlink(await resolveFileInDirs(karaDB[0].karafile, getConfig().System.Path.Karas));
		if (karaDB[0].mediafile !== karaData.mediafile) await asyncUnlink(await resolveFileInDirs(karaDB[0].mediafile, getConfig().System.Path.Medias));
		if (karaDB[0].subfile !== 'dummy.ass' && karaDB[0].subfile !== karaData.subfile) await asyncUnlink(await resolveFileInDirs(karaDB[0].subfile, getConfig().System.Path.Lyrics));
	} else {
		await createKaraInDB(karaData, { refresh: false });
	}
}

export async function getDataFromKaraFile(karafile: string, karaData: KaraFile): Promise<Kara> {
	const state = getState();
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

	if (mediaFile || !state.opt.noMedia) {
		const subFile = await findSubFile(mediaFile, karaData.subfile, karaData.KID);
		if (!subFile && state.opt.strict && karaData.subfile !== 'dummy.ass') strictModeError(karaData, 'extracting subtitles failed');
		if (subFile && karaData.subfile !== 'dummy.ass') {
			const subChecksum = await extractAssInfos(subFile);
			if (subChecksum !== karaData.subchecksum) {
				karaData.isKaraModified = true;
				karaData.subchecksum = subChecksum;
				if (state.opt.strict) strictModeError(karaData, 'subchecksum is missing or invalid');
			}
		}
		const mediaInfo = await extractMediaTechInfos(mediaFile, karaData.mediasize);
		if (mediaInfo.error) {
			if (state.opt.strict && mediaInfo.size != null) {
				strictModeError(karaData, `Media data is wrong for : ${mediaFile}`);
			}
			if (state.opt.strict && mediaInfo.size === null) {
				strictModeError(karaData, `Media file could not be read by ffmpeg : ${mediaFile}`);
			}
			karaData.error = true;
		} else if (mediaInfo.size) {
			karaData.isKaraModified = true;
			karaData.mediasize = mediaInfo.size;
			karaData.mediagain = mediaInfo.gain;
			karaData.mediaduration = mediaInfo.duration;
		}
	}
	if (karaData.order === '') karaData.order = null;
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
		series: karaData.series.split(',').filter(e => e !== ''),
		tags: karaData.tags.split(',').filter(e => e !== ''),
		type: karaData.type,
		singer: karaData.singer.split(',').filter(e => e !== ''),
		songwriter: karaData.songwriter.split(',').filter(e => e !== ''),
		creator: karaData.creator.split(',').filter(e => e !== ''),
		groups: karaData.groups.split(',').filter(e => e !== ''),
		author: karaData.author.split(',').filter(e => e !== ''),
		lang: karaData.lang.split(',').filter(e => e !== '')
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
	const noInfo = {
		error: false,
		size: null,
		gain: null,
		duration: null
	};
	const errorInfo = {
		size: null,
		error: true,
		gain: null,
		duration: null
	};
	if (!getState().opt.noMedia) {
		let mediaStats: any;
		try {
			mediaStats = await asyncStat(mediaFile);
		} catch(err) {
			// Return early if file isn't found
			return errorInfo;
		}
		if (mediaStats.size !== size) {
			const mediaData = await getMediaInfo(mediaFile);
			if (mediaData.error) return errorInfo;
			return {
				error: false,
				size: mediaStats.size,
				gain: mediaData.gain,
				duration: mediaData.duration
			};
		} else {
			return noInfo;
		}
	} else {
		return noInfo;
	}
}

export async function writeKara(karafile: string, karaData: Kara) {
	const infosToWrite: KaraFile = formatKara(karaData);
	if (karaData.isKaraModified === false) return;
	infosToWrite.datemodif = now(true);
	delete infosToWrite.karafile;
	karaData.datemodif = new Date(infosToWrite.datemodif * 1000);
	await asyncWriteFile(karafile, stringify(infosToWrite));
}

export async function parseKara(karaFile: string): Promise<any> {
	let data: string;
	try {
		data = await asyncReadFile(karaFile, 'utf-8');
	} catch(err) {
		throw `Kara file ${karaFile} is not readable`;
	}
	if (!data) throw `Kara file ${karaFile} is empty`
	data = data.replace(/\r/g, '');
	const karaData = parseini(data);
	karaData.mediasize = +karaData.mediasize;
	karaData.mediaduration = +karaData.mediaduration;
	karaData.mediagain = +karaData.mediagain;
	karaData.dateadded = +karaData.dateadded;
	karaData.datemodif = +karaData.datemodif;
	return karaData;
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
	return null;
}

export async function replaceSerieInKaras(oldSerie: string, newSerie: string) {
	logger.info(`[Kara] Replacing serie "${oldSerie}" by "${newSerie}" in .kara files`);
	const karas = await selectAllKaras({
		filter: null,
		lang: null
	});
	const karasWithSerie = karas.filter((k: any) => {
		if (k.serie_orig && k.serie_orig.split(',').includes(oldSerie)) return k.karafile;
	})
	if (karasWithSerie.length > 0) logger.info(`[Kara] Replacing in ${karasWithSerie.length} files`);
	for (const karaWithSerie of karasWithSerie) {
		logger.info(`[Kara] Replacing in ${karaWithSerie.karafile}...`);
		const karaPath = await resolveFileInDirs(karaWithSerie.karafile, resolvedPathKaras());
		const kara = await parseKara(karaPath);
		let series = kara.series.split(',');
		const index = series.indexOf(oldSerie);
		if (index > -1)	series[index] = newSerie;
		kara.series = series.join(',');
		kara.datemodif = now(true);
		await asyncWriteFile(karaPath, stringify(kara));
	}
}

export async function removeSerieInKaras(serie: string) {
	logger.info(`[Kara] Removing serie ${serie} in .kara files`);
	const karas = await selectAllKaras({
		filter: null,
		lang: null
	});
	const karasWithSerie = karas.filter((k: any) => {
		if (k.serie_orig && k.serie_orig.split(',').includes(serie)) return k.karafile;
	})
	if (karasWithSerie.length > 0) logger.info(`[Kara] Removing in ${karasWithSerie.length} files`);
	for (const karaWithSerie of karasWithSerie) {
		logger.info(`[Kara] Removing in ${karaWithSerie.karafile}...`);
		const karaPath = await resolveFileInDirs(karaWithSerie.karafile, resolvedPathKaras());
		const kara = await parseKara(karaPath);
		const series = kara.series.split(',');
		const newSeries = series.filter(s => s !== serie);
		kara.series = newSeries.join(',');
		kara.datemodif = now(true);
		await asyncWriteFile(karaPath, stringify(kara));
	}
}

/**
 * Generate info to write in a .kara file from an object passed as argument by filtering out unnecessary fields and adding default values if needed.
 */
export function formatKara(karaData: Kara): KaraFile {
	return {
		mediafile: karaData.mediafile || '',
		subfile: karaData.subfile || 'dummy.ass',
		subchecksum: karaData.subchecksum || '',
		title: karaData.title || '',
		series: karaData.series.join(',') || '',
		type: karaData.type || '',
		order: karaData.order || '',
		year: karaData.year || '',
		singer: karaData.singer.join(',') || '',
		tags: karaData.tags.join(',') || '',
		groups: karaData.groups.join(',') || '',
		songwriter: karaData.songwriter.join(',') || '',
		creator: karaData.creator.join(',') || '',
		author: karaData.author.join(',') || '',
		lang: karaData.lang.join(',') || 'und',
		KID: karaData.kid || uuidV4(),
		dateadded: Math.floor(karaData.dateadded.getTime() / 1000) || now(true),
		datemodif: Math.floor(karaData.datemodif.getTime() / 1000) || now(true),
		mediasize: karaData.mediasize || 0,
		mediagain: karaData.mediagain || 0,
		mediaduration: karaData.mediaduration || 0,
		version: karaData.version || 3
	};
}

const karaConstraintsV3 = {
	mediafile: {
		presence: {allowEmpty: false},
		format: mediaFileRegexp
	},
	subfile: {
		presence: {allowEmpty: false},
		format: subFileRegexp
	},
	title: {presence: {allowEmpty: true}},
	type: {presence: true, inclusion: karaTypesArray},
	series: (_value: string, attributes: any) => {
		return (!serieRequired(attributes['type'])) ?  { presence: {allowEmpty: true} } : { presence: {allowEmpty: false} };
	},
	lang: {langValidator: true},
	year: {integerValidator: true},
	KID: {format: uuidRegexp},
	mediasize: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	mediagain: {numericality: true},
	mediaduration: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	version: {numericality: {onlyInteger: true, equality: 3}}
};

export function karaDataValidationErrors(karaData: KaraFile) {
	initValidators();
	return check(karaData, karaConstraintsV3);
}

export function verifyKaraData(karaData: KaraFile) {
	// Version 2 is considered deprecated, so let's throw an error.
	if (karaData.version < 3) throw 'Karaoke version 2 or lower is deprecated';
	const validationErrors = karaDataValidationErrors(karaData);
	if (validationErrors) {
		throw `Karaoke data is not valid: ${JSON.stringify(validationErrors)}`;
	}
}

/** Only MV or LIVE types don't have to have a series filled. */
export function serieRequired(karaType: string) {
	return karaType !== karaTypes.MV.type && karaType !== karaTypes.LIVE.type;
}