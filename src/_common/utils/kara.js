/**
 * Outils de manipulation des fichiers kara : lecture, extraction d'infos, etc.
 * Les outils de ce fichier ne s'occupent pas de résoudre les chemins. On suppose donc que les paramètres
 * sont déjà résolus.
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
		songorder: orderInfos[2] ? +orderInfos[2] : 0,
		title: infos[3] || ''
	};
}

export async function getKara(karafile) {

	const karaData = await parseKara(karafile);
	let isKaraModified = false;

	verifyRequiredInfos(karaData);

	if (!karaData.KID) {
		isKaraModified = true;
		karaData.KID = uuidV4();
	}
	timestamp.round = true;
	if (!karaData.dateadded) {
		isKaraModified = true;
		karaData.dateadded = timestamp.now();
	}
	karaData.datemodif = timestamp.now();

	// On duplique karaData car on veut ajouter à l'objet kara des informations qui ne seront pas
	// écrites dans le fichier kara.
	const kara = {...karaData};

	kara.karafile = karafile;

	const karaInfos = karaFilenameInfos(karafile);
	kara.title = karaInfos.title;
	// Attention à ne pas confondre avec le champ 'series' au pluriel, provenant du fichier kara
	// et copié de l'objet 'karaData'.
	kara.serie = karaInfos.serie;
	kara.type = karaInfos.type;
	kara.songorder = karaInfos.songorder;
	kara.langFromFileName = karaInfos.lang;

	kara.lang = trim(kara.lang, '"'); // Nettoyage du champ lang du fichier kara.

	let videoFile;

	try {
		videoFile = await resolveFileInDirs(karaData.videofile, resolvedPathVideos());
	} catch (err) {
		logger.warn('[Kara] Video file not found : ' + karaData.videofile);
		kara.gain = 0;
		kara.size = 0;
		kara.videolength = 0;
		kara.ass = '';
	}

	if (videoFile) {
		const subFile = await findSubFile(videoFile, kara);
		if (subFile) {
			kara.ass = await asyncReadFile(subFile, {encoding: 'utf8'});
			kara.ass_checksum = checksum(kara.ass);
			// TODO Supprimer le fichier temporaire éventuel.
		} else {
			kara.ass = '';
		}
		const videoStats = await asyncStat(videoFile);
		if (videoStats.size !== +karaData.videosize) {
			isKaraModified = true;
			karaData.videosize = videoStats.size;

			const [videogain, videoduration] = await Promise.all([getVideoGain(videoFile), getVideoDuration(videoFile)]);

			karaData.videogain = videogain;
			kara.videogain = videogain;
			karaData.videoduration = videoduration;
			kara.videoduration = videoduration;
		}

	}

	kara.rating = 0;
	kara.viewcount = 0;
	kara.checksum = checksum(stringify(karaData));

	if (isKaraModified) {
		await asyncWriteFile(karafile, stringify(karaData));
	}

	return kara;
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
		throw 'Karaoke sub file file empty!';
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
				// Non bloquant.
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
	// Cas non bloquant de fichier non trouvé.
	return '';
}

function checksum(str, algorithm, encoding) {
	return createHash(algorithm || 'md5')
		.update(str, 'utf8')
		.digest(encoding || 'hex');
}