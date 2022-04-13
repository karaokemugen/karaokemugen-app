import i18next from 'i18next';
import langs from 'langs';
import { intersectionWith, isEqual } from 'lodash';

import {
	deleteCriteria,
	insertCriteria,
	insertPlaylist,
	selectCriterias,
	selectKarasFromCriterias,
	truncateCriterias,
	updatePlaylistLastEditTime,
} from '../dao/playlist';
import { Criteria } from '../lib/types/playlist';
import { uuidRegexp } from '../lib/utils/constants';
import logger, { profile } from '../lib/utils/logger';
import { isNumber } from '../lib/utils/validators';
import { emitWS } from '../lib/utils/ws';
import { adminToken } from '../utils/constants';
import Sentry from '../utils/sentry';
import { getState, setState } from '../utils/state';
import { downloadStatuses } from './download';
import { getKara } from './kara';
import {
	addKaraToPlaylist,
	editPLC,
	getPlaylistContentsMini,
	getPlaylistInfo,
	getPlaylists,
	removeKaraFromPlaylist,
} from './playlist';
import { getTag, getTags } from './tag';

const service = 'SmartPlaylist';

export async function getCriterias(plaid: string, lang?: string, translate = true): Promise<Criteria[]> {
	try {
		profile('getCriterias');
		const c = await selectCriterias(plaid);
		if (!translate) return c;
		return await translateCriterias(c, lang);
	} catch (err) {
		Sentry.error(err);
		throw err;
	} finally {
		profile('getCriterias');
	}
}

export async function emptyCriterias(plaid: string) {
	profile('emptyCriterias');
	logger.debug('Wiping criterias', { service });
	const pl = await getPlaylistInfo(plaid);
	if (!pl) throw { code: 404, message: 'Playlist unknown' };
	await truncateCriterias(plaid);
	if (pl.flag_smart) {
		await updateSmartPlaylist(plaid);
		const isBlacklist = plaid === getState().blacklistPlaid;
		const isWhitelist = plaid === getState().whitelistPlaid;
		if (isBlacklist || isWhitelist) {
			updateAllSmartPlaylists(isBlacklist, isWhitelist);
		}
	}
	profile('emptyCriterias');
}

export async function updateAllSmartPlaylists(skipBlacklist = false, skipWhitelist = false) {
	profile('updateAllSmartPlaylists');
	logger.info('Updating all smart playlists...', { service });
	const pls = await getPlaylists(adminToken);
	const updatePromises = [];
	// We need to update the whitelist first if it's smart, then the blacklist, then all others.
	const wl = pls.find(p => p.flag_whitelist && p.flag_smart);
	if (wl && !skipWhitelist) await updateSmartPlaylist(wl.plaid);
	const bl = pls.find(p => p.flag_blacklist && p.flag_smart);
	if (bl && !skipBlacklist) await updateSmartPlaylist(bl.plaid);
	for (const pl of pls.filter(p => p.flag_smart && !p.flag_whitelist && !p.flag_blacklist)) {
		updatePromises.push(updateSmartPlaylist(pl.plaid));
	}
	await Promise.all(updatePromises);
	profile('updateAllSmartPlaylists');
}

export async function updateSmartPlaylist(plaid: string) {
	profile(`updateSmartPlaylist-${plaid}`);
	const pl = await getPlaylistInfo(plaid);
	if (!pl.flag_smart) {
		// Playlist is not smart! We're not throwing, simply returning.
		logger.info(`Playlist "${pl.name}" is not a smart one, skipping update`);
		return;
	}

	logger.info(`Updating smart playlist "${pl.name}"...`, { service });
	const [plc, list] = await Promise.all([
		getPlaylistContentsMini(plaid),
		selectKarasFromCriterias(plaid, pl.type_smart),
	]);

	// First we need to trim our list if a limit is in place
	if (pl.flag_smartlimit) {
		// First, sort by newest or oldest
		list.sort((a, b) => (a.created_at > b.created_at ? 1 : b.created_at > a.created_at ? -1 : 0));
		if (pl.smart_limit_order === 'newest') list.reverse();
		// Now let's trim that list!
		const trimmedListInfo = {
			songs: list.length,
			duration: list.reduce((a, b) => a + b.duration, 0),
		};
		// Time in pl.smart_limit_number is in minutes)
		const trimTarget = pl.smart_limit_type === 'duration' ? pl.smart_limit_number * 60 : pl.smart_limit_number;
		while (trimmedListInfo[pl.smart_limit_type] > trimTarget) {
			const lastSong = list.pop();
			if (pl.smart_limit_type === 'songs') trimmedListInfo.songs -= 1;
			if (pl.smart_limit_type === 'duration') trimmedListInfo.duration -= lastSong.duration;
		}
	}

	// We compare what we have in the playlist and what we have in the generated list, removing and adding songs without changing the order.

	const removedSongs = plc.filter(pc => !list.find(l => l.kid === pc.kid));
	const addedSongs = list.filter(l => !plc.find(pc => pc.kid === l.kid));
	const sameSongs = list.filter(l => plc.find(pc => pc.kid === l.kid));

	// We need to run through the addedSongs part and consolidate it
	// Because getKarasFromCriterias will give us the same song several times if it's from an UNION.
	const newMap = new Map<string, Criteria[]>();
	for (const song of addedSongs) {
		let criterias = newMap.get(song.kid);
		criterias ? (criterias = [].concat(criterias, song.criterias)) : (criterias = song.criterias);
		newMap.set(song.kid, criterias);
	}
	const newArray = Array.from(newMap, ([kid, criterias]) => ({ kid, criterias }));

	// Tricky part, we need to compare criterias between the list we got and the criterias stored in the PLC.
	const sameMap = new Map<string, Criteria[]>();
	for (const song of sameSongs) {
		let criterias = sameMap.get(song.kid);
		criterias ? (criterias = [].concat(criterias, song.criterias)) : (criterias = song.criterias);
		sameMap.set(song.kid, criterias);
	}
	// Now that we aggregated, we need to compare.
	const modifiedSongs = plc.filter(pc => {
		const songCriterias = sameMap.get(pc.kid);
		// No more criterias exist, it means the song got deleted by another criteria
		if (!songCriterias) return false;
		// If song has no criterias it has been added manually somehow.
		if (!pc.criterias) return false;
		// True if song has been modified
		return intersectionWith(songCriterias, pc.criterias, isEqual).length !== pc.criterias.length;
	});

	// Removed songs, that's simple.
	if (removedSongs.length > 0) {
		try {
			await removeKaraFromPlaylist(
				removedSongs.map(s => s.plcid),
				adminToken,
				false,
				true
			);
		} catch (err) {
			logger.warn(`Unable to remove karaokes from playlist "${pl.name}"`, { service, obj: err });
		}
	}
	if (addedSongs.length > 0) {
		try {
			await addKaraToPlaylist(
				addedSongs.map(s => s.kid),
				pl.username,
				plaid,
				undefined,
				true,
				false,
				newArray
			);
		} catch (err) {
			logger.warn(`Unable to add karaokes to playlist "${pl.name}"`, { service, obj: err });
		}
	}
	for (const song of modifiedSongs) {
		try {
			await editPLC(
				[song.plcid],
				{
					criterias: song.criterias,
				},
				false
			);
		} catch (err) {
			logger.warn(`Unable to edit PLCs in playlist "${pl.name}"`, { service, obj: err });
		}
	}
	updatePlaylistLastEditTime(plaid);
	emitWS('playlistContentsUpdated', plaid);
	emitWS('playlistInfoUpdated', plaid);
	profile(`updateSmartPlaylist-${plaid}`);
}

export async function removeCriteria(cs: Criteria[]) {
	profile('delCriteria');
	logger.debug('Deleting criterias', { service });
	const promises: Promise<any>[] = [];
	for (const c of cs) {
		promises.push(deleteCriteria(c));
	}
	await Promise.all(promises);
	const playlistsToUpdate = new Set<string>();
	for (const c of cs) {
		playlistsToUpdate.add(c.plaid);
	}
	if (playlistsToUpdate.has(getState().whitelistPlaid) || playlistsToUpdate.has(getState().blacklistPlaid)) {
		updateAllSmartPlaylists();
	} else {
		for (const plaid of playlistsToUpdate.values()) {
			updateSmartPlaylist(plaid);
		}
	}
	profile('delCriteria');
}

/** Add one or more criterias to smart playlists */
export async function addCriteria(cs: Criteria[]) {
	profile('addCriteria');
	if (!Array.isArray(cs)) throw { code: 400 };
	logger.info(`Adding criterias = ${JSON.stringify(cs)}`, { service });
	try {
		const playlistsToUpdate = new Set<string>();
		for (const c of cs) {
			if (playlistsToUpdate.has(c.plaid)) continue;
			const pl = await getPlaylistInfo(c.plaid);
			if (!pl) throw { code: 404, msg: 'PL unknown' };
			playlistsToUpdate.add(c.plaid);
		}
		// Validation
		// BLC 1002 - 1002: 0
		// BLC 1003 - 1002: 1
		// Placed to true to check for multiples occurrences of the same type
		const timeC = [false, false];
		for (const c of cs) {
			if (c.type < 0 || c.type > 1006 || c.type === 1000) {
				throw { code: 400, msg: `Incorrect Criteria type (${c.type})` };
			}
			if (c.type === 1006) {
				if (!downloadStatuses.includes(c.value)) {
					throw {
						code: 400,
						msg: `Criteria value mismatch : type ${
							c.type
						} must have either of these values : ${downloadStatuses.toString()}`,
					};
				}
			}
			if (c.type === 1001 || (c.type >= 1 && c.type < 1000)) {
				if (!c.value.match(uuidRegexp)) {
					throw { code: 400, msg: `Criteria value mismatch : type ${c.type} must have UUID values` };
				}
			}
			if (c.type === 1002 || c.type === 1003) {
				c.value = +c.value;
				if (!isNumber(c.value)) {
					throw { code: 400, msg: `Criteria type mismatch : type ${c.type} must have a numeric value!` };
				}
				if (timeC[c.type - 1002]) {
					throw {
						code: 400,
						msg: `Criteria type mismatch : type ${c.type} can occur only once in a smart playlist.`,
					};
				}
				const opposingC = cs.find(crit => {
					// Find the C type 1003 (shorter than) when we add a 1002 C (longer than) and vice versa.
					return crit.plaid === c.plaid && crit.type === (c.type === 1002 ? 1003 : 1002);
				});
				if (opposingC) {
					if (c.type === 1002 && c.value <= opposingC.value) {
						throw { code: 409, msg: { code: 'C_LONGER_THAN_CONFLICT' } };
					} else if (c.type === 1003 && c.value >= opposingC.value) {
						throw { code: 409, msg: { code: 'C_SHORTER_THAN_CONFLICT' } };
					}
				}
				const existingC = cs.find(crit => crit.type === c.type && crit.plaid === c.plaid);
				if (existingC) {
					// Replace the one
					await deleteCriteria(existingC);
				}
				timeC[c.type - 1002] = true;
			}
		}
		await insertCriteria(cs);
		if (playlistsToUpdate.has(getState().whitelistPlaid) || playlistsToUpdate.has(getState().blacklistPlaid)) {
			updateAllSmartPlaylists();
		} else {
			for (const plaid of playlistsToUpdate.values()) {
				updateSmartPlaylist(plaid);
			}
		}
	} catch (err) {
		logger.error('Error adding criteria', { service, obj: err });
		if (!err.code || err.code >= 500) Sentry.error(err);
		throw err;
	} finally {
		profile('addCriteria');
	}
}

async function translateCriterias(cList: Criteria[], lang: string): Promise<Criteria[]> {
	// If lang is not provided, assume we're using node's system locale
	if (!lang) lang = getState().defaultLocale;
	// Test if lang actually exists in ISO639-1 format
	if (!langs.has('1', lang)) throw `Unknown language : ${lang}`;
	// We need to read the detected locale in ISO639-1
	const langObj = langs.where('1', lang);
	for (const i in cList) {
		if ({}.hasOwnProperty.call(cList, i)) {
			if (cList[i].type === 1) {
				// We just need to translate the tag name if there is a translation
				if (typeof cList[i].value !== 'string') throw `BLC value is not a string : ${cList[i].value}`;
				cList[i].value_i18n = cList[i].value;
			}
			if (cList[i].type >= 1 && cList[i].type <= 999) {
				// We need to get the tag name and then translate it if needed
				const tag = await getTag(cList[i].value);
				tag
					? (cList[i].value_i18n = tag.i18n[langObj['2B']]
							? tag.i18n[langObj['2B']]
							: tag.i18n.eng
							? tag.i18n.eng
							: tag.name)
					: (cList[i] = null);
			}
			if (cList[i].type === 1001) {
				// We have a kara ID, let's get the kara itself and append it to the value
				const kara = await getKara(cList[i].value, adminToken, lang);
				// If it doesn't exist anymore, remove the entry with null.
				kara ? (cList[i].value = kara) : (cList[i] = null);
			}
			// No need to do anything, values have been modified if necessary
		}
	}
	// Filter all nulls
	return cList.filter(blc => blc !== null);
}

export async function createProblematicSmartPlaylist() {
	const tags = await getTags({ type: 15 });
	const plaid = await insertPlaylist({
		name: i18next.t('PROBLEMATIC_SONGS'),
		created_at: new Date(),
		modified_at: new Date(),
		flag_visible: true,
		flag_smart: true,
		username: 'admin',
		type_smart: 'INTERSECT',
	});
	const blcs: Criteria[] = [];

	for (const tag of tags.content) {
		blcs.push({
			plaid,
			type: tag.types[0],
			value: tag.tid,
		});
	}
	await addCriteria(blcs);
	await updateSmartPlaylist(plaid);
}

// Actions took when a new whitelist is set
export function whitelistHook(plaid: string) {
	const oldWhitelistPlaylist_id = getState().whitelistPlaid;
	updatePlaylistLastEditTime(oldWhitelistPlaylist_id);
	emitWS('playlistInfoUpdated', oldWhitelistPlaylist_id);
	setState({ whitelistPlaid: plaid });
}

// Actions took when a new blacklist is set
export function blacklistHook(plaid: string) {
	const oldBlacklistPlaylist_id = getState().blacklistPlaid;
	updatePlaylistLastEditTime(oldBlacklistPlaylist_id);
	emitWS('playlistInfoUpdated', oldBlacklistPlaylist_id);
	setState({ blacklistPlaid: plaid });
}
