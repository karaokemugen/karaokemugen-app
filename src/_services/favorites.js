import {getFavoritesPlaylist} from '../_dao/favorites';
import {getPlaylists, setCurrentPlaylist, trimPlaylist, shufflePlaylist, copyKaraToPlaylist, createPlaylist, deleteKaraFromPlaylist, reorderPlaylist, addKaraToPlaylist, getPlaylistContents, translateKaraInfo, filterPlaylist} from '../_services/playlist';
import {listUsers, checkUserNameExists} from '../_services/user';
import moment from 'moment';
moment.locale('fr');
import logger from 'winston';

export async function getFavorites(username, filter, lang, from, size) {
	try {
		const plInfo = await getFavoritesPlaylist(username);
		const pl = await getPlaylistContents(plInfo.playlist_id);
		let karalist = translateKaraInfo(pl,lang);
		if (filter) karalist = filterPlaylist(karalist,filter);
		return {
			infos: { 
				count: karalist.length,
				from: parseInt(from),
				to: parseInt(from)+parseInt(size)
			},
			content: karalist.slice(from,parseInt(from)+parseInt(size))
		};
	} catch(err) {
		throw {
			message: err,
			data: username
		};
	}	
}

export async function addToFavorites(username, kara_id) {
	try {
		const plInfo = await getFavoritesPlaylist(username);
		await addKaraToPlaylist([kara_id], username, plInfo.playlist_id);
		await reorderPlaylist(plInfo.playlist_id, { sortBy: 'name'});
		return plInfo;
	} catch(err) {
		throw {message: err};
	}
}

export async function deleteFavorite(username, kara_id) {
	const plInfo = await getFavoritesPlaylist(username);
	const plContents = await getPlaylistContents(plInfo.playlist_id);
	let plc_id;
	const isKaraInPL = plContents.some((plc) => {
		if (plc.kara_id === kara_id) {
			plc_id = plc.playlistcontent_id;
			return true;
		}
		return false;
	});
	if (!isKaraInPL) throw 'Karaoke ID is not present in this favorites list';
	await deleteKaraFromPlaylist([plc_id], plInfo.playlist_id);
	await reorderPlaylist(plInfo.playlist_id, { sortBy: 'name'});
	return plInfo;
}

async function getAllFavorites(userList) {
	const plcs = [];
	const kara_ids = [];	
	let user;
	for (user of userList) {
		const res = await checkUserNameExists(user);
		if (!res) {
			logger.error(`[AutoMix] Username ${user} does not exist`);
		} else {
			const plInfo = await getFavoritesPlaylist(user);
			const pl = await getPlaylistContents(plInfo.playlist_id);
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
	let users;
	if (typeof params.users === 'string') {
		users = params.users.split(',');
	} else {
		users = [params.users];
	}
	const plcList = await getAllFavorites(users);
	const autoMixPLName = 'AutoMix ' + moment().format('L') + ' ' + moment().format('LT');
	const playlist_id = await createPlaylist(autoMixPLName,1,0,0,0,username);
	// Copy karas from everyone listed	
	await copyKaraToPlaylist(plcList, playlist_id);
	// Shuffle time.
	await shufflePlaylist(playlist_id);
	// Cut playlist after duration
	await trimPlaylist(playlist_id, params.duration);
	// Make it current.
	await setCurrentPlaylist(playlist_id);
	return {
		playlist_id: playlist_id,
		playlist_name: autoMixPLName
	};
}

export async function initFavoritesSystem() {
	// Let's make sure all our users have a favorites playlist
	logger.debug('[Favorites] Check if everyone has a favorites playlist');
	const [playlists, users] = await Promise.all([
		await getPlaylists(false,'admin'),
		await listUsers()
	]);	
	for (const user of users) {		
		const isFavoritePLExists = playlists.some(pl => {
			if (pl.fk_user_id == user.user_id && pl.flag_favorites == 1 && user.type == 1) return true;
			return false;
		})
		if (!isFavoritePLExists) await createPlaylist('Faves : '+user.login,0,0,0,1,user.login);
	}
}