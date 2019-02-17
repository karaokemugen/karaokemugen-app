import {selectFavorites, removeAllFavorites, removeFavorites, insertFavorites} from '../_dao/favorites';
import {trimPlaylist, shufflePlaylist, createPlaylist, addKaraToPlaylist} from '../_services/playlist';
import {findUserByName} from '../_services/user';
import logger from 'winston';
import {date} from '../_utils/date';
import {profile} from '../_utils/logger';
import {formatKaraList, isAllKaras} from './kara';
import { uuidRegexp } from './constants';
import { getRemoteToken } from '../_dao/user';
import got from 'got';
import {getConfig} from '../_utils/config';

export async function getFavorites(username, filter, lang, from = 0, size = 99999999) {
	try {
		profile('getFavorites');
		const favs = await selectFavorites(filter, lang, from, size, username);
		return formatKaraList(favs.slice(from, from + size), lang, from, favs.length);
	} catch(err) {
		throw err;
	} finally {
		profile('getFavorites');
	}
}

export async function fetchAndAddFavorites(instance, token, username) {
	const res = await got(`http://${instance}/api/favorites`, {
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

export async function emptyFavorites(username) {
	return await removeAllFavorites(username);
}

export async function addToFavorites(username, kid) {
	try {
		profile('addToFavorites');
		let karas = [kid];
		if (Array.isArray(kid)) karas = kid;
		if (typeof kid === 'string') karas = kid.split(',');
		await insertFavorites(karas, username);
		if (username.includes('@') && +getConfig().OnlineUsers) for (const kara of karas) {
			manageFavoriteInInstance('POST', username, kara);
		}
	} catch(err) {
		throw err;
	} finally {
		profile('addToFavorites');
	}
}

export async function convertToRemoteFavorites(username) {
	// This is called when converting a local account to a remote one
	// We thus know no favorites exist remotely.
	if (!+getConfig().OnlineUsers) return true;
	const favorites = await getFavorites({username: username});
	const addFavorites = [];
	if (favorites.content.length > 0) {
		for (const favorite of favorites) {
			addFavorites.push(manageFavoriteInInstance('POST', username, favorite.kid));
		}
		await Promise.all(addFavorites);
	}
}

export async function deleteFavorites(username, kid) {
	try {
		profile('deleteFavorites');
		let karas = [kid];
		if (Array.isArray(kid)) karas = kid;
		if (typeof kid === 'string') karas = kid.split(',');
		await removeFavorites(karas, username);
		if (username.includes('@') && +getConfig().OnlineUsers) {
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

async function manageFavoriteInInstance(action, username, kid) {
	// If OnlineUsers is disabled, we return early and do not try to update favorites online.
	if (!+getConfig().OnlineUsers) return true;
	const instance = username.split('@')[1];
	const remoteToken = getRemoteToken(username);
	try {
		return await got(`http://${instance}/api/favorites`, {
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

export async function exportFavorites(username) {
	const favs = await getFavorites(username);
	if (favs.content.length === 0) throw 'Favorites empty';
	return {
		Header: {
			version: 1,
			description: 'Karaoke Mugen Favorites List File'
		},
		Favorites: favs.content
	};
}

export async function importFavorites(favs, username) {
	if (favs.Header.version !== 1) throw 'Incompatible favorites version list';
	if (favs.Header.description !== 'Karaoke Mugen Favorites List File') throw 'Not a favorites list';
	if (!Array.isArray(favs.Favorites)) throw 'Favorites item is not an array';
	const re = new RegExp(uuidRegexp);
	if (favs.Favorites.some(f => !re.test(f.kid))) throw 'One item in the favorites list is not a UUID';
	// Stripping favorites from unknown karaokes in our database to avoid importing them
	let favorites = favs.Favorites.map(f => f.kid);
	const karasUnknown = await isAllKaras(favorites);
	favorites = favorites.filter(f => !karasUnknown.includes(f));
	await addToFavorites(username, favorites);
	return { karasUnknown: karasUnknown };
}

async function getAllFavorites(userList) {
	const kids = [];
	for (const user of userList) {
		if (!await findUserByName(user)) {
			logger.warn(`[AutoMix] Username ${user} does not exist`);
		} else {
			const favs = await getFavorites(user);
			favs.content.forEach(f => {
				if (!kids.includes(f.kid)) kids.push(f.kid);
			});
		}
	}
	return kids;
}

export async function createAutoMix(params, username) {
	// Create Playlist.
	profile('AutoMix');
	const favs = await getAllFavorites(params.users.split(','));
	if (favs.length === 0) throw 'No favorites found for those users';
	const autoMixPLName = `AutoMix ${date()}`;
	const playlist_id = await createPlaylist(autoMixPLName,{
		visible: true
	},username);
	// Copy karas from everyone listed
	await addKaraToPlaylist(favs, username, playlist_id);
	// Shuffle time.
	await shufflePlaylist(playlist_id);
	// Cut playlist after duration
	await trimPlaylist(playlist_id, +params.duration);
	profile('AutoMix');
	return {
		playlist_id: playlist_id,
		playlist_name: autoMixPLName
	};
}