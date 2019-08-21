//Utils
import {getStats} from '../dao/database';
import {getConfig, resolvedPathAvatars} from '../lib/utils/config';
import {now} from '../lib/utils/date';
import logger from '../lib/utils/logger';
import shuffle from 'lodash.shuffle';
import {emitWS} from '../lib/utils/ws';
import {on} from '../lib/utils/pubsub';
import {setState, getState} from '../utils/state';
import {profile} from '../lib/utils/logger';
import {resolve} from 'path';
import i18n from 'i18next';

//DAO
import {
	countPlaylistUsers,
	createPlaylist as createPL,
	deletePlaylist as deletePL,
	editPlaylist as editPL,
	emptyPlaylist as emptyPL,
	getCurrentPlaylist,
	getPublicPlaylist,
	getMaxPosInPlaylist,
	getMaxPosInPlaylistForUser,
	getPlaylistContents as getPLContents,
	getPlaylistContentsMini as getPLContentsMini,
	getPlaylistInfo as getPLInfo,
	getPlaylistKaraIDs,
	getPlaylists as getPLs,
	getPLCByDate,
	getPLCByKIDAndUser,
	getPLCInfoMini as getPLCInfoMiniDB,
	getPLCInfo as getPLCInfoDB,
	replacePlaylist,
	reorderPlaylist as reorderPL,
	setCurrentPlaylist as setCurrentPL,
	setPlaying as setPlayingFlag,
	setPLCFreeBeforePos,
	setPLCFree,
	setPLCVisible,
	setPLCInvisible,
	setPos,
	setPublicPlaylist as setPublicPL,
	setVisiblePlaylist as setVisiblePL,
	shiftPosInPlaylist,
	trimPlaylist as trimPL,
	unsetVisiblePlaylist as unsetVisiblePL,
	updatePlaylistDuration,
	updatePlaylistKaraCount,
	updatePlaylistLastEditTime,
	unsetCurrentPlaylist,
	unsetPublicPlaylist,
} from '../dao/playlist';

//KM Modules
import {updateSongsLeft, findUserByName} from './user';
import {Token, User} from '../lib/types/user';
import { isAllKaras, formatKaraList, getKaras, getKara} from './kara';
import {playPlayer, playingUpdated} from './player';
import {getBlacklist} from './blacklist';
import {updateFreeOrphanedSongs as updateFreeOrphanedSongsDB,
	getKaraMini,
	removeKaraFromPlaylist,
	addKaraToPlaylist as addKaraToPL,
	getSongTimeSpentForUser,
	getSongCountForUser,
	addKaraToRequests
} from '../dao/kara';
import { Playlist, PLC, Pos, PlaylistOpts, PlaylistExport, PLCEditParams, CurrentSong } from '../types/playlist';
import { DBPLC } from '../types/database/playlist';
import { bools } from '../lib/utils/constants';
import { check } from '../lib/utils/validators';

let databaseBusy = false;

on('databaseBusy', (status: boolean) => {
	databaseBusy = status;
});

/** Test if basic playlists exist */
export async function testPlaylists() {
	await testCurrentPlaylist();
	await testPublicPlaylist();
}

/** Getting position of the currently playing karaoke in a playlist */
function getPlayingPos(playlist: PLC[]): Pos {
	const index = playlist.findIndex(e => e.flag_playing);
	if (index > -1) return {
		plc_id_pos: playlist[index].pos,
		index: index
	};
	return undefined;
}

/** Set PLC's flag_free to enabled */
export async function freePLC(plc_id: number) {
	return await setPLCFree(plc_id);
}

/** Free all PLCs before a certain position in a playlist */
export async function freePLCBeforePos(pos: number, playlist_id: number) {
	return await setPLCFreeBeforePos(pos, playlist_id);
}

/** Checks if user is allowed to add a song (quota) */
export async function isUserAllowedToAddKara(playlist_id: number, requester: string, duration: number): Promise<boolean> {
	const conf = getConfig();
	if (+conf.Karaoke.Quota.Type === 0) return true;
	const user = await findUserByName(requester);
	let limit: number;
	switch(+conf.Karaoke.Quota.Type) {
	default:
	case 1:
		limit = conf.Karaoke.Quota.Songs;
		try {
			const count = await getSongCountForUser(playlist_id,user.login);
			if (count >= limit) {
				logger.debug(`[PLC] User ${requester} tried to add more songs than he/she was allowed (${limit})`);
				return false;
			}
			return true;
		} catch (err) {
			throw err;
		}
	case 2:
		limit = conf.Karaoke.Quota.Time;
		try {
			let time = await getSongTimeSpentForUser(playlist_id,user.login);
			if (!time) time = 0;
			if ((limit - time - duration) < 0) {
				logger.debug(`[PLC] User ${requester} tried to add more songs than he/she was allowed (${limit - time} seconds of time credit left and tried to add ${duration} seconds)`);
				return false;
			}
			return true;
		} catch(err) {
			throw err;
		}
	}
}

/** Find out which ID is the Current Playlist */
export async function findCurrentPlaylist(): Promise<number> {
	const res = await getCurrentPlaylist();
	if (res) return res.playlist_id;
	return undefined;
}

/** Find out which ID is the Public Playlist */
export async function findPublicPlaylist(): Promise<number> {
	const res = await getPublicPlaylist();
	if (res) return res.playlist_id;
	return undefined;
}

/** Set a PLC flag_playing to enabled */
async function setPlaying(plc_id: number, playlist_id: number) {
	if (plc_id) await setPlayingFlag(plc_id, playlist_id);
	emitWS('playingUpdated',{
		playlist_id: playlist_id,
		plc_id: plc_id,
	});
	updatePlaylistDuration(playlist_id);
}

/** Get PLC IDs by a particular date added */
async function getPLCIDByDate(playlist_id: number, date_added: Date) {
	return await getPLCByDate(playlist_id, date_added);
}

/** Trim playlist after a certain duration */
export async function trimPlaylist(playlist_id: number, duration: number) {
	const durationSecs = duration * 60;
	let durationPL = 0;
	let lastPos = 1;
	const pl = await getPlaylistContentsMini(playlist_id);
	// Going through the playlist and updating lastPos on each item
	// Until we hit the limit for duration
	const needsTrimming = pl.some((kara: PLC) => {
		lastPos = kara.pos;
		durationPL = durationPL + kara.duration;
		return durationPL > durationSecs;
	});
	if (needsTrimming) await trimPL(playlist_id, lastPos);
	await Promise.all([
		updatePlaylistDuration(playlist_id),
		updatePlaylistKaraCount(playlist_id)
	]);
	updatePlaylistLastEditTime(playlist_id);
}

/** Set playlist as current */
export async function setCurrentPlaylist(playlist_id: number) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw 'Playlist unknown';
	if (pl.flag_public) throw 'PL_SET_CURRENT_PUBLIC_ERROR';
	try {
		const oldCurrentPlaylist_id = getState().currentPlaylistID;
		await unsetCurrentAllPlaylists();
		await setCurrentPL(playlist_id);
		updatePlaylistLastEditTime(playlist_id);
		emitWS('playlistInfoUpdated', playlist_id);
		emitWS('playlistInfoUpdated', oldCurrentPlaylist_id);
		setState({currentPlaylistID: playlist_id});
		logger.info(`[Playlist] Playlist ${pl.name} is now current`);
		return playlist_id;
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	}
}

/** Set playlist as visible to regular users */
export async function setVisiblePlaylist(playlist_id: number) {
	await setVisiblePL(playlist_id);
	updatePlaylistLastEditTime(playlist_id);
}

/** Set playlist as invisible to regular users */
export async function unsetVisiblePlaylist(playlist_id: number) {
	await unsetVisiblePL(playlist_id);
	updatePlaylistLastEditTime(playlist_id);
}

/** Set playlist as public */
export async function setPublicPlaylist(playlist_id: number) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw 'Playlist unknown';
	if (pl.flag_current) throw 'PL_SET_PUBLIC_CURRENT_ERROR';
	try {
		const oldPublicPlaylist_id = getState().publicPlaylistID;
		await unsetPublicAllPlaylists();
		await setPublicPL(playlist_id);
		updatePlaylistLastEditTime(playlist_id);
		emitWS('playlistInfoUpdated', playlist_id);
		emitWS('playlistInfoUpdated', oldPublicPlaylist_id);
		setState({publicPlaylistID: playlist_id});
		logger.info(`[Playlist] Playlist ${pl.name} is now public`);
		return playlist_id;
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	}
}

/** Remove playlist entirely */
export async function deletePlaylist(playlist_id: number) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw {message: `Playlist ${playlist_id} unknown`};
	try {
		profile('deletePlaylist');
		logger.info(`[Playlist] Deleting playlist ${pl.name}`);
		if (pl.flag_public) throw `Playlist ${playlist_id} is public. Unable to delete it. Make another playlist public first.`;
		if (pl.flag_current) throw `Playlist ${playlist_id} is current. Unable to delete it. Make another playlist current first.`;
		return await deletePL(playlist_id);
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	} finally {
		profile('deletePlaylist');
	}
}

/** Empty playlist completely */
export async function emptyPlaylist(playlist_id: number): Promise<number> {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw 'Playlist unknown';
	try {
		profile('emptyPL');
		logger.debug(`[Playlist] Emptying playlist ${pl.name}`);
		await emptyPL(playlist_id);
		await Promise.all([
			updatePlaylistKaraCount(playlist_id),
			updatePlaylistDuration(playlist_id)
		]);
		updatePlaylistLastEditTime(playlist_id);
		return playlist_id;
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	} finally {
		profile('emptyPL');
	}
}

/** Edit playlist properties */
export async function editPlaylist(playlist_id: number, playlist: Playlist) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw `Playlist ${playlist_id} unknown`;
	try {
		logger.debug(`[Playlist] Editing playlist ${playlist_id} : ${JSON.stringify(playlist)}`);
		await editPL({
			id: playlist_id,
			name: playlist.name,
			modified_at: new Date(),
			flag_visible: playlist.flag_visible
		});
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	}
}

/** Create new playlist */
export async function createPlaylist(name: string, opts: PlaylistOpts,username: string) {
	if (+opts.current && +opts.public) throw 'A playlist cannot be current and public at the same time!';
	if (+opts.public) await unsetPublicAllPlaylists();
	if (+opts.current) await unsetCurrentAllPlaylists();
	return await createPL({
		name: name,
		created_at: new Date(),
		modified_at: new Date(),
		flag_visible: opts.visible,
		flag_current: opts.current,
		flag_public: opts.public,
		username: username
	});
}

/** Get playlist properties */
export async function getPlaylistInfo(playlist_id: number, token?: Token) {
	const pl = await getPLInfo(playlist_id);
	if (token) {
		if (token.role === 'admin' || pl.flag_visible) return pl;
		return null;
	}
	return pl;
}

/** Get all playlists properties */
export async function getPlaylists(token: Token) {
	profile('getPlaylists');
	let seenFromUser = true;
	if (token.role === 'admin') seenFromUser = false;
	const ret = await getPLs(seenFromUser);
	profile('getPlaylists');
	return ret;
}

/** Remove public property from all playlists */
async function unsetPublicAllPlaylists() {
	return await unsetPublicPlaylist();
}

/** Remove current property from all playlists */
async function unsetCurrentAllPlaylists() {
	return await unsetCurrentPlaylist();
}

/** Get playlist contents in a smaller format to speed up fetching data for internal use */
export async function getPlaylistContentsMini(playlist_id: number) {
	return await getPLContentsMini(playlist_id);
}

/** Get playlist contents */
export async function getPlaylistContents(playlist_id: number, token: Token, filter: string, lang: string, from = 0, size = 99999999999, random = 0) {
	const plInfo = await getPlaylistInfo(playlist_id, token);
	try {
		profile('getPLC');
		if (token.role !== 'admin' && !plInfo.flag_visible) throw `Playlist ${playlist_id} unknown`;
		const pl = await getPLContents({
			playlist_id: playlist_id,
			username: token.username,
			filter: filter,
			lang: lang,
			random: random
		});
		if (from === -1) {
			const pos = getPlayingPos(pl);
			pos
				? from = pos.index
				: from = 0;
		}
		profile('getPLC');
		return formatKaraList(pl.slice(from, from + size), from, pl.length, lang);
	} catch(err) {
		throw {
			message: err
		};
	}
}

/** Get song information from a particular PLC */
export async function getKaraFromPlaylist(plc_id: number, token: Token) {
	profile('getPLCInfo');
	const kara = await getPLCInfo(plc_id, token.role === 'user', token.username);
	if (!kara) throw 'PLCID unknown';
	profile('getPLCInfo');
	return kara;
}

/** Get PLC by KID and Username */
async function getPLCByKIDUser(kid: string, username: string, playlist_id: number) {
	return await getPLCByKIDAndUser(kid, username, playlist_id);
}

/** Return all songs not present in specified playlist */
export function isAllKarasInPlaylist(karas: PLC[], karasToRemove: PLC[]) {
	return karas.filter(k => !karasToRemove.map(ktr => ktr.unique_id).includes(k.unique_id));
}

/** Add song to playlist */
export async function addKaraToPlaylist(kids: string|string[], requester: string, playlist_id?: number, pos?: number) {
	let addByAdmin = true;
	const conf = getConfig();
	let errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR';
	const state = getState();
	let karas: string[] = (typeof kids === 'string') ? kids.split(',') : kids;
	if (!playlist_id) {
		addByAdmin = false;
		playlist_id = state.modePlaylistID;
	}
	let [pl, kara] = await Promise.all([
		getPlaylistInfo(playlist_id),
		getKaraMini(karas[0])
	]);
	try {
		profile('addKaraToPL');
		if (!pl) throw {code: 1, msg: `Playlist ${playlist_id} unknown`};
		const karasUnknown = await isAllKaras(karas);
		if (karasUnknown.length > 0) throw {code: 3, msg: 'One of the karaokes does not exist'};
		logger.debug(`[Playlist] Adding ${karas.length} karaokes to playlist ${pl.name || 'unknown'} by ${requester} : ${kara.title || 'unknown'}...`);
		if (!addByAdmin) {
			// Check user quota first
			if (!await isUserAllowedToAddKara(playlist_id, requester, kara.duration)) {
				errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED';
				throw 'User quota reached';
			}
			// Check if karaoke is in blacklist
			const blacklist = await getBlacklist({});
			if (blacklist.content.some(blc => {
				return blc.kid === karas[0];
			})) {
				errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_BLACKLISTED';
				throw 'Song is blacklisted';
			}
		}
		// Everything's daijokay, user is allowed to add a song.
		// User should exist, but we need its profile anyway.
		const user: User = await findUserByName(requester);
		if (!user) throw {code: 2, msg: 'User does not exist'};
		const date_add = new Date();
		let karaList: PLC[] = karas.map(kid => {
			return {
				kid: kid,
				username: requester,
				nickname: user.nickname,
				playlist_id: +playlist_id,
				created_at: date_add
			};
		});

		const [userMaxPosition, numUsersInPlaylist, playlistMaxPos] = await Promise.all([
				getMaxPosInPlaylistForUser(playlist_id, user.login),
				countPlaylistUsers(playlist_id),
				getMaxPosInPlaylist(playlist_id),
			]);
		const plContents = await getPlaylistKaraIDs(playlist_id);
		// Making a unique ID depending on if we're in public playlist or something else.
		// Unique ID here is to determine if a song is already present or not
		// A person cannot add a song a second time if it's already pending. However, if it's been already played, it won't count
		const playingObject = getPlayingPos(plContents);
		const playingPos = playingObject
			? playingObject.plc_id_pos
			: 0;
		// If no song is currently playing, plContentsBeforePlay returns all songs in playlist. These are all songs not played yet.
		const plContentsBeforePlay = plContents.filter((plc: PLC) => plc.pos >= playingPos);
		if (conf.Playlist.AllowDuplicates) {
			if (!pl.flag_public) {
				plContentsBeforePlay.forEach((p: PLC) => p.unique_id = `${p.kid}_${p.username}`);
				karaList.forEach(k => k.unique_id = `${k.kid}_${user.login}`);
			} else {
				plContentsBeforePlay.forEach((p: PLC) => p.unique_id = `${p.kid}`);
				karaList.forEach(k => k.unique_id = `${k.kid}`);
			}
		} else {
			plContentsBeforePlay.forEach((p: PLC) => p.unique_id = `${p.kid}`);
			karaList.forEach(k => k.unique_id = `${k.kid}`);
		}
		let removeDuplicates = false;
		if (addByAdmin) {
			if (conf.Playlist.AllowDuplicates) {
				// Adding duplicates is not allowed on public playlists
				if (pl.flag_public) removeDuplicates = true;
				// Don't remove duplicates if it's another playlist type. Admin can add a song multiple times in the current or any other playlist, even by the same user
			} else {
				// Option to allow is not set : removing duplicates from songs to add
				removeDuplicates = true;
			}
		} else {
			// Not an admin adding this. Removing duplicates
			removeDuplicates = true;
		}
		if (removeDuplicates) {
			karaList = isAllKarasInPlaylist(karaList, plContentsBeforePlay);
		}
		// If AllowDuplicateSeries is set to false, remove all songs with the same SIDs
		if (!conf.Playlist.AllowDuplicateSeries && !addByAdmin) {
			const seriesSingersInPlaylist = plContentsBeforePlay.map(plc => {
				if (plc.serie) return plc.serie
				return plc.singer[0].name;
			});
			for (const i in karaList) {
				const karaInfo = await getKara(karaList[i].kid, {username: 'admin', role: 'admin'});
				karaInfo.serie
					? karaList[i].uniqueSerieSinger = karaInfo.serie
					: karaList[i].uniqueSerieSinger = karaInfo.singers[0].name
			}
			karaList = karaList.filter(k => {
				return !seriesSingersInPlaylist.includes(k.uniqueSerieSinger);
			});
			if (karaList.length === 0) throw {
				code: 5,
				msg: `Adding karaokes from the same series / singer is not allowed`
			}
		}
		if (karaList.length === 0) throw {
			code: 4,
			msg: `No karaoke could be added, all are in destination playlist already (PLID : ${playlist_id})`
		};
		// Song requests by admins are ignored and not added to requests stats
		if (!addByAdmin) addKaraToRequests(user.login, karaList.map(k => k.kid));
		/*
		If pos is provided, we need to update all karas above that and add karas.length to the position
		If pos is not provided, we need to get the maximum position in the PL
		And use that +1 to set our song's playlist position.
		If pos is -1, we must add it after the currently flag_playing karaoke.
		Position management here :
		*/
		if (conf.Karaoke.SmartInsert && user.type !== 0) {
			if (userMaxPosition === null) {
				// No songs yet from that user, they go first.
				pos = -1;
			} else if (userMaxPosition < playingPos) {
				// No songs enqueued in the future, they go first.
				pos = -1;
			} else {
				// Everyone is in the queue, we will leave an empty spot for each user and place ourselves next.
				pos = Math.min(playlistMaxPos + 1, userMaxPosition + numUsersInPlaylist);
			}
		}
		// Find out position of currently playing karaoke
		// If no flag_playing is found, we'll add songs at the end of playlist.
		if (pos === -1) pos = playingPos + 1;
		if (pos) {
			await shiftPosInPlaylist(playlist_id, pos, karas.length);
		} else {
			pos = playlistMaxPos + 1;
		}
		for (const i in karaList) {
			karaList[i].pos = pos + +i;
		}

		// Adding song to playlsit at long last!
		await addKaraToPL(karaList);
		updatePlaylistLastEditTime(playlist_id);
		// Checking if a flag_playing is present inside the playlist.
		// If not, we'll have to set the karaoke we just added as the currently playing one. updatePlaylistDuration is done by setPlaying already.
		if (!plContents.some((plc: PLC) => plc.flag_playing)) {
			const plc_id = await getPLCIDByDate(playlist_id, date_add);
			await setPlaying(plc_id, playlist_id);
		} else {
			await updatePlaylistDuration(playlist_id);
		}
		if (conf.Karaoke.Autoplay &&
			+playlist_id === state.currentPlaylistID &&
			state.status === 'stop' ) playPlayer();
		await Promise.all([
			updatePlaylistKaraCount(playlist_id),
			updateSongsLeft(user.login, playlist_id)
		]);
		return {
			kara: kara.title,
			playlist: pl.name,
			kid: karaList.map(k => k.kid),
			playlist_id: playlist_id
		};
	} catch(err) {
		logger.error(`[Playlist] Unable to add karaokes : ${JSON.stringify(err)}`);
		if (err.code === 4) errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_ALREADY_ADDED';
		if (err.code === 5) errorCode =
		'PLAYLIST_MODE_ADD_SONG_ERROR_NO_DUPLICATE_SERIES_SINGERS';
		let plname : string;
		pl ? plname = pl.name : plname = 'Unknown';
		throw {
			code: errorCode,
			message: err.msg,
			data: {
				kara: karas,
				playlist: plname || 'unknown',
				user: requester
			}
		};
	} finally {
		profile('addKaraToPL');
	}
}

/** Get PLC information from database */
export async function getPLCInfo(plc_id: number, forUser: boolean, username: string) {
	return await getPLCInfoDB(plc_id, forUser, username);
}

/** Get a small amount of data from a PLC */
export async function getPLCInfoMini(plc_id: number) {
	return await getPLCInfoMiniDB(plc_id);
}

/** Copy song from one playlist to another */
export async function copyKaraToPlaylist(plc_id: number[], playlist_id: number, pos?: number) {
	const [plcData, pl] = await Promise.all([
		getPLCInfoMini(plc_id[0]),
		getPlaylistInfo(playlist_id)
	]);
	if (!pl) throw `Playlist ${playlist_id} unknown`;
	if (!plcData) throw `PLC ${plcData[0]} unknown`;
	logger.info(`[Playlist] Copying ${plc_id.length} karaokes to playlist ${pl.name} : ${plcData.title}...`);
	try {
		profile('copyKaraToPL');
		const playlist = await getPlaylistKaraIDs(playlist_id);
		// plcs is an array of plc_ids.
		const date_add = new Date();
		let plcList: PLC[] = plc_id.map(p => {
			return {
				playlistcontent_id: p,
				playlist_id: playlist_id,
				date_add: date_add
			};
		});
		for (const index in plcList) {
			const plcData = await getPLCInfoMini(plcList[index].playlistcontent_id);
			if (!plcData) throw `PLC ${plcList[index].playlistcontent_id} does not exist`;
			plcList[index].kid = plcData.kid;
			plcList[index].nickname = plcData.nickname;
			plcList[index].created_at = new Date();
			plcList[index].username = plcData.username;
			plcList[index].playlist_id = playlist_id;
		}
		// Remove karas already in playlist
		plcList = plcList.filter(plc => !playlist.map(e => e.kid).includes(plc.kid));
		// If pos is provided, we need to update all karas above that and add
		// karas.length to the position
		// If pos is not provided, we need to get the maximum position in the PL
		// And use that +1 to set our playlist position.
		if (pos) {
			await shiftPosInPlaylist(playlist_id, pos, plcList.length);
		} else {
			const maxpos = await getMaxPosInPlaylist(playlist_id);
			let startpos = maxpos + 1;
			for (const i in plcList) {
				plcList[i].pos = startpos + +i;
			};
		}
		await addKaraToPL(plcList);
		await Promise.all([
			updatePlaylistDuration(playlist_id),
			updatePlaylistKaraCount(playlist_id)
		]);
		updatePlaylistLastEditTime(playlist_id);
		return playlist_id;
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	} finally {
		profile('addKaraToPL');
	}
}

/** Remove song from a playlist */
export async function deleteKaraFromPlaylist(plcs: number[], playlist_id:number, token?: Token) {
	// If playlist_id is null, set it to current/public PL ID
	// It's called from the public interface if null.
	profile('deleteKara');
	if (!playlist_id) playlist_id = getState().modePlaylistID;
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw `Playlist ${playlist_id} unknown`;
	// If we get a single song, it's a user deleting it (most probably)
	const plcData = await getPLCInfoMini(plcs[0]);
	if (!plcData) throw 'At least one playlist content is unknown'	;
	logger.debug(`[Playlist] Deleting karaokes from playlist ${pl.name} : ${plcData.title}...`);
	try {
		//If token is present, a user is trying to remove a karaoke
		if (token && token.role !== 'admin' && plcData.username !== token.username) throw 'You cannot delete a song you did not add';
		// Removing karaoke here.
		await removeKaraFromPlaylist(plcs, playlist_id);
		await Promise.all([
			updatePlaylistDuration(playlist_id),
			updatePlaylistKaraCount(playlist_id),
			reorderPlaylist(playlist_id)
		]);
		updatePlaylistLastEditTime(playlist_id);
		profile('deleteKara');
		return {
			pl_id: playlist_id,
			pl_name: pl.name
		};
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	} finally {
		profile('deleteKara');
	}

}

/** Edit PLC's properties in a playlist */
export async function editPLC(plc_id: number, params: PLCEditParams, token: Token) {
	profile('editPLC');
	if (params.flag_playing === false) throw 'flag_playing cannot be unset! Set it to another karaoke to unset it on this one';
	if (params.flag_free === false) throw 'flag_free cannot be unset!';
	const plcData = await getPLCInfoMini(plc_id);
	if (!plcData) throw 'PLC ID unknown';
	const pl = await getPlaylistInfo(plcData.playlist_id);
	if (token.role !== 'admin' && !pl.flag_visible) throw `Playlist ${plcData.playlist_id} unknown`;
	if (params.flag_playing === true) {
		await setPlaying(plc_id, pl.playlist_id);
		if (pl.flag_current) playingUpdated();
	}
	if (params.flag_free === true) {
		await freePLC(plc_id);
		updateSongsLeft(plcData.username, pl.playlist_id);
	}
	if (params.flag_visible === true) await setPLCVisible(plc_id);
	if (params.flag_visible === false) await setPLCInvisible(plc_id);
	if (params.pos) {
		await shiftPosInPlaylist(pl.playlist_id, params.pos, 1);
		await setPos(plc_id, params.pos);
		await reorderPlaylist(pl.playlist_id);
	}
	updatePlaylistLastEditTime(pl.playlist_id);
	profile('editPLC');
	return {
		pl_id: pl.playlist_id
	};
}

/** Reorders playlist with positions */
export async function reorderPlaylist(playlist_id: number) {
	return await reorderPL(playlist_id);
}

/** Export playlist as JSON */
export async function exportPlaylist(playlist_id: number) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw `Playlist ${playlist_id} unknown`;
	try {
		logger.debug( `[Playlist] Exporting playlist ${playlist_id}`);
		const plContents = await getPlaylistContentsMini(playlist_id);
		let playlist: PlaylistExport = {};
		const plExport = {
			name: pl.name,
			created_at: pl.created_at,
			modified_at: pl.modified_at,
			flag_visible: pl.flag_visible
		};
		const plcFiltered = plContents.map((plc: any) => {
			return {
				kid: plc.kid,
				nickname: plc.nickname,
				created_at: plc.created_at,
				pos: plc.pos,
				username: plc.username,
				serie: plc.serie,
				title: plc.title,
				songtype: plc.songtypes[0].name,
				songorder: plc.songorder,
				language: plc.langs[0].name,
				flag_playing: plc.flag_playing || undefined
			};
		});
		playlist.Header = {
			version: 4,
			description: 'Karaoke Mugen Playlist File',
		};
		playlist.PlaylistInformation = plExport;
		playlist.PlaylistContents = plcFiltered;
		return playlist;
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	}
}

const PLImportConstraints = {
	'Header.description': {presence: true},
	'Header.version': {numericality: {onlyInteger: true, equalTo: 4}},
	'PlaylistInformation.created_at': {presence: {allowEmpty: false}},
	'PlaylistInformation.modified_at': {presence: {allowEmpty: false}},
	'PlaylistInformation.name': {presence: {allowEmpty: false}},
	'PlaylistInformation.flag_visible': {inclusion: bools},
	PlaylistContents: {PLCsValidator: true}
}

export const PLCImportConstraints = {
	kid: {presence: true, uuidArrayValidator: true},
	created_at: {presence: {allowEmpty: false}},
	flag_playing: {inclusion: bools},
	pos: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	nickname: {presence: {allowEmpty: false}},
	username: {presence: {allowEmpty: false}}
}

/** Import playlist from JSON */
export async function importPlaylist(playlist: any, username: string, playlist_id?: number) {
	// Check if format is valid :
	// Header must contain :
	// description = Karaoke Mugen Playlist File
	// version <= 4
	//
	// PlaylistContents array must contain at least one element.
	// That element needs to have at least kid. flag_playing is optional
	// kid must be uuid
	// Test each element for those.
	//
	// PlaylistInformation must contain :
	// - flag_visible : (true / false)
	// - name : playlist name
	//
	// If all tests pass, then add playlist, then add karas
	// Playlist can end up empty if no karaokes are found in database
	try {
		logger.debug(`[Playlist] Importing playlist ${JSON.stringify(playlist, null, 2)}`);
		const validationErrors = check(playlist, PLImportConstraints)
		if (validationErrors) throw `Playlist file is invalid : ${JSON.stringify(validationErrors)}`;
		let playingKara: PLC = {
			playlist_id: null
		};
		let flag_playingDetected = false;
		for (const index in playlist.PlaylistContents) {
			const kara = playlist.PlaylistContents[index];
			if (kara.flag_playing === true) {
				if (flag_playingDetected) throw 'Playlist contains more than one currently playing marker';
				flag_playingDetected = true;
				playingKara.kid = kara.kid;
				playingKara.username = kara.username;
			}
			const user = await findUserByName(kara.username);
			if (!user) {
				// If user isn't found locally, replacing it with admin user
				playlist.PlaylistContents[index].username = 'admin';
				const admin: User = await findUserByName('admin');
				playlist.PlaylistContents[index].nickname = admin.nickname;
			}
		};
		// Validations done. First creating playlist.
		try {
			if (!playlist_id) {
				playlist_id = await createPlaylist(playlist.PlaylistInformation.name, {
					visible: playlist.PlaylistInformation.flag_visible
				}, username);
			} else {
				await emptyPlaylist(playlist_id);
			}
			const unknownKaras = await isAllKaras(playlist.PlaylistContents.map((plc: PLC) => plc.kid));
			const karasToImport = playlist.PlaylistContents.filter((plc: PLC) => !unknownKaras.includes(plc.kid));
			for (const i in karasToImport) {
				karasToImport[i].playlist_id = playlist_id;
			}
			await addKaraToPL(karasToImport);
			if (playingKara && playingKara.kid) {
				const plcPlaying = await getPLCByKIDUser(playingKara.kid, playingKara.username, playlist_id);
				await setPlaying(plcPlaying.playlistcontent_id, playlist_id);
			}
			return {
				playlist_id: playlist_id,
				karasUnknown: unknownKaras
			};
		} catch(err) {
			throw err;
		}
	} catch(err) {
		logger.error(`[Playlist] Import failed : ${err}`);
		throw err;
	}
}

/** Shuffle (smartly or not) a playlist */
export async function shufflePlaylist(playlist_id: number, isSmartShuffle?: boolean) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw `Playlist ${playlist_id} unknown`;
	// We check if the playlist to shuffle is the current one. If it is, we will only shuffle
	// the part after the song currently being played.
	try {
		profile('shuffle');
		let playlist = await getPlaylistContentsMini(playlist_id);
		if (!pl.flag_current) {
			isSmartShuffle
				? playlist = smartShuffle(playlist)
				: playlist = shuffle(playlist);
		} else {
			// If it's current playlist, we'll make two arrays out of the playlist :
			// - One before (and including) the current song being played (flag_playing = true)
			// - One after.
			// We'll shuffle the one after then concatenate the two arrays.
			const playingPos = getPlayingPos(playlist);
			if (playingPos) {
				const BeforePlaying = playlist.filter(plc => plc.pos <= playingPos.plc_id_pos);
				let AfterPlaying = playlist.filter(plc => plc.pos > playingPos.plc_id_pos);
				isSmartShuffle
					? AfterPlaying = smartShuffle(AfterPlaying)
					: AfterPlaying = shuffle(AfterPlaying);
				playlist = BeforePlaying.concat(AfterPlaying);
			} else {
			// If no flag_playing has been set, the current playlist won't be shuffled. To fix this, we shuffle the entire playlist if no flag_playing has been met
				isSmartShuffle
					? playlist = smartShuffle(playlist)
					: playlist = shuffle(playlist);
			}
		}
		await replacePlaylist(playlist);
		updatePlaylistLastEditTime(playlist_id);
		logger.info(`[Playlist] Playlist ${pl.name} shuffled`);
		return pl.name;
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	} finally {
		profile('shuffle');
	}
}

/** Smart shuffle */
function smartShuffle(playlist: DBPLC[]) {
	let userShuffleBoolean = false; // boolean to add a shuffle condition if the number of user is high enough
	playlist = shuffle(playlist);
	let verificator = 0;
	if (playlist.length - 6 > 0) {      // We do nothing if the playlist length is too low
		let userTest = 1;
		let userTestArray = [playlist[0].nickname];
		for (const playlistItem of playlist) {
			if (!userTestArray.includes(playlistItem.nickname)) {
				userTestArray.push(playlistItem.nickname);
				userTest++;
			}
		}
		if (userTest > 5) userShuffleBoolean = true;
		let user_iterator = 0;
		if (userShuffleBoolean) {
			while (playlist.length - user_iterator > 0) {
				if ((playlist.length - user_iterator) > 6) {
					let playlist_temp = playlist.slice(user_iterator, user_iterator + 6);
					for (let i = 0; i < 5; i++) {
						if (playlist_temp[i].nickname === playlist_temp[i + 1].nickname) {
							if (playlist[i + 4 + user_iterator]) {
								let a = playlist_temp[i + 1];
								playlist[i + 1 + user_iterator] = playlist[i + 4 + user_iterator];
								playlist[i + 4 + user_iterator] = a;
							} else {
								let a = playlist_temp[i + 1];
								playlist[i + 1 + user_iterator] = playlist[i - 5 + user_iterator];
								playlist[i - 5 + user_iterator] = a;
							}
						}
					}
				}
				user_iterator += 5;
			}
			let playlist_temp = playlist.slice(user_iterator - 1, playlist.length);

			for (let i = user_iterator; i < playlist_temp.length - 1; i++) {
				if (playlist_temp[i].nickname === playlist_temp[i + 1].nickname) verificator = i;
			}

			if (verificator !== 0) {
				let a = playlist_temp[verificator + 1];
				playlist[verificator + 1 + user_iterator] = playlist[2];
				playlist[2] = a;
			}
		}
		let duration_iterator = 0;

		while (playlist.length - duration_iterator > 0) {

			if (playlist.length - duration_iterator > 6) {
				let playlist_temp = playlist.slice(duration_iterator, duration_iterator + 6);
				for (let i = 0; i < 4; i++) {
					if (playlist_temp[i].duration > 150 && playlist_temp[i + 1].duration > 150) {
						if (playlist[i + 4 + duration_iterator]) {
							let a = playlist_temp[i + 1];
							playlist[i + 1 + duration_iterator] = playlist[i + 4 + duration_iterator];
							playlist[i + 4 + duration_iterator] = a;
						} else {
							let a = playlist_temp[i + 1];
							playlist[i + 1 + duration_iterator] = playlist[i - 5 + duration_iterator];
							playlist[i - 5 + duration_iterator] = a;
						}
					}
				}
			}
			duration_iterator += 6;
		}
	}

	return playlist;
}

/** Move to previous song */
export async function previousSong() {
	const playlist_id = getState().currentPlaylistID;
	const playlist = await getPlaylistContentsMini(playlist_id);
	if (playlist.length === 0) throw 'Playlist is empty!';
	let readpos = 0;
	const reachedPlaying = playlist.some((plc, index) => {
		readpos = index - 1;
		return plc.flag_playing;
	});
	// If readpos ends up being -1 then we're at the beginning of the playlist and can't go to the previous song
	if (!reachedPlaying) throw 'No playing kara in current playlist';
	if (readpos < 0) throw 'Current position is first song!';
	const kara = playlist[readpos];
	if (!kara) throw 'Karaoke received is empty!';
	await setPlaying(kara.playlistcontent_id, playlist_id);
}

/** Move to next song */
export async function nextSong() {
	const conf = getConfig();
	const playlist = await getCurrentPlaylistContents();
	// Test if we're at the end of the playlist and if RepeatPlaylist is set.
	if (playlist.content.length === 0) throw 'Playlist is empty!';
	if (playlist.index + 1 >= playlist.content.length && !conf.Karaoke.Repeat) {
		logger.debug('[PLC] End of playlist.');
		await setPlaying(null, playlist.id);
		throw 'Current position is last song!';
	} else {
		// If we're here, it means either we're beyond the length of the playlist
		// OR that RepeatPlaylist is set to 1.
		// We test again if we're at the end of the playlist. If so we go back to first song.
		if (conf.Karaoke.Repeat && playlist.index + 1 >= playlist.content.length) playlist.index = -1;
		const kara = playlist.content[playlist.index + 1];
		if (!kara) throw 'Karaoke received is empty!';
		await setPlaying(kara.playlistcontent_id, playlist.id);
	}
}

/** Get current playlist contents */
async function getCurrentPlaylistContents() {
	// Returns current playlist contents and where we're at.
	const playlist_id = getState().currentPlaylistID;
	const playlist = await getPlaylistContentsMini(playlist_id);
	// Setting readpos to 0. If no flag_playing is found in current playlist
	// Then karaoke will begin at the first element of the playlist (0)
	let readpos = 0;
	playlist.some((kara: PLC, index: number) => {
		if (kara.flag_playing) {
			readpos = index;
			return true;
		}
		return false;
	});
	return {
		id: playlist_id,
		content: playlist,
		index: readpos
	};
}

/** Get currently playing song's data */
export async function getCurrentSong(): Promise<CurrentSong> {
	try {
		const conf = getConfig();
		const playlist = await getCurrentPlaylistContents();
		// Search for currently playing song
		let updatePlayingKara = false;
		if (!playlist.index) {
			playlist.index = 0;
			updatePlayingKara = true;
		}
		const kara = playlist.content[playlist.index];
		if (!kara) throw 'No karaoke found in playlist object';
		// If there's no kara with a playing flag, we set the first one in the playlist
		if (updatePlayingKara) await setPlaying(kara.playlistcontent_id,playlist.id);
		// Let's add details to our object so the player knows what to do with it.
		kara.playlist_id = playlist.id;
		let requester: string;
		let avatarfile: string;
		if (conf.Karaoke.Display.Nickname) {
			// When a kara has been added by admin/import, do not display it on screen.
			// Escaping {} because it'll be interpreted as ASS tags below.
			kara.nickname = kara.nickname.replace(/[\{\}]/g,'');
			requester = `${i18n.t('REQUESTED_BY')} ${kara.nickname}`;
			// Get user avatar
			const user = await findUserByName(kara.username);
			avatarfile = resolve(resolvedPathAvatars(), user.avatar_file);
		} else {
			requester = '';
		}
		if (kara.title) kara.title = ` - ${kara.title}`;
		// If series is empty, pick singer information instead

		let series = kara.serie;
		if (!kara.serie) series = kara.singers.map(s => s.name).join(', ');

		// If song order is 0, don't display it (we don't want things like OP0, ED0...)
		let songorder: string = `${kara.songorder}`;
		if (!kara.songorder || kara.songorder === 0) songorder = '';
		//If karaoke is present in the public playlist, we're deleting it.
		if (conf.Playlist.RemovePublicOnPlay) {
			const playlist_id = getState().publicPlaylistID;
			const plc = await getPLCByKIDUser(kara.kid, kara.username, playlist_id);
			if (plc) await deleteKaraFromPlaylist([plc.playlistcontent_id], playlist_id);
		}
		const currentSong: CurrentSong = {...kara}
		// Construct mpv message to display.
		currentSong.infos = '{\\bord0.7}{\\fscx70}{\\fscy70}{\\b1}'+series+'{\\b0}\\N{\\i1}' +kara.songtypes[0].name+songorder+kara.title+'{\\i0}\\N{\\fscx50}{\\fscy50}'+requester;
		currentSong.avatar = avatarfile;
		return currentSong;
	} catch(err) {
		logger.error(`[Playlist] Error selecting current song to play : ${err}`);
	}
}

/** Build initial dummy playlist */
export async function buildDummyPlaylist() {
	const stats = await getStats();
	const state = getState();
	let karaCount = stats.karas;
	// Limiting to 5 sample karas to add if there's more.
	if (karaCount > 5) karaCount = 5;
	if (karaCount > 0) {
		logger.info(`[PLC] Dummy Plug : Adding ${karaCount} karas into current playlist`);
		const karas = await getKaras({
			size: karaCount,
			token: {username: 'admin', role: 'admin'},
			random: karaCount
		});
		karas.content.forEach(k => addKaraToPlaylist(k.kid, 'admin', state.currentPlaylistID));
		logger.info(`[PLC] Dummy Plug : Activation complete. The current playlist has now ${karaCount} sample songs in it.`);
		emitWS('playlistInfoUpdated', state.currentPlaylistID);
		emitWS('playlistContentsUpdated', state.currentPlaylistID);
		return true;
	} else {
		logger.warn('[PLC] Dummy Plug : your database has no songs! Maybe you should try to regenerate it?');
		return true;
	}
}

/** Flag songs as free if they are older than X minutes */
async function updateFreeOrphanedSongs() {
	try {
		if (!databaseBusy) await updateFreeOrphanedSongsDB(now(true) - (getConfig().Karaoke.Quota.FreeAutoTime * 60));
	} catch(err) {
		logger.error(`[Playlist] Failed to free orphaned songs (will try again) : ${err}`);
	}
}

/** Initialize playlist tasks */
export async function initPlaylistSystem() {
	setInterval(updateFreeOrphanedSongs, 60 * 1000);
}

/** Create current playlist if it doesn't exist */
export async function testCurrentPlaylist() {
	const currentPL_id = await findCurrentPlaylist();
	if (currentPL_id) {
		setState({currentPlaylistID: currentPL_id});
	} else {
		setState({currentPlaylistID: await createPlaylist(i18n.t('CURRENT_PLAYLIST'),{
			visible: true,
			current: true
		},'admin')
		});
		logger.debug('[Playlist] Initial current playlist created');
		if (!getState().isTest) buildDummyPlaylist();
	}
}

/** Create public playlist if it doesn't exist */
export async function testPublicPlaylist() {
	const publicPL_id = await findPublicPlaylist();
	if (publicPL_id) {
		setState({ publicPlaylistID: publicPL_id });
	} else {
		setState({ publicPlaylistID: await createPlaylist(i18n.t('PUBLIC_PLAYLIST'),{
			visible: true,
			public: true
		},'admin')
		});
		logger.debug('[Playlist] Initial public playlist created');
	}
}