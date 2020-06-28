import logger from 'winston';

import {insertFavorites,removeFavorites, selectFavorites} from '../dao/favorites';
import { getRemoteToken } from '../dao/user';
import {KaraList} from '../lib/types/kara';
import {getConfig} from '../lib/utils/config';
import { uuidRegexp } from '../lib/utils/constants';
import {date} from '../lib/utils/date';
import HTTP from '../lib/utils/http';
import {profile} from '../lib/utils/logger';
import { emitWS } from '../lib/utils/ws';
import {AutoMixParams, AutoMixPlaylistInfo, FavExport, FavExportContent,FavParams} from '../types/favorites';
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
		const error = new Error(err);
		sentry.error(error);
		throw error;
	} finally {
		profile('getFavorites');
	}
}

export async function fetchAndAddFavorites(instance: string, token: string, username: string) {
	try {
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
		await importFavorites(favorites, username);
	} catch(err) {
		logger.error(`Error getting remote favorites for ${username}`, {service: 'Favorites', obj: err});
	}
}

export async function manageFavoriteInInstanceBatch(action: 'POST' | 'DELETE', username: string, kids: string[]) {
	for (const kid of kids) {
		await manageFavoriteInInstance(action, username, kid);
	}
}

export async function addToFavorites(username: string, kids: string[], sendOnline = true) {
	try {
		profile('addToFavorites');
		await insertFavorites(kids, username);
		if (username.includes('@') && sendOnline && getConfig().Online.Users) {
			manageFavoriteInInstanceBatch('POST', username, kids);
		}
		emitWS('favoritesUpdated', username);
	} catch(err) {
		const error = new Error(err);
		sentry.error(error);
		throw error;
	} finally {
		profile('addToFavorites');
	}
}

export async function convertToRemoteFavorites(username: string) {
	// This is called when converting a local account to a remote one
	// We thus know no favorites exist remotely.
	if (!getConfig().Online.Users) return true;
	const favorites = await getFavorites({
		filter: null,
		lang: null,
		username: username
	});
	const addFavorites = [];
	if (favorites.content.length > 0) {
		for (const favorite of favorites.content) {
			addFavorites.push(manageFavoriteInInstance('POST', username, favorite.kid));
		}
		await Promise.all(addFavorites);
	}
}

export async function deleteFavorites(username: string, kids: string[]) {
	try {
		profile('deleteFavorites');
		await removeFavorites(kids, username);
		if (username.includes('@') && getConfig().Online.Users) {
			manageFavoriteInInstanceBatch('DELETE', username, kids);
		}
		emitWS('favoritesUpdated', username);
	} catch(err) {
		throw {message: err};
	} finally {
		profile('deleteFavorites');
	}
}

async function manageFavoriteInInstance(action: 'POST' | 'DELETE', username: string, kid: string) {
	// If OnlineUsers is disabled, we return early and do not try to update favorites online.
	if (!getConfig().Online.Users) return true;
	const instance = username.split('@')[1];
	const remoteToken = getRemoteToken(username);
	try {
		return await HTTP(`https://${instance}/api/favorites/${kid}`, {
			method: action,
			headers: {
				authorization: remoteToken.token || null
			},
		});
	} catch(err) {
		logger.error(`Unable to ${action} favorite ${kid} on ${username}'s online account`, {service: 'RemotesFavorites', obj: err});
	}
}

export async function exportFavorites(username: string) {
	const favs = await getFavorites({
		username: username,
		filter: null,
		lang: null,
		from: 0,
		size: 99999999
	});
	return {
		Header: {
			version: 1,
			description: 'Karaoke Mugen Favorites List File'
		},
		Favorites: favs.content.map(k => {
		// Only the kid property is mandatory, the rest is just decoration so the person can know which song is which in the file
			return {
				kid: k.kid,
				title: k.title,
				songorder: k.songorder,
				serie: k.series.map(s => s.name).join(' '),
				songtype: k.songtypes.map(s => s.name).join(' '),
				language: k.langs.map(s => s.name).join(' '),
			};
		})
	};
}

export async function importFavorites(favs: FavExport, username: string) {
	if (favs.Header.version !== 1) throw 'Incompatible favorites version list';
	if (favs.Header.description !== 'Karaoke Mugen Favorites List File') throw 'Not a favorites list';
	if (!Array.isArray(favs.Favorites)) throw 'Favorites item is not an array';
	if (favs.Favorites.some(f => !new RegExp(uuidRegexp).test(f.kid))) throw 'One item in the favorites list is not a UUID';
	// Stripping favorites from unknown karaokes in our database to avoid importing them
	let favorites = favs.Favorites.map(f => f.kid);
	const karasUnknown = await isAllKaras(favorites);
	favorites = favorites.filter(f => !karasUnknown.includes(f));
	const userFavorites = await getFavorites({username: username});
	favorites = favorites.filter(f => !userFavorites.content.map(uf => uf.kid).includes(f));
	if (favorites.length > 0) await addToFavorites(username, favorites, false);
	emitWS('favoritesUpdated', username);
	return { karasUnknown: karasUnknown };
}

/* Get favorites from a user list */
async function getAllFavorites(userList: string[]): Promise<string[]> {
	const kids = [];
	for (const user of userList) {
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
			favs.content.forEach(f => {
				if (!kids.includes(f.kid)) kids.push(f.kid);
			});
		}
	}
	return kids;
}

export async function createAutoMix(params: AutoMixParams, username: string): Promise<AutoMixPlaylistInfo> {
	profile('AutoMix');
	const favs = await getAllFavorites(params.users);
	if (favs.length === 0) throw 'No favorites found for those users';
	const autoMixPLName = `AutoMix ${date()}`;
	const playlist_id = await createPlaylist(autoMixPLName, {
		visible: true
	}, username);
	// Copy karas from everyone listed
	await addKaraToPlaylist(favs, username, playlist_id);
	// Shuffle time.
	await shufflePlaylist(playlist_id);
	// Cut playlist after duration
	await trimPlaylist(playlist_id, params.duration);
	profile('AutoMix');
	emitWS('playlistsUpdated');
	return {
		playlist_id: playlist_id,
		playlist_name: autoMixPLName
	};
}
