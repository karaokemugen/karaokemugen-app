import timestamp from 'unix-timestamp';
import uuidV4 from 'uuid/v4';
import {check, initValidators} from '../_common/utils/validators';
import {tagTypes, karaTypes, karaTypesArray, subFileRegexp, uuidRegexp, mediaFileRegexp} from './constants';
import {deleteBackupDirs, backupKaraDirs, extractAllKaraFiles, getAllKaras} from '../_admin/generate_karasdb';
import {getConfig} from '../_common/utils/config';
import logger from 'winston';
import isEmpty from 'lodash.isempty';
const karaDB = require('../_dao/kara');
const tagDB = require('../_dao/tag');
const serieDB = require('../_dao/series');

async function updateSeries(kara) {
	if (isEmpty(kara.series)) return true;
	let lang = 'und';
	if (!isEmpty(kara.lang)) lang = kara.lang.split(',')[0];
	let series = [];
	for (const s of kara.series.split(',')) {		
		series.push(await serieDB.checkOrCreateSerie(s,lang));
	}
	await serieDB.updateKaraSeries(kara.kara_id,series);
}

async function updateTags(kara) {
	// Create an array of tags to add for our kara
	let tags = [];
	if (!isEmpty(kara.singer)) kara.singer.split(',').forEach(t => tags.push({tag: t, type: tagTypes.singer}));
	if (!isEmpty(kara.tags)) kara.tags.split(',').forEach(t => tags.push({tag: t, type: tagTypes.misc}));
	if (!isEmpty(kara.songwriter)) kara.songwriter.split(',').forEach(t => tags.push({tag: t, type: tagTypes.songwriter}));
	if (!isEmpty(kara.creator)) kara.creator.split(',').forEach(t => tags.push({tag: t, type: tagTypes.creator}));
	if (!isEmpty(kara.author)) kara.author.split(',').forEach(t => tags.push({tag: t, type: tagTypes.author}));
	if (!isEmpty(kara.lang)) kara.lang.split(',').forEach(t => tags.push({tag: t, type: tagTypes.lang}));
	
	//Songtype is a little specific.
	tags.push({tag: karaTypes[kara.type].dbType, type: tagTypes.songtype});

	if (tags.length === 0) return true;
	for (const i in tags) {
		tags[i].id = await tagDB.checkOrCreateTag(tags[i]);		
	}
	return await tagDB.updateKaraTags(kara.kara_id, tags);	
}

export async function createKaraInDB(kara) {
	kara.kara_id = await karaDB.addKara(kara);	
	await Promise.all([
		updateTags(kara),
		updateSeries(kara)
	]);
}

export async function editKaraInDB(kara) {
	await karaDB.updateKara(kara);
	await Promise.all([
		updateTags(kara),
		updateSeries(kara)
	]);
}

/**
 * Generate info to write in a .kara file from an object passed as argument by filtering out unnecessary fields and adding default values if needed.
 */
export function getKara(karaData) {
	timestamp.round = true;
	return {
		mediafile: karaData.mediafile || '',
		subfile: karaData.subfile || 'dummy.ass',
		subchecksum: karaData.subchecksum || '',
		title: karaData.title || '',
		series: karaData.series || '',
		type: karaData.type || '',
		order: karaData.order || '',
		year: karaData.year || '',
		singer: karaData.singer || '',
		tags: karaData.tags || '',
		songwriter: karaData.songwriter || '',
		creator: karaData.creator || '',
		author: karaData.author || '',
		lang: karaData.lang || 'und',
		KID: karaData.KID || uuidV4(),
		dateadded: karaData.dateadded || timestamp.now(),
		datemodif: karaData.datemodif || timestamp.now(),
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
	mediasize: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	mediagain: {numericality: true},
	mediaduration: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	version: {numericality: {onlyInteger: true, equality: 3}}
};

const karaConstraintsV2 = {
	videofile: {
		presence: {allowEmpty: false},
		format: mediaFileRegexp
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
	version: {numericality: {onlyInteger: true, lowerThanOrEqualTo: 2}}
};


export async function validateKaras() {
	try {
		const conf = getConfig();
		await backupKaraDirs(conf);
		const karaFiles = await extractAllKaraFiles();
		const karas = await getAllKaras(karaFiles);		 
		verifyKIDsUnique(karas);
		await deleteBackupDirs(conf);		
		if (karas.some((kara) => {
			return kara.error;
		})) throw 'One kara failed validation process';
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
	switch (karaData.version) {
	case 0:
	case 1:
	case 2:
		return check(karaData, karaConstraintsV2);			
	default:
	case 3:
		return check(karaData, karaConstraintsV3);
	}		
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

export async function getKaraHistory() {
	return await karaDB.getKaraHistory();
}

export async function getTop50(token, lang) {
	let karas = await karaDB.getAllKaras(token.username, null, lang);
	karas = karas.filter(kara => kara.requested > 0);
	karas.sort((a,b) => {
		if (a.requested < b.requested) return -1;
		if (a.requested > b.requested) return 1;
		return 0;
	});	
	return karas;
}

export async function getKaraViewcounts() {
	return await karaDB.getKaraViewcounts();
}