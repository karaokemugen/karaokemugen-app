import {emptyBlacklistCriterias as emptyBLC,
	isBLCriteria as isBLC,
	editBlacklistCriteria as editBLC,
	deleteBlacklistCriteria as deleteBLC,
	generateBlacklist as generateBL,
	addBlacklistCriteria as addBLC,
	getBlacklistContents as getBLContents,
	getBlacklistCriterias as getBLC,
} from '../dao/blacklist';
import {getTag} from '../dao/tag';
import {getKara} from '../dao/kara';
import {translateKaraInfo} from './kara';
import langs from 'langs';
import {getState} from '../utils/state';
import {resolve} from 'path';
import logger from '../lib/utils/logger';
import {profile} from '../lib/utils/logger';
import {formatKaraList} from './kara';
import {uuidRegexp} from '../lib/utils/constants';
import {KaraList} from '../types/kara';
import {KaraParams} from '../lib/types/kara';
import {BLC} from '../types/blacklist';
import {isNumber} from '../lib/utils/validators';

export async function getBlacklist(params: KaraParams): Promise<KaraList> {
	profile('getBL');
	const pl = await getBLContents(params);
	const ret = formatKaraList(pl.slice(params.from, params.from + params.size), params.lang, params.from, pl.length);
	profile('getBL');
	return ret;
}

export async function getBlacklistCriterias(lang?: string): Promise<BLC[]> {
	try {
		profile('getBLC');
		const blcs = await getBLC();
		return await translateBlacklistCriterias(blcs, lang);
	} catch(err) {
		throw err;
	} finally {
		profile('getBLC');
	}
}

export async function generateBlacklist() {
	return await generateBL();
}

async function isBLCriteria(blc_id: number): Promise<boolean> {
	return await isBLC(blc_id);
}

export async function emptyBlacklistCriterias() {
	logger.info('[Blacklist] Wiping criterias');
	await emptyBLC();
	return await generateBlacklist();
}

export async function editBlacklistCriteria(blc: BLC) {
	if (!await isBLCriteria(blc.id)) throw `BLC ID ${blc.id} unknown`;
	profile('editBLC');
	logger.info(`[Blacklist] Editing criteria ${blc.id} : ${blc.type} = ${blc.value}`);
	if (blc.type < 0 && blc.type > 1004) throw `Blacklist criteria type error : ${blc.type} is incorrect`;
	if (blc.type === 1001) {
		if (!new RegExp(uuidRegexp).test(blc.value)) throw `Blacklist criteria value mismatch : type ${blc.type} must have UUID values`;
	}
	if (((blc.type > 1001 && blc.type <= 1003) || (blc.type > 0 && blc.type < 999)) && (isNaN(blc.value))) throw `Blacklist criteria type mismatch : type ${blc.type} must have a numeric value!`;
	await editBLC(blc);
	await generateBlacklist();
	profile('editBLC');
}

async function BLCgetTagName(blcList: BLC[]): Promise<BLC[]> {
	for (const index in blcList) {
		const res = await getTag(blcList[index].value);
		if (res) blcList[index].uniquevalue = res.name;
	}
	return blcList;
}

export async function deleteBlacklistCriteria(blc_id: number) {
	profile('delBLC');
	logger.info(`[Blacklist] Deleting criteria ${blc_id}`);
	if (!await isBLCriteria(blc_id)) throw `BLC ID ${blc_id} unknown`;
	await deleteBLC(blc_id);
	await generateBlacklist();
	profile('delBLC');
}

export async function addBlacklistCriteria(type: number, value: any) {
	profile('addBLC');
	let blcvalues: string[];
	typeof value === 'string'
		? blcvalues = value.split(',')
		: blcvalues = [value];
	logger.info(`[Blacklist] Adding criteria ${type} = ${blcvalues}`);
	let blcList = blcvalues.map((e: any) => {
		return {
			value: e,
			type: type
		};
	});
	try {
		if (type < 0 && type > 1004) throw `Incorrect BLC type (${type})`;
		if (type > 0 && type < 1000) blcList = await BLCgetTagName(blcList);
		if (type === 1001) {
			if (blcList.some((blc: BLC) => !new RegExp(uuidRegexp).test(blc.value))) throw `Blacklist criteria value mismatch : type ${type} must have UUID values`;
		}
		if (((type > 1001 && type <= 1003) || (type > 0 && type < 999)) && blcvalues.some(isNumber)) throw `Blacklist criteria type mismatch : type ${type} must have a numeric value!`;
		await addBLC(blcList);
		return await generateBlacklist();
	} catch(err) {
		throw err;
	} finally {
		profile('addBLC');
	}
}

async function translateBlacklistCriterias(blcList: BLC[], lang: string): Promise<BLC[]> {
	// If lang is not provided, assume we're using node's system locale
	if (!lang) lang = getState().EngineDefaultLocale;
	// Test if lang actually exists in ISO639-1 format
	if (!langs.has('1',lang)) throw `Unknown language : ${lang}`;
	// Instanciate a translation object for our needs with the correct language.
	const i18n = require('i18n'); // Needed for its own translation instance
	i18n.configure({
		directory: resolve(__dirname,'../locales'),
	});
	i18n.setLocale(lang);
	// We need to read the detected locale in ISO639-1
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
			if (tag.name.startsWith('TAG_')) {
				blcList[i].value_i18n = i18n.__(tag.name);
			} else {
				blcList[i].value_i18n = tag.name;
			}
		}
		if (blcList[i].type === 1001) {
			// We have a kara ID, let's get the kara itself and append it to the value
			const kara = await getKara(blcList[i].value, 'admin', lang, 'admin');
			blcList[i].value = translateKaraInfo(kara, lang);
		}
		// No need to do anything, values have been modified if necessary
	}
	return blcList;
}