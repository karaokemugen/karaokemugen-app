//Utils
import i18n from 'i18next';
import shuffle from 'lodash.shuffle';
import {resolve} from 'path';

import { APIMessage } from '../controllers/common';
import {	addKaraToPlaylist as addKaraToPL,
	addKaraToRequests,
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
	setPlaying as setPlayingFlag,
	setPLCAccepted,
	setPLCFree,
	setPLCFreeBeforePos,
	setPLCInvisible,
	setPLCRefused,
	setPLCVisible,
	setPos,
	shiftPosInPlaylist,
	trimPlaylist as trimPL,
	updatePlaylistDuration,
	updatePlaylistKaraCount,
	updatePlaylistLastEditTime,
} from '../dao/playlist';
import { getSongTitle } from '../lib/services/kara';
import {PLImportConstraints} from '../lib/services/playlist';
import { DBPL } from '../lib/types/database/playlist';
import { PlaylistExport, PLC, PLCEditParams } from '../lib/types/playlist';
import {Token, User} from '../lib/types/user';
import {getConfig, resolvedPathAvatars} from '../lib/utils/config';
import {now} from '../lib/utils/date';
import { asyncExists } from '../lib/utils/files';
import logger, {profile} from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { check } from '../lib/utils/validators';
import {emitWS} from '../lib/utils/ws';
import { DBPLC, DBPLCKID } from '../types/database/playlist';
import { CurrentSong, PlaylistOpts, Pos, ShuffleMethods } from '../types/playlist';
import sentry from '../utils/sentry';
import {getState,setState} from '../utils/state';
import {writeStreamFiles} from '../utils/streamerFiles';
import {getBlacklist} from './blacklist';
import { checkMediaAndDownload } from './download';
import { formatKaraList, getKaras, getSongSeriesSingers,getSongVersion} from './kara';
import {playingUpdated, playPlayer} from './player';
import { getRepos } from './repo';
//KM Modules
import {findUserByName,updateSongsLeft} from './user';

/** Test if basic playlists exist */
export async function testPlaylists() {
	const currentPL_id = await findCurrentPlaylist();
	const publicPL_id = await findPublicPlaylist();
	if (!currentPL_id && !publicPL_id) {
		// Initial state here, we create only one playlist
		const plaid = await createPL({
			name: i18n.t('MY_PLAYLIST'),
			created_at: new Date(),
			modified_at: new Date(),
			flag_visible: true,
			flag_current: true,
			flag_public: true,
			username: 'admin'
		});
		setState({currentPlaid: plaid, publicPlaid: plaid});
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
	return undefined;
}

/** Set PLC's flag_free to enabled */
export function freePLC(plc_id: number) {
	return setPLCFree(plc_id);
}

/** Free all PLCs before a certain position in a playlist */
export function freePLCBeforePos(pos: number, plaid: string) {
	return setPLCFreeBeforePos(pos, plaid);
}

/** Checks if user is allowed to add a song (quota) */
export async function isUserAllowedToAddKara(plaid: string, user: User, duration: number): Promise<boolean> {
	try {
		const conf = getConfig();
		if (+conf.Karaoke.Quota.Type === 0) return true;
		let limit: number;
		switch(+conf.Karaoke.Quota.Type) {
			case 2:
				limit = conf.Karaoke.Quota.Time;
				let time = await getSongTimeSpentForUser(plaid,user.login);
				if (!time) time = 0;
				if ((limit - time - duration) < 0) {
					logger.debug(`User ${user.login} tried to add more songs than he/she was allowed (${limit - time} seconds of time credit left and tried to add ${duration} seconds)`, {service: 'PLC'});
					return false;
				}
				return true;
			case 1:
			default:
				limit = conf.Karaoke.Quota.Songs;
				const count = await getSongCountForUser(plaid,user.login);
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
export async function findCurrentPlaylist(): Promise<string> {
	const res = await getCurrentPlaylist();
	if (res) return res.plaid;
	return undefined;
}

/** Find out which ID is the Public Playlist */
export async function findPublicPlaylist(): Promise<string> {
	const res = await getPublicPlaylist();
	if (res) return res.plaid;
	return undefined;
}

/** Set a PLC flag_playing to enabled */
export async function setPlaying(plc_id: number, plaid: string) {
	await setPlayingFlag(plc_id, plaid);
	emitWS('playingUpdated',{
		plaid: plaid,
		plc_id: plc_id,
	});
	updatePlaylistDuration(plaid);
}

/** Trim playlist after a certain duration */
export async function trimPlaylist(plaid: string, duration: number) {
	const durationSecs = duration * 60;
	let durationPL = 0;
	let lastPos = 1;
	const pl = await getPlaylistContentsMini(plaid);
	// Going through the playlist and updating lastPos on each item
	// Until we hit the limit for duration
	const needsTrimming = pl.some((kara: PLC) => {
		lastPos = kara.pos;
		durationPL = durationPL + kara.duration;
		return durationPL > durationSecs;
	});
	if (needsTrimming) await trimPL(plaid, lastPos);
	await Promise.all([
		updatePlaylistDuration(plaid),
		updatePlaylistKaraCount(plaid)
	]);
	updatePlaylistLastEditTime(plaid);
}

/** Remove playlist entirely */
export async function deletePlaylist(plaid: string) {
	const pl = await getPlaylistInfo(plaid);
	if (!pl) throw {code: 404};
	try {
		profile('deletePlaylist');
		if (pl.flag_current) throw {code: 409, msg: `Playlist ${plaid} is current. Unable to delete it. Make another playlist current first.`};
		if (pl.flag_public) throw {code: 409, msg: `Playlist ${plaid} is public. Unable to delete it. Make another playlist public first.`};
		logger.info(`Deleting playlist ${pl.name}`, {service: 'Playlist'});
		await deletePL(plaid);
		emitWS('playlistsUpdated');

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
export async function emptyPlaylist(plaid: string): Promise<string> {
	const pl = await getPlaylistInfo(plaid);
	if (!pl) throw {code: 404, msg: 'Playlist unknown'};
	try {
		profile('emptyPL');
		logger.debug(`Emptying playlist ${pl.name}`, {service: 'Playlist'});
		await emptyPL(plaid);
		await Promise.all([
			updatePlaylistKaraCount(plaid),
			updatePlaylistDuration(plaid)
		]);
		updatePlaylistLastEditTime(plaid);
		// If our playlist is the public one, the frontend should reset all buttons on the song library so it shows + for everything all over again.
		if (plaid === getState().publicPlaid) emitWS('publicPlaylistEmptied', plaid);
		emitWS('playlistContentsUpdated', plaid);
		return plaid;
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	} finally {
		profile('emptyPL');
	}
}

/** Download all song media files from a playlist */
async function downloadMediasInPlaylist(plaid: string) {
	const plcs = await getPlaylistContentsMini(plaid);
	for (const plc of plcs) {
		checkMediaAndDownload(plc.kid, plc.mediafile, plc.repository, plc.mediasize);
	}
}

// Actions took when a new current playlist is set
function currentHook(plaid: string, name: string) {
	const oldCurrentPlaylist_id = getState().currentPlaid;
	updatePlaylistLastEditTime(oldCurrentPlaylist_id);
	emitWS('playlistInfoUpdated', oldCurrentPlaylist_id);
	setState({currentPlaid: plaid, introPlayed: false, introSponsorPlayed: false});
	emitWS('currentPlaylistUpdated', plaid);
	resetAllAcceptedPLCs();
	writeStreamFiles('current_kara_count');
	writeStreamFiles('time_remaining_in_current_playlist');
	downloadMediasInPlaylist(plaid);
	logger.info(`Playlist ${name} is now current`, {service: 'Playlist'});
}

// Actions took when a new public playlist is set
function publicHook(plaid: string, name: string) {
	const oldPublicPlaylist_id = getState().publicPlaid;
	updatePlaylistLastEditTime(oldPublicPlaylist_id);
	emitWS('playlistInfoUpdated', oldPublicPlaylist_id);
	setState({publicPlaid: plaid});
	emitWS('publicPlaylistUpdated', plaid);
	writeStreamFiles('public_kara_count');
	logger.info(`Playlist ${name} is now public`, {service: 'Playlist'});
}

/** Edit playlist properties */
export async function editPlaylist(plaid: string, playlist: DBPL) {
	const pl = await getPlaylistInfo(plaid);
	if (!pl) throw {code: 404};
	logger.debug(`Editing playlist ${plaid}`, {service: 'Playlist', obj: playlist});
	const newPL: DBPL = {
		...pl,
		...playlist
	};
	await editPL(newPL);
	if (playlist.flag_current) currentHook(plaid, newPL.name);
	if (playlist.flag_public) publicHook(plaid, newPL.name);
	updatePlaylistLastEditTime(plaid);
	emitWS('playlistInfoUpdated', plaid);
	emitWS('playlistsUpdated');
}

/** Create new playlist */
export async function createPlaylist(name: string, opts: PlaylistOpts,username: string): Promise<string> {
	const plaid = await createPL({
		name: name,
		created_at: new Date(),
		modified_at: new Date(),
		flag_visible: opts.visible,
		flag_current: opts.current || null,
		flag_public: opts.public || null,
		username: username
	});
	if (+opts.current) currentHook(plaid, name);
	if (+opts.public) publicHook(plaid, name);
	emitWS('playlistInfoUpdated', plaid);
	emitWS('playlistsUpdated');
	return plaid;
}

/** Get playlist properties */
export async function getPlaylistInfo(plaid: string, token?: Token) {
	const pl = await getPLInfo(plaid);
	if (token) {
		if (token.role === 'admin' || pl.flag_visible) return pl;
		return null;
	}
	return pl;
}

/** Get all playlists properties */
export async function getPlaylists(token: Token) {
	profile('getPlaylists');
	const ret = await getPLs(token.role !== 'admin');
	profile('getPlaylists');
	return ret;
}

/** Get playlist contents in a smaller format to speed up fetching data for internal use */
export function getPlaylistContentsMini(plaid: string) {
	return getPLContentsMini(plaid);
}

/** Get playlist contents */
export async function getPlaylistContents(plaid: string, token: Token, filter: string, lang: string, from = 0, size = 99999999999, random = 0, orderByLikes = false) {
	profile('getPLC');
	const plInfo = await getPlaylistInfo(plaid, token);
	if (!plInfo) throw {code: 404};
	try {
		const pl = await getPLContents({
			plaid: plaid,
			username: token.username.toLowerCase(),
			filter: filter,
			lang: lang,
			from: from,
			size: size,
			random: random,
			orderByLikes: orderByLikes
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
	const kara = await getPLCInfo(plc_id, token.role === 'user', token.username.toLowerCase());
	if (!kara) throw {code: 404, msg: 'PLCID unknown'};
	profile('getPLCInfo');
	return kara;
}

/** Get PLC by KID and Username */
function getPLCByKIDUser(kid: string, username: string, plaid: string) {
	return getPLCByKIDAndUser(kid, username, plaid);
}

/** Return all songs not present in specified playlist */
export function isAllKarasInPlaylist(karas: PLC[], playlist: PLC[]) {
	return {
		notPresent: karas.filter(k => !playlist.map(plc => plc.kid).includes(k.kid)),
	};
}

/** Add song to playlist */
export async function addKaraToPlaylist(kids: string[], requester: string, plaid?: string, pos?: number, ignoreQuota?: boolean) {
	requester = requester.toLowerCase();
	let errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR';
	const conf = getConfig();
	const state = getState();
	if (!plaid) plaid = state.publicPlaid;
	const [pl, karas] = await Promise.all([
		getPlaylistInfo(plaid),
		getKaras({
			q: `k:${kids.join(',')}`
		})
	]);
	try {
		profile('addKaraToPL');
		if (!pl) throw {code: 404, msg: `Playlist ${plaid} unknown`};

		const user: User = await findUserByName(requester);
		if (!user) throw {code: 404, msg: 'Requester does not exist'};

		const karasUnknown = kids.filter(kid => !karas.content.map(k => k.kid).includes(kid));
		if (karasUnknown.length > 0) throw {code: 404, msg: 'One of the karaokes does not exist'};
		logger.debug(`Adding ${karas.content.length} song(s) to playlist ${pl.name || 'unknown'} by ${requester}...`, {service: 'Playlist'});

		if (user.type > 0 && !ignoreQuota) {
			// If user is not admin
			// Check if karaoke is in blacklist
			const blacklist = await getBlacklist({});
			if (blacklist.content.some(blc => {
				return blc.kid === karas.content[0].kid;
			})) {
				errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_BLACKLISTED';
				throw {code: 451};
			}
			// Check user quota first
			if (!await isUserAllowedToAddKara(plaid, user, karas.content[0].duration)) {
				errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED';
				throw {code: 429};
			}
		}
		// Everything's daijokay, user is allowed to add a song.
		const date_add = new Date();
		let karaList: PLC[] = karas.content.map(k => {
			return {
				kid: k.kid,
				username: requester,
				nickname: user.nickname,
				plaid: plaid,
				created_at: date_add
			};
		});

		const [userMaxPosition, numUsersInPlaylist, playlistMaxPos] = await Promise.all([
			getMaxPosInPlaylistForUser(plaid, user.login),
			countPlaylistUsers(plaid),
			getMaxPosInPlaylist(plaid),
		]);
		const plContents = await getPlaylistKaraIDs(plaid);
		// Making a unique ID depending on if we're in public playlist or something else.
		// Unique ID here is to determine if a song is already present or not
		// A person cannot add a song a second time if it's already pending. However, if it's been already played, it won't count
		const playingObject = getPlayingPos(plContents);
		const playingPos = playingObject?.plc_id_pos || 0;
		// If no song is currently playing, plContentsBeforePlay returns all songs in playlist. These are all songs not played yet.
		const plContentsAfterPlay = plContents.filter((plc: PLC) => plc.pos >= playingPos);
		const songs = user.type === 0
			// Admin can add a song multiple times in the current or any other playlist, even by the same user
			? conf.Playlist.AllowDuplicates
				// If it's set we allow it only for songs after play cursor.
				// This means you can readd a song if it's already been played.
				// I hate this logic.
				? isAllKarasInPlaylist(karaList, plContentsAfterPlay)
				// Option to allow is not set : removing duplicates from songs to add
				: isAllKarasInPlaylist(karaList, plContents)
			// Not an admin adding this these songs.
			: isAllKarasInPlaylist(karaList, plContents);
		karaList = songs.notPresent;

		if (karaList.length === 0) {
			errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_ALREADY_ADDED';
			throw {code: 409};
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
			await shiftPosInPlaylist(plaid, pos, kids.length);
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

		updatePlaylistLastEditTime(plaid);

		// Auto-balance current playlist if user isn't in first pool
		if (conf.Karaoke.AutoBalance) {
			let playlist = await getPlaylistContentsMini(plaid);
			const playingPos = getPlayingPos(playlist);
			if (playingPos) {
				playlist = playlist.filter(plc => plc.pos > playingPos.plc_id_pos);
			}

			const checker = new Set<string>();
			for (const content of playlist) {
				if (checker.has(content.username)) {
					await shufflePlaylist(plaid, 'balance');
					break;
				} else if (content.username === user.login) {
					break;
				}
				checker.add(content.username);
			}
		}

		// Checking if a flag_playing is present inside the playlist.
		// If not, we'll have to set the karaoke we just added as the currently playing one. updatePlaylistDuration is done by setPlaying already.
		if (!plContents.find((plc: PLC) => plc.flag_playing)) {
			await setPlaying(PLCsInserted[0].plc_id, plaid);
		} else {
			await updatePlaylistDuration(plaid);
		}

		await Promise.all([
			updatePlaylistKaraCount(plaid),
			updateSongsLeft(user.login, plaid)
		]);
		const plc = await getPLCInfo(PLCsInserted[0].plc_id, true, requester);
		if (plaid === state.currentPlaid) {
			for (const kara of karas.content) {
				checkMediaAndDownload(kara.kid, kara.mediafile, kara.repository, kara.mediasize);
			}
			writeStreamFiles('current_kara_count');
			writeStreamFiles('time_remaining_in_current_playlist');
			if (conf.Karaoke.Autoplay &&
				(state.player.playerStatus === 'stop' || state.randomPlaying) ) {
				setState({ randomPlaying: false });
				await setPlaying(PLCsInserted[0].plc_id, getState().currentPlaid);
				await playPlayer(true);
			}
		}
		if (plaid === state.publicPlaid) {
			emitWS('KIDUpdated', PLCsInserted.map(plc => {
				return {
					kid: plc.kid,
					requester: plc.username,
					plc_id: [plc.plc_id]
				};
			}));
			writeStreamFiles('public_kara_count');
		}
		emitWS('playlistContentsUpdated', plaid);
		emitWS('playlistInfoUpdated', plaid);
		return {plc};
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
async function notifyUserOfSongPlayTime(plc_id: number, username: string) {
	emitWS('userSongPlaysIn', await getPLCInfo(plc_id, true, username));
}

/** Copy song from one playlist to another */
export async function copyKaraToPlaylist(plc_ids: number[], plaid: string, pos?: number) {
	const pl = await getPlaylistInfo(plaid);
	if (!pl) throw {code: 404, msg: `Playlist ${plaid} unknown`};
	logger.info(`Copying ${plc_ids.length} karaokes to playlist ${pl.name}`, {service: 'Playlist'});
	try {
		profile('copyKaraToPL');
		const playlist = await getPlaylistKaraIDs(plaid);
		// plcs is an array of plc_ids.
		const date_add = new Date();
		let plcList: PLC[] = plc_ids.map(p => {
			return {
				plcid: p,
				plaid: plaid,
				date_add: date_add
			};
		});
		const PLCsToFree: number[] = [];
		for (const index in plcList) {
			const plcData = await getPLCInfoMini(plcList[index].plcid);
			if (!plcData) throw {code: 404, msg: `PLC ${plcList[index].plcid} does not exist`};
			// If source is public playlist and destination current playlist, free up PLCs from the public playlist.
			if (plcList[index].plaid === getState().publicPlaid && plaid === getState().currentPlaid) {
				PLCsToFree.push(plcList[index].plcid);
			}
			plcList[index].kid = plcData.kid;
			plcList[index].nickname = plcData.nickname;
			plcList[index].created_at = new Date();
			plcList[index].username = plcData.username;
			plcList[index].plaid = plaid;
			plcList[index].flag_visible = plcData.flag_visible;
			plcList[index].flag_refused = plcData.flag_refused;
			plcList[index].flag_accepted = plcData.flag_accepted;
			plcList[index].mediafile = plcData.mediafile;
			plcList[index].repository = plcData.repository;
			plcList[index].mediasize = plcData.mediasize;
		}
		// Remove karas already in playlist
		plcList = plcList.filter(plc => !playlist.map(e => e.kid).includes(plc.kid));
		// If pos is provided, we need to update all karas above that and add
		// karas.length to the position
		// If pos is not provided, we need to get the maximum position in the PL
		// And use that +1 to set our playlist position.
		if (pos) {
			await shiftPosInPlaylist(plaid, pos, plcList.length);
		} else {
			const maxpos = await getMaxPosInPlaylist(plaid);
			const startpos = maxpos + 1;
			for (const i in plcList) {
				plcList[i].pos = startpos + +i;
			}
		}
		await addKaraToPL(plcList);
		await Promise.all([
			editPLC(PLCsToFree, {flag_free: true}),
			updatePlaylistDuration(plaid),
			updatePlaylistKaraCount(plaid)
		]);
		updatePlaylistLastEditTime(plaid);
		const state = getState();
		// If we're adding to the current playlist ID and KM's mode is public, we have to notify users that their song has been added and will be playing in xxx minutes
		// Also for current playlist we check if medias are present
		if (plaid === state.currentPlaid) {
			for (const plc of plcList) {
				checkMediaAndDownload(plc.kid, plc.mediafile, plc.repository, plc.mediasize);
				if (plaid !== state.publicPlaid) {
					notifyUserOfSongPlayTime(plc.plcid, plc.username);
				}
			}
		}
		if (plaid === state.publicPlaid) {
			emitWS('KIDUpdated', plcList.map(plc => {
				return {
					kid: plc.kid,
					requester: plc.username,
					plc_id: [plc.plcid]
				};
			}));
		}
		emitWS('playlistContentsUpdated', plaid);
		emitWS('playlistInfoUpdated', plaid);
	} catch(err) {
		logger.error('Cannot copy karaokes to another playlist', {service: 'Playlist', obj: err});
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
export async function deleteKaraFromPlaylist(plc_ids: number[], token: Token) {
	profile('deleteKara');
	// If we get a single song, it's a user deleting it (most probably)
	try {
		const usersNeedingUpdate: Set<string> = new Set();
		const playlistsNeedingUpdate: Set<string> = new Set();
		const plcsNeedingDelete: any[] = [];
		for (const plc_id of plc_ids) {
			if (typeof plc_id !== 'number') throw {errno: 400, msg: 'At least one PLC ID is invalid'};
			const plcData = await getPLCInfoMini(plc_id);
			if (!plcData) throw {errno: 404, msg: 'At least one playlist content is unknown'};
			if (token.role !== 'admin' && plcData.username !== token.username.toLowerCase()) throw {errno: 403, msg: 'You cannot delete a song you did not add'};
			if (token.role !== 'admin' && plcData.upvotes > 0) throw {errno: 403, code: 'PL_DELETE_UPVOTED', msg: 'You cannot delete a song with upvotes'};
			if (plcData.flag_playing && getState().player.playerStatus === 'play' && plcData.plaid === getState().currentPlaid) throw {errno: 403, msg: 'You cannot delete a song being currently played. Stop playback first.'};
			usersNeedingUpdate.add(plcData.username);
			playlistsNeedingUpdate.add(plcData.plaid);
			plcsNeedingDelete.push({
				id: plc_id,
				plaid: plcData.plaid,
				kid: plcData.kid
			});
		}
		logger.debug(`Deleting songs ${plcsNeedingDelete.map(p => p.id).toString()}`, {service: 'Playlist'});
		await removeKaraFromPlaylist(plcsNeedingDelete.map((p:any) => p.id));
		const pubPLID = getState().publicPlaid;
		const KIDsNeedingUpdate: Set<string> = new Set();
		for (const plc of plcsNeedingDelete) {
			if (plc.plaid === pubPLID) {
				KIDsNeedingUpdate.add(plc.kid);
			}
		}
		emitWS('KIDUpdated', [...KIDsNeedingUpdate].map(kid => {
			return {
				kid: kid,
				plc_id: []
			};
		}));
		for (const plaid of playlistsNeedingUpdate.values()) {
			await Promise.all([
				updatePlaylistDuration(plaid),
				updatePlaylistKaraCount(plaid),
				reorderPlaylist(plaid)
			]);
			updatePlaylistLastEditTime(plaid);

			emitWS('playlistContentsUpdated', plaid);
			emitWS('playlistInfoUpdated', plaid);
			const pl = await getPlaylistInfo(plaid, {role: 'admin', username: 'admin'});
			if (pl.flag_public || pl.flag_current) {
				for (const username of usersNeedingUpdate.values()) {
					updateSongsLeft(username);
				}
			}
		}
		await Promise.all([
			writeStreamFiles('current_kara_count'),
			writeStreamFiles('time_remaining_in_current_playlist'),
			writeStreamFiles('public_kara_count')
		]);
	} catch(err) {
		throw {
			code: err?.errno,
			message: err
		};
	} finally {
		profile('deleteKara');
	}
}

export async function resetAllAcceptedPLCs() {
	const [publicPL, currentPL] = await Promise.all([
		getPlaylistContentsMini(getState().publicPlaid),
		getPlaylistContentsMini(getState().currentPlaid),
	]);
	// Filter public playlist with only songs that are accepted and which are missing from current playlist.
	const PLCsToResetAccepted = publicPL.filter(pubPLC =>
		pubPLC.flag_accepted && !currentPL.find(curPLC => curPLC.kid === pubPLC.kid && pubPLC.username === curPLC.username));
	await editPLC(PLCsToResetAccepted.map(plc => plc.plcid), {flag_accepted: false});
}

/** Edit PLC's properties in a playlist */
export async function editPLC(plc_ids: number[], params: PLCEditParams) {
	profile('editPLC');
	if (params.flag_playing === false) throw {code: 400, msg: 'flag_playing cannot be unset! Set it to another karaoke to unset it on this one'};
	if (params.flag_playing === true && plc_ids.length > 1) throw {code: 400, msg: 'flag_playing cannot be set to multiple songs at once'};
	if (params.flag_free === false) throw {code: 400, msg: 'flag_free cannot be unset!'};
	const plcData: DBPLC[] = [];
	for (const plc_id of plc_ids) {
		plcData.push(await getPLCInfoMini(plc_id));
	}
	if (plcData.includes(undefined)) throw {code: 404, msg: 'PLC ID unknown'};

	// Validations donne
	const pls: Set<string> = new Set();
	const songsLeftToUpdate: Set<any> = new Set();
	const PLCsToCopyToCurrent: number[] = [];
	const PLCsToDeleteFromCurrent: number[] = [];
	let currentPlaylist: DBPLC[] = [];
	if (params.flag_accepted === false || params.flag_refused === true) {
		//If we are cancelling flag_accepted, we'll need to remove songs from the current playlist
		// Then we need to fetch the current playlist somehow
		currentPlaylist = await getCurrentPlaylistContents();
	}
	for (const plc of plcData) {
		pls.add(plc.plaid);
		// Get playlist info in these cases
		let pl: DBPL;
		if (params.flag_playing === true || params.pos === -1) {
			pl = await getPlaylistInfo(plc.plaid);
		}
		if (params.flag_playing === true) {
			await setPlaying(plc.plcid, plc.plaid);
			// This only occurs to one playlist anyway
			if (pl.flag_current) playingUpdated();
		}
		if (params.flag_accepted === true) {
			params.flag_free = true;
			params.flag_refused = false;
			PLCsToCopyToCurrent.push(plc.plcid);
			await Promise.all([
				setPLCAccepted(plc.plcid, true),
				setPLCRefused(plc.plcid, false)
			]);
		}
		// Remember kids, flags can also be undefined, that's the magic.
		if (params.flag_accepted === false) {
			// Let's find our PLC in the current playlist
			const currentPLC = currentPlaylist.find(curplc => curplc.kid === plc.kid && curplc.username === plc.username);
			if (currentPLC) PLCsToDeleteFromCurrent.push(currentPLC.plcid);
			await setPLCAccepted(plc.plcid, params.flag_accepted);
		}
		if (params.flag_refused === true) {
			const currentPLC = currentPlaylist.find(curplc => curplc.kid === plc.kid && curplc.username === plc.username);
			if (currentPLC) PLCsToDeleteFromCurrent.push(currentPLC.plcid);
			params.flag_free = true;
			params.flag_accepted = false;
			await Promise.all([
				setPLCAccepted(plc.plcid, false),
				setPLCRefused(plc.plcid, true)
			]);
		}
		if (params.flag_refused === false) {
			await setPLCRefused(plc.plcid, params.flag_refused);
		}
		if (params.flag_free === true) {
			await freePLC(plc.plcid);
			songsLeftToUpdate.add({
				username: plc.username,
				plaid: plc.plaid
			});
		}
		if (params.flag_visible === true) await setPLCVisible(plc.plcid);
		if (params.flag_visible === false) await setPLCInvisible(plc.plcid);
		if (params.pos) {
			// If -1 move the song right after the one playing.
			if (params.pos === -1) {
				const playingPLC = await getPLCInfoMini(pl.plcontent_id_playing);
				params.pos = playingPLC?.pos + 1;
			}
			songsLeftToUpdate.add({
				username: plc.username,
				plaid: plc.plaid
			});
			await shiftPosInPlaylist(plc.plaid, params.pos, 1);
			await setPos(plc.plcid, params.pos);
			await reorderPlaylist(plc.plaid);
			const currentSong = getState().player.currentSong;
			// If our new PLC has a position higher or equal than the current song pos in state, we need to update getCurrentSong's position
			if (currentSong && currentSong.pos <= params.pos && plc.plaid === getState().currentPlaid) {
				setState({player: {currentSong: await getCurrentSong()}});
			}
			writeStreamFiles('time_remaining_in_current_playlist');
		}
	}
	if (PLCsToCopyToCurrent.length > 0) {
		try {
			await copyKaraToPlaylist(PLCsToCopyToCurrent, getState().currentPlaid);
		} catch(err) {
			// This is allowed to fail if the song is already in playlist
		}
	}
	if (PLCsToDeleteFromCurrent.length > 0) {
		try {
			await deleteKaraFromPlaylist(PLCsToDeleteFromCurrent, {role: 'admin', username: 'admin'});
		} catch(err) {
			// This is allowed to fail if the song is not present
		}
	}
	for (const songUpdate of songsLeftToUpdate.values()) {
		updateSongsLeft(songUpdate.username, songUpdate.plaid);
	}
	for (const plaid of pls.values()) {
		updatePlaylistLastEditTime(plaid);
		emitWS('playlistContentsUpdated', plaid);
		emitWS('playlistInfoUpdated', plaid);
	}
	profile('editPLC');
	return {
		plaids: pls.values()
	};
}

/** Reorders playlist with positions */
export function reorderPlaylist(plaid: string) {
	return reorderPL(plaid);
}

/** Export playlist as JSON */
export async function exportPlaylist(plaid: string) {
	const pl = await getPlaylistInfo(plaid);
	if (!pl) throw {code: 404, msg: `Playlist ${plaid} unknown`};
	try {
		logger.debug(`Exporting playlist ${plaid}`, {service: 'Playlist'});
		const plContents = await getPlaylistContentsMini(plaid);
		const playlist: PlaylistExport = {};
		// We only need a few things
		const plExport = {
			name: pl.name,
			created_at: pl.created_at,
			modified_at: pl.modified_at,
			flag_visible: pl.flag_visible,
			plaid: pl.plaid,
			username: pl.username
		};
		const plcFiltered = plContents.map((plc: DBPLC) => {
			return {
				kid: plc.kid,
				nickname: plc.nickname,
				created_at: plc.created_at,
				pos: plc.pos,
				username: plc.username,
				flag_playing: plc.flag_playing,
				flag_free: plc.flag_free,
				flag_visible: plc.flag_visible,
				flag_accepted: plc.flag_accepted,
				flag_refused: plc.flag_refused,
				plaid: plc.plaid
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

/** Import playlist from JSON */
export async function importPlaylist(playlist: any, username: string, plaid?: string) {
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
			plaid: null
		};
		let flag_playingDetected = false;
		const users = new Map();
		for (const index in playlist.PlaylistContents) {
			const kara = playlist.PlaylistContents[index];
			kara.username = kara.username.toLowerCase();
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
		if (!plaid) {
			plaid = await createPlaylist(playlist.PlaylistInformation.name, {
				visible: playlist.PlaylistInformation.flag_visible
			}, username);
		} else {
			await emptyPlaylist(plaid);
		}
		const repos = getRepos();
		const unknownRepos: Set<string> = new Set();
		for (const i in playlist.PlaylistContents) {
			// Do not replace here to not break old exports/imports
			playlist.PlaylistContents[i].plaid = plaid;
			const repo = playlist.PlaylistContents[i].repository;
			if (repo && !repos.find(r => r.Name === repo)) {
				// Repository not found
				unknownRepos.add(repo);
			}
		}

		if (playlist.PlaylistContents?.length > 0) await addKaraToPL(playlist.PlaylistContents);
		if (playingKara?.kid) {
			const plcPlaying = await getPLCByKIDUser(playingKara.kid, playingKara.username, plaid);
			await setPlaying(plcPlaying?.plcid || 0, plaid);
		}
		await Promise.all([
			updatePlaylistKaraCount(plaid),
			updatePlaylistDuration(plaid),
			writeStreamFiles('current_kara_count'),
			writeStreamFiles('time_remaining_in_current_playlist'),
			writeStreamFiles('public_kara_count')
		]);
		emitWS('playlistsUpdated');
		return {
			plaid: plaid,
			reposUnknown: Array.from(unknownRepos)
		};
	} catch(err) {
		logger.error('Import failed', {service: 'Playlist', obj: err});
		if (err?.code !== 400) {
			sentry.addErrorInfo('playlist', JSON.stringify(playlist, null, 2));
			sentry.error(err);
		}
		throw err;
	} finally {
		task.end();
	}
}

/** Find flag_playing index in a playlist */
export async function findPlaying(plaid: string): Promise<number> {
	const pl = await getPlaylistKaraIDs(plaid);
	return pl.findIndex(plc => plc.flag_playing);
}

/** Shuffle (smartly or not) a playlist */
export async function shufflePlaylist(plaid: string, method: ShuffleMethods ) {
	const pl = await getPlaylistInfo(plaid);
	if (!pl) throw {code: 404, msg: `Playlist ${plaid} unknown`};
	// We check if the playlist to shuffle is the current one. If it is, we will only shuffle
	// the part after the song currently being played.
	try {
		profile('shuffle');
		let playlist = await getPlaylistContentsMini(plaid);
		if (!pl.flag_current) {
			playlist = shufflePlaylistWithList(playlist, method);
		} else {
			// If it's current playlist, we'll make two arrays out of the playlist :
			// - One before (and including) the current song being played (flag_playing = true)
			// - One after.
			// We'll shuffle the one after then concatenate the two arrays.
			const playingPos = getPlayingPos(playlist);
			if (playingPos) {
				const BeforePlaying = playlist.filter(plc => plc.pos <= playingPos.plc_id_pos);
				let AfterPlaying = playlist.filter(plc => plc.pos > playingPos.plc_id_pos);

				AfterPlaying = shufflePlaylistWithList(AfterPlaying, method);
				playlist = BeforePlaying.concat(AfterPlaying);
			} else {
				// If no flag_playing has been set, the current playlist won't be shuffled. To fix this, we shuffle the entire playlist if no flag_playing has been met
				playlist = shufflePlaylistWithList(playlist, method);
			}
		}
		await replacePlaylist(playlist);
		updatePlaylistLastEditTime(plaid);
		logger.info(`Playlist ${pl.name} shuffled (method: ${method})`, {service: 'Playlist'});
		emitWS('playlistContentsUpdated', plaid);
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

function shufflePlaylistWithList(playlist: DBPLC[], method: ShuffleMethods ) {
	if (method === 'normal') {
		return shuffle(playlist);
	} else if (method === 'smart') {
		return smartShuffle(playlist);
	} else if (method === 'balance') {
		return balancePlaylist(playlist);
	} else if (method === 'upvotes') {
		return sortPlaylistByUpvote(playlist);
	} else {
		return playlist;
	}
}

/** Sort playlist by number of upvotes descending order */
function sortPlaylistByUpvote(playlist: DBPLC[]) {
	return playlist.sort((a, b) => b.upvotes - a.upvotes);
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

/** Balance playlist **/
function balancePlaylist(playlist: DBPLC[]) {
	const balance: Map<string, DBPLC>[] = [];

	// Organisation of karaokes
	for (const content of playlist) {
		let hasBeenInserted = false;
		for (const i in balance) {
			if (!balance[i].has(content.username)) {
				balance[i].set(content.username, content);
				hasBeenInserted = true;
				break;
			}
		}
		if (!hasBeenInserted) balance.push(new Map().set(content.username, content));
	}

	// Re-insertion
	const newPlaylist: DBPLC[] = [];
	for (const pool of balance) {
		const values = [...pool.values()];
		// If last of previous pool and first of current pool have same user
		if (newPlaylist.length > 0 && newPlaylist[newPlaylist.length - 1].username === values[0].username) {
			values.push(values.shift());
		}
		newPlaylist.push(...values);
	}

	const state = getState();
	state.usersBalance.clear();

	return newPlaylist;
}

/** Move to previous song */
export async function previousSong() {
	const plaid = getState().currentPlaid;
	const playlist = await getPlaylistContentsMini(plaid);
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
	await setPlaying(kara.plcid, plaid);
}

/** Move to next song */
export async function nextSong(): Promise<DBPLC> {
	const conf = getConfig();
	profile('NextSong');
	let playlist: DBPLCKID[];
	try {
		playlist = await getPlaylistKaraIDs(getState().currentPlaid);
	} catch(err) {
		sentry.error(err);
		profile('NextSong');
		throw err;
	}
	// Test if we're at the end of the playlist and if RepeatPlaylist is set.
	try {
		if (playlist.length === 0) throw 'Playlist is empty!';
		let currentPos = playlist.findIndex(plc => plc.flag_playing);
		if (currentPos + 1 >= playlist.length && conf.Playlist.EndOfPlaylistAction !== 'repeat') {
			logger.debug('End of playlist', {service: 'PLC'});
			// Current position is last song, not quite an error.
			return null;
		} else {
			// If we're here, it means either we're beyond the length of the playlist
			// OR that RepeatPlaylist is set.
			// We test again if we're at the end of the playlist. If so we go back to first song.
			if (conf.Playlist.EndOfPlaylistAction === 'repeat' && currentPos + 1 >= playlist.length) currentPos = -1;
			const kara = playlist[currentPos + 1];
			if (!kara) throw 'Karaoke received is empty!';
			return await getPLCInfo(kara.plcid, false, 'admin');
		}
	} catch(err) {
		throw err;
	} finally {
		profile('NextSong');
	}
}

/** Get current playlist contents */
async function getCurrentPlaylistContents(): Promise<DBPLC[]> {
	// Returns current playlist contents and where we're at.
	const plaid = getState().currentPlaid;
	const playlist = await getPlaylistContentsMini(plaid);
	return playlist;
}

export async function notificationNextSong(): Promise<void> {
	try {
		const kara = await nextSong();
		if (kara?.flag_visible) {
			const pl = await getPlaylistInfo(kara.plaid);
			if (pl.flag_visible) emitWS('nextSong', kara);
		}
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
		const plaid = getState().currentPlaid;
		if (updatePlayingKara) await setPlaying(kara.plcid, plaid);
		// Let's add details to our object so the player knows what to do with it.
		kara.plaid = plaid;
		let requester: string;
		let avatarfile: string;
		if (conf.Player.Display.Nickname) {
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
			avatarfile = resolve(resolvedPathAvatars(), user.avatar_file);
			if (!await asyncExists(avatarfile)) avatarfile = resolve(resolvedPathAvatars(), 'blank.png');
		} else {
			requester = '';
		}
		// If series is empty, pick singer information instead
		const series = getSongSeriesSingers(kara);

		// If song order is 0, don't display it (we don't want things like OP0, ED0...)
		let songorder = `${kara.songorder}`;
		if (!kara.songorder || kara.songorder === 0) songorder = '';

		const versions = getSongVersion(kara);
		const currentSong: CurrentSong = {...kara};
		// Construct mpv message to display.
		currentSong.infos = '{\\bord2}{\\fscx70}{\\fscy70}{\\b1}'+series+'{\\b0}\\N{\\i1}' +kara.songtypes.map(s => s.name).join(' ')+songorder+' - '+getSongTitle(kara)+versions+'{\\i0}\\N{\\fscx50}{\\fscy50}'+requester;
		currentSong.avatar = avatarfile;
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
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYLIST_FREE_ORPHANED_SONGS', err));
	}
}

/** Initialize playlist tasks */
export async function initPlaylistSystem() {
	profile('initPL');
	setInterval(updateFreeOrphanedSongs, 60 * 1000);
	const pls = await getPLs(false);
	pls.forEach(pl => reorderPlaylist(pl.plaid));
	await testPlaylists();
	logger.debug('Playlists initialized', {service: 'Playlist'});
	profile('initPL');
}

/** Create current playlist if it doesn't exist */
export async function testCurrentPlaylist() {
	const currentPL_id = await findCurrentPlaylist();
	if (currentPL_id) {
		setState({currentPlaid: currentPL_id});
	} else {
		setState({currentPlaid:
			await createPL({
				name: i18n.t('CURRENT_PLAYLST'),
				flag_visible: true,
				flag_current: true,
				username: 'admin'
			})
		});
		logger.debug('Initial current playlist created', {service: 'Playlist'});
	}
}

/** Create public playlist if it doesn't exist */
export async function testPublicPlaylist() {
	const publicPL_id = await findPublicPlaylist();
	if (publicPL_id) {
		setState({ publicPlaid: publicPL_id });
	} else {
		setState({ publicPlaid:
			await createPL({
				name: i18n.t('PUBLIC_PLAYLST'),
				flag_visible: true,
				flag_public: true,
				username: 'admin'
			})
		});
		logger.debug('Initial public playlist created', {service: 'Playlist'});
	}
}

/** Update all user quotas affected by a PLC getting freed/played */
export async function updateUserQuotas(kara: PLC) {
	// If karaokes are present in the public playlist, we're marking them free.
	// First find which KIDs are to be freed. All those before the currently playing kara
	// are to be set free.
	// Then we're updating song quotas for all users involved.
	const state = getState();
	profile('updateUserQuotas');
	await freePLCBeforePos(kara.pos, state.currentPlaid);
	// For every KID we check if it exists and add the PLC to a list
	const [publicPlaylist, currentPlaylist] = await Promise.all([
		getPlaylistContentsMini(state.publicPlaid),
		getPlaylistContentsMini(state.currentPlaid)
	]);
	const freeTasks = [];
	const usersNeedingUpdate: Set<string> = new Set();
	const freeSongs = currentPlaylist.filter(plc => plc.flag_free);
	for (const freeSong of freeSongs) {
		const publicSong = publicPlaylist.find(plc => plc.kid === freeSong.kid);
		if (publicSong) {
			freeTasks.push(freePLC(publicSong.plcid));
			usersNeedingUpdate.add(publicSong.username);
		}
	}
	await Promise.all(freeTasks);
	for (const username of usersNeedingUpdate.values()) {
		updateSongsLeft(username, state.publicPlaid);
	}
	profile('updateUserQuotas');
}

export function playlistImported(res: any) {
	emitWS('playlistImported', res);
}
