import {emptyBlacklistCriterias as emptyBLC,
	isBLCriteria as isBLC,
	editBlacklistCriteria as editBLC,
	deleteBlacklistCriteria as deleteBLC,
	generateBlacklist as generateBL,
	addBlacklistCriteria as addBLC,
	getBlacklistContents as getBLContents,
	getBlacklistCriterias as getBLC,
} from '../_dao/blacklist';
import {getTag} from '../_dao/tag';
import {getKara} from '../_dao/kara';
import {translateKaraInfo} from './kara';
import logger from 'winston';
import langs from 'langs';
import {getConfig} from '../_utils/config';
import {resolve} from 'path';
import {profile} from '../_utils/logger';
import {formatKaraList} from './kara';

export async function getBlacklist(filter, lang, from, size) {
	try {
		profile('getBL');
		const pl = await getBLContents(filter, lang);
		const ret = formatKaraList(pl.slice(from, from + size), lang, from, pl.length);
		profile('getBL');
		return ret;
	} catch(err) {
		throw err;
	}
}

export async function getBlacklistCriterias(lang) {
	profile('getBLC');
	const blcs = await getBLC();
	console.log(blcs);
	const ret = await translateBlacklistCriterias(blcs, lang);
	profile('getBLC');
	return ret;
}

export async function generateBlacklist() {
	return await generateBL();
}

async function isBLCriteria(blc_id) {
	return await isBLC(blc_id);
}

export async function emptyBlacklistCriterias() {
	logger.info('[Blacklist] Wiping criterias');
	await emptyBLC();
	return await generateBlacklist();
}

export async function editBlacklistCriteria(blc_id, blctype, blcvalue) {
	if (!await isBLCriteria(blc_id)) throw `BLC ID ${blc_id} unknown`;
	profile('editBLC');
	logger.info(`[Blacklist] Editing criteria ${blc_id} : ${blctype} = ${blcvalue}`);
	if (blctype < 0 && blctype > 1004) throw `Blacklist criteria type error : ${blctype} is incorrect`;
	if (((blctype >= 1001 && blctype <= 1003) || (blctype > 0 && blctype < 999)) && (isNaN(blcvalue))) throw `Blacklist criteria type mismatch : type ${blctype} must have a numeric value!`;
	await editBLC({
		id: blc_id,
		type: blctype,
		value: blcvalue
	});
	await generateBlacklist();
	profile('editBLC');
}

async function BLCgetTagName(blcList) {
	for (const index in blcList) {
		const res = await getTag(blcList[index].blcvalue);
		if (res) blcList[index].blcuniquevalue = res.name;
	}
	return blcList;
}

async function BLCGetKID(blcList) {
	for (const index in blcList) {
		const res = await getKara(blcList[index].blcvalue);
		if (res) blcList[index].blcuniquevalue = res.kid;
	}
	return blcList;
}

export async function deleteBlacklistCriteria(blc_id) {
	profile('delBLC');
	logger.info(`[Blacklist] Deleting criteria ${blc_id}`);
	if (!await isBLCriteria(blc_id)) throw `BLC ID ${blc_id} unknown`;
	await deleteBLC(blc_id);
	await generateBlacklist();
	profile('delBLC');
}

export async function addBlacklistCriteria(blctype, blcvalue) {
	profile('addBLC');
	let blcvalues;
	typeof blcvalue === 'string' ? blcvalues = blcvalue.split(',') : blcvalues = [blcvalue];
	logger.info(`[Blacklist] Adding criteria ${blctype} = ${blcvalues}`);
	let blcList = [];
	blcvalues.forEach(function(blcvalue){
		blcList.push({
			blcvalue: blcvalue,
			blctype: parseInt(blctype, 10)
		});
	});
	try {
		if (+blctype < 0 && +blctype > 1004) throw `Incorrect BLC type (${blctype})`;
		if (+blctype > 0 && +blctype < 1000) blcList = await BLCgetTagName(blcList);
		if (+blctype === 1001) blcList = await BLCGetKID(blcList);
		if (((+blctype >= 1001 && +blctype <= 1003) || (+blctype > 0 && +blctype < 999)) && blcvalues.some(isNaN)) throw `Blacklist criteria type mismatch : type ${blctype} must have a numeric value!`;
		await addBLC(blcList);
		return await generateBlacklist();
	} catch(err) {
		throw err;
	} finally {
		profile('addBLC');
	}
}

async function translateBlacklistCriterias(blcs, lang) {
	const blcList = blcs;
	// If lang is not provided, assume we're using node's system locale
	if (!lang) lang = getConfig().EngineDefaultLocale;
	// Test if lang actually exists in ISO639-1 format
	if (!langs.has('1',lang)) throw `Unknown language : ${lang}`;
	// Instanciate a translation object for our needs with the correct language.
	const i18n = require('i18n'); // Needed for its own translation instance
	i18n.configure({
		directory: resolve(__dirname,'../_locales'),
	});
	i18n.setLocale(lang);
	// We need to read the detected locale in ISO639-1
	console.log(blcList);
	try{


	for (const i in blcList) {
		if (blcList[i].type === 1) {
			// We just need to translate the tag name if there is a translation
			if (typeof blcList[i].value !== 'string') throw `BLC value is not a string : ${blcList[i].value}`;
			if (blcList[i].value.startsWith('TAG_')) {
				blcList[i].value_i18n = i18n.__(blcList[i].value);
			} else {
				blcList[i].value_i18n = blcList[i].value;
			}
		}
		if (blcList[i].type >= 2 && blcList[i].type <= 999) {
			// We need to get the tag name and then translate it if needed
			const tag = await getTag(blcList[i].value);
			if (typeof tag.name !== 'string') throw 'Tag name is not a string : '+JSON.stringify(tag);
			if (tag.name.startsWith('TAG_')) {
				blcList[i].value_i18n = i18n.__(tag.name);
			} else {
				blcList[i].value_i18n = tag.name;
			}
		}
		if (blcList[i].type === 1001) {
			// We have a kara ID, let's get the kara itself and append it to the value
			const kara = await getKara(blcList[i].value, true);
			console.log(kara);
			blcList[i].value = translateKaraInfo(kara, lang);
		}
		// No need to do anything, values have been modified if necessary
	}
	return blcList;
	}catch(err) {
		console.log(err);
		throw err;
	}
}