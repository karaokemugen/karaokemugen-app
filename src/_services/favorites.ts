import {selectFavorites, removeAllFavorites, removeFavorites, insertFavorites} from '../_dao/favorites';
import {trimPlaylist, shufflePlaylist, createPlaylist, addKaraToPlaylist} from './playlist';
import {findUserByName} from './user';
import logger from 'winston';
import {date} from '../_utils/date';
import {profile} from '../_utils/logger';
import {formatKaraList, isAllKaras} from './kara';
import {KaraList} from '../_types/kara';
import {FavParams, FavExport, AutoMixParams} from '../_types/favorites';
import { uuidRegexp } from './constants';
import { getRemoteToken } from '../_dao/user';
import got from 'got';
import {getConfig} from '../_utils/config';

export async function getFavorites(params: FavParams): Promise<KaraList> {
	try {
		profile('getFavorites');
		const favs = await selectFavorites(params);
		return formatKaraList(favs.slice(params.from, params.from + params.size), params.lang, params.from, favs.length);
	} catch(err) {
		throw err;
	} finally {
		profile('getFavorites');
	}
}

export async function fetchAndAddFavorites(instance: string, token: string, username: string) {
	const res = await got(`https://${instance}/api/favorites`, {
		headers: {
			authorization: token
		},
		json: true
	});
	const favorites = {
		Header: {
			version: 1,
			description: 'Karaoke Mugen Favorites List File'
		},
		Favorites: res.body
	};
	await importFavorites(favorites, username);
}

export async function emptyFavorites(username: string) {
	return await removeAllFavorites(username);
}

export async function addToFavorites(username: string, kid: any) {
	try {
		profile('addToFavorites');
		let karas = [kid];
		if (Array.isArray(kid)) karas = kid;
		if (typeof kid === 'string') karas = kid.split(',');
		await insertFavorites(karas, username);
		if (username.includes('@') && getConfig().Online.Users) karas.forEach(k => manageFavoriteInInstance('POST', username, k));
	} catch(err) {
		throw err;
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

export async function deleteFavorites(username: string, kid: string) {
	try {
		profile('deleteFavorites');
		let karas = [kid];
		if (Array.isArray(kid)) karas = kid;
		if (typeof kid === 'string') karas = kid.split(',');
		await removeFavorites(karas, username);
		if (username.includes('@') && getConfig().Online.Users) {
			for (const kid of karas) {
				manageFavoriteInInstance('DELETE', username, kid);
			}
		}
	} catch(err) {
		throw {message: err};
	} finally {
		profile('deleteFavorites');
	}
}

async function manageFavoriteInInstance(action: string, username: string, kid: string) {
	// If OnlineUsers is disabled, we return early and do not try to update favorites online.
	if (!getConfig().Online.Users) return true;
	const instance = username.split('@')[1];
	const remoteToken = getRemoteToken(username);
	try {
		return await got(`https://${instance}/api/favorites`, {
			method: action,
			body: {
				kid: kid
			},
			headers: {
				authorization: remoteToken.token
			},
			form: true
		});
	} catch(err) {
		logger.error(`[RemoteFavorites] Unable to ${action} favorite ${kid} on ${username}'s online account : ${err}`);
	}
}

export async function exportFavorites(username: string) {
	const favs = await getFavorites({
		username: username,
		filter: null,
		lang: null
	});
	if (favs.content.length === 0) throw 'Favorites empty';
	return {
		Header: {
			version: 1,
			description: 'Karaoke Mugen Favorites List File'
		},
		Favorites: favs.content
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
	await addToFavorites(username, favorites);
	return { karasUnknown: karasUnknown };
}

async function getAllFavorites(userList: string[]) {
	const kids = [];
	for (const user of userList) {
		if (!await findUserByName(user)) {
			logger.warn(`[AutoMix] Username ${user} does not exist`);
		} else {
			const favs = await getFavorites({
				username: user,
				filter: null,
				lang: null
			});
			favs.content.forEach(f => {
				if (!kids.includes(f.kid)) kids.push(f.kid);
			});
		}
	}
	return kids;
}

export async function createAutoMix(params: AutoMixParams, username: string) {
	// Create Playlist.
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
	return {
		playlist_id: playlist_id,
		playlist_name: autoMixPLName
	};
}