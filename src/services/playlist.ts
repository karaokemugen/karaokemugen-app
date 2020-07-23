//Utils
import i18n from 'i18next';
import shuffle from 'lodash.shuffle';
import {resolve} from 'path';

import {	addKaraToPlaylist as addKaraToPL,
	addKaraToRequests,
	getKaraMini,
	getSongCountForUser,
	getSongTimeSpentForUser,
	removeKaraFromPlaylist,
	updateFreeOrphanedSongs as updateFreeOrphanedSongsDB} from '../dao/kara';
//DAO
import {
	countPlaylistUsers,
	createPlaylist as createPL,
	deletePlaylist as deletePL,
	editPlaylist as editPL,
	emptyPlaylist as emptyPL,
	getCurrentPlaylist,
	getMaxPosInPlaylist,
	getMaxPosInPlaylistForUser,
	getPlaylistContents as getPLContents,
	getPlaylistContentsMini as getPLContentsMini,
	getPlaylistInfo as getPLInfo,
	getPlaylistKaraIDs,
	getPlaylists as getPLs,
	getPLCByKIDAndUser,
	getPLCInfo as getPLCInfoDB,
	getPLCInfoMini as getPLCInfoMiniDB,
	getPublicPlaylist,
	reorderPlaylist as reorderPL,
	replacePlaylist,
	setCurrentPlaylist as setCurrentPL,
	setPlaying as setPlayingFlag,
	setPLCFree,
	setPLCFreeBeforePos,
	setPLCInvisible,
	setPLCVisible,
	setPos,
	setPublicPlaylist as setPublicPL,
	setVisiblePlaylist as setVisiblePL,
	shiftPosInPlaylist,
	trimPlaylist as trimPL,
	unsetVisiblePlaylist as unsetVisiblePL,
	updatePlaylistDuration,
	updatePlaylistKaraCount,
	updatePlaylistLastEditTime,
} from '../dao/playlist';
import {Token, User} from '../lib/types/user';
import {getConfig, resolvedPathAvatars} from '../lib/utils/config';
import { bools } from '../lib/utils/constants';
import {now} from '../lib/utils/date';
import { asyncExists,replaceExt } from '../lib/utils/files';
import logger, {profile} from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { check } from '../lib/utils/validators';
import {emitWS} from '../lib/utils/ws';
import { DBPLC } from '../types/database/playlist';
import { CurrentSong,Playlist, PlaylistExport, PlaylistOpts, PLC, PLCEditParams, Pos } from '../types/playlist';
import sentry from '../utils/sentry';
import {getState,setState} from '../utils/state';
import {getBlacklist} from './blacklist';
import { getAllRemoteKaras } from './download';
import { formatKaraList, getKara, getSeriesSingers,isAllKaras} from './kara';
import {playingUpdated, playPlayer} from './player';
import { addUpvotes } from './upvote';
//KM Modules
import {findUserByName,updateSongsLeft} from './user';

/** Test if basic playlists exist */
export async function testPlaylists() {
	const currentPL_id = await findCurrentPlaylist();
	const publicPL_id = await findPublicPlaylist();
	if (!currentPL_id && !publicPL_id) {
		// Initial state here, we create only one playlist
		const pl_id = await createPlaylist(i18n.t('MY_PLAYLIST'),{
			visible: true,
			current: true,
			public: true
		}, 'admin');
		setState({currentPlaylistID: pl_id, publicPlaylistID: pl_id});
		logger.debug('Initial current playlist created', {service: 'Playlist'});
	} else {
		// Testing current/public playlist individually.
		await testCurrentPlaylist();
		await testPublicPlaylist();
	}
}

/** Getting position of the currently playing karaoke in a playlist */
function getPlayingPos(playlist: PLC[]): Pos {
	const index = playlist.findIndex(e => e.flag_playing);
	if (index > -1) return {
		plc_id_pos: playlist[index].pos,
		index: index
	};
	logger.debug('Playlists tested', {service: 'Playlist'});
	return undefined;
}

/** Set PLC's flag_free to enabled */
export function freePLC(plc_id: number) {
	return setPLCFree(plc_id);
}

/** Free all PLCs before a certain position in a playlist */
export function freePLCBeforePos(pos: number, playlist_id: number) {
	return setPLCFreeBeforePos(pos, playlist_id);
}

/** Checks if user is allowed to add a song (quota) */
export async function isUserAllowedToAddKara(playlist_id: number, user: User, duration: number): Promise<boolean> {
	try {
		const conf = getConfig();
		if (+conf.Karaoke.Quota.Type === 0) return true;
		let limit: number;
		switch(+conf.Karaoke.Quota.Type) {
		case 2:
			limit = conf.Karaoke.Quota.Time;
			let time = await getSongTimeSpentForUser(playlist_id,user.login);
			if (!time) time = 0;
			if ((limit - time - duration) < 0) {
				logger.debug(`User ${user.login} tried to add more songs than he/she was allowed (${limit - time} seconds of time credit left and tried to add ${duration} seconds)`, {service: 'PLC'});
				return false;
			}
			return true;
		case 1:
		default:
			limit = conf.Karaoke.Quota.Songs;
			const count = await getSongCountForUser(playlist_id,user.login);
			if (count >= limit) {
				logger.debug(`User ${user.login} tried to add more songs than he/she was allowed (${limit})`, {service: 'PLC'});
				return false;
			}
			return true;
		}
	} catch(err) {
		sentry.error(err);
		throw err;
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
export async function setPlaying(plc_id: number, playlist_id: number) {
	await setPlayingFlag(plc_id, playlist_id);
	emitWS('playingUpdated',{
		playlist_id: playlist_id,
		plc_id: plc_id,
	});
	updatePlaylistDuration(playlist_id);
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
	if (!pl) throw {code: 404, msg: 'Playlist unknown'};
	try {
		const oldCurrentPlaylist_id = getState().currentPlaylistID;
		await setCurrentPL(playlist_id);
		updatePlaylistLastEditTime(playlist_id);
		emitWS('playlistInfoUpdated', playlist_id);
		emitWS('playlistInfoUpdated', oldCurrentPlaylist_id);
		setState({currentPlaylistID: playlist_id, introPlayed: false});
		// Event to signal the public interface the current playlist has been updated
		emitWS('currentPlaylistUpdated', playlist_id);
		logger.info(`Playlist ${pl.name} is now current`, {service: 'Playlist'});
		emitWS('playlistInfoUpdated', playlist_id);
	} catch(err) {
		throw {
			message: err
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
	if (!pl) throw {code: 404, msg: 'Playlist unknown'};
	try {
		const oldPublicPlaylist_id = getState().publicPlaylistID;
		await setPublicPL(playlist_id);
		updatePlaylistLastEditTime(playlist_id);
		emitWS('playlistInfoUpdated', playlist_id);
		emitWS('playlistInfoUpdated', oldPublicPlaylist_id);
		setState({publicPlaylistID: playlist_id});
		emitWS('publicPlaylistUpdated', playlist_id);
		logger.info(`Playlist ${pl.name} is now public`, {service: 'Playlist'});
		return playlist_id;
	} catch(err) {
		throw {
			message: err
		};
	}
}

/** Remove playlist entirely */
export async function deletePlaylist(playlist_id: number) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw {code: 404, msg: `Playlist ${playlist_id} unknown`};
	try {
		profile('deletePlaylist');
		logger.info(`Deleting playlist ${pl.name}`, {service: 'Playlist'});
		if (pl.flag_public) throw {code: 409, msg: `Playlist ${playlist_id} is public. Unable to delete it. Make another playlist public first.`};
		if (pl.flag_current) throw {code: 409, msg: `Playlist ${playlist_id} is current. Unable to delete it. Make another playlist current first.`};
		emitWS('playlistsUpdated');
		return await deletePL(playlist_id);
	} catch(err) {
		throw {
			code: err.code,
			msg: err.msg
		};
	} finally {
		profile('deletePlaylist');
	}
}

/** Empty playlist completely */
export async function emptyPlaylist(playlist_id: number): Promise<number> {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw {code: 404, msg: 'Playlist unknown'};
	try {
		profile('emptyPL');
		logger.debug(`Emptying playlist ${pl.name}`, {service: 'Playlist'});
		await emptyPL(playlist_id);
		await Promise.all([
			updatePlaylistKaraCount(playlist_id),
			updatePlaylistDuration(playlist_id)
		]);
		updatePlaylistLastEditTime(playlist_id);
		// If our playlist is the public one, the frontend should reset all buttons on the song library so it shows + for everything all over again.
		if (playlist_id === getState().publicPlaylistID) emitWS('publicPlaylistEmptied', playlist_id);
		emitWS('playlistContentsUpdated', playlist_id);
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
	if (!pl) throw {code: 404, msg: `Playlist ${playlist_id} unknown`};
	try {
		logger.debug(`Editing playlist ${playlist_id}`, {service: 'Playlist', obj: playlist});
		await editPL({
			id: playlist_id,
			name: playlist.name,
			modified_at: new Date(),
			flag_visible: playlist.flag_visible
		});
		emitWS('playlistInfoUpdated', playlist_id);
		emitWS('playlistsUpdated');

	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	}
}

/** Create new playlist */
export async function createPlaylist(name: string, opts: PlaylistOpts,username: string) {
	const playlist_id = await createPL({
		name: name,
		created_at: new Date(),
		modified_at: new Date(),
		flag_visible: opts.visible,
		flag_current: opts.current || null,
		flag_public: opts.public || null,
		username: username
	});
	if (+opts.current) setState({currentPlaylistID: playlist_id});
	if (+opts.public) setState({publicPlaylistID: playlist_id});
	emitWS('playlistsUpdated');
	return playlist_id;
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

/** Get playlist contents in a smaller format to speed up fetching data for internal use */
export function getPlaylistContentsMini(playlist_id: number) {
	return getPLContentsMini(playlist_id);
}

/** Get playlist contents */
export async function getPlaylistContents(playlist_id: number, token: Token, filter: string, lang: string, from = 0, size = 99999999999, random = 0) {
	profile('getPLC');
	const plInfo = await getPlaylistInfo(playlist_id, token);
	if (!plInfo) throw {code: 404, msg: `Playlist ${playlist_id} unknown`};
	try {
		const pl = await getPLContents({
			playlist_id: playlist_id,
			username: token.username,
			filter: filter,
			lang: lang,
			from: from,
			size: size,
			random: random
		});
		if (from === -1) {
			const pos = getPlayingPos(pl);
			pos
				? from = pos.index
				: from = 0;
		}
		profile('getPLC');
		const count = pl.length > 0 ? pl[0].count : 0;
		return formatKaraList(pl, from, count);
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
	if (!kara) throw {code: 404, msg: 'PLCID unknown'};
	profile('getPLCInfo');
	return kara;
}

/** Get PLC by KID and Username */
function getPLCByKIDUser(kid: string, username: string, playlist_id: number) {
	return getPLCByKIDAndUser(kid, username, playlist_id);
}

/** Return all songs not present in specified playlist */
export function isAllKarasInPlaylist(karas: PLC[], playlist: PLC[]) {
	return {
		notPresent: karas.filter(k => !playlist.map(plc => plc.kid).includes(k.kid)),
		alreadyPresent: playlist.filter(p => karas.map(k => k.kid).includes(p.kid))
	};
}

/** Add song to playlist */
export async function addKaraToPlaylist(kids: string|string[], requester: string, playlist_id?: number, pos?: number) {
	let errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR';
	const conf = getConfig();
	const state = getState();
	if (!playlist_id) playlist_id = state.publicPlaylistID;
	const karas: string[] = (typeof kids === 'string') ? kids.split(',') : kids;
	const [pl, kara] = await Promise.all([
		getPlaylistInfo(playlist_id),
		getKaraMini(karas[0])
	]);
	try {
		profile('addKaraToPL');
		if (!pl) throw {code: 404, msg: `Playlist ${playlist_id} unknown`};

		const user: User = await findUserByName(requester);
		if (!user) throw {code: 404, msg: 'Requester does not exist'};

		const karasUnknown = await isAllKaras(karas);
		if (karasUnknown.length > 0) throw {code: 404, msg: 'One of the karaokes does not exist'};
		logger.debug(`Adding ${karas.length} karaokes to playlist ${pl.name || 'unknown'} by ${requester} : ${kara.title || 'unknown'}...`, {service: 'Playlist'});

		if (user.type > 0) {
			// If user is not admin
			// Check if we're using correct playlist. User is only allowed to add to public Playlist
			if (playlist_id !== state.publicPlaylistID) throw {code: 403, msg: 'User is not allowed to add to this playlist'};
			// Check if karaoke is in blacklist
			const blacklist = await getBlacklist({});
			if (blacklist.content.some(blc => {
				return blc.kid === karas[0];
			})) {
				errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_BLACKLISTED';
				throw {code: 451, msg: 'Song is blacklisted'};
			}
		}
		// Everything's daijokay, user is allowed to add a song.
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
		const plContentsAfterPlay = plContents.filter((plc: PLC) => plc.pos >= playingPos);
		if (user.type === 0) {
			// Admin can add a song multiple times in the current or any other playlist, even by the same user
			if (!conf.Playlist.AllowDuplicates) {
				// Option to allow is not set : removing duplicates from songs to add
				const songs = isAllKarasInPlaylist(karaList, plContentsAfterPlay);
				karaList = songs.notPresent;
			}
		} else {
			// Not an admin adding this. Adding an upvote to all songs already in playlist, adding the rest
			const songs = isAllKarasInPlaylist(karaList, plContentsAfterPlay);
			karaList = songs.notPresent;
			// Upvoting each song already present
			if (songs.alreadyPresent.length > 0) addUpvotes(songs.alreadyPresent.map(plc => plc.playlistcontent_id), requester);
		}
		// Check user quota first
		if (user.type > 0 && !await isUserAllowedToAddKara(playlist_id, user, kara.duration)) {
			errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED';
			throw {code: 429, msg: 'User quota reached'};
		}
		// If AllowDuplicateSeries is set to false, remove all songs with the same SIDs
		if (!conf.Playlist.AllowDuplicateSeries && user.type > 0) {
			const seriesSingersInPlaylist = plContentsAfterPlay.map(plc => {
				if (plc.series.length > 0) return plc.series[0].name;
				return plc.singer[0].name;
			});
			for (const i in karaList) {
				const karaInfo = await getKara(karaList[i].kid, {username: 'admin', role: 'admin'});
				karaInfo.series.length > 0
					? karaList[i].uniqueSerieSinger = karaInfo.series[0].name
					: karaList[i].uniqueSerieSinger = karaInfo.singers[0].name;
			}
			karaList = karaList.filter(k => {
				return !seriesSingersInPlaylist.includes(k.uniqueSerieSinger);
			});
			if (karaList.length === 0) {
				errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_ALREADY_ADDED';
				throw {
					code: 406,
					msg: 'Adding karaokes from the same series / singer is not allowed'
				};
			}
		}
		if (karaList.length === 0) {
			errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_NO_DUPLICATE_SERIES_SINGERS';
			throw {
				code: 409,
				msg: `No karaoke could be added, all are in destination playlist already (PLID : ${playlist_id})`
			};
		}
		// Song requests by admins are ignored and not added to requests stats
		if (user.type > 0) addKaraToRequests(user.login, karaList.map(k => k.kid));
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
		// -1 means the admin right-clicked and the song is to be added after the current playing song
		if (pos === -1) pos = playingPos + 1;
		if (pos) {
			await shiftPosInPlaylist(playlist_id, pos, karas.length);
		} else {
			pos = playlistMaxPos + 1;
		}
		for (const i in karaList) {
			karaList[i].pos = pos + +i;
			// Test if we're adding a invisible/masked karaoke or not
			karaList[i].flag_visible = true;
			if ((!conf.Playlist.MysterySongs.AddedSongVisibilityAdmin && user.type === 0) || !conf.Playlist.MysterySongs.AddedSongVisibilityPublic && user.type > 0) karaList[i].flag_visible = false;
		}

		// Adding song to playlist at long last!
		const PLCsInserted = await addKaraToPL(karaList);

		updatePlaylistLastEditTime(playlist_id);
		// Checking if a flag_playing is present inside the playlist.
		// If not, we'll have to set the karaoke we just added as the currently playing one. updatePlaylistDuration is done by setPlaying already.
		if (!plContents.find((plc: PLC) => plc.flag_playing)) {
			await setPlaying(PLCsInserted[0].plc_id, playlist_id);
		} else {
			await updatePlaylistDuration(playlist_id);
		}
		if (conf.Karaoke.Autoplay &&
			+playlist_id === state.currentPlaylistID &&
			(state.player.playerStatus === 'stop' || state.randomPlaying) ) {
			setState({ randomPlaying: false });
			await nextSong();
			await playPlayer(true);
		}
		await Promise.all([
			updatePlaylistKaraCount(playlist_id),
			updateSongsLeft(user.login, playlist_id)
		]);
		const ret = {
			kara: kara.title,
			playlist: pl.name,
			kid: karaList.map(k => k.kid),
			playlist_id: playlist_id,
			plc: null
		};
		ret.plc = await getPLCInfo(PLCsInserted[0].plc_id, true, requester);
		if (playlist_id !== state.currentPlaylistID) delete ret.plc.time_before_play;
		if (+playlist_id === state.publicPlaylistID) {
			emitWS('KIDUpdated', PLCsInserted.map(plc => {
				return {
					kid: plc.kid,
					flag_inplaylist: true,
					requester: plc.username,
					my_public_plc_id: plc.plc_id
				};
			}));
		}
		emitWS('playlistContentsUpdated', playlist_id);
		emitWS('playlistInfoUpdated', playlist_id);
		return ret;
	} catch(err) {
		logger.error('Unable to add karaokes', {service: 'Playlist', obj: err});
		let plname : string;
		pl ? plname = pl.name : plname = 'Unknown';
		throw {
			code: err?.code,
			message: errorCode,
			data: {
				details: err.msg,
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
function getPLCInfo(plc_id: number, forUser: boolean, username: string) {
	return getPLCInfoDB(plc_id, forUser, username);
}

/** Get a small amount of data from a PLC */
export function getPLCInfoMini(plc_id: number) {
	return getPLCInfoMiniDB(plc_id);
}

/** Notify user of song play time */
export async function notifyUserOfSongPlayTime(plc_id: number, username: string) {
	emitWS('userSongPlaysIn', await getPLCInfo(plc_id, true, username));
}

/** Copy song from one playlist to another */
export async function copyKaraToPlaylist(plc_id: number[], playlist_id: number, pos?: number) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw {code: 404, msg: `Playlist ${playlist_id} unknown`};
	logger.info(`Copying ${plc_id.length} karaokes to playlist ${pl.name}`, {service: 'Playlist'});
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
			if (!plcData) throw {code: 404, msg: `PLC ${plcList[index].playlistcontent_id} does not exist`};
			plcList[index].kid = plcData.kid;
			plcList[index].nickname = plcData.nickname;
			plcList[index].created_at = new Date();
			plcList[index].username = plcData.username;
			plcList[index].playlist_id = playlist_id;
			plcList[index].flag_visible = plcData.flag_visible;
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
			const startpos = maxpos + 1;
			for (const i in plcList) {
				plcList[i].pos = startpos + +i;
			}
		}
		await addKaraToPL(plcList);
		await Promise.all([
			updatePlaylistDuration(playlist_id),
			updatePlaylistKaraCount(playlist_id)
		]);
		updatePlaylistLastEditTime(playlist_id);
		const state = getState();
		// If we're adding to the current playlist ID and KM's mode is public, we have to notify users that their song has been added and will be playing in xxx minutes
		if (playlist_id === state.currentPlaylistID && playlist_id !== state.publicPlaylistID) {
			plcList.forEach(plc => notifyUserOfSongPlayTime(plc.playlistcontent_id, plc.username));
		}
		if (+playlist_id === state.publicPlaylistID) {
			emitWS('KIDUpdated', plcList.map(plc => {
				return {
					kid: plc.kid,
					flag_inplaylist: true,
					requester: plc.username,
					my_public_plc_id: plc.playlistcontent_id
				};
			}));
		}
		emitWS('playlistContentsUpdated', playlist_id);
		emitWS('playlistInfoUpdated', playlist_id);
		return playlist_id;
	} catch(err) {
		throw {
			code: err?.code,
			message: err,
			data: pl.name
		};
	} finally {
		profile('copyKaraToPL');
	}
}

/** Remove song from a playlist */
export async function deleteKaraFromPlaylist(plcs: number[], playlist_id:number, token: Token) {
	profile('deleteKara');
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw {code: 404, msg: `Playlist ${playlist_id} unknown`};
	// If we get a single song, it's a user deleting it (most probably)
	const kids = [];
	for (const i in plcs) {
		const plcData = await getPLCInfoMini(plcs[i]);
		kids.push(plcData.kid);
		if (!plcData) throw {code: 404, msg: 'At least one playlist content is unknown'};
		if (token.role !== 'admin' && plcData.username !== token.username) throw {code: 403, msg: 'You cannot delete a song you did not add'};
		if (plcData.flag_playing && getState().player.playerStatus === 'play') throw {code: 403, msg: 'You cannot delete a song being currently played. Stop playback first.'};
	}
	logger.debug(`Deleting karaokes from playlist ${pl.name}`, {service: 'Playlist'});
	try {
		// Removing karaoke here.
		await removeKaraFromPlaylist(plcs, playlist_id);
		await Promise.all([
			updatePlaylistDuration(playlist_id),
			updatePlaylistKaraCount(playlist_id),
			reorderPlaylist(playlist_id)
		]);
		updatePlaylistLastEditTime(playlist_id);
		const pubPLID = getState().publicPlaylistID;
		if (+playlist_id === pubPLID) {
			emitWS('KIDUpdated', kids.map(kid => {
				return {
					kid: kid,
					flag_inplaylist: false
				};
			}));
		}
		emitWS('playlistContentsUpdated', playlist_id);
		emitWS('playlistInfoUpdated', playlist_id);
		profile('deleteKara');
		return {
			pl_id: playlist_id,
			pl_name: pl.name
		};
	} catch(err) {
		throw {
			code: err?.code,
			message: err,
			data: pl.name
		};
	} finally {
		profile('deleteKara');
	}

}

/** Edit PLC's properties in a playlist */
export async function editPLC(plc_id: number, params: PLCEditParams) {
	profile('editPLC');
	if (params.flag_playing === false) throw {code: 400, msg: 'flag_playing cannot be unset! Set it to another karaoke to unset it on this one'};
	if (params.flag_free === false) throw {code: 400, msg: 'flag_free cannot be unset!'};
	const plcData = await getPLCInfoMini(plc_id);
	if (!plcData) throw {code: 404, msg: 'PLC ID unknown'};
	const pl = await getPlaylistInfo(plcData.playlist_id);
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
		// If -1 move the song right after the one playing.
		if (params.pos === -1) {
			const plc = await getPLCInfoMini(pl.plcontent_id_playing);
			params.pos = plc.pos + 1;
		}
		await shiftPosInPlaylist(pl.playlist_id, params.pos, 1);
		await setPos(plc_id, params.pos);
		await reorderPlaylist(pl.playlist_id);

	}
	updatePlaylistLastEditTime(pl.playlist_id);
	emitWS('playlistContentsUpdated', pl.playlist_id);
	emitWS('playlistInfoUpdated', pl.playlist_id);
	profile('editPLC');
	return {
		pl_id: pl.playlist_id
	};
}

/** Reorders playlist with positions */
export function reorderPlaylist(playlist_id: number) {
	return reorderPL(playlist_id);
}

/** Export playlist as JSON */
export async function exportPlaylist(playlist_id: number) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw {code: 404, msg: `Playlist ${playlist_id} unknown`};
	try {
		logger.debug(`Exporting playlist ${playlist_id}`, {service: 'Playlist'});
		const plContents = await getPlaylistContentsMini(playlist_id);
		const playlist: PlaylistExport = {};
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
				flag_playing: plc.flag_playing
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
};

export const PLCImportConstraints = {
	kid: {presence: true, uuidArrayValidator: true},
	created_at: {presence: {allowEmpty: false}},
	flag_playing: {inclusion: bools},
	pos: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}},
	nickname: {presence: {allowEmpty: false}},
	username: {presence: {allowEmpty: false}}
};

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
	const task = new Task({
		text: 'IMPORTING_PLAYLIST',
	});
	try {
		logger.debug('Importing playlist', {service: 'Playlist', obj: playlist});
		const validationErrors = check(playlist, PLImportConstraints);
		if (validationErrors) throw {code: 400, msg: `Playlist file is invalid : ${JSON.stringify(validationErrors)}`};
		task.update({
			subtext: playlist.PlaylistInformation.name
		});
		const playingKara: PLC = {
			playlist_id: null
		};
		let flag_playingDetected = false;
		const users = new Map();
		for (const index in playlist.PlaylistContents) {
			const kara = playlist.PlaylistContents[index];
			let user: User = users.get(kara.username);
			if (!user) {
				user = await findUserByName(kara.username);
				if (!user) {
					// If user isn't found locally, replacing it with admin user
					playlist.PlaylistContents[index].username = kara.username = 'admin';
					user = await findUserByName('admin');
					playlist.PlaylistContents[index].nickname = user.nickname;
				}
				users.set(user.login, user);
			}
			if (kara.flag_playing === true) {
				if (flag_playingDetected) throw {code: 400, msg: 'Playlist contains more than one currently playing marker'};
				flag_playingDetected = true;
				playingKara.kid = kara.kid;
				playingKara.username = kara.username;
			}
		}
		// Validations done. First creating playlist.
		if (!playlist_id) {
			playlist_id = await createPlaylist(playlist.PlaylistInformation.name, {
				visible: playlist.PlaylistInformation.flag_visible
			}, username);
		} else {
			await emptyPlaylist(playlist_id);
		}
		const unknownKIDs = await isAllKaras(playlist.PlaylistContents.map((plc: PLC) => plc.kid));
		for (const i in playlist.PlaylistContents) {
			playlist.PlaylistContents[i].playlist_id = playlist_id;
		}
		if (playlist.PlaylistContents?.length > 0) await addKaraToPL(playlist.PlaylistContents);
		if (playingKara?.kid) {
			const plcPlaying = await getPLCByKIDUser(playingKara.kid, playingKara.username, playlist_id);
			await setPlaying(plcPlaying.playlistcontent_id, playlist_id);
		}
		let unknownKaras = [];
		if (unknownKIDs.length > 0) {
			const karas = await getAllRemoteKaras(null, {});
			unknownKaras = karas.content.filter(k => unknownKIDs.includes(k.kid));
		}
		await Promise.all([
			updatePlaylistKaraCount(playlist_id),
			updatePlaylistDuration(playlist_id)
		]);
		emitWS('playlistsUpdated');
		return {
			playlist_id: playlist_id,
			karasUnknown: unknownKaras
		};
	} catch(err) {
		logger.error('Import failed', {service: 'Playlist', obj: err});
		sentry.addErrorInfo('playlist', JSON.stringify(playlist, null, 2));
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

/** Find flag_playing index in a playlist */
export async function findPlaying(playlist_id: number): Promise<number> {
	const pl = await getPlaylistKaraIDs(playlist_id);
	return pl.findIndex(plc => plc.flag_playing);
}

/** Shuffle (smartly or not) a playlist */
export async function shufflePlaylist(playlist_id: number, isSmartShuffle?: boolean) {
	const pl = await getPlaylistInfo(playlist_id);
	if (!pl) throw {code: 404, msg: `Playlist ${playlist_id} unknown`};
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
		logger.info(`Playlist ${pl.name} shuffled`, {service: 'Playlist'});
		emitWS('playlistContentsUpdated', playlist_id);
	} catch(err) {
		logger.error('Could not shuffle playlist', {service: 'Playlist', obj: err});
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
		const userTestArray = [playlist[0].nickname];
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
					const playlist_temp = playlist.slice(user_iterator, user_iterator + 6);
					for (let i = 0; i < 5; i++) {
						if (playlist_temp[i].nickname === playlist_temp[i + 1].nickname) {
							if (playlist[i + 4 + user_iterator]) {
								const a = playlist_temp[i + 1];
								playlist[i + 1 + user_iterator] = playlist[i + 4 + user_iterator];
								playlist[i + 4 + user_iterator] = a;
							} else {
								const a = playlist_temp[i + 1];
								playlist[i + 1 + user_iterator] = playlist[i - 5 + user_iterator];
								playlist[i - 5 + user_iterator] = a;
							}
						}
					}
				}
				user_iterator += 5;
			}
			const playlist_temp = playlist.slice(user_iterator - 1, playlist.length);

			for (let i = user_iterator; i < playlist_temp.length - 1; i++) {
				if (playlist_temp[i].nickname === playlist_temp[i + 1].nickname) verificator = i;
			}

			if (verificator !== 0) {
				const a = playlist_temp[verificator + 1];
				playlist[verificator + 1 + user_iterator] = playlist[2];
				playlist[2] = a;
			}
		}
		let duration_iterator = 0;

		while (playlist.length - duration_iterator > 0) {

			if (playlist.length - duration_iterator > 6) {
				const playlist_temp = playlist.slice(duration_iterator, duration_iterator + 6);
				for (let i = 0; i < 4; i++) {
					if (playlist_temp[i].duration > 150 && playlist_temp[i + 1].duration > 150) {
						if (playlist[i + 4 + duration_iterator]) {
							const a = playlist_temp[i + 1];
							playlist[i + 1 + duration_iterator] = playlist[i + 4 + duration_iterator];
							playlist[i + 4 + duration_iterator] = a;
						} else {
							const a = playlist_temp[i + 1];
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
export async function nextSong(setPlayingSong = true): Promise<DBPLC> {
	const conf = getConfig();
	let playlist: DBPLC[];
	try {
		playlist = await getCurrentPlaylistContents();
	} catch(err) {
		const error = new Error(err);
		sentry.error(error);
		throw error;
	}
	// Test if we're at the end of the playlist and if RepeatPlaylist is set.
	if (playlist.length === 0) throw 'Playlist is empty!';
	let currentPos = playlist.findIndex(plc => plc.flag_playing);
	if (currentPos + 1 >= playlist.length && conf.Playlist.EndOfPlaylistAction !== 'repeat') {
		logger.debug('End of playlist', {service: 'PLC'});
		if (setPlayingSong) await setPlaying(0, getState().currentPlaylistID);
		throw 'Current position is last song!';
	} else {
		// If we're here, it means either we're beyond the length of the playlist
		// OR that RepeatPlaylist is set to 1.
		// We test again if we're at the end of the playlist. If so we go back to first song.
		if (conf.Playlist.EndOfPlaylistAction === 'repeat' && currentPos + 1 >= playlist.length) currentPos = -1;
		const kara = playlist[currentPos + 1];
		if (!kara) throw 'Karaoke received is empty!';
		if (setPlayingSong) await setPlaying(kara.playlistcontent_id, getState().currentPlaylistID);
		return kara;
	}
}

/** Get current playlist contents */
async function getCurrentPlaylistContents(): Promise<DBPLC[]> {
	// Returns current playlist contents and where we're at.
	const playlist_id = getState().currentPlaylistID;
	const playlist = await getPlaylistContentsMini(playlist_id);
	return playlist;
}

export async function notificationNextSong(): Promise<void> {
	try {
		const kara = await nextSong(false);
		emitWS('nextSong', kara);
	} catch(err) {
		//Non-fatal, it usually means we're at the last song
	}
}

/** Get currently playing song's data */
export async function getCurrentSong(): Promise<CurrentSong> {
	try {
		const conf = getConfig();
		const playlist = await getCurrentPlaylistContents();
		// Search for currently playing song
		let updatePlayingKara = false;
		let currentPos = playlist.findIndex(plc => plc.flag_playing);
		if (currentPos === -1) {
			currentPos = 0;
			updatePlayingKara = true;
		}
		const kara = playlist[currentPos];
		if (!kara) throw 'No karaoke found in playlist object';
		// If there's no kara with a playing flag, we set the first one in the playlist
		const playlist_id = getState().currentPlaylistID;
		if (updatePlayingKara) await setPlaying(kara.playlistcontent_id, playlist_id);
		// Let's add details to our object so the player knows what to do with it.
		kara.playlist_id = playlist_id;
		let requester: string;
		let avatarfile: string;
		if (conf.Karaoke.Display.Nickname) {
			// When a kara has been added by admin/import, do not display it on screen.
			// Escaping {} because it'll be interpreted as ASS tags below.
			kara.nickname = kara.nickname.replace(/[{}]/g,'');
			requester = `${i18n.t('REQUESTED_BY')} ${kara.nickname}`;
			// Get user avatar
			let user = await findUserByName(kara.username);
			if (!user) {
				// User does not exist anymore, replacing it with admin
				user = await findUserByName('admin');
			}
			avatarfile = replaceExt(resolve(resolvedPathAvatars(), user.avatar_file), '.circle.png');
			if (!await asyncExists(avatarfile)) avatarfile = resolve(resolvedPathAvatars(), 'blank.circle.png');
		} else {
			requester = '';
		}
		// If series is empty, pick singer information instead
		const series = getSeriesSingers(kara);

		// If song order is 0, don't display it (we don't want things like OP0, ED0...)
		let songorder = `${kara.songorder}`;
		if (!kara.songorder || kara.songorder === 0) songorder = '';

		const currentSong: CurrentSong = {...kara};
		// Construct mpv message to display.
		currentSong.infos = '{\\bord0.7}{\\fscx70}{\\fscy70}{\\b1}'+series+'{\\b0}\\N{\\i1}' +kara.songtypes.map(s => s.name).join(' ')+songorder+' - '+kara.title+'{\\i0}\\N{\\fscx50}{\\fscy50}'+requester;
		currentSong.avatar = avatarfile;
		currentSong.playlistLength = playlist.length;
		return currentSong;
	} catch(err) {
		logger.error('Error selecting current song to play', {service: 'Playlist', obj: err});
	}
}

/** Flag songs as free if they are older than X minutes */
async function updateFreeOrphanedSongs() {
	try {
		await updateFreeOrphanedSongsDB(now(true) - (getConfig().Karaoke.Quota.FreeAutoTime * 60));
	} catch(err) {
		logger.error('Failed to free orphaned songs (will try again)', {service: 'Playlist', obj: err});
	}
}

/** Initialize playlist tasks */
export async function initPlaylistSystem() {
	setInterval(updateFreeOrphanedSongs, 60 * 1000);
	const pls = await getPLs(false);
	pls.forEach(pl => reorderPlaylist(pl.playlist_id));
	await testPlaylists();
	logger.debug('Playlists initialized', {service: 'Playlist'});
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
		logger.debug('Initial current playlist created', {service: 'Playlist'});
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
		logger.debug('Initial public playlist created', {service: 'Playlist'});
	}
}

export function playlistImported(res: any) {
	emitWS('playlistsUpdated');
	emitWS('playlistImported', res);
}
