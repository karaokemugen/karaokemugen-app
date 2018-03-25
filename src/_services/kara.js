import timestamp from 'unix-timestamp';
import uuidV4 from 'uuid/v4';
import validate from 'validate.js';
import {has as hasLang} from 'langs';
import {karaTypes, karaTypesArray, subFileRegexp, uuidRegexp, videoFileRegexp} from './constants';
import {deleteBackupDirs, backupKaraDirs, extractAllKaraFiles, getAllKaras} from '../_admin/generate_karasdb';
import {getConfig} from '../_common/utils/config';
import logger from 'winston';
/**
 * Génère les informations à écrire dans un fichier kara, à partir d'un objet passé en paramètre, en filtrant les
 * champs non concernés, et en ajoutant les valeurs par défaut au besoin.
 */
export function getKara(karaData) {
	timestamp.round = true;

	return {
		videofile: karaData.videofile || '',
		subfile: karaData.subfile || 'dummy.ass',
	//	subchecksum: karaData.subchecksum || '',
	//	karachecksum: karaData.karachecksum || '',
		title: karaData.title || '',
		series: karaData.series || '',
		type: karaData.type || '',
		order: karaData.order || 0,
		year: karaData.year || '',
		singer: karaData.singer || '',
		tags: karaData.tags || '',
		songwriter: karaData.songwriter || '',
		creator: karaData.creator || '',
		author: karaData.author || '',
		lang: karaData.lang || '',
		KID: karaData.KID || uuidV4(),
		dateadded: karaData.dateadded || timestamp.now(),
		datemodif: karaData.datemodif || timestamp.now(),
		videosize: karaData.videosize || 0,
		videogain: karaData.videogain || 0,
		videoduration: karaData.videoduration || 0,
		version: karaData.version || 2
	};
}

function initValidators() {
	if (!validate.validators.langValidator) {
		validate.validators.langValidator = langValidator;
	}
	if (!validate.validators.integerValidator) {
		validate.validators.integerValidator = integerValidator;
	}
}

function langValidator(value) {
	const langs = value.replace('"', '').split(',');
	let result = null;
	for (const lang of langs) {		
		if (!(lang === 'und' || lang === 'mul' || hasLang('2B', lang))) {
			result = `Lang '${lang}' is invalid`;
			break;
		}
	}
	return result;
}

function integerValidator(value) {
	let result = null;	
	if (value !== 'und' && value < 0) {
		result = ` '${value}' is invalid`;
	}
	return result;
}

const karaConstraints = {
	videofile: {
		presence: {allowEmpty: false},
		format: videoFileRegexp
	},
	subfile: {
		presence: {allowEmpty: false},
		format: subFileRegexp
	},
	title: {presence: {allowEmpty: true}},
	type: {presence: true, inclusion: karaTypesArray},
	series: function(value, attributes) {
		if (!serieRequired(attributes['type'])) {
			return { presence: {allowEmpty: true} };
		} else {
			return { presence: {allowEmpty: false} };
		}
	},
	lang: {langValidator: true},
	order: {integerValidator: true},
	year: {integerValidator: true},
	KID: {presence: true, format: uuidRegexp},
	dateadded: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	datemodif: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	videosize: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	videogain: {numericality: true},
	videoduration: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	version: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}}
};

export async function validateKaras() {
	try {
		const conf = getConfig();
		await backupKaraDirs(conf);
		const karaFiles = await extractAllKaraFiles();
		const karas = await getAllKaras(karaFiles);
		verifyKIDsUnique(karas);
		await deleteBackupDirs(conf);		
	} catch(err) {
		throw err;
	}
}

function verifyKIDsUnique(karas) {
	const KIDs = [];
	karas.forEach((kara) => {
		if (!KIDs.includes(kara.KID)) {
			KIDs.push(kara.KID);
		} else {
			logger.error(`[Kara] KID ${kara.KID} is not unique : duplicate found in karaoke ${kara.lang} - ${kara.series} - ${kara.type}${kara.order} - ${kara.title}`);
			throw `Duplicate KID found : ${kara.KID}`;
		}		
	});	
}

export function karaDataValidationErrors(karaData) {
	initValidators();
	return validate(karaData, karaConstraints);
}

export function verifyKaraData(karaData) {
	const validationErrors = karaDataValidationErrors(karaData);
	if (validationErrors) {
		throw `Karaoke data is not valid: ${JSON.stringify(validationErrors)}`;
	}
}

/** Only MV or LIVE types don't have to have a series filled. */
export function serieRequired(karaType) {	
	return karaType !== karaTypes.MV && karaType !== karaTypes.LIVE;
}
