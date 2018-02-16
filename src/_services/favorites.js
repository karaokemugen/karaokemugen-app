import {getFavoritesPlaylist} from '../_dao/favorites';
import {deleteKaraFromPlaylist, reorderPlaylist, addKaraToPlaylist, getPlaylistContents, translateKaraInfo, filterPlaylist} from '../_services/playlist';

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
	kara_id = [kara_id];
	try {
		const plInfo = await getFavoritesPlaylist(username);
		await addKaraToPlaylist(kara_id, username, plInfo.playlist_id);
		await reorderPlaylist(plInfo.playlist_id, { sortBy: 'name'});
		return plInfo;
	} catch(err) {
		throw {message: err};
	}
}

export async function deleteFavorite(username, plc_id) {
	const plInfo = await getFavoritesPlaylist(username);
	await deleteKaraFromPlaylist([plc_id], plInfo.playlist_id);
	await reorderPlaylist(plInfo.playlist_id, { sortBy: 'name'});
	return plInfo;
}