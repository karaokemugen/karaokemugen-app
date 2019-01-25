import {getFavoritesPlaylist} from '../_dao/favorites';
import {importPlaylist, exportPlaylist, getPlaylists, trimPlaylist, shufflePlaylist, copyKaraToPlaylist, createPlaylist, deleteKaraFromPlaylist, reorderPlaylist, addKaraToPlaylist, getPlaylistContentsMini, getPlaylistContents} from '../_services/playlist';
import {listUsers, findUserByName} from '../_services/user';
import logger from 'winston';
import {date} from '../_common/utils/date';
import {profile} from '../_common/utils/logger';
import { getRemoteToken } from '../_dao/user';
import got from 'got';
import { getKaraMini } from '../_dao/kara';
import { now } from 'unix-timestamp';
import {getConfig} from '../_common/utils/config';

export async function fetchAndAddFavorites(instance, token, username, nickname) {
	try {
		const pl = await getFavoritesPlaylist(username);
		if (!pl) throw 'User has no favorites playlist';
		const res = await got(`http://${instance}/api/favorites`, {
			headers: {
				authorization: token
			},
			json: true
		});
		const favorites = res.body;
		const favoritesPlaylist = {
			Header: {
				version: 3,
				description: 'Karaoke Mugen Playlist File'
			},
			PlaylistInformation: {
				name: `Faves : ${username}`,
				time_left: 0,
				created_at: now(),
				modified_at: now(),
				flag_visible: 1
			},
			PlaylistContents: []
		};
		let index = 1;
		for (const favorite of favorites) {
			favoritesPlaylist.PlaylistContents.push({
				kid: favorite.kid,
				pseudo_add: nickname,
				created_at: now(),
				pos: index,
				username: username
			});
			index++;
		}
		logger.debug(`[Favorites] Favorites imported : ${JSON.stringify(favoritesPlaylist, null, 2)}`);
		await importFavorites(favoritesPlaylist, {username: username});

	} catch(err) {
		throw err;
	}
}
export async function getFavorites(token, filter, lang, from, size) {
	try {
		profile('getFavorites');
		const plInfo = await getFavoritesPlaylist(token.username);
		if (!plInfo) throw 'This user has no favorites playlist!';
		return await getPlaylistContents(plInfo.playlist_id, token, filter, lang, from, size);
	} catch(err) {
		throw {
			message: err,
			data: token.username
		};
	} finally {
		profile('getFavorites');
	}
}

export async function convertToRemoteFavorites(username) {
	// This is called when converting a local account to a remote one
	// We thus know no favorites exist remotely.
	if (!+getConfig().OnlineUsers) return true;
	try {
		const favorites = await getFavorites({username: username});
		const addFavorites = [];
		if (favorites.content.length > 0) {
			for (const favorite of favorites.content) {
				addFavorites.push(manageFavoriteInInstance('POST', username, favorite.kara_id));
			}
			await Promise.all(addFavorites);
		}
	} catch(err) {
		throw err;
	}
}

export async function addToFavorites(username, kara_id) {
	try {
		profile('addToFavorites');
		const plInfo = await getFavoritesPlaylist(username);
		if (!plInfo) throw 'This user has no favorites playlist!';
		await addKaraToPlaylist(kara_id, username, plInfo.playlist_id);
		await reorderPlaylist(plInfo.playlist_id, { sortBy: 'name'});
		if (username.includes('@')) manageFavoriteInInstance('POST', username, kara_id);
		return plInfo;
	} catch(err) {
		throw {message: err};
	} finally {
		profile('addToFavorites');
	}
}

async function manageFavoriteInInstance(action, username, kara_id) {
	// If OnlineUsers is disabled, we return early and do not try to update favorites online.
	if (!+getConfig().OnlineUsers) return true;
	const instance = username.split('@')[1];
	const remoteToken = getRemoteToken(username);
	const kara = await getKaraMini(kara_id);
	try {
		return await got(`http://${instance}/api/favorites`, {
			method: action,
			body: {
				kid: kara.kid
			},
			headers: {
				authorization: remoteToken.token
			},
			form: true
		});
	} catch(err) {
		logger.error(`[RemoteFavorites] Unable to ${action} favorite ${kara.kid} on ${username}'s online account : ${err}`);
	}
}

export async function deleteFavorite(username, kara_id) {
	profile('deleteFavorites');
	const plInfo = await getFavoritesPlaylist(username);
	const plContents = await getPlaylistContentsMini(plInfo.playlist_id);
	let plc_id;
	const isKaraInPL = plContents.some((plc) => {
		if (plc.kara_id === kara_id) {
			plc_id = plc.playlistcontent_id;
			return true;
		}
		return false;
	});
	if (!isKaraInPL) throw 'Karaoke ID is not present in this favorites list';
	await deleteKaraFromPlaylist(plc_id, plInfo.playlist_id, null, {sortBy: 'name'});
	profile('deleteFavorites');
	if (username.includes('@')) manageFavoriteInInstance('DELETE', username, kara_id);
	return plInfo;
}

export async function exportFavorites(token) {
	const plInfo = await getFavoritesPlaylist(token.username);
	return await exportPlaylist(plInfo.playlist_id);
}

export async function importFavorites(favorites, token) {
	const plInfo = await getFavoritesPlaylist(token.username);
	if (!plInfo) throw ('This user has no favorites playlist!');
	const result = await importPlaylist(favorites, token.username, plInfo.playlist_id);
	reorderPlaylist(plInfo.playlist_id, { sortBy: 'name'});
	return result;
}

async function getAllFavorites(userList) {
	const plcs = [];
	const kara_ids = [];
	for (const user of userList) {
		if (!await findUserByName(user)) {
			logger.warn(`[AutoMix] Username ${user} does not exist`);
		} else {
			const plInfo = await getFavoritesPlaylist(user);
			const pl = await getPlaylistContentsMini(plInfo.playlist_id);
			// Each PLC is pushed into a list if the kara_id doesn't exist already to avoid duplicates.
			// Later on we could use that to give more weight to some karaokes
			pl.forEach((plItem) => {
				if (!kara_ids.includes(plItem.kara_id)) {
					plcs.push(plItem.playlistcontent_id);
					kara_ids.push(plItem.kara_id);
				}
			});
		}
	}
	return plcs.join();
}

export async function createAutoMix(params, username) {
	// Create Playlist.
	profile('AutoMix');
	let users = params.users.split(',');
	const plcList = await getAllFavorites(users);
	const autoMixPLName = `AutoMix ${date()}`;
	const playlist_id = await createPlaylist(autoMixPLName,{
		visible: true
	},username);
	// Copy karas from everyone listed
	await copyKaraToPlaylist(plcList, playlist_id);
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

export async function initFavoritesSystem() {
	// Let's make sure all our users have a favorites playlist
	logger.debug('[Favorites] Check if everyone has a favorites playlist');
	const [playlists, users] = await Promise.all([
		await getPlaylists({role: 'admin', username: 'admin'}),
		await listUsers()
	]);
	for (const user of users) {
		const isFavoritePLExists = playlists.some(pl => {
			return pl.username === user.login && pl.flag_favorites === 1 && user.type === 1;
		});
		if (!isFavoritePLExists && user.type === 1) await createPlaylist(`Faves : ${user.login}`,{
			favorites: true
		},user.login);
	}
}

export async function findFavoritesPlaylist(username) {
	const plInfo = await getFavoritesPlaylist(username);
	if (plInfo) return plInfo.playlist_id;
	return false;
}