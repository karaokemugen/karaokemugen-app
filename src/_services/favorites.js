import {getFavoritesPlaylist} from '../_dao/favorites';
import {importPlaylist, exportPlaylist, getPlaylists, trimPlaylist, shufflePlaylist, copyKaraToPlaylist, createPlaylist, deleteKaraFromPlaylist, reorderPlaylist, addKaraToPlaylist, getPlaylistContentsMini, getPlaylistContents} from '../_services/playlist';
import {listUsers, checkUserNameExists} from '../_services/user';
import logger from 'winston';
import {date} from '../_common/utils/date';
import {profile} from '../_common/utils/logger';

export async function getFavorites(token, filter, lang, from, size) {
	try {
		profile('getFavorites');
		const plInfo = await getFavoritesPlaylist(token.username);
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

export async function addToFavorites(username, kara_id) {
	try {
		profile('addToFavorites');
		const plInfo = await getFavoritesPlaylist(username);
		await addKaraToPlaylist([kara_id], username, plInfo.playlist_id);
		await reorderPlaylist(plInfo.playlist_id, { sortBy: 'name'});
		return plInfo;
	} catch(err) {
		throw {message: err};
	} finally {
		profile('addToFavorites');
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
	await deleteKaraFromPlaylist([plc_id], plInfo.playlist_id, null, {sortBy: 'name'});
	profile('deleteFavorites');
	return plInfo;
}

export async function exportFavorites(token) {
	const plInfo = await getFavoritesPlaylist(token.username);
	return await exportPlaylist(plInfo.playlist_id);
}

export async function importFavorites(favorites, token) {
	const plInfo = await getFavoritesPlaylist(token.username);
	return await importPlaylist(favorites, token.username, plInfo.playlist_id);
}

async function getAllFavorites(userList) {
	const plcs = [];
	const kara_ids = [];
	for (const user of userList) {
		const res = await checkUserNameExists(user);
		if (!res) {
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
	return plcs;
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
	await trimPlaylist(playlist_id, params.duration);
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