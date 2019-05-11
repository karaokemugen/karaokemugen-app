/**
 * .kara files generation
 */

import logger from 'winston';
import {basename, extname, resolve} from 'path';
import {resolvedPathImport, resolvedPathTemp, resolvedPathKaras, resolvedPathSubs, resolvedPathMedias} from '../_utils/config';
import {sanitizeFile, asyncCopy, asyncUnlink, asyncExists, asyncMove, replaceExt} from '../_utils/files';
import {
	extractAssInfos, extractVideoSubtitles, extractMediaTechInfos, writeKara
} from '../_dao/karafile';
import {getType} from '../_services/constants';
import {createKaraInDB, editKaraInDB, formatKara} from '../_services/kara';
import {check} from '../_utils/validators';
import {getOrAddSerieID} from '../_services/series';
import {now} from '../_utils/date';
import { compareKarasChecksum } from '../_dao/database';
import { webOptimize } from '../_utils/ffmpeg';

export async function editKara(kara) {
	let newKara;
	try {
		const mediaFile = resolve(resolvedPathMedias()[0], kara.mediafile);
		let subFile;
		kara.subfile && kara.subfile !== 'dummy.ass'
			? subFile = resolve(resolvedPathSubs()[0], kara.subfile)
			: subFile = kara.subfile;
		const karaFile = resolve(resolvedPathKaras()[0], kara.karafile);
		// Removing useless data
		delete kara.karafile;
		// Copying already present files in temp directory to be worked on with by generateKara
		if (!kara.mediafile_orig) {
			kara.noNewVideo = true;
			kara.overwrite = true;
			kara.mediafile_orig = kara.mediafile;
			if (!await asyncExists(mediaFile)) throw `Mediafile ${mediaFile} does not exist! Check your base files or upload a new media`;
			await asyncCopy(mediaFile, resolve(resolvedPathTemp(), kara.mediafile), {overwrite: true});
		}
		if (!kara.subfile_orig) {
			kara.overwrite = true;
			kara.subfile_orig = kara.subfile;
			if (kara.subfile !== 'dummy.ass') {
				if (!await asyncExists(subFile)) throw `Subfile ${subFile} does not exist! Check your base files or upload a new subfile`;
				await asyncCopy(subFile, resolve(resolvedPathTemp(), kara.subfile), {overwrite: true});
			}
		}
		kara.KID = kara.kid;
		// Treat files
		newKara = await generateKara(kara);
		const newSubFile = resolve(resolvedPathSubs()[0],newKara.data.subfile);
		const newMediaFile = resolve(resolvedPathMedias()[0],newKara.data.mediafile);

		//Removing previous files if they're different from the new ones (name changed, etc.)
		if (newKara.file.toLowerCase() !== karaFile.toLowerCase() && await asyncExists(karaFile)) asyncUnlink(karaFile);
		if (newSubFile.toLowerCase() !== subFile.toLowerCase() && subFile !== 'dummy.ass') {
			if (await asyncExists(subFile)) asyncUnlink(subFile);
		}
		if (newMediaFile.toLowerCase() !== mediaFile.toLowerCase() && await asyncExists(mediaFile)) asyncUnlink(mediaFile);
	} catch(err) {
		logger.error(`[KaraGen] Error while editing kara : ${err}`);
		throw err;
	}
	// Update in database
	newKara.data.karafile = basename(newKara.file);
	try {
		await editKaraInDB(newKara.data);
	} catch(err) {
		const errMsg = `${newKara.data.karafile} file generation is OK, but unable to edit karaoke in live database. Please regenerate database entirely if you wish to see your modifications : ${err}`;
		logger.warn(`[KaraGen] ${errMsg}`);
		throw errMsg;
	}
}

export async function createKara(kara) {
	const newKara = await generateKara(kara);
	try {
		newKara.data.karafile = basename(newKara.file);
		await createKaraInDB(newKara.data);
	} catch(err) {
		const errMsg = `.kara file is OK, but unable to add karaoke in live database. Please regenerate database entirely if you wish to see your modifications : ${err}`;
		logger.warn(`[KaraGen] ${errMsg}`);
		throw errMsg;
	}
	return newKara;
}

async function generateKara(kara, opts) {
	/*
	kara = {
		title = string
		series = string (elements separated by ,) (see series from series.json)
		type = string (see karaTypes from constants)
		year = number or empty
		order = number or empty
		singer = string (elements separated by ,) (see results from GET /api/tags, type is 2)
		songwriter = string (elements separated by ,) (see results from GET /api/tags, type is 8)
		tags = string (elements separated by ,) (see tags from constants)
		creator = string (elements separated by ,) (see results from GET /api/tags, type is 4)
		author = string (elements separated by ,) (see results from GET /api/tags, type is 6)
		lang = string (elements separated by ,) (get iso639-2B from langs.codes("2B") )
		mediafile = mediafile name as uploaded
		subfile = subfile name as uploaded
		mediafile_orig = Original name from the user's computer
		subfile_orig = Original name from the user's computer
	}
	*/
	if (!opts) opts = {};
	if ((kara.type !== 'MV' && kara.type !== 'LIVE') && kara.series.length < 1) throw 'Series cannot be empty if type is not MV or LIVE';
	if (!kara.mediafile) throw 'No media file uploaded';
	const validationErrors = check(kara, {
		year: {integerValidator: true},
		lang: {langValidator: true},
		tags: {tagsValidator: true},
		type: {typeValidator: true},
		order: {integerValidator: true},
		series: {arrayNoCommaValidator: true},
		singer: {arrayNoCommaValidator: true},
		author: {arrayNoCommaValidator: true},
		songwriter: {arrayNoCommaValidator: true},
		creator: {arrayNoCommaValidator: true},
		groups: {arrayNoCommaValidator: true},
		title: {presence: true}
	});
	// Move files from temp directory to import, depending on the different cases.
	// First name media files and subfiles according to their extensions
	// Since temp files don't have any extension anymore
	const newMediaFile = `${kara.mediafile}${extname(kara.mediafile_orig)}`;
	let newSubFile;
	if (kara.subfile && kara.subfile !== 'dummy.ass' && kara.subfile_orig) newSubFile = `${kara.subfile}${extname(kara.subfile_orig)}`;
	if (kara.subfile === 'dummy.ass') newSubFile = kara.subfile;
	// We don't need these anymore.
	delete kara.subfile_orig;
	delete kara.mediafile_orig;
	// Let's move baby.
	await asyncCopy(resolve(resolvedPathTemp(),kara.mediafile),resolve(resolvedPathImport(),newMediaFile), { overwrite: true });
	if (kara.subfile && kara.subfile !== 'dummy.ass') await asyncCopy(resolve(resolvedPathTemp(),kara.subfile),resolve(resolvedPathImport(),newSubFile), { overwrite: true });

	try {
		if (validationErrors) throw JSON.stringify(validationErrors);
		!kara.dateadded
			? kara.dateadded = now(true)
			: kara.dateadded = Math.floor(new Date(kara.dateadded).getTime() / 1000);
		kara.songwriter.sort();
		kara.singer.sort();
		//Trim spaces before and after elements.
		kara.series.forEach((e,i) => kara.series[i] = e.trim());
		kara.lang.forEach((e,i) => kara.lang[i] = e.trim());
		kara.singer.forEach((e,i) => kara.singer[i] = e.trim());
		kara.groups.forEach((e,i) => kara.groups[i] = e.trim());
		kara.songwriter.forEach((e,i) => kara.songwriter[i] = e.trim());
		kara.tags.forEach((e,i) => kara.tags[i] = e.trim());
		kara.creator.forEach((e,i) => kara.creator[i] = e.trim());
		kara.author.forEach((e,i) => kara.author[i] = e.trim());
		if (!kara.order) kara.order = '';
		const newKara = await importKara(newMediaFile, newSubFile, kara);
		compareKarasChecksum({silent: true});
		return newKara;
	} catch(err) {
		logger.error(`[Karagen] Error during generation : ${err}`);
		if (await asyncExists(newMediaFile)) await asyncUnlink(newMediaFile);
		if (newSubFile) if (await asyncExists(newSubFile)) await asyncUnlink(newSubFile);
		throw err;
	}
}

function containsVideoGameSupportTag(tags) {
	return tags.includes('TAG_PS3')
			|| tags.includes('TAG_PS2')
			|| tags.includes('TAG_PSX')
			|| tags.includes('TAG_PS4')
			|| tags.includes('TAG_PSV')
			|| tags.includes('TAG_PSP')
			|| tags.includes('TAG_XBOX360')
			|| tags.includes('TAG_GAMECUBE')
			|| tags.includes('TAG_DS')
			|| tags.includes('TAG_3DS')
			|| tags.includes('TAG_PC')
			|| tags.includes('TAG_SEGACD')
			|| tags.includes('TAG_SATURN')
			|| tags.includes('TAG_WII')
			|| tags.includes('TAG_WIIU')
			|| tags.includes('TAG_DREAMCAST')
			|| tags.includes('TAG_SWITCH')
			|| tags.includes('TAG_XBOXONE')
			|| tags.includes('TAG_VN')
			|| tags.includes('TAG_MOBAGE');
}

function defineFilename(data) {
	// Generate filename according to tags and type.
	if (data) {
		const extraTags = [];
		if (data.tags.includes('TAG_PS3')) extraTags.push('PS3');
		if (data.tags.includes('TAG_PS2')) extraTags.push('PS2');
		if (data.tags.includes('TAG_PSX')) extraTags.push('PSX');
		if (data.tags.includes('TAG_SPECIAL')) extraTags.push('SPECIAL');
		if (data.tags.includes('TAG_COVER')) extraTags.push('COVER');
		if (data.tags.includes('TAG_DUB')) extraTags.push('DUB');
		if (data.tags.includes('TAG_REMIX')) extraTags.push('REMIX');
		if (data.tags.includes('TAG_OVA')) extraTags.push('OVA');
		if (data.tags.includes('TAG_ONA')) extraTags.push('ONA');
		if (data.tags.includes('TAG_MOVIE')) extraTags.push('MOVIE');
		if (data.tags.includes('TAG_PS4')) extraTags.push('PS4');
		if (data.tags.includes('TAG_PSV')) extraTags.push('PSV');
		if (data.tags.includes('TAG_PSP')) extraTags.push('PSP');
		if (data.tags.includes('TAG_XBOX360')) extraTags.push('XBOX360');
		if (data.tags.includes('TAG_GAMECUBE')) extraTags.push('GAMECUBE');
		if (data.tags.includes('TAG_DS')) extraTags.push('DS');
		if (data.tags.includes('TAG_3DS')) extraTags.push('3DS');
		if (data.tags.includes('TAG_PC')) extraTags.push('PC');
		if (data.tags.includes('TAG_SEGACD')) extraTags.push('SEGACD');
		if (data.tags.includes('TAG_SATURN')) extraTags.push('SATURN');
		if (data.tags.includes('TAG_WII')) extraTags.push('WII');
		if (data.tags.includes('TAG_WIIU')) extraTags.push('WIIU');
		if (data.tags.includes('TAG_SWITCH')) extraTags.push('SWITCH');
		if (data.tags.includes('TAG_VIDEOGAME')) extraTags.push('GAME');
		if (data.tags.includes('TAG_SOUNDONLY')) extraTags.push('AUDIO');
		let extraType = '';
		if (extraTags.length > 0) extraType = extraTags.join(' ') + ' ';
		const fileLang = data.lang[0].toUpperCase();
		return sanitizeFile(`${fileLang} - ${data.series[0] || data.singer} - ${extraType}${getType(data.type)}${data.order} - ${data.title}`);
	}
}

async function importKara(mediaFile, subFile, data) {
	const kara = defineFilename(data);
	logger.info('[KaraGen] Generating kara file for ' + kara);
	let karaSubFile;
	subFile === 'dummy.ass'
		? karaSubFile = subFile
		: karaSubFile = `${kara}${extname(subFile || '.ass')}`;
	let karaData = formatKara({ ...data,
		mediafile: `${kara}${extname(mediaFile)}`,
		subfile: karaSubFile
	});
	karaData.overwrite = data.overwrite;

	// Extract media info, find subfile, and process series before moving files
	const mediaPath = resolve(resolvedPathImport(), mediaFile);
	let subPath;
	if (subFile !== 'dummy.ass') subPath = await findSubFile(mediaPath, karaData, subFile);

	// Autocreating groups based on song year
	if(containsVideoGameSupportTag(karaData.tags) && !karaData.tags.includes('TAG_VIDEOGAME')) karaData.tags.push('TAG_VIDEOGAME');
	if(mediaFile.match('^.+\\.(ogg|m4a|mp3)$') && !karaData.tags.includes('TAG_SOUNDONLY')) karaData.tags.push('TAG_SOUNDONLY');

	if (+karaData.year >= 1950 && +karaData.year <= 1959 && !karaData.groups.includes('50s')) karaData.groups.push('50s');
	if (+karaData.year >= 1960 && +karaData.year <= 1969 && !karaData.groups.includes('60s')) karaData.groups.push('60s');
	if (+karaData.year >= 1970 && +karaData.year <= 1979 && !karaData.groups.includes('70s')) karaData.groups.push('70s');
	if (+karaData.year >= 1980 && +karaData.year <= 1989 && !karaData.groups.includes('80s')) karaData.groups.push('80s');
	if (+karaData.year >= 1990 && +karaData.year <= 1999 && !karaData.groups.includes('90s')) karaData.groups.push('90s');
	if (+karaData.year >= 2000 && +karaData.year <= 2009 && !karaData.groups.includes('2000s')) karaData.groups.push('2000s');
	if (+karaData.year >= 2010 && +karaData.year <= 2019 && !karaData.groups.includes('2010s')) karaData.groups.push('2010s');

	try {
		if (subPath !== 'dummy.ass') await extractAssInfos(subPath, karaData);
		await processSeries(data);
		return await generateAndMoveFiles(mediaPath, subPath, karaData);
	} catch(err) {
		const error = `Error importing ${kara} : ${err}`;
		logger.error(`[KaraGen] ${error}`);
		throw error;
	}
}

async function processSeries(kara) {
	//Creates series in kara if they do not exist already.
	for (const serie of kara.series) {
		const serieObj = {
			name: serie,
			i18n: {}
		};
		serieObj.i18n[kara.lang[0]] = serie;
		await getOrAddSerieID(serieObj);
	}
}

async function findSubFile(mediaPath, karaData, subFile) {
	// Replacing file extension by .ass in the same directory
	// Default is media + .ass instead of media extension.
	// If subfile exists, assFile becomes that.
	let assFile = replaceExt(mediaPath, '.ass');
	if (subFile) assFile = resolve(resolvedPathImport(), subFile);
	if (await asyncExists(assFile) && subFile !== 'dummy.ass') {
		// If a subfile is found, adding it to karaData
		karaData.subfile = replaceExt(karaData.mediafile, '.ass');
		return assFile;
	} else if (mediaPath.endsWith('.mkv')) {
		// In case of a mkv, we're going to extract its subtitles track
		try {
			const extractFile = await extractVideoSubtitles(mediaPath, karaData.KID);
			karaData.subfile = replaceExt(karaData.mediafile, '.ass');
			return extractFile;
		} catch (err) {
			// Non-blocking.
			logger.info('[KaraGen] Could not extract subtitles from video file ' + mediaPath + ' : ' + err);
			return 'dummy.ass';
		}
	} else {
		return 'dummy.ass';
	}
}

async function generateAndMoveFiles(mediaPath, subPath, karaData) {
	// Generating kara file in the first kara folder

	const karaFilename = replaceExt(karaData.mediafile, '.kara');
	const karaPath = resolve(resolvedPathKaras()[0], karaFilename);
	if (subPath === 'dummy.ass') karaData.subfile = 'dummy.ass';

	karaData.series = karaData.series.join(',');
	karaData.groups = karaData.groups.join(',');
	karaData.lang = karaData.lang.join(',');
	karaData.singer = karaData.singer.join(',');
	karaData.songwriter = karaData.songwriter.join(',');
	karaData.tags = karaData.tags.join(',');
	karaData.creator = karaData.creator.join(',');
	karaData.author = karaData.author.join(',');
	const mediaDest = resolve(resolvedPathMedias()[0], karaData.mediafile);
	let subDest;
	if (subPath && karaData.subfile !== 'dummy.ass') subDest = resolve(resolvedPathSubs()[0], karaData.subfile);
	try {
		// Moving media in the first media folder.
		if (extname(mediaDest).toLowerCase() === '.mp4' && !karaData.noNewVideo) {
			if (!karaData.overwrite && await asyncExists(mediaDest)) throw 'Media file already exists in destination folder';
			await webOptimize(mediaPath, mediaDest);
			await asyncUnlink(mediaPath);
			delete karaData.noNewVideo;
		} else {
			await asyncMove(mediaPath, mediaDest, { overwrite: karaData.overwrite });
		}
		// Extracting media info here and now because we migth have had to weboptimize it earlier.
		await extractMediaTechInfos(mediaDest, karaData);
		// Moving subfile in the first lyrics folder.
		if (subDest) await asyncMove(subPath, subDest, { overwrite: karaData.overwrite });
		delete karaData.overwrite;
	} catch (err) {
		throw `Error while moving files. Maybe destination files (${mediaDest} or ${subDest} already exist? (${err})`;
	}
	await writeKara(karaPath, karaData);
	return {
		data: karaData,
		file: karaPath
	};
}