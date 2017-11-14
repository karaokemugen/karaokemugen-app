import timestamp from 'unix-timestamp';
import uuidV4 from 'uuid/v4';
import validate from 'validate.js';
import {has as hasLang} from 'langs';
import {karaTypes, karaTypesArray} from './constants';

/** Expressions régulières de validation. */
export const uuidRegexp = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
export const videoFileRegexp = '^.+\\.(avi|mkv|mp4|webm|mov|wmv|mpg)$';
export const subFileRegexp = '^.+\\.ass$';


/**
 * Génère les informations à écrire dans un fichier kara, à partir d'un objet passé en paramètre, en filtrant les
 * champs non concernés, et en ajoutant les valeurs par défaut au besoin.
 */
export function getKara(karaData) {
	timestamp.round = true;

	return {
		videofile: karaData.videofile || '',
		subfile: karaData.subfile || 'dummy.ass',
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
		version: karaData.version || 1
	};
}

function initValidators() {
	if (!validate.validators.langValidator) {
		validate.validators.langValidator = langValidator;
	}
}

function langValidator(value) {
	const langs = value.replace('"', '').split(',');
	let result = null;
	for (const lang of langs) {
		if (!(lang === 'und' || hasLang('2B', value))) {
			result = `Lang '${lang}' is invalid`;
			break;
		}
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
	title: {presence: {allowEmpty: false}},
	type: {presence: true, inclusion: karaTypesArray},
	series: function(value, attributes) {
		if (!serieRequired(attributes['type'])) {
			return { presence: {allowEmpty: false} };
		}
	},
	lang: {langValidator: true},
	order: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	year: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	KID: {presence: true, format: uuidRegexp},
	dateadded: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	datemodif: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	videosize: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	videogain: {numericality: true},
	videoduration: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	version: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}}
};

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

/** Mutualisation du code gérant l'obligation d'avoir une série associée au kara. */
export function serieRequired(karaType) {
	return karaType !== karaTypes.MV && karaType !== karaTypes.LIVE;
}
