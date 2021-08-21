import logger from 'winston';

import { clearFavorites, insertFavorites, removeFavorites, selectFavorites } from '../dao/favorites';
import {KaraList} from '../lib/types/kara';
import {getConfig} from '../lib/utils/config';
import { uuidRegexp } from '../lib/utils/constants';
import {date} from '../lib/utils/date';
import HTTP from '../lib/utils/http';
import {profile} from '../lib/utils/logger';
import { emitWS } from '../lib/utils/ws';
import {AutoMixParams, AutoMixPlaylistInfo, FavExport, FavExportContent,Favorite,FavParams} from '../types/favorites';
import sentry from '../utils/sentry';
import {formatKaraList, isAllKaras} from './kara';
import {addKaraToPlaylist,createPlaylist, shufflePlaylist, trimPlaylist} from './playlist';
import {findUserByName} from './user';

export async function getFavorites(params: FavParams): Promise<KaraList> {
	try {
		profile('getFavorites');
		const favs = await selectFavorites(params);
		const count = favs.length > 0 ? favs[0].count : 0;
		return formatKaraList(favs, params.from, count);
	} catch(err) {
		sentry.error(err);
		throw err;
	} finally {
		profile('getFavorites');
	}
}

export async function fetchAndAddFavorites(username: string, token: string) {
	try {
		const instance = username.split('@')[1];
		const res = await HTTP(`https://${instance}/api/favorites`, {
			headers: {
				authorization: token
			},
			responseType: 'json'
		});
		const favorites = {
			Header: {
				version: 1,
				description: 'Karaoke Mugen Favorites List File'
			},
			Favorites: res.body as FavExportContent[]
		};
		await importFavorites(favorites, username, token, false, false);
	} catch(err) {
		logger.error(`Error getting remote favorites for ${username}`, {service: 'Favorites', obj: err});
	}
}

export async function manageFavoriteInInstanceBatch(action: 'POST' | 'DELETE', username: string, kids: string[], token: string) {
	await Promise.all(kids.map(kid => manageFavoriteInInstance(action, username, kid, token)));
}

export async function addToFavorites(username: string, kids: string[], onlineToken?: string, updateRemote = true) {
	try {
		profile('addToFavorites');
		username = username.toLowerCase();
		await insertFavorites(kids, username);
		if (username.includes('@') && onlineToken && getConfig().Online.Users && updateRemote) {
			await manageFavoriteInInstanceBatch('POST', username, kids, onlineToken);
		}
		emitWS('favoritesUpdated', username);
	} catch(err) {
		sentry.error(err);
		throw err;
	} finally {
		profile('addToFavorites');
	}
}

export async function convertToRemoteFavorites(username: string, token: string) {
	// This is called when converting a local account to a remote one
	// We thus know no favorites exist remotely.
	if (!getConfig().Online.Users) return true;
	const favorites = await getFavorites({
		filter: null,
		lang: null,
		username: username
	});
	const localFavorites = favorites.content.map(fav => fav.kid);
	if (localFavorites.length > 0) {
		await manageFavoriteInInstanceBatch('POST', username, localFavorites, token);
	}
}

export async function deleteFavorites(username: string, kids: string[], token: string) {
	try {
		profile('deleteFavorites');
		username = username.toLowerCase();
		await removeFavorites(kids, username);
		if (username.includes('@') && getConfig().Online.Users) {
			manageFavoriteInInstanceBatch('DELETE', username, kids, token);
		}
		emitWS('favoritesUpdated', username);
	} catch(err) {
		throw {message: err};
	} finally {
		profile('deleteFavorites');
	}
}

async function manageFavoriteInInstance(action: 'POST' | 'DELETE', username: string, kid: string, token: string) {
	// If OnlineUsers is disabled, we return early and do not try to update favorites online.
	if (!getConfig().Online.Users) return true;
	const instance = username.split('@')[1];
	try {
		return await HTTP(`https://${instance}/api/favorites/${kid}`, {
			method: action,
			headers: {
				authorization: token
			},
		});
	} catch(err) {
		logger.error(`Unable to ${action} favorite ${kid} on ${username}'s online account`, {service: 'RemotesFavorites', obj: err});
	}
}

export async function exportFavorites(username: string) {
	username = username.toLowerCase();
	const favs = await getFavorites({
		username: username,
		filter: null,
		lang: null,
		from: 0,
		size: 99999999
	});
	if (favs.content.length === 0) throw {code: 404, msg: 'No favorites'};
	return {
		Header: {
			version: 1,
			description: 'Karaoke Mugen Favorites List File'
		},
		Favorites: favs.content.map(k => {
		// Only the kid property is mandatory, the rest is just decoration so the person can know which song is which in the file
			return {
				kid: k.kid,
				titles: k.titles,
				songorder: k.songorder,
				serie: k.series.map(s => s.name).join(' '),
				songtype: k.songtypes.map(s => s.name).join(' '),
				language: k.langs.map(s => s.name).join(' '),
			};
		})
	};
}

export async function importFavorites(favs: FavExport, username: string, token?: string, emptyBefore = false, updateRemote = true) {
	username = username.toLowerCase();
	if (favs.Header.version !== 1) throw {code: 400, msg: 'Incompatible favorites version list'};
	if (favs.Header.description !== 'Karaoke Mugen Favorites List File') throw {code: 400, msg: 'Not a favorites list'};
	if (!Array.isArray(favs.Favorites)) throw {code: 400, msg: 'Favorites item is not an array'};
	if (favs.Favorites.some(f => !new RegExp(uuidRegexp).test(f.kid))) throw {code: 400, msg: 'One item in the favorites list is not a UUID'};
	// Stripping favorites from unknown karaokes in our database to avoid importing them
	try {
		if (emptyBefore) {
			await clearFavorites(username);
		}
		const favorites = favs.Favorites.map(f => f.kid);
		const [karasUnknown, userFavorites] = await Promise.all([
			isAllKaras(favorites),
			getFavorites({username: username})
		]);
		// Removing favorites already added
		const mappedUserFavorites = userFavorites.content.map(uf => uf.kid);
		const favoritesToAdd = favorites.filter(f => !mappedUserFavorites.includes(f));
		if (favoritesToAdd.length > 0) await addToFavorites(username, favoritesToAdd, token, updateRemote);
		emitWS('favoritesUpdated', username);
		return { karasUnknown: karasUnknown };
	} catch(err) {
		logger.error('Unable to import favorites', {service: 'Favorites', obj: err});
		sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
		sentry.error(err);
		throw err;
	}
}

/* Get favorites from a user list */
async function getAllFavorites(userList: string[]): Promise<Favorite[]> {
	const faves: Favorite[] = [];
	for (let user of userList) {
		user = user.toLowerCase();
		if (!await findUserByName(user)) {
			logger.warn(`Username ${user} does not exist`, {service: 'Favorites'});
		} else {
			const favs = await getFavorites({
				username: user,
				filter: null,
				lang: null,
				from: 0,
				size: 9999999
			});
			for (const f of favs.content) {
				if (!faves.find(fav => fav.kid === f.kid)) faves.push({
					kid: f.kid,
					username: user
				});
			}
		}
	}
	return faves;
}

export async function createAutoMix(params: AutoMixParams, username: string): Promise<AutoMixPlaylistInfo> {
	profile('AutoMix');
	params.users = params.users.map(u => u.toLowerCase());
	try {
		const favs = await getAllFavorites(params.users);
		if (favs.length === 0) throw {code: 404, msg: 'AUTOMIX_ERROR_NOT_FOUND_FAV_FOR_USERS'};
		const autoMixPLName = `AutoMix ${date()}`;
		const plaid = await createPlaylist(autoMixPLName, {
			visible: true
		}, username);
		// Copy karas from everyone listed
		for (const user of params.users) {
			const userFaves = favs.filter(f => f.username === user);
			if (userFaves.length > 0) {
				await addKaraToPlaylist(userFaves.map(f => f.kid), user, plaid, null, true);
			}
		}
		// Shuffle time. First we shuffle with balanced to make sure everyone gets to have some songs in.
		await shufflePlaylist(plaid, 'balance');
		// Cut playlist after duration
		await trimPlaylist(plaid, params.duration);
		// Let's reshuffle normally now that the playlist is trimmed.
		await shufflePlaylist(plaid, 'normal');
		emitWS('playlistsUpdated');
		return {
			plaid: plaid,
			playlist_name: autoMixPLName
		};
	} catch(err) {
		logger.error('Failed to create AutoMix', {service: 'Automix', obj: err});
		if (err?.code === 404) throw err;
		sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
		sentry.error(err);
		throw err;
	} finally {
		profile('AutoMix');
	}
}
