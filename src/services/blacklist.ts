import i18n from 'i18next';
import langs from 'langs';

import {	addBlacklistCriteria as addBLC,
	copyBLCSet,
	createBLCSet,
	deleteBlacklistCriteria as deleteBLC,
	deleteSet,
	editBLCSet,
	emptyBlacklistCriterias as emptyBLC,
	generateBlacklist as generateBL,
	getBlacklistContents as getBLContents,
	getBlacklistCriterias as getBLC,
	getCurrentBLCSet,
	selectSet,
	selectSets,
	unsetCurrentSet,
} from '../dao/blacklist';
import {KaraList, KaraParams} from '../lib/types/kara';
import {uuidRegexp} from '../lib/utils/constants';
import logger, { profile } from '../lib/utils/logger';
import {isNumber} from '../lib/utils/validators';
import { emitWS } from '../lib/utils/ws';
import {BLC, BLCSet, BLCSetFile} from '../types/blacklist';
import sentry from '../utils/sentry';
import {getState, setState} from '../utils/state';
import { downloadStatuses } from './download';
import {formatKaraList, getKara} from './kara';
import {getTag, getTags} from './tag';

export async function editSet(params: BLCSet) {
	const blcSet = await selectSet(params.blc_set_id);
	if (!blcSet) throw {code: 404, msg: 'BLC set unknown'};
	if (params.flag_current) await unsetCurrentSet();
	await editBLCSet({...blcSet, ...params});
	if (params.flag_current) await generateBlacklist();
	updatedSetModifiedAt(blcSet.blc_set_id);
	emitWS('BLCSetInfoUpdated', params.blc_set_id);
	emitWS('BLCSetsUpdated');
}

async function updatedSetModifiedAt(id: number) {
	const blcSet = await selectSet(id);
	await editBLCSet({
		name: blcSet.name,
		created_at: blcSet.created_at,
		modified_at: new Date()
	});
}

export async function addSet(params: BLCSet) {
	const id = await createBLCSet({
		name: params.name,
		created_at: new Date(),
		modified_at: new Date()
	});
	if (params.flag_current) {
		await unsetCurrentSet();
		await editBLCSet({name: params.name, blc_set_id: id, flag_current: true});
		await generateBlacklist();
	}
	return id;
}

export async function importSet(file: BLCSetFile) {
	const id = await addSet(file.blcSetInfo);
	await addBlacklistCriteria(file.blcSet, id);
	emitWS('BLCSetsUpdated');
	return id;
}

export async function exportSet(id: number): Promise<BLCSetFile> {
	const blcSet = await selectSet(id);
	if (!blcSet) throw {code: 404, msg: 'BLC set unknown'};
	delete blcSet.flag_current;
	delete blcSet.blc_set_id;
	const blcs = await getBlacklistCriterias(id, null, true);
	const header = {
		description: 'Karaoke Mugen BLC Set File',
		version: 1
	};
	const file = {
		header: header,
		blcSetInfo: blcSet,
		blcSet: blcs
	};
	return file;
}

export async function removeSet(id: number) {
	const blcSet = await selectSet(id);
	if (!blcSet) throw {code: 404, msg: 'BLC set unknown'};
	if (blcSet.flag_current) throw {code: 403, msg: 'Unable to remove a current BLC Set'};
	await deleteSet(id);
	emitWS('BLCSetsUpdated');
}

export async function copySet(from: number, to: number) {
	const blcSet1 = await selectSet(from);
	const blcSet2 = await selectSet(to);
	if (!blcSet1) throw {code: 404, msg: 'Origin BLC set unknown'};
	if (!blcSet2) throw {code: 404, msg: 'Destination BLC set unknown'};
	await copyBLCSet(from, to);
	if (blcSet2.flag_current) await generateBlacklist();
	emitWS('BLCSetInfoUpdated', to);
}

export function getAllSets() {
	return selectSets();
}

export async function getSet(id: number) {
	const set = await selectSet(id);
	if (!set) throw {code: 404};
	return set;
}

export async function getBlacklist(params: KaraParams): Promise<KaraList> {
	profile('getBL');
	const pl = await getBLContents(params);
	const count = pl.length > 0 ? pl[0].count : 0;
	const ret = formatKaraList(pl, params.from, count);
	profile('getBL');
	return ret;
}

export async function getBlacklistCriterias(id: number, lang?: string, noDressingUp?: boolean): Promise<BLC[]> {
	try {
		profile('getBLC');
		const blcs = await getBLC(id);
		if (noDressingUp) return blcs;
		return await translateBlacklistCriterias(blcs, lang);
	} catch(err) {
		sentry.error(err);
		throw err;
	} finally {
		profile('getBLC');
	}
}

export function generateBlacklist() {
	return generateBL();
}

// Create problematic BLC set. Should be called on first run only
export async function createProblematicBLCSet() {
	const tags = await getTags({problematic: true});
	const blcSetID = await addSet({
		name: i18n.t('PROBLEMATIC_SONGS')
	});
	const blcs: BLC[] = [];

	for (const tag of tags.content) {
		blcs.push({
			blc_set_id: blcSetID,
			type: tag.types[0],
			value: tag.tid
		});
	}
	await addBlacklistCriteria(blcs, blcSetID);
}

export async function initBlacklistSystem() {
	profile('initBL');
	await testCurrentBLCSet();
	profile('initBL');
}

/** Create current blacklist set if it doesn't exist */
export async function testCurrentBLCSet() {
	const current_id = await getCurrentBLCSet();
	if (current_id) {
		setState({currentBLCSetID: current_id.blc_set_id});
	} else {
		setState({currentBLCSetID: await createBLCSet({
			name: 'Blacklist 1',
			created_at: new Date(),
			modified_at: new Date(),
			flag_current: true
		})
		});
		logger.debug('Initial current BLC Set created', {service: 'Blacklist'});
	}
}

export async function emptyBlacklistCriterias(id: number) {
	logger.debug('Wiping criterias', {service: 'Blacklist'});
	const blcSet = await selectSet(id);
	if (!blcSet) throw {code: 404, message: 'BLC set unknown'};
	await emptyBLC(id);
	if (blcSet.flag_current) await generateBlacklist();
	updatedSetModifiedAt(id);
	emitWS('blacklistUpdated');
}

export async function deleteBlacklistCriteria(blc_ids: number[], set_id: number) {
	profile('delBLC');
	logger.debug(`Deleting criteria ${blc_ids.join(' ')}`, {service: 'Blacklist'});
	const blcSet = await selectSet(set_id);
	if (!blcSet) throw {code: 404, msg: 'BLC set unknown'};
	const promises: Promise<any>[] = [];
	for (const blc_id of blc_ids) {
		promises.push(deleteBLC(blc_id));
	}
	await Promise.all(promises);
	if (blcSet.flag_current) await generateBlacklist();
	profile('delBLC');
	updatedSetModifiedAt(set_id);
	emitWS('blacklistUpdated');
}

export async function addBlacklistCriteria(BLCs: BLC[], set_id: number) {
	profile('addBLC');
	if (!Array.isArray(BLCs)) throw {code: 400};
	logger.info(`Adding criterias = ${JSON.stringify(BLCs)}`, {service: 'Blacklist'});
	const blcList = BLCs.map(blc => {
		return {
			value: blc.value,
			type: blc.type,
			blc_set_id: set_id || blc.blc_set_id
		};
	});
	try {
		const blcset = await selectSet(set_id);
		const blcs = await getBLC(set_id);
		if (!blcset) throw {code: 404, msg: 'BLC set unknown'};
		// Validation
		// BLC 1002 - 1002: 0
		// BLC 1003 - 1002: 1
		// Placed to true to check for multiples occurrences of the same type
		const timeBLC = [false, false];
		for (const blc of blcList) {
			if (blc.type < 0 || blc.type > 1006 || blc.type === 1000) throw {code: 400, msg: `Incorrect BLC type (${blc.type})`};
			if (blc.type === 1006) {
				if (!downloadStatuses.includes(blc.value)) throw {code: 400, msg: `Blacklist criteria value mismatch : type ${blc.type} must have either of these values : ${downloadStatuses.toString()}`};
			}
			if (blc.type === 1001 || (blc.type >= 1 && blc.type < 1000)) {
				if (!new RegExp(uuidRegexp).test(blc.value)) throw {code: 400, msg: `Blacklist criteria value mismatch : type ${blc.type} must have UUID values`};
			}
			if (blc.type === 1002 || blc.type === 1003) {
				blc.value = +blc.value;
				if (!isNumber(blc.value)) throw {code: 400, msg: `Blacklist criteria type mismatch : type ${blc.type} must have a numeric value!`};
				if (timeBLC[blc.type - 1002]) throw {code: 400, msg: `Blacklist criteria type mismatch : type ${blc.type} can occur only once in a set.`};
				const opposing_blc = blcs.find(dbblc => {
					// Find the BLC type 1003 (shorter than) when we add a 1002 BLC (longer than) and vice versa.
					return dbblc.type === (blc.type === 1002 ? 1003:1002);
				});
				if (opposing_blc) {
					if (blc.type === 1002 && blc.value <= opposing_blc.value) {
						throw {code: 409, msg: { code: 'BLC_LONGER_THAN_CONFLICT' }};
					} else if (blc.type === 1003 && blc.value >= opposing_blc.value) {
						throw {code: 409, msg: { code: 'BLC_SHORTER_THAN_CONFLICT' }};
					}
				}
				const existing_blc = blcs.find(dbblc => dbblc.type === blc.type);
				if (existing_blc) { // Replace the one
					await deleteBLC(existing_blc.blcriteria_id);
				}
				timeBLC[blc.type - 1002] = true;
			}
		}
		await addBLC(blcList);
		if (blcset.flag_current) await generateBlacklist();
		updatedSetModifiedAt(set_id);
		emitWS('blacklistUpdated');
	} catch(err) {
		logger.error('Error adding criteria', {service: 'Blacklist', obj: err});
		if (!err.code || err.code >= 500) sentry.error(err);
		throw err;
	} finally {
		profile('addBLC');
	}
}

async function translateBlacklistCriterias(blcList: BLC[], lang: string): Promise<BLC[]> {
	// If lang is not provided, assume we're using node's system locale
	if (!lang) lang = getState().defaultLocale;
	// Test if lang actually exists in ISO639-1 format
	if (!langs.has('1', lang)) throw `Unknown language : ${lang}`;
	// We need to read the detected locale in ISO639-1
	const langObj = langs.where('1', lang);
	for (const i in blcList) {
		if (blcList[i].type === 1) {
			// We just need to translate the tag name if there is a translation
			if (typeof blcList[i].value !== 'string') throw `BLC value is not a string : ${blcList[i].value}`;
			blcList[i].value_i18n = blcList[i].value;
		}
		if (blcList[i].type >= 1 && blcList[i].type <= 999) {
			// We need to get the tag name and then translate it if needed
			const tag = await getTag(blcList[i].value);
			tag
				? blcList[i].value_i18n = tag.i18n[langObj['2B']]
					? tag.i18n[langObj['2B']]
					: (tag.i18n['eng']
						? tag.i18n['eng']
						: tag.name)
				: blcList[i] = null;
		}
		if (blcList[i].type === 1001) {
			// We have a kara ID, let's get the kara itself and append it to the value
			const kara = await getKara(blcList[i].value, {role: 'admin', username: 'admin'}, lang);
			// If it doesn't exist anymore, remove the entry with null.
			kara
				? blcList[i].value = kara
				: blcList[i] = null;
		}
		// No need to do anything, values have been modified if necessary
	}
	// Filter all nulls
	return blcList.filter(blc => blc !== null);
}
