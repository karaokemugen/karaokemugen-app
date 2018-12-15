/**
 * .kara files generation
 */

import logger from 'winston';
import {basename, extname, resolve} from 'path';
import {resolvedPathImport, resolvedPathTemp, resolvedPathKaras, resolvedPathSubs, resolvedPathMedias, getConfig} from '../_common/utils/config';
import {sanitizeFile, asyncReadFile, asyncCopy, asyncUnlink, asyncExists, asyncMove, asyncReadDir, filterMedias, replaceExt, asyncWriteFile} from '../_common/utils/files';
import {
	extractAssInfos, extractVideoSubtitles, extractMediaTechInfos, karaFilenameInfos, writeKara
} from '../_dao/karafile';
import {getType} from '../_services/constants';
import {createKaraInDB, editKaraInDB, formatKara} from '../_services/kara';
import {check} from '../_common/utils/validators';
import {getOrAddSerieID} from '../_services/series';
import timestamp from 'unix-timestamp';
import { compareKarasChecksum } from './generate_karasdb';
import { getAllKaras } from '../_dao/kara';
import ini from 'ini';

export async function editKara(kara_id,kara,opts = {compareChecksum: true}) {
	let newKara;
	let kara_orig = {...kara};
	try {
		const mediaFile = resolve(resolvedPathMedias()[0],kara.mediafile);
		let subFile;
		kara.subfile && kara.subfile !== 'dummy.ass' ? subFile = resolve(resolvedPathSubs()[0],kara.subfile) : subFile = kara.subfile;
		const karaFile = resolve(resolvedPathKaras()[0],kara.karafile);
		// Removing useless data
		delete kara.kara_id;
		delete kara.karafile;
		// Copying already present files in temp directory to be worked on with by generateKara
		if (!kara.mediafile_orig) {
			kara.overwrite = true;
			kara.mediafile_orig = kara.mediafile;
			if (!await asyncExists(mediaFile)) throw `Mediafile ${mediaFile} does not exist! Check your base files or upload a new media`;
			await asyncCopy(mediaFile, resolve(resolvedPathTemp(),kara.mediafile), {overwrite: true});
		}
		if (!kara.subfile_orig) {
			kara.overwrite = true;
			kara.subfile_orig = kara.subfile;
			if (kara.subfile !== 'dummy.ass') {
				if (!await asyncExists(subFile)) throw `Subfile ${subFile} does not exist! Check your base files or upload a new subfile`;
				await asyncCopy(subFile, resolve(resolvedPathTemp(),kara.subfile), {overwrite: true});
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
	newKara.data.kara_id = kara_orig.kara_id;
	newKara.data.karafile = basename(newKara.file);
	try {
		await editKaraInDB(newKara.data);
		compareKarasChecksum({silent: true});
	} catch(err) {
		const errMsg = `${newKara.data.karafile} file generation is OK, but unable to edit karaoke in live database. Please regenerate database entirely if you wish to see your modifications : ${err}`;
		logger.warn(`[KaraGen] ${errMsg}`);
		throw errMsg;
	}
	if (opts.compareChecksum) compareKarasChecksum({silent: true});
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
	compareKarasChecksum({silent: true});
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
		singer = string (elements separated by ,) (see results from GET /api/v1/tags, type is 2)
		songwriter = string (elements separated by ,) (see results from GET /api/v1/tags, type is 8)
		tags = string (elements separated by ,) (see tags from constants)
		creator = string (elements separated by ,) (see results from GET /api/v1/tags, type is 4)
		author = string (elements separated by ,) (see results from GET /api/v1/tags, type is 6)
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
		series: {presence: true},
		title: {presence: true}
	});
	// Move files from temp directory to import, depending on the different cases.
	const newMediaFile = `${kara.mediafile}${extname(kara.mediafile_orig)}`;
	let newSubFile;
	if (kara.subfile && kara.subfile !== 'dummy.ass' && kara.subfile_orig) newSubFile = `${kara.subfile}${extname(kara.subfile_orig)}`;
	if (kara.subfile === 'dummy.ass') newSubFile = kara.subfile;
	delete kara.subfile_orig;
	delete kara.mediafile_orig;
	await asyncMove(resolve(resolvedPathTemp(),kara.mediafile),resolve(resolvedPathImport(),newMediaFile), { overwrite: true });
	if (kara.subfile && kara.subfile !== 'dummy.ass') await asyncMove(resolve(resolvedPathTemp(),kara.subfile),resolve(resolvedPathImport(),newSubFile), { overwrite: true });

	let newKara;
	try {
		if (validationErrors) throw JSON.stringify(validationErrors);
		timestamp.round = true;
		if (!kara.dateadded) kara.dateadded = timestamp.now();
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
		newKara = await importKara(newMediaFile, newSubFile, kara);
		compareKarasChecksum({silent: true});
		return newKara;
	} catch(err) {
		logger.error(`[Karagen] Error during generation : ${err}`);
		if (await asyncExists(newMediaFile)) await asyncUnlink(newMediaFile);
		if (newSubFile) if (await asyncExists(newSubFile)) await asyncUnlink(newSubFile);
		throw err;
	}
}

/**
 * Generating kara files in batch mode. The import folder is scanned for video files
 * which respect the KM naming convention. If such a file is found, the associated
 * karaoke file is created, and subtitle files are moved to their own directories.
 */

export async function karaGenerationBatch() {
	const importFiles = await asyncReadDir(resolvedPathImport());
	const importPromises = filterMedias(importFiles).map(mediaFile => importKara(mediaFile));
	try {
		await Promise.all(importPromises);
	} catch(err) {
		throw err;
	}
}

function defineFilename(data) {
	if (data) {
		const extraTags = [];
		if (data.tags.includes('TAG_PS3')) extraTags.push('PS3');
		if (data.tags.includes('TAG_PS2')) extraTags.push('PS2');
		if (data.tags.includes('TAG_PSX')) extraTags.push('PSX');
		if (data.tags.includes('TAG_SPECIAL')) extraTags.push('SPECIAL');
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
		if (data.tags.includes('TAG_SWITCH')) extraTags.push('SWITCH');
		if (data.tags.includes('TAG_VIDEOGAME')) extraTags.push('GAME');
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
	subFile === 'dummy.ass' ? karaSubFile = subFile : karaSubFile = `${kara}${extname(subFile || '.ass')}`;
	let karaData = formatKara({ ...data,
		mediafile: `${kara}${extname(mediaFile)}`,
		subfile: karaSubFile
	});
	karaData.overwrite = data.overwrite;
	if (!data) karaData = {mediafile: mediaFile, ...karaDataInfosFromFilename(mediaFile)};

	const mediaPath = resolve(resolvedPathImport(), mediaFile);
	let subPath;
	if (subFile !== 'dummy.ass') subPath = await findSubFile(mediaPath, karaData, subFile);
	try {
		if (subPath !== 'dummy.ass') await extractAssInfos(subPath, karaData);
		await extractMediaTechInfos(mediaPath, karaData);
		await processSeries(data);
		return await generateAndMoveFiles(mediaPath, subPath, karaData);
	} catch(err) {
		const error = `Error importing ${kara} : ${err}`;
		logger.error(`[KaraGen] ${error}`);
		throw error;
	}
}

async function processSeries(kara) {
	for (const serie of kara.series) {
		const serieObj = {
			name: serie,
			i18n: {}
		};
		serieObj.i18n[kara.lang[0]] = serie;
		await getOrAddSerieID(serieObj);
	}
}

function karaDataInfosFromFilename(mediaFile) {
	try {
		const filenameInfos = karaFilenameInfos(mediaFile);
		const common = {
			title: filenameInfos.title,
			type: getType(filenameInfos.type),
			order: filenameInfos.order,
			lang: filenameInfos.lang
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

async function findSubFile(mediaPath, karaData, subFile) {
	// Replacing file extension by .ass in the same directory
	let assFile = replaceExt(mediaPath, '.ass');
	if (subFile) assFile = resolve(resolvedPathImport(), subFile);
	if (await asyncExists(assFile) && subFile !== 'dummy.ass') {
		// If a subfile is found, adding it to karaData
		karaData.subfile = replaceExt(karaData.mediafile, '.ass');
		return assFile;
	} else if (mediaPath.endsWith('.mkv')) {
		try {
			const extractFile = await extractVideoSubtitles(mediaPath, karaData.KID);
			karaData.subfile = replaceExt(karaData.mediafile, '.ass');
			return extractFile;
		} catch (err) {
			// Non-blocking.
			logger.info('[KaraGen] Could not extract subtitles from video file ' + mediaPath + ' : ' + err);
		}
	} else {
		return 'dummy.ass';
	}
}

export async function renameAllKaras() {
	const karas = await getAllKaras('admin');
	let karasRenames = [];
	let lyricsRenames = [];
	const conf = getConfig();
	try {
		for (const kara of karas) {
			logger.info(`[KaraRename] Processing ${kara.karafile}`);
			let k = {};
			k.lang = kara.language.split(',');
			k.lang.forEach((e,i) => k.lang[i] = e.trim());
			kara.misc === 'NO_TAG' || !kara.misc ? k.tags = [] : k.tags = kara.misc.split(',');
			k.tags.forEach((e,i) => k.tags[i] = e.trim());
			if (kara.serie_orig) {
				k.series = kara.serie_orig.split(',');
				k.series.forEach((e,i) => k.series[i] = e.trim());
			} else {
				k.series = [];
			}
			k.order = kara.songorder;
			k.type = kara.songtype.replace(/TYPE_/,'');
			kara.singer === 'NO_TAG' || !kara.singer ? k.singer = [] : k.singer = kara.singer.split(',');
			k.singer.forEach((e,i) => k.singer[i] = e.trim());
			k.title = kara.title;
			if (`${defineFilename(k)}.kara` !== kara.karafile) {
				logger.info(`[KaraRename] Renaming to ${defineFilename(k)}`);
				let karaText = await asyncReadFile(resolve(conf.appPath, conf.PathKaras,kara.karafile),'utf-8');
				karaText = karaText.replace(/\r/g, '');
				let karaData = ini.parse(karaText);
				karasRenames.push(`git mv "karas/${kara.karafile}" "karas/${defineFilename(k)}.kara"`);
				karaData.mediafile = `${defineFilename(k)}${extname(karaData.mediafile)}`;
				if (karaData.subfile !== 'dummy.ass') {
					karaData.subfile = `${defineFilename(k)}.ass`;
					lyricsRenames.push(`git mv "lyrics/${kara.subfile}" "lyrics/${karaData.subfile}"`);
				}
				try {
					asyncMove(
						resolve(conf.appPath,conf.PathMedias,kara.mediafile),
						resolve(conf.appPath,conf.PathMedias,`${defineFilename(k)}${extname(kara.mediafile)}`)
					);
				} catch(err) {
					logger.warn(`[KaraRename] Unable to rename video : ${err}`);
				}

				asyncWriteFile(resolve(conf.appPath,conf.PathKaras,kara.karafile),ini.stringify(karaData),'utf-8');

			} else {
				logger.info('[KaraRename] Kara already named correctly, skipping.');
			}
		}
	} catch(err) {
		logger.error(`[KaraRename] Process aborted : ${err}`);
	}
	asyncWriteFile('gitkaras.sh',karasRenames.join('\r\n'),'utf-8');
	asyncWriteFile('gitlyrics.sh',lyricsRenames.join('\r\n'),'utf-8');
	logger.info('[KaraRename] Renaming complete. Please update your karaoke base from Shelter now');
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
		await asyncMove(mediaPath, mediaDest, { overwrite: karaData.overwrite });
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