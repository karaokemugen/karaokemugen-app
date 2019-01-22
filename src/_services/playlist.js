//Utils
import {uuidRegexp} from './constants';
import {getStats} from '../_dao/database';
import {getConfig} from '../_utils/config';
import {now} from 'unix-timestamp';
import logger from 'winston';
import shuffle from 'lodash.shuffle';
import {emitWS} from '../_webapp/frontend';
import {on} from '../_utils/pubsub';
import testJSON from 'is-valid-json';
import {setState, getState} from '../_utils/state';
import {profile} from '../_utils/logger';

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
	getPLCByKIDAndUserID,
	getPLCInfoMini as getPLCInfoMiniDB,
	getPLCInfo as getPLCInfoDB,
	raisePosInPlaylist,
	replacePlaylist,
	reorderPlaylist as reorderPL,
	setCurrentPlaylist as setCurrentPL,
	setPlaying as setPlayingFlag,
	setPLCFreeBeforePos,
	setPLCFree,
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
	unsetPlaying as unsetPlayingFlag,
	unsetPublicPlaylist,
} from '../_dao/playlist';

//KM Modules
import {updateSongsLeft, findUserByName} from './user';
import {translateKaraInfo, isAllKaras, formatKaraList, getRandomKara} from './kara';
import {playPlayer, playingUpdated} from './player';
import {isPreviewAvailable} from '../_webapp/previews';
import {getBlacklist} from './blacklist';
import {updateFreeOrphanedSongs as updateFreeOrphanedSongsDB,
	isKara,
	getKaraMini,
	removeKaraFromPlaylist,
	addKaraToPlaylist as addKaraToPL,
	isKaraInPlaylist as isKaraInPL,
	getSongTimeSpentForUser,
	getSongCountForUser,
	addKaraToRequests
} from '../_dao/kara';


let databaseBusy = false;

on('databaseBusy', status => {
	databaseBusy = status;
});

export async function testPlaylists() {
	await testCurrentPlaylist();
	await testPublicPlaylist();
}

function getPlayingPos(playlist) {
	// Function to run in array.some of a playlist to check if a kara is a flag_playing one, and get its position.
	let PLCIDPlayingPos;
	let indexPlaying;
	const isASongFlagPlaying = playlist.some((element,index) => {
		if (element.flag_playing) {
			PLCIDPlayingPos = element.pos;
			indexPlaying = index;
			return true;
		}
		return false;
	});
	if (isASongFlagPlaying) {
		return {
			plc_id_pos: PLCIDPlayingPos,
			index: indexPlaying
		};
	}
	return undefined;
}

export async function freePLC(plc_id) {
	return await setPLCFree(plc_id);
}

export async function freePLCBeforePos(pos, playlist_id) {
	return await setPLCFreeBeforePos(pos, playlist_id);
}

export async function isUserAllowedToAddKara(playlist_id,requester,duration) {
	const conf = getConfig();
	if (+conf.EngineQuotaType === 0) return true;
	const user = await findUserByName(requester);
	let limit;
	switch(+conf.EngineQuotaType) {
	default:
	case 1:
		limit = conf.EngineSongsPerUser;
		try {
			const count = await getSongCountForUser(playlist_id,user.login);
			if (count.count >= limit) {
				logger.info(`[PLC] User ${requester} tried to add more songs than he/she was allowed (${limit})`);
				return false;
			}
			return true;
		} catch (err) {
			throw err;
		}
	case 2:
		limit = getConfig().EngineTimePerUser;
		try {
			const time = await getSongTimeSpentForUser(playlist_id,user.login);
			if (!time.timeSpent) time.timeSpent = 0;
			if ((limit - time.timeSpent - duration) < 0) {
				logger.info(`[PLC] User ${requester} tried to add more songs than he/she was allowed (${limit - time.timeSpent} seconds of time credit left and tried to add ${duration} seconds)`);
				return false;
			}
			return true;
		} catch(err) {
			throw err;
		}
	}
}

export async function findCurrentPlaylist() {
	const res = await getCurrentPlaylist();
	if (res) return res.playlist_id;
	return false;
}

export async function findPublicPlaylist() {
	const res = await getPublicPlaylist();
	if (res) return res.playlist_id;
	return false;
}

async function setPlaying(plc_id,playlist_id) {
	await unsetPlayingFlag(playlist_id);
	if (plc_id) await setPlayingFlag(plc_id);
	emitWS('playingUpdated',{
		playlist_id: playlist_id,
		plc_id: plc_id,
	});
	updatePlaylistDuration(playlist_id);
	return true;
}

async function getPLCIDByDate(playlist_id,date_added) {
	return await getPLCByDate(playlist_id,date_added);
}

async function isKaraInPlaylist(kara_id,playlist_id) {
	return await isKaraInPL(kara_id,playlist_id);
}

export async function trimPlaylist(playlist_id,duration) {
	const durationSecs = duration * 60;
	let durationPL = 0;
	let lastPos = 1;
	const pl = await getPlaylistContentsMini(playlist_id);
	// Going through the playlist and updating lastPos on each item
	// Until we hit the limit for duration
	const needsTrimming = pl.some((kara) => {
		lastPos = kara.pos;
		durationPL = durationPL + kara.duration;
		return durationPL > durationSecs;
	});
	if (needsTrimming) await trimPL(playlist_id,lastPos);
	await Promise.all([
		updatePlaylistDuration(playlist_id),
		updatePlaylistKaraCount(playlist_id)
	]);
	updatePlaylistLastEditTime(playlist_id);
}

export async function setCurrentPlaylist(playlist_id) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw 'Playlist unknown';
	if (pl.flag_public) throw 'A current playlist cannot be set to public. Set another playlist to current first.';
	try {
		const state = getState();
		const oldCurrentPlaylist_id = state.currentPlaylistID;
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

export async function setVisiblePlaylist(playlist_id) {
	await setVisiblePL(playlist_id);
	updatePlaylistLastEditTime(playlist_id);
}

export async function unsetVisiblePlaylist(playlist_id) {
	await unsetVisiblePL(playlist_id);
	updatePlaylistLastEditTime(playlist_id);
}

export async function setPublicPlaylist(playlist_id) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw 'Playlist unknown';
	if (pl.flag_current) throw 'A public playlist cannot be set to current. Set another playlist to public first.';
	try {
		const state = getState();
		const oldPublicPlaylist_id = state.publicPlaylistID;
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

export async function deletePlaylist(playlist_id, token) {
	if (!token) token = {};
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw {
		message: `Playlist ${playlist_id} unknown`,
		data: null
	};
	try {
		profile('deletePlaylist');
		logger.info(`[Playlist] Deleting playlist ${pl.name}`);
		if (pl.flag_public) throw `Playlist ${playlist_id} is public. Unable to delete it`;
		if (pl.flag_current) throw `Playlist ${playlist_id} is current. Unable to delete it`;
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

export async function emptyPlaylist(playlist_id) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw 'Playlist unknown';
	try {
		profile('emptyPL');
		logger.info(`[Playlist] Emptying playlist ${pl.name}`);
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

export async function editPlaylist(playlist_id,playlist) {
	if (!await getPlaylistInfo(playlist_id)) throw `Playlist ${playlist_id} unknown`;
	try {
		logger.info(`[Playlist] Editing playlist ${playlist_id} : ${JSON.stringify(playlist)}`);
		await editPL({
			id: playlist_id,
			name: playlist.name,
			modified_at: new Date(),
			flag_visible: playlist.flag_visible
		});
	} catch(err) {
		const pl = await getPlaylistInfo(playlist_id);
		throw {
			message: err,
			data: pl.name
		};
	}
}

export async function createPlaylist(name,opts,username) {
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

export async function getPlaylistInfo(playlist_id, token) {
	const pl = await getPLInfo(playlist_id);
	if (token) {
		if (token.role === 'admin' || pl.flag_visible) return pl;
		return false;
	}
	return pl;
}

export async function getPlaylists(token) {
	profile('getPlaylists');
	let seenFromUser = true;
	if (token.role === 'admin') seenFromUser = false;
	const ret = await getPLs(seenFromUser);
	profile('getPlaylists');
	return ret;
}

async function unsetPublicAllPlaylists() {
	return await unsetPublicPlaylist();
}

async function unsetCurrentAllPlaylists() {
	return await unsetCurrentPlaylist();
}

export async function getPlaylistContentsMini(playlist_id) {
	return await getPLContentsMini(playlist_id);
}

export async function getPlaylistContents(playlist_id,token,filter,lang,from,size) {
	try {
		profile('getPLC');
		const plInfo = await getPlaylistInfo(playlist_id, token);
		if (token.role === 'admin' || plInfo.flag_visible) throw `Playlist ${playlist_id} unknown`;
		const pl = await getPLContents(playlist_id,token.username,filter,lang);
		if (from === -1) {
			const pos = getPlayingPos(pl);
			if (!pos) {
				from = 0;
			} else {
				from = pos.index;
			}
		}
		profile('getPLC');
		return formatKaraList(pl.slice(from || 0, from + size || undefined), lang, from, pl.length);
	} catch(err) {
		const pl = await getPlaylistInfo(playlist_id);
		throw {
			message: err,
			data: pl.name
		};
	}
}


export async function getKaraFromPlaylist(plc_id,lang,token) {
	profile('getPLCInfo');
	try {
		const kara = await getPLCInfo(plc_id, token.role === 'user', token.username);
		if (!kara) throw 'PLCID unknown';
		let output = translateKaraInfo([kara], lang);
		try {
			profile('previewCheck');
			const previewfile = await isPreviewAvailable(output[0].mediafile);
			if (previewfile) output[0].previewfile = previewfile;
			profile('previewCheck');
		} catch(err) {
			logger.warn(`[Previews] Error detecting previews : ${err}`);
		}
		profile('getPLCInfo');
		return output;
	} catch(err) {
		throw err;
	}
}

async function getPLCByKIDUser(kid,username,playlist_id) {
	return await getPLCByKIDAndUserID(kid,username,playlist_id);
}

export function isAllKarasInPlaylist(karas, karasToRemove) {
	return karas.filter(k => !karasToRemove.map(ktr => ktr.unique_id).includes(k.unique_id));
}

export async function addKaraToPlaylist(kids, requester, playlist_id, pos) {
	let addByAdmin = true;
	const conf = getConfig();
	let errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR';
	const state = getState();
	let karas = [kids];
	if (typeof kids === 'string') karas = kids.split(',');
	if (Array.isArray(kids)) karas = kids;
	if (!playlist_id) {
		addByAdmin = false;
		playlist_id = state.currentPlaylistID;
		if (!state.private) playlist_id = state.publicPlaylistID;
	}
	let [pl, kara] = await Promise.all([
		getPlaylistInfo(playlist_id),
		getKaraMini(parseInt(karas[0], 10))
	]);
	try {
		profile('addKaraToPL');
		if (!pl) throw {code: 1, msg: `Playlist ${playlist_id} unknown`};
		if (!await isAllKaras(karas)) throw {code: 3, msg: 'One of the karaokes does not exist'};
		logger.info(`[Playlist] Adding ${karas.length} karaokes to playlist ${pl.name || 'unknown'} by ${requester} : ${kara.title || 'unknown'}...`);

		if (!addByAdmin) {
			// Check user quota first
			if (!await isUserAllowedToAddKara(playlist_id,requester,kara.duration)) {
				errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED';
				throw 'User quota reached';
			}
			// Check if karaoke is in blacklist
			const blacklist = await getBlacklist();
			if (blacklist.content.some(blc => {
				return blc.kid === karas[0];
			})) {
				errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_BLACKLISTED';
				throw 'Song is blacklisted';
			}
		}
		let karaList = [];
		const user = await findUserByName(requester);
		if (!user) throw {code: 2, msg: 'User does not exist'};
		const date_add = new Date();
		karas.forEach((kid) => {
			karaList.push({
				kid: kid,
				username: requester,
				nickname: user.nickname,
				playlist_id: +playlist_id,
				created_at: date_add,
			});
		});
		const [userMaxPosition,
			numUsersInPlaylist,
			playlistMaxPos
		] =
			await Promise.all([
				getMaxPosInPlaylistForUser(playlist_id, user.login),
				countPlaylistUsers(playlist_id),
				getMaxPosInPlaylist(playlist_id),
			]);
		const plContents = await getPlaylistKaraIDs(playlist_id);
		// Making a unique ID depending on if we're in public playlist or something else.
		// Unique ID here is to determine if a song is already present or not
		if (+conf.EngineAllowDuplicates) {
			if (!pl.flag_public) {
				plContents.forEach(p => p.unique_id = `${p.kid}_${p.username}`);
				karaList.forEach(k => k.unique_id = `${k.kid}_${user.login}`);
			} else {
				plContents.forEach(p => p.unique_id = `${p.kid}`);
				karaList.forEach(k => k.unique_id = `${k.kid}`);
			}
		} else {
			plContents.forEach(p => p.unique_id = `${p.kid}`);
			karaList.forEach(k => k.unique_id = `${k.kid}`);
		}
		let removeDuplicates = false;
		if (addByAdmin) {
			if (+conf.EngineAllowDuplicates) {
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
			karaList = isAllKarasInPlaylist(karaList, plContents);
			if (karaList.length === 0) throw {
				code: 4,
				msg: `No karaoke could be added, all are in destination playlist already (PLID : ${playlist_id})`
			};
		}
		if (karaList.length === 0) throw {
			code: 4,
			msg: `No karaoke could be added, all are in destination playlist already (PLID : ${playlist_id})`
		};
		// Song requests by admins are ignored.
		if (!addByAdmin) addKaraToRequests(user.login, karaList);
		// If pos is provided, we need to update all karas above that and add
		// karas.length to the position
		// If pos is not provided, we need to get the maximum position in the PL
		// And use that +1 to set our playlist position.
		// If pos is -1, we must add it after the currently flag_playing karaoke.
		const playingObject = getPlayingPos(plContents);
		const playingPos = playingObject ? playingObject.plc_id_pos : 0;
		// Position management here :
		if (+conf.EngineSmartInsert && user.type !== 0) {
			if (userMaxPosition === null) {
				// No songs yet from that user, they go first.
				pos = -1;
			} else if (userMaxPosition < playingPos) {
				// No songs enqueued in the future, they go first.
				pos = -1;
			} else {
				// Everyone is in the queue, we will leave an empty spot for each user and place ourselves next.
				pos = Math.min(playlistMaxPos.maxpos + 1, userMaxPosition.maxpos + numUsersInPlaylist);
			}
		}
		// Find out position of currently playing karaoke
		// If no flag_playing is found, we'll add songs at the end of playlist.
		if (pos === -1) pos = playingPos + 1;
		if (pos) {
			await shiftPosInPlaylist(playlist_id, pos, karas.length);
			karaList.forEach((kara, index) => {
				karaList[index].pos = pos + index;
			});
		} else {
			const startpos = playlistMaxPos.maxpos + 1.0;
			for (const i in karaList) {
				karaList[i].pos = startpos + +i;
			}
		}
		await addKaraToPL(karaList);
		updatePlaylistLastEditTime(playlist_id);
		// Checking if a flag_playing is present inside the playlist.
		// If not, we'll have to set the karaoke we just added as the currently playing one. updatePlaylistDuration is done by setPlaying already.
		if (!plContents.some(plc => plc.flag_playing)) {
			const plc = await getPLCIDByDate(playlist_id, date_add);
			await setPlaying(plc.playlistcontent_id, playlist_id);
		} else {
			await updatePlaylistDuration(playlist_id);
		}
		if (+conf.EngineAutoPlay &&
			+playlist_id === state.currentPlaylistID &&
			state.status === 'stop' ) playPlayer();
		await updatePlaylistKaraCount(playlist_id);
		const karaAdded = karaList.map(k => k.kid);
		await updateSongsLeft(user.login, playlist_id);
		return {
			kara: kara.title,
			playlist: pl.name,
			kid: karaAdded,
			playlist_id: playlist_id
		};
	} catch(err) {
		logger.error(`[Playlist] Unable to add karaokes : ${JSON.stringify(err)}`);
		if (err.code === 4) errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_ALREADY_ADDED';
		throw {
			code: errorCode,
			message: err.msg,
			data: {
				kara: karas,
				playlist: pl.name || 'unknown',
				user: requester
			}
		};
	} finally {
		profile('addKaraToPL');
	}
}

export async function getPLCInfo(plc_id) {
	return await getPLCInfoDB(plc_id);
}

export async function getPLCInfoMini(plc_id) {
	return await getPLCInfoMiniDB(plc_id);
}

async function checkPLCandKaraInPlaylist(plcList,playlist_id) {
	let plcToAdd = [];
	for (const index in plcList) {
		const plcData = await getPLCInfoMini(plcList[index].plc_id);
		if (!plcData) throw `PLC ${plcList[index].plc_id} does not exist`;
		//We got a hit!
		// Let's check if the kara we're trying to add is
		// already in the playlist we plan to copy it to.
		if (!await isKaraInPlaylist(plcData.kid,playlist_id)) {
			plcList[index].kid = plcData.kid;
			plcList[index].nickname = plcData.nickname;
			plcList[index].created_at = new Date();
			plcList[index].username = plcData.username;
			plcList[index].playlist_id = playlist_id;
			plcToAdd.push(plcList[index]);
		}
	}
	return plcToAdd;
}

export async function copyKaraToPlaylist(plc_id,playlist_id,pos) {
	let plcs = plc_id.split(',');
	if (Array.isArray(plc_id)) plcs = plc_id;
	const [plcData, pl] = await Promise.all([
		getPLCInfoMini(plcs[0]),
		getPlaylistInfo(playlist_id)
	]);
	if (!pl) throw `Playlist ${playlist_id} unknown`;
	//FIXME : Add a check for all PLCs if they exist
	if (!plcData) throw `PLC ${plcData[0]} unknown`;
	logger.info(`[Playlist] Copying ${plcs.length} karaokes to playlist ${pl.name} : ${plcData.title}...`);
	try {
		profile('copyKaraToPL');

		// plcs is an array of plc_ids.
		const date_add = new Date();
		let plcList = plcs.map(p => {
			return {
				plc_id: p,
				playlist_id: playlist_id,
				date_add: date_add
			};
		});
		plcList = await checkPLCandKaraInPlaylist(plcList, playlist_id);
		// If pos is provided, we need to update all karas above that and add
		// karas.length to the position
		// If pos is not provided, we need to get the maximum position in the PL
		// And use that +1 to set our playlist position.
		if (pos) {
			await shiftPosInPlaylist(playlist_id,pos,plcs.length);
		} else {
			const res = await getMaxPosInPlaylist(playlist_id);
			let startpos = res.maxpos + 1.0;
			let index = 0;
			plcList.forEach(() => {
				plcList[index].pos = startpos + index++;
			});
		}
		await addKaraToPL(plcList);
		updatePlaylistLastEditTime(playlist_id);
		await Promise.all([
			updatePlaylistDuration(playlist_id),
			updatePlaylistKaraCount(playlist_id)
		]);
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

export async function deleteKaraFromPlaylist(plcs,playlist_id,token) {
	// If playlist_id is null, set it to current/public PL ID
	profile('deleteKara');
	if (!playlist_id) playlist_id = getState().modePlaylistID;
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw `Playlist ${playlist_id} unknown`;
	let karas = [plcs];
	if (Array.isArray(plcs)) karas = plcs;
	if (typeof plcs === 'string') karas = plcs.split(',');
	//If we get a single song, it's a user deleting it (most probably)
	const plcData = await getPLCInfoMini(karas[0]);
	logger.info(`[Playlist] Deleting karaokes from playlist ${pl.name} : ${plcData.title}...`);
	try {
		//If token is present, a user is trying to remove a karaoke
		if (token && token.role !== 'admin' && plcData.username !== token.username) throw 'You cannot delete a song you did not add';
		// Removing karaoke here.
		await removeKaraFromPlaylist(karas,playlist_id);
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

export async function editPLC(plc_id,params,token) {
	profile('editPLC');
	if (+params.flag_playing === 0) throw 'flag_playing cannot be unset! Set it to another karaoke to unset it on this one';
	if (+params.flag_free === 0) throw 'flag_free cannot be unset!';
	const plcData = await getPLCInfoMini(plc_id);
	if (!plcData) throw 'PLC ID unknown';
	const pl = await getPlaylistInfo(plcData.playlist_id);
	if (token.role === 'admin' || pl.flag_visible) throw `Playlist ${plcData.playlist_id} unknown`;
	if (params.flag_playing) {
		await setPlaying(plc_id, pl.playlist_id);
		if (pl.flag_current) playingUpdated();
	}
	if (params.flag_free) {
		await freePLC(plc_id);
		updateSongsLeft(plcData.user_id,pl.playlist_id);
	}
	if (params.pos) {
		await raisePosInPlaylist(params.pos,pl.playlist_id);
		await setPos(plc_id,params.pos);
		await reorderPlaylist(pl.playlist_id);
	}
	updatePlaylistLastEditTime(pl.playlist_id);
	profile('editPLC');
	return {
		pl_id: pl.playlist_id
	};
}

export async function reorderPlaylist(playlist_id) {
	return await reorderPL(playlist_id);
}

export async function exportPlaylist(playlist_id) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw `Playlist ${playlist_id} unknown`;
	try {
		logger.debug( `[Playlist] Exporting playlist ${playlist_id}`);
		const plContents = await getPlaylistContentsMini(playlist_id);
		let playlist = {};
		const plExport = {
			name: pl.name,
			created_at: pl.created_at,
			modified_at: pl.modified_at,
			flag_visible: pl.flag_visible
		};
		const plcFiltered = plContents.map(plc => {
			return {
				kid: plc.kid,
				nickname: plc.nickname,
				created_at: plc.created_at,
				pos: plc.pos,
				username: plc.username,
				serie: plc.serie,
				title: plc.title,
				type: plc.type,
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

async function checkImportedKIDs(playlist) {
	let karasToImport = [];
	let karasUnknown = [];
	for (const kara in playlist) {
		const karaFromDB = await isKara(playlist[kara].kid);
		if (karaFromDB) {
			playlist[kara].kid = karaFromDB.kid;
			karasToImport.push(playlist[kara]);
		} else {
			logger.warn(`[PLC] importPlaylist : KID ${kara.kid} unknown`);
			karasUnknown.push(kara.kid);
		}
	}
	return {
		karasToImport: karasToImport,
		karasUnknown: karasUnknown
	};
}

export async function importPlaylist(playlist, username, playlist_id) {
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
	// - flag_visible : (0 / 1)
	// - name : playlist name
	//
	// If all tests pass, then add playlist, then add karas
	// Playlist can end up empty if no karaokes are found in database
	try {
		logger.debug(`[Playlist] Importing playlist ${JSON.stringify(playlist,null,'\n')}`);
		let playingKara = {};
		if (!testJSON(playlist)) throw 'Invalid JSON';
		if (!playlist.Header) throw 'No Header section';
		if (playlist.Header.description !== 'Karaoke Mugen Playlist File') throw 'Not a .kmplaylist file';
		if (playlist.Header.version > 3) throw `Cannot import this version (${playlist.Header.version})`;
		if (!playlist.PlaylistContents) throw 'No PlaylistContents section';
		if (!playlist.PlaylistInformation) throw 'No PlaylistInformation section';
		if (!(new Date.parse(playlist.PlaylistInformation.created_at))) throw 'Creation time is not valid';
		if (!(new Date.parse(playlist.PlaylistInformation.modified_at))) throw 'Modification time is not valid';
		if (playlist.PlaylistInformation.flag_visible !== true &&
		playlist.PlaylistInformation.flag_visible !== false) throw 'Visible flag must be boolean';
		if (!playlist.PlaylistInformation.name) throw 'Playlist name must not be empty';
		let flag_playingDetected = false;
		if (playlist.PlaylistContents) {
			playlist.PlaylistContents.forEach((kara,index) => {
				if (!(new RegExp(uuidRegexp).test(kara.kid))) throw 'KID is not a valid UUID!';
				if (!(new Date.parse(kara.created_at))) throw 'Karaoke added time is not a number';
				if (kara.flag_playing === true) {
					if (flag_playingDetected) throw 'Playlist contains more than one currently playing marker';
					flag_playingDetected = true;
					playingKara.kid = kara.kid;
					playingKara.user = kara.username;
				}
				if (isNaN(kara.pos)) throw 'Position must be a number';
				if (!kara.nickname) throw 'All karaokes must have a nickname associated with them';
				const user = findUserByName(kara.username);
				if (!user) {
					playlist.PlaylistContents[index].username = 'admin';
					const admin = findUserByName('admin');
					playlist.PlaylistContents[index].nickname = admin.nickname;
				}
			});
		}
		// Validations done. First creating playlist.
		try {
			if (!playlist_id) {
				playlist_id = await createPlaylist(playlist.PlaylistInformation.name, {
					visible: playlist.PlaylistInformation.flag_visible
				},username);
			} else {
				await emptyPlaylist(playlist_id);
			}
			const ret = await checkImportedKIDs(playlist.PlaylistContents);
			playlist.PlaylistContents = ret.karasToImport;
			playlist.PlaylistContents.forEach((kara,index) => {
				playlist.PlaylistContents[index].playlist_id = playlist_id;
			});
			await addKaraToPL(playlist.PlaylistContents);
			if (playingKara.kid) {
				const plcPlaying = await getPLCByKIDUser(playingKara.kid,playingKara.username,playlist_id);
				await setPlaying(plcPlaying.playlistcontent_id,playlist_id);
			}
			return {
				playlist_id: playlist_id,
				karasUnknown: ret.karasUnknown
			};
		} catch(err) {
			throw err;
		}
	} catch(err) {
		logger.error(`[Playlist] Import failed : ${err}`);
		throw err;
	}
}

export async function shufflePlaylist(playlist_id, isSmartShuffle) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw `Playlist ${playlist_id} unknown`;
	// We check if the playlist to shuffle is the current one. If it is, we will only shuffle
	// the part after the song currently being played.
	try {
		profile('shuffle');
		let playlist = await getPlaylistContentsMini(playlist_id);

		if (!pl.flag_current) {
			isSmartShuffle ? playlist = smartShuffle(playlist) : playlist = shuffle(playlist);
		} else {
			// If it's current playlist, we'll make two arrays out of the playlist :
			// - One before (and including) the current song being played (flag_playing = true)
			// - One after.
			// We'll shuffle the one after then concatenate the two arrays.
			let BeforePlaying = [];
			let AfterPlaying = [];
			let ReachedPlaying = false;
			playlist.forEach((kara) => {
				if (!ReachedPlaying) {
					BeforePlaying.push(kara);
					if (kara.flag_playing) ReachedPlaying = true;
				} else {
					AfterPlaying.push(kara);
				}
			});
			isSmartShuffle ? AfterPlaying = smartShuffle(AfterPlaying) : AfterPlaying = shuffle(AfterPlaying);
			playlist = BeforePlaying.concat(AfterPlaying);
			// If no flag_playing has been set, the current playlist won't be shuffled. To fix this, we shuffle the entire playlist if no flag_playing has been met
			if (!ReachedPlaying) isSmartShuffle ? playlist = smartShuffle(playlist) : playlist = shuffle(playlist);
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

function smartShuffle(playlist){ // Smart Shuffle begin
	let userShuffleBoolean = false; // The boolean to add a shuffle condition if the number of user is high enough
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
		if (userTest > 5) {
			userShuffleBoolean = true;
		}
		let user_iterator = 0;
		if (userShuffleBoolean) {
			while (playlist.length - user_iterator > 0) {
				if ((playlist.length - user_iterator) > 6) {
					let playlist_temp = playlist.slice(user_iterator, user_iterator + 6);
					for (let i = 0; i < 5; i++) {
						if (playlist_temp[i].nickname === playlist_temp[i + 1].pseudo_add) {
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

export async function previousSong() {
	const playlist_id = await findCurrentPlaylist();
	const playlist = await getPlaylistContentsMini(playlist_id);
	if (playlist.length === 0) throw 'Playlist is empty!';
	let readpos = 0;
	playlist.forEach((kara, index) => {
		if (kara.flag_playing) readpos = index - 1;
	});
	// If readpos ends up being -1 then we're at the beginning of the playlist and can't go to the previous song
	if (readpos < 0) throw 'Current position is first song!';
	const kara = playlist[readpos];
	if (!kara) throw 'Karaoke received is empty!';
	await setPlaying(kara.playlistcontent_id,playlist_id);
}

export async function nextSong() {
	const conf = getConfig();
	const current = await getCurrentPlaylistContents();
	// Test if we're at the end of the playlist and if RepeatPlaylist is set.
	if (current.index >= current.content.length && !+conf.EngineRepeatPlaylist) {
		logger.debug('[PLC] End of playlist.');
		await setPlaying(null,current.id);
		throw 'Current position is last song!';
	} else {
		// If we're here, it means either we're beyond the length of the playlist
		// OR that EngineRepeatPlaylist is set to 1.
		// We test again if we're at the end of the playlist. If so we go back to first song.
		if (current.index >= current.content.length) current.index = 0;
		const kara = current.content[current.index];
		if (!kara) throw 'Karaoke received is empty!';
		await setPlaying(kara.playlistcontent_id,current.id);
	}
}

async function getCurrentPlaylistContents() {
	// Returns current playlist contents and where we're at.
	const playlist_id = getState().currentPlaylistID;
	const playlist = await getPlaylistContentsMini(playlist_id);
	// Setting readpos to 0. If no flag_playing is found in current playlist
	// Then karaoke will begin at the first element of the playlist (0)
	let readpos = 0;
	playlist.some((kara, index) => {
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

export async function getCurrentSong() {
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
	let requester;
	if (+conf.EngineDisplayNickname) {
		// When a kara has been added by admin/import, do not display it on screen.
		// Escaping {} because it'll be interpreted as ASS tags below.
		kara.nickname = kara.nickname.replace(/[\{\}]/g,'');
		requester = `${__('REQUESTED_BY')} ${kara.nickname}`;
	} else {
		requester = '';
	}
	if (kara.title) kara.title = ` - ${kara.title}`;
	// If series is empty, pick singer information instead

	let series = kara.serie;
	if (!kara.serie) series = kara.singers.join(', ');

	// If song order is 0, don't display it (we don't want things like OP0, ED0...)
	if (!kara.songorder || kara.songorder === 0) kara.songorder = '';
	// Construct mpv message to display.
	//If karaoke is present in the public playlist, we're deleting it.
	if (+conf.EngineRemovePublicOnPlay) {
		const playlist_id = await findPublicPlaylist();
		const plc = await getPLCByKIDUser(kara.kid,kara.username,playlist_id);
		if (plc) await deleteKaraFromPlaylist(plc.playlistcontent_id,playlist_id);
	}
	kara.infos = '{\\bord0.7}{\\fscx70}{\\fscy70}{\\b1}'+series+'{\\b0}\\N{\\i1}'+__(kara.songtype+'_SHORT')+kara.songorder+kara.title+'{\\i0}\\N{\\fscx50}{\\fscy50}'+requester;
	return kara;
}

export async function buildDummyPlaylist(playlist_id) {
	const stats = await getStats();
	let karaCount = stats.karas;
	// Limiting to 5 sample karas to add if there's more.
	if (karaCount > 5) karaCount = 5;
	if (karaCount > 0) {
		logger.info(`[PLC] Dummy Plug : Adding ${karaCount} karas into current playlist`);
		for (let i = 1; i <= karaCount; i++) {
			const kid = await getRandomKara(playlist_id);
			await addKaraToPlaylist(kid,'admin',getState().currentPlaylistID);
		}
		logger.info(`[PLC] Dummy Plug : Activation complete. The current playlist has now ${karaCount} sample songs in it.`);
		return true;
	} else {
		logger.warn('[PLC] Dummy Plug : your database has no songs! Maybe you should try to regenerate it?');
		return true;
	}
}

async function updateFreeOrphanedSongs() {
	// Flag songs as free if they are older than X minutes
	try {
		if (!databaseBusy) await updateFreeOrphanedSongsDB(now() - (getConfig().EngineFreeAutoTime * 60));
	} catch(err) {
		logger.error(`[Playlist] Failed to free orphaned songs (will try again) : ${err}`);
	}
}

export async function initPlaylistSystem() {
	setInterval(updateFreeOrphanedSongs, 60 * 1000);
}

export async function testCurrentPlaylist() {
	const conf = getConfig();
	const currentPL_id = await findCurrentPlaylist();
	if (currentPL_id) {
		setState({currentPlaylistID: currentPL_id});
	} else {
		setState({currentPlaylistID: await createPlaylist(__('CURRENT_PLAYLIST'),{
			visible: true,
			current: true
		},'admin')
		});
		logger.debug('[Playlist] Initial current playlist created');
		if (!conf.isTest) buildDummyPlaylist(getState().currentPlaylistID);
	}
}

export async function testPublicPlaylist() {
	const publicPL_id = await findPublicPlaylist();
	if (publicPL_id) {
		setState({ publicPlaylistID: publicPL_id });
	} else {
		setState({ publicPlaylistID: await createPlaylist(__('PUBLIC_PLAYLIST'),{
			visible: true,
			public: true
		},'admin')
		});
		logger.debug('[Playlist] Initial public playlist created');
	}
}