import {selectFavorites, removeAllFavorites, removeFavorites, insertFavorites} from '../_dao/favorites';
import {trimPlaylist, shufflePlaylist, createPlaylist, addKaraToPlaylist} from '../_services/playlist';
import {findUserByName} from '../_services/user';
import logger from 'winston';
import {date} from '../_utils/date';
import {profile} from '../_utils/logger';
import {formatKaraList} from './kara';
import { uuidRegexp } from './constants';

export async function getFavorites(username, filter, lang, from, size) {
	try {
		profile('getFavorites');
		const favs = await selectFavorites(filter, lang, from, size, username);
		return formatKaraList(favs.slice(from, from + size), lang, from, favs.length);
	} catch(err) {
		throw {
			message: err,
			data: username
		};
	} finally {
		profile('getFavorites');
	}
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
	} catch(err) {
		throw {message: err};
	} finally {
		profile('addToFavorites');
	}
}

export async function deleteFavorites(username, kid) {
	try {
		profile('deleteFavorites');
		let karas = [kid];
		if (Array.isArray(kid)) karas = kid;
		if (typeof kid === 'string') karas = kid.split(',');
		await removeFavorites(karas, username);
	} catch(err) {
		throw {message: err};
	} finally {
		profile('deleteFavorites');
	}
}

export async function exportFavorites(username) {
	const favs = await getFavorites(username);
	return {
		Header: {
			version: 1,
			description: 'Karaoke Mugen Favorites List'
		},
		Favorites: favs.map(f => f.kid)
	};
}

export async function importFavorites(favs, username) {
	if (!favs.Header.version === 1) throw 'Incompatible favorites version list';
	if (!favs.Header.description !== 'Karaoke Mugen Favorites List') throw 'Not a favorites list';
	if (!Array.isArray(favs.Favorites)) throw 'Favorites item is not an array';
	const re = new RegExp(uuidRegexp);
	if (favs.Favorites.some(f => !re.test(f))) throw 'One item in the favorites list is not a UUID';
	await addToFavorites(username, favs.Favorites);
}

async function getAllFavorites(userList) {
	const kids = [];
	for (const user of userList) {
		if (!await findUserByName(user)) {
			logger.warn(`[AutoMix] Username ${user} does not exist`);
		} else {
			const favs = await getFavorites(user);
			favs.forEach(f => {
				if (!kids.includes(f)) kids.push(f);
			});
		}
	}
	return kids;
}

export async function createAutoMix(params, username) {
	// Create Playlist.
	profile('AutoMix');
	const user = await findUserByName(username);
	const favs = await getAllFavorites(params.users.split(','));
	const autoMixPLName = `AutoMix ${date()}`;
	const playlist_id = await createPlaylist(autoMixPLName,{
		visible: true
	},username);
	// Copy karas from everyone listed
	await addKaraToPlaylist(favs, user.nickname, playlist_id);
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