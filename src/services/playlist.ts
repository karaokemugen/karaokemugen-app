// Utils
import { extname, resolve } from 'node:path';

import { promises as fs } from 'fs';
import i18n from 'i18next';
import { shuffle } from 'lodash';

import { insertKaraToRequests } from '../dao/kara.js';
// DAO
import {
	deleteKaraFromPlaylist,
	deletePlaylist,
	insertKaraIntoPlaylist,
	insertPlaylist,
	reorderPlaylist as reorderPL,
	replacePlaylist,
	selectMaxPosInPlaylist,
	selectPlaylistContents,
	selectPlaylistContentsMicro,
	selectPlaylistContentsMini,
	selectPlaylists,
	selectPLCByKIDAndUser,
	selectPLCInfo,
	selectPLCInfoMini,
	selectSongCountForUser,
	selectSongTimeSpentForUser,
	shiftPosInPlaylist,
	truncatePlaylist,
	updateFreeOrphanedSongs,
	updatePlaying as setPlayingFlag,
	updatePlaylist,
	updatePlaylistDuration,
	updatePlaylistKaraCount,
	updatePlaylistLastEditTime,
	updatePLCAccepted,
	updatePLCCriterias,
	updatePLCFree,
	updatePLCFreeBeforePos,
	updatePLCInvisible,
	updatePLCRefused,
	updatePLCVisible,
	updatePos,
} from '../dao/playlist.js';
import { APIMessage } from '../lib/services/frontend.js';
import { formatKaraList } from '../lib/services/kara.js';
import { PLImportConstraints } from '../lib/services/playlist.js';
import { DBKara, DBKaraBase } from '../lib/types/database/kara.js';
import { DBPLC, DBPLCBase, PLCInsert } from '../lib/types/database/playlist.js';
import { PlaylistExport, PLCEditParams } from '../lib/types/playlist.js';
import { OldJWTToken, User } from '../lib/types/user.js';
import { getConfig, resolvedPathRepos } from '../lib/utils/config.js';
import { date, now, time as time2 } from '../lib/utils/date.js';
import { ErrorKM } from '../lib/utils/error.js';
import { fileExists, resolveFileInDirs, sanitizeFile } from '../lib/utils/files.js';
import logger, { profile } from '../lib/utils/logger.js';
import { generateM3uFileFromPlaylist } from '../lib/utils/m3u.js';
import Task from '../lib/utils/taskManager.js';
import { check } from '../lib/utils/validators.js';
import { emitWS } from '../lib/utils/ws.js';
import { DBPL } from '../types/database/playlist.js';
import { AutoMixParams, AutoMixPlaylistInfo, PlaylistLimit } from '../types/favorites.js';
import { AddKaraParams, CurrentSong, Pos, ShuffleMethods } from '../types/playlist.js';
import { adminToken } from '../utils/constants.js';
import sentry from '../utils/sentry.js';
import { getState, setState } from '../utils/state.js';
import { writeStreamFiles } from '../utils/streamerFiles.js';
import { checkMediaAndDownload } from './download.js';
import { getAllFavorites } from './favorites.js';
import { getKaras, getKarasMicro } from './kara.js';
import { getSongInfosForPlayer } from './karaEngine.js';
import { playPlayer } from './player.js';
import { getRepos } from './repo.js';
import {
	addCriteria,
	blacklistHook,
	getCriterias,
	updateAllSmartPlaylists,
	updateSmartPlaylist,
	validateCriterias,
	whitelistHook,
} from './smartPlaylist.js';
import { getUser, getUsers, updateSongsLeft } from './user.js';

const service = 'Playlist';

let freeOrphanedSongsIntervalID: NodeJS.Timeout;

/** Test if basic playlists exist */
export async function testPlaylists() {
	profile('testPlaylists');
	const pls = await getPlaylists(adminToken);
	const currentPL = pls.find(pl => pl.flag_current);
	const publicPL = pls.find(pl => pl.flag_public);
	const whitePL = pls.find(pl => pl.flag_whitelist);
	const blackPL = pls.find(pl => pl.flag_blacklist);
	const fallbackPL = pls.find(pl => pl.flag_fallback);
	if (!currentPL && !publicPL) {
		// Initial state here, or someone did something REALLY wrong. we create only one playlist
		const plaid = await insertPlaylist({
			name: i18n.t('MY_PLAYLIST'),
			created_at: new Date(),
			modified_at: new Date(),
			flag_visible: true,
			flag_current: true,
			flag_public: true,
			username: 'admin',
		});
		setState({ currentPlaid: plaid, publicPlaid: plaid });
		logger.debug('Initial current and public playlist created', { service });
	} else {
		// Testing current/public playlist individually.
		if (currentPL) {
			setState({ currentPlaid: currentPL.plaid });
		} else {
			setState({
				currentPlaid: await insertPlaylist({
					name: i18n.t('CURRENT_PLAYLIST'),
					flag_visible: true,
					flag_current: true,
					username: 'admin',
				}),
			});
			logger.debug('Initial current playlist created', { service });
		}
		if (publicPL) {
			setState({ publicPlaid: publicPL.plaid });
		} else {
			setState({
				publicPlaid: await insertPlaylist({
					name: i18n.t('PUBLIC_PLAYLIST'),
					flag_visible: true,
					flag_public: true,
					username: 'admin',
				}),
			});
			logger.debug('Initial public playlist created', { service });
		}
	}

	if (whitePL) {
		setState({ whitelistPlaid: whitePL.plaid });
	} else {
		setState({
			whitelistPlaid: await insertPlaylist({
				name: i18n.t('WHITELIST'),
				created_at: new Date(),
				modified_at: new Date(),
				flag_visible: true,
				flag_whitelist: true,
				username: 'admin',
			}),
		});
		logger.debug('Initial whitelist playlist created', { service });
	}

	if (blackPL) {
		setState({ blacklistPlaid: blackPL.plaid });
	} else {
		setState({
			blacklistPlaid: await insertPlaylist({
				name: i18n.t('BLACKLIST'),
				created_at: new Date(),
				modified_at: new Date(),
				flag_visible: true,
				flag_blacklist: true,
				flag_smart: true,
				username: 'admin',
				type_smart: 'UNION',
			}),
		});
		logger.debug('Initial blacklist playlist created', { service });
	}

	if (fallbackPL) {
		setState({ fallbackPlaid: fallbackPL.plaid });
	} else {
		setState({
			fallbackPlaid: await insertPlaylist({
				name: i18n.t('FALLBACK'),
				created_at: new Date(),
				modified_at: new Date(),
				flag_visible: false,
				flag_fallback: true,
				flag_smart: true,
				username: 'admin',
				type_smart: 'UNION',
			}),
		});
		logger.debug('Initial fallback playlist created', { service });
	}

	profile('testPlaylists');
}

/** Getting position of the currently playing karaoke in a playlist */
function getPlayingPos(playlist: DBPLCBase[]): Pos {
	const index = playlist.findIndex(e => e.flag_playing);
	if (index > -1) {
		return {
			plc_id_pos: playlist[index].pos,
			index,
		};
	}
	return undefined;
}

/** Set PLC's flag_free to enabled */
export function freePLC(plc_ids: number[]) {
	return updatePLCFree(plc_ids);
}

/** Free all PLCs before a certain position in a playlist */
export function freePLCBeforePos(pos: number, plaid: string) {
	return updatePLCFreeBeforePos(pos, plaid);
}

/** Checks if user is allowed to add a song (quota) */
export async function isUserAllowedToAddKara(plaid: string, user: User, duration: number): Promise<boolean> {
	try {
		const conf = getConfig();
		if (+conf.Karaoke.Quota.Type === 0) return true;
		const playlistsToConsider =
			conf?.Karaoke?.Quota?.FreeAcceptedSongs === true
				? [plaid]
				: [getState().publicPlaid, getState().currentPlaid, plaid];
		let limit: number;
		switch (+conf.Karaoke.Quota.Type) {
			case 2:
				limit = conf.Karaoke.Quota.Time;
				let time = await selectSongTimeSpentForUser(playlistsToConsider, user.login);
				if (!time) time = 0;
				if (limit - time - duration < 0) {
					logger.debug(
						`User ${user.login} tried to add more songs than he/she was allowed (${
							limit - time
						} seconds of time credit left and tried to add ${duration} seconds)`,
						{ service }
					);
					return false;
				}
				return true;
			case 1:
			default:
				limit = conf.Karaoke.Quota.Songs;
				const count = await selectSongCountForUser(playlistsToConsider, user.login);
				if (count >= limit) {
					logger.debug(`User ${user.login} tried to add more songs than he/she was allowed (${limit})`, {
						service,
					});
					return false;
				}
				return true;
		}
	} catch (err) {
		sentry.error(err);
		throw err;
	}
}

/** Set a PLC flag_playing to enabled */
export async function setPlaying(plc_id: number, plaid: string) {
	await setPlayingFlag(plc_id, plaid);
	emitWS('playingUpdated', {
		plaid,
		plc_id,
	});
	updatePlaylistDuration(plaid);
}

/** Trim playlist after a certain duration */
export async function trimPlaylist(playlist: DBPLC[], duration: number, type: PlaylistLimit = 'duration') {
	let lastPos = 0;
	if (type === 'duration') {
		const durationSecs = duration * 60 || 0;
		let durationPL = 0;
		// Going through the playlist and updating lastPos on each item
		// Until we hit the limit for duration
		for (const pos in playlist) {
			if (Object.prototype.hasOwnProperty.call(playlist, pos)) {
				lastPos = +pos;
				durationPL += playlist[pos].duration;
				if (durationPL > durationSecs) break;
			}
		}
	} else {
		lastPos = duration;
	}
	return playlist.slice(0, lastPos);
}

/** Remove playlist entirely */
export async function removePlaylist(plaid: string) {
	try {
		profile('deletePlaylist');
		const pl = await getPlaylistInfo(plaid);
		if (!pl) throw new ErrorKM('UNKNOWN_PLAYLIST', 404, false);
		const msgs = {
			flag_current: 'DELETE_PLAYLIST_ERROR_CURRENT',
			flag_public: 'DELETE_PLAYLIST_ERROR_PUBLIC',
			flag_whitelist: 'DELETE_PLAYLIST_ERROR_WHITELIST',
			flag_blacklist: 'DELETE_PLAYLIST_ERROR_BLACKLIST',
		};
		let msg = '';
		const specialPlaylistFlag = pl.flag_current || pl.flag_blacklist || pl.flag_whitelist || pl.flag_public;
		if (specialPlaylistFlag) {
			if (pl.flag_current) msg = msgs.flag_current;
			if (pl.flag_blacklist) msg = msgs.flag_blacklist;
			if (pl.flag_public) msg = msgs.flag_public;
			if (pl.flag_whitelist) msg = msgs.flag_whitelist;
			throw new ErrorKM(msg, 409, false);
		}
		logger.info(`Deleting playlist ${pl.name}`, { service });
		await deletePlaylist(plaid);
		emitWS('playlistsUpdated');
	} catch (err) {
		logger.error(`Error deleting playlist ${plaid} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_DELETE_ERROR');
	} finally {
		profile('deletePlaylist');
	}
}

/** Empty playlist completely */
export async function emptyPlaylist(plaid: string): Promise<string> {
	try {
		profile('emptyPL');
		const pl = await getPlaylistInfo(plaid);
		if (!pl) throw new ErrorKM('UNKNOWN_PLAYLIST', 404, false);
		logger.debug(`Emptying playlist ${pl.name}`, { service });
		await truncatePlaylist(plaid);
		await Promise.all([updatePlaylistKaraCount(plaid), updatePlaylistDuration(plaid)]);
		updatePlaylistLastEditTime(plaid);
		if (plaid === getState().currentPlaid) writeStreamFiles('current_playlist_info');
		// If our playlist is the public one, the frontend should reset all buttons on the song library so it shows + for everything all over again.
		if (plaid === getState().publicPlaid) emitWS('publicPlaylistEmptied', plaid);
		emitWS('playlistContentsUpdated', plaid);
		return plaid;
	} catch (err) {
		logger.error(`Error emptying playlist ${plaid} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_EMPTY_ERROR');
	} finally {
		profile('emptyPL');
	}
}

/** Exports all playlist media files to a specified directory */
export async function exportPlaylistMedia(
	plaid: string,
	exportDir: string
): Promise<Array<DBPLC & { exportSuccessful: boolean }>> {
	const plMini = await getPlaylistContentsMini(plaid);
	if (!plMini) throw new ErrorKM('UNKNOWN_PLAYLIST', 404, false);
	const task = new Task({
		text: 'EXPORTING_PLAYLIST_MEDIA',
		total: plMini.length,
		value: 0,
	});
	try {
		let itemsProcessed = 0;
		logger.debug(`Exporting media of playlist ${plaid}`, { service });
		const exportedResult: Array<DBPLC & { exportSuccessful: boolean }> = [];
		for (const kara of plMini) {
			try {
				const karaMediaPath = await resolveFileInDirs(
					kara.mediafile,
					resolvedPathRepos('Medias', kara.repository)
				);
				const karaLyricsPath = await resolveFileInDirs(
					kara.lyrics_infos[0]?.filename,
					resolvedPathRepos('Lyrics', kara.repository)
				);
				const destBaseFile = sanitizeFile(kara.songname);
				logger.debug(`Copying ${karaMediaPath[0]} to ${exportDir}`, { service });
				task.update({
					subtext: destBaseFile,
				});
				const exportPath = resolve(exportDir, `${destBaseFile}${extname(kara.mediafile)}`);
				const existingFileSize = (await fileExists(exportPath)) && (await fs.stat(exportPath)).size;
				if (!existingFileSize || existingFileSize !== kara.mediasize)
					await fs.copyFile(karaMediaPath[0], exportPath);
				if (karaLyricsPath[0]) {
					// Kara can have no lyrics file
					await fs.copyFile(
						karaLyricsPath[0],
						resolve(exportDir, `${destBaseFile}${extname(kara.lyrics_infos[0]?.filename)}`)
					);
				}
				exportedResult.push({ ...kara, exportSuccessful: true });
			} catch (err) {
				logger.warn(`Unable to export media ${kara.mediafile} : ${err}`, { service });
				exportedResult.push({ ...kara, exportSuccessful: false });
			} finally {
				itemsProcessed += 1;
				task.update({
					value: itemsProcessed,
				});
			}
		}

		// Create m3u playlist
		const playlist = await getPlaylistInfo(plaid);
		const successfulExports = exportedResult.filter(resultKara => resultKara.exportSuccessful);
		if (successfulExports.length > 0)
			await generateM3uFileFromPlaylist(playlist, successfulExports, exportDir, true);

		return exportedResult;
	} catch (err) {
		logger.error(`Error export media from playlist ${plaid} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_EXPORT_MEDIA_ERROR');
	} finally {
		task.end();
	}
}

/** Download all song media files from a playlist */
async function downloadMediasInPlaylist(plaid: string) {
	const plcs = await getPlaylistContentsMini(plaid);
	await checkMediaAndDownload(plcs);
}

// Actions took when a new current playlist is set
function currentHook(plaid: string, name: string) {
	const oldCurrentPlaylist_id = getState().currentPlaid;
	updatePlaylistLastEditTime(oldCurrentPlaylist_id);
	emitWS('playlistInfoUpdated', oldCurrentPlaylist_id);
	setState({ currentPlaid: plaid, introPlayed: false, introSponsorPlayed: false });
	emitWS('currentPlaylistUpdated', plaid);
	resetAllAcceptedPLCs();
	writeStreamFiles('next_song_name_and_requester');
	writeStreamFiles('current_playlist_info');
	downloadMediasInPlaylist(plaid);
	logger.info(`Playlist ${name} is now current`, { service });
}

// Actions took when a new public playlist is set
function publicHook(plaid: string, name: string) {
	const oldPublicPlaylist_id = getState().publicPlaid;
	updatePlaylistLastEditTime(oldPublicPlaylist_id);
	emitWS('playlistInfoUpdated', oldPublicPlaylist_id);
	setState({ publicPlaid: plaid });
	emitWS('publicPlaylistUpdated', plaid);
	writeStreamFiles('public_kara_count');
	logger.info(`Playlist ${name} is now public`, { service });
}

/** Edit playlist properties */
export async function editPlaylist(plaid: string, playlist: Partial<DBPL>) {
	try {
		const pl = await getPlaylistInfo(plaid);
		if (!pl) throw new ErrorKM('UNKNOWN_PLAYLIST', 404, false);
		logger.debug(`Editing playlist ${plaid}`, { service, obj: playlist });
		const newPL: DBPL = {
			...pl,
			...playlist,
		};
		let needsSmartUpdating = false;

		if (newPL.flag_smart) {
			// Only update if :
			// - Smart type (AND/OR) has changed
			// - Smart limit has changed
			// - Any smart limit option has been set with this change and the PL has the limit enabled
			if (
				pl.type_smart !== newPL.type_smart ||
				pl.flag_smartlimit !== newPL.flag_smartlimit ||
				(newPL.flag_smartlimit && playlist.smart_limit_number) ||
				(newPL.flag_smartlimit && playlist.smart_limit_order) ||
				(newPL.flag_smartlimit && playlist.smart_limit_type)
			) {
				needsSmartUpdating = true;
			}
			// If type_smart switches from UNION to INTERSECT we must check criterias to see if they're still compatible.
			if (pl.type_smart === 'UNION' && newPL.type_smart === 'INTERSECT') {
				const cs = await getCriterias(newPL.plaid, null, false);
				try {
					validateCriterias(cs, newPL);
				} catch (err) {
					// We change the message to say you can't chagne the smart type due to conflicting criterias
					if (err.code === 409) err.message === 'TYPE_SMART_CHANGE_CONFLICTING_CRITERIAS_ERROR';
					throw err;
				}
			}
		}
		await updatePlaylist(newPL);
		if (playlist.flag_current) currentHook(plaid, newPL.name);
		if (playlist.flag_public) publicHook(plaid, newPL.name);
		if (playlist.flag_whitelist) whitelistHook(plaid);
		if (playlist.flag_blacklist) blacklistHook(plaid);
		if (playlist.flag_fallback) fallbackPlaylistHook(plaid);
		const isBlacklist = plaid === getState().blacklistPlaid;
		const isWhitelist = plaid === getState().whitelistPlaid;

		if (needsSmartUpdating) {
			await updateSmartPlaylist(plaid);
		}
		// Skip playlist's smart updating if it's whitelist or blacklist since we already did it.
		if (isBlacklist || isWhitelist) {
			updateAllSmartPlaylists(isBlacklist, isWhitelist);
		}
		updatePlaylistLastEditTime(plaid);
		emitWS('playlistInfoUpdated', plaid);
		emitWS('playlistsUpdated');
	} catch (err) {
		logger.error(`Error editing playlist ${plaid} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_UPDATE_ERROR');
	}
}

/** Create new playlist */
export async function createPlaylist(pl: DBPL, username: string): Promise<string> {
	try {
		const plaid = await insertPlaylist({
			...pl,
			created_at: new Date(),
			modified_at: new Date(),
			flag_current: pl.flag_current || null,
			flag_public: pl.flag_public || null,
			flag_whitelist: pl.flag_whitelist || null,
			flag_blacklist: pl.flag_blacklist || null,
			username,
		});
		if (+pl.flag_current) currentHook(plaid, pl.name);
		if (+pl.flag_public) publicHook(plaid, pl.name);
		if (+pl.flag_whitelist) whitelistHook(plaid);
		if (+pl.flag_blacklist) blacklistHook(plaid);
		if (+pl.flag_fallback) fallbackPlaylistHook(plaid);
		emitWS('playlistInfoUpdated', plaid);
		emitWS('playlistsUpdated');
		return plaid;
	} catch (err) {
		logger.error(`Error creating playlist ${pl.name} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_CREATE_ERROR');
	}
}

/** Get playlist properties */
export async function getPlaylistInfo(plaid: string, token?: OldJWTToken) {
	try {
		const pl = (await selectPlaylists(false, plaid))[0];
		// We're testing this here instead of in the above function
		if (token) {
			if (token.role === 'admin' || pl?.flag_visible) return pl;
			throw new ErrorKM('UNKNOWN_PLAYLIST', 404, false);
		}
		return pl;
	} catch (err) {
		logger.error(`Error viewing playlist info for ${plaid} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_VIEW_ERROR');
	}
}

/** Get all playlists properties */
export async function getPlaylists(token: OldJWTToken) {
	profile('getPlaylists');
	try {
		let ret = await selectPlaylists(token.role !== 'admin');
		ret = [
			// Group by user created and system playlists
			...ret
				.filter(pl => pl.username !== 'admin')
				.sort((a, b) => b.created_at?.getTime() - a.created_at?.getTime()),
			...ret.filter(pl => pl.username === 'admin'),
		];
		profile('getPlaylists');
		return ret;
	} catch (err) {
		logger.error(`Error fetching playlists : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_LIST_ERROR');
	}
}

/** Get playlist contents in a smaller format to speed up fetching data for internal use */
export function getPlaylistContentsMini(plaid: string) {
	return selectPlaylistContentsMini(plaid);
}

/** Get a tiny amount of data from a PLC
 * After Mini-PL, Micro-PL, we need the PL-C format.
 */
export async function getPlaylistContentsMicro(plaid: string, username?: string, token?: OldJWTToken) {
	try {
		const pl = await getPlaylistInfo(plaid, token);
		// Playlist isn't visible to user, throw.
		if (!pl) throw new ErrorKM('UNKNOWN_PLAYLIST', 404, false);
		return await selectPlaylistContentsMicro(plaid, username);
	} catch (err) {
		logger.error(`Error fetching playlist micro contents : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_VIEW_SONGS_ERROR');
	}
}

/** Get playlist contents */
export async function getPlaylistContents(
	plaid: string,
	token: OldJWTToken,
	filter: string,
	lang: string,
	from = 0,
	size = 99999999999,
	random = 0,
	orderByLikes = false
) {
	try {
		profile('getPLC');
		await getPlaylistInfo(plaid, token);
		const pl = await selectPlaylistContents({
			plaid,
			username: token.username.toLowerCase(),
			filter,
			lang,
			from,
			size,
			random,
			orderByLikes,
		});
		if (from === -1) {
			const pos = getPlayingPos(pl);
			pos ? (from = pos.index) : (from = 0);
		}
		profile('getPLC');
		const count = pl.length > 0 ? pl[0].count : 0;
		return formatKaraList(pl, from, count);
	} catch (err) {
		logger.error(`Error fetching playlist contents : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_VIEW_SONGS_ERROR');
	}
}

/** Get song information from a particular PLC */
export async function getKaraFromPlaylist(plc_id: number, token: OldJWTToken) {
	try {
		const kara = await getPLCInfo(plc_id, token.role === 'user', token.username.toLowerCase());
		if (!kara) throw new ErrorKM('UNKNOWN_PLAYLIST_ITEM', 404, false);
		return kara;
	} catch (err) {
		logger.error(`Error getting PLC ${plc_id} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_VIEW_CONTENT_ERROR');
	}
}

/** Get PLC by KID and Username */
function getPLCByKIDUser(kid: string, username: string, plaid: string) {
	return selectPLCByKIDAndUser(kid, username, plaid);
}

/** Add song to playlist
 * This is one of the most cursed functions in Karaoke Mugen.
 * Please be calm when reading it.
 */
export async function addKaraToPlaylist(params: AddKaraParams) {
	// Defaults
	params = {
		refresh: true,
		throwOnMissingKara: false,
		visible: true,
		...params,
	};
	try {
		const requester = params.requester.toLowerCase();
		const conf = getConfig();
		const state = getState();
		if (!params.plaid) params.plaid = state.publicPlaid;
		const [pl, karasInDB] = await Promise.all([getPlaylistInfo(params.plaid), getKarasMicro(params.kids)]);
		const karas: DBKaraBase[] = [];
		profile('addKaraToPL');
		if (!pl) throw new ErrorKM('UNKNOWN_PLAYLIST', 404, false);
		const user: User = await getUser(requester);
		if (!user) throw new ErrorKM('UNKNOWN_USER', 404, false);

		profile('addKaraToPL-checkKIDExistence');
		const allKaras = new Set(karasInDB.map(k => k.kid));
		const karasUnknown = [];
		params.kids.forEach(kid => {
			if (!allKaras.has(kid)) karasUnknown.push(kid);
		});
		if (karasUnknown.length > 0 && params.throwOnMissingKara) {
			throw new ErrorKM('UNKNOWN_SONG', 404, false);
		}
		const karasLeftToAdd = params.kids.filter(kid => !karasUnknown.includes(kid));
		if (karasLeftToAdd.length === 0) {
			logger.warn(`No song left to add to playlist ${pl.name || 'unknown'}. All songs supplied are unknown.`, {
				service,
			});
			return;
		}
		profile('addKaraToPL-checkKIDExistence');
		// Sort karas from our database by the list that was provided to this function, so songs are added in the correct order
		profile('addKaraToPL-sort');
		for (const kid of params.kids) {
			if (!karasUnknown.includes(kid)) karas.push(karasInDB.find(k => k.kid === kid));
		}
		profile('addKaraToPL-sort');
		logger.debug(`Adding ${karas.length} song(s) to playlist ${pl.name || 'unknown'} by ${requester}...`, {
			service,
		});

		if (user.type > 0 && !params.ignoreQuota) {
			// If user is not admin
			// Check if karaoke is in blacklist
			const [blacklist, whitelist] = await Promise.all([
				getPlaylistContentsMini(getState().blacklistPlaid),
				getPlaylistContentsMini(getState().whitelistPlaid),
			]);
			if (blacklist.find(k => k.kid === karas[0].kid) && !whitelist.find(k => k.kid === karas[0].kid)) {
				throw new ErrorKM('PLAYLIST_MODE_ADD_SONG_ERROR_BLACKLISTED', 451, false);
			}
			// Check user quota first
			if (!(await isUserAllowedToAddKara(params.plaid, user, karas[0].duration))) {
				throw new ErrorKM('PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED', 429, false);
			}
		}
		// Everything's daijokay, user is allowed to add a song.
		const date_add = new Date();
		let karaList: PLCInsert[] = karas.map(k => {
			return {
				kid: k.kid,
				username: requester,
				nickname: user.nickname,
				plaid: params.plaid,
				added_at: date_add,
				criterias: params.criterias?.find(c => c.kid === k.kid)?.criterias,
			};
		});

		profile('addKaraToPL-determinePos');
		profile('addKaraToPL-determinePos-queries');
		const [playlistMaxPos] = await Promise.all([selectMaxPosInPlaylist(params.plaid)]);
		profile('addKaraToPL-determinePos-queries');
		const plContents = await selectPlaylistContentsMicro(params.plaid);

		profile('addKaraToPL-determinePos');
		const playingObject = getPlayingPos(plContents);
		const playingPos = playingObject?.plc_id_pos || 0;

		profile('addKaraToPL-checkDuplicates');
		const duplicateCheckList =
			user.type === 0
				? // Admin can add a song multiple times in the current or any other playlist, even by the same user
					conf.Playlist.AllowDuplicates
					? []
					: // Option to allow is not set : removing duplicates from songs to add
						plContents
				: // Not an admin adding these songs.
					conf.Playlist.AllowPublicDuplicates === 'allowed'
					? // A user isn't allowed to add the same song twice
						// But several users can add the same song twice
						// So we remove all songs they haven't added already from the list that's going to be compared later.
						plContents.filter(plc => plc.username === requester)
					: plContents;
		karaList = karaList.filter(k => !duplicateCheckList.map(plc => plc.kid).includes(k.kid));
		profile('addKaraToPL-checkDuplicates');
		if (karaList.length === 0) {
			throw new ErrorKM('PLAYLIST_MODE_ADD_SONG_ERROR_ALREADY_ADDED', 409, false);
		}
		// Find out position of currently playing karaoke
		// If no flag_playing is found, we'll add songs at the end of playlist.
		// -1 means the admin right-clicked and the song is to be added after the current playing song
		if (params.pos === -1) params.pos = playingPos + 1;
		if (params.pos) {
			await shiftPosInPlaylist(params.plaid, params.pos, params.kids.length);
		} else {
			params.pos = playlistMaxPos + 1;
		}
		for (const i in karaList) {
			if ({}.hasOwnProperty.call(karaList, i)) {
				karaList[i].pos = params.pos + +i;
				// Test if we're adding a invisible/masked karaoke or not
				karaList[i].flag_visible = true;
				if (
					(!conf.Playlist.MysterySongs.AddedSongVisibilityAdmin && user.type === 0) ||
					(!conf.Playlist.MysterySongs.AddedSongVisibilityPublic && user.type > 0) ||
					params.visible === false
				) {
					karaList[i].flag_visible = false;
				}
			}
		}

		// Adding song to playlist at long last!
		profile('addKaraToPL-insert');
		const PLCsInserted = await insertKaraIntoPlaylist(karaList);
		profile('addKaraToPL-insert');
		// Song requests by admins are ignored and not added to requests stats
		if (user.type > 0) {
			insertKaraToRequests(
				user.login,
				karaList.map(k => k.kid)
			);
		}

		updatePlaylistLastEditTime(params.plaid);

		// Auto-balance current playlist if user isn't in first pool
		if (conf.Karaoke.AutoBalance && params.plaid === getState().currentPlaid) {
			let playlist = await getPlaylistContentsMini(params.plaid);
			const playingPosInPL = getPlayingPos(playlist);
			if (playingPosInPL) {
				playlist = playlist.filter(plc => plc.pos > playingPosInPL.plc_id_pos);
			}

			const checker = new Set<string>();
			for (const content of playlist) {
				if (checker.has(content.username)) {
					await shufflePlaylist(params.plaid, 'balance');
					break;
				} else if (content.username === user.login) {
					break;
				}
				checker.add(content.username);
			}
		}

		// Checking if a flag_playing is present inside the playlist.
		// If not, we'll have to set the karaoke we just added as the currently playing one. updatePlaylistDuration is done by setPlaying already.
		profile('addKaraToPL-updateFlagPlaying');
		if (!plContents.find((plc: DBPLCBase) => plc.flag_playing)) {
			await setPlaying(PLCsInserted[0].plcid, params.plaid);
		} else {
			await updatePlaylistDuration(params.plaid);
		}
		profile('addKaraToPL-updateFlagPlaying');
		profile('addKaraToPL-updateCountAndSongsLeft');
		await Promise.all([updatePlaylistKaraCount(params.plaid), updateSongsLeft(user.login, params.plaid)]);
		profile('addKaraToPL-updateCountAndSongsLeft');
		const plc = await getPLCInfo(PLCsInserted[0].plcid, true, requester);
		if (params.plaid === state.currentPlaid) {
			checkMediaAndDownload(karas);
			writeStreamFiles('next_song_name_and_requester');
			writeStreamFiles('current_playlist_info');
			if (conf.Karaoke.Autoplay && (state.player?.mediaType === 'stop' || state.randomPlaying)) {
				setState({ randomPlaying: false });
				await setPlaying(PLCsInserted[0].plcid, getState().currentPlaid);
				await playPlayer(true);
			}
		}
		if (params.plaid === state.publicPlaid) {
			emitWS(
				'KIDUpdated',
				PLCsInserted.map(iplc => {
					return {
						kid: iplc.kid,
						requester: iplc.username,
						plc_id: [iplc.plcid],
					};
				})
			);
			writeStreamFiles('public_kara_count');
		}
		if (params.refresh) {
			emitWS('playlistContentsUpdated', params.plaid);
			emitWS('playlistInfoUpdated', params.plaid);
		}
		return { plc };
	} catch (err) {
		logger.error('Unable to add karaokes', { service, obj: err });
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_ADD_SONG_ERROR');
	} finally {
		profile('addKaraToPL');
	}
}

/** Get PLC information from database */
function getPLCInfo(plc_id: number, forUser: boolean, username: string) {
	try {
		profile('getPLCInfo');
		return selectPLCInfo(plc_id, forUser, username);
	} catch (err) {
		throw err;
	} finally {
		profile('getPLCInfo');
	}
}

/** Get a small amount of data from a PLC */
export function getPLCInfoMini(plc_ids: number[]) {
	return selectPLCInfoMini(plc_ids);
}

/** Notify user of song play time */
async function notifyUserOfSongPlayTime(plc_id: number, username: string) {
	emitWS('userSongPlaysIn', await getPLCInfo(plc_id, true, username));
}

/** Copy song from one playlist to another */
export async function copyKaraToPlaylist(plc_ids: number[], plaid: string, pos?: number) {
	try {
		profile('copyKaraToPL');
		const pl = await getPlaylistInfo(plaid);
		if (!pl) throw new ErrorKM('UNKNOWN_PLAYLIST', 404, false);
		logger.info(`Copying ${plc_ids.length} karaokes to playlist ${pl.name}`, { service });
		const playlist = await selectPlaylistContentsMicro(plaid);
		const PLCsToFree: number[] = [];
		let plcs = await getPLCInfoMini(plc_ids);
		for (const plcid of plc_ids) {
			if (!plcs.find(plc => plc.plcid === +plcid)) throw new ErrorKM('UNKNOWN_PLAYLIST_ITEM', 404, false);
		}
		for (const plc of plcs) {
			// If source is public playlist and destination current playlist, free up PLCs from the public playlist.
			if (
				plc.plaid === getState().publicPlaid &&
				plaid === getState().currentPlaid &&
				getConfig().Karaoke.Quota.FreeAcceptedSongs
			) {
				PLCsToFree.push(plc.plcid);
			}
			plc.added_at = new Date();
			plc.plaid = plaid;
		}
		// Remove karas already in playlist if allowDuplicates isn't set
		if (!getConfig().Playlist.AllowDuplicates) {
			plcs = plcs.filter(plc => !playlist.map(e => e.kid).includes(plc.kid));
		}
		// If pos is provided, we need to update all karas above that and add
		// karas.length to the position
		// If pos is not provided, we need to get the maximum position in the PL
		// And use that +1 to set our playlist position.
		if (pos) {
			await shiftPosInPlaylist(plaid, pos, plcs.length);
		} else {
			const maxpos = await selectMaxPosInPlaylist(plaid);
			const startpos = maxpos + 1;
			plcs.forEach((_, i) => {
				plcs[i].pos = startpos + +i;
			});
		}
		await insertKaraIntoPlaylist(plcs);
		await Promise.all([
			editPLC(PLCsToFree, { flag_free: true }),
			updatePlaylistDuration(plaid),
			updatePlaylistKaraCount(plaid),
		]);
		if (plaid === getState().currentPlaid) writeStreamFiles('current_playlist_info');
		updatePlaylistLastEditTime(plaid);
		const state = getState();
		// If we're adding to the current playlist ID and KM's mode is public, we have to notify users that their song has been added and will be playing in xxx minutes
		// Also for current playlist we check if medias are present
		if (plaid === state.currentPlaid) {
			checkMediaAndDownload(plcs);
			if (plaid !== state.publicPlaid) {
				for (const plc of plcs) {
					notifyUserOfSongPlayTime(plc.plcid, plc.username);
				}
			}
		}
		if (plaid === state.publicPlaid) {
			emitWS(
				'KIDUpdated',
				plcs.map(plc => {
					return {
						kid: plc.kid,
						requester: plc.username,
						plc_id: [plc.plcid],
					};
				})
			);
		}
		emitWS('playlistContentsUpdated', plaid);
		emitWS('playlistInfoUpdated', plaid);
	} catch (err) {
		logger.error('Cannot copy karaokes to another playlist', { service, obj: err });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_SONG_COPY_ERROR');
	} finally {
		profile('copyKaraToPL');
	}
}

/** Remove song from a playlist */
export async function removeKaraFromPlaylist(
	plc_ids: number[],
	token: OldJWTToken,
	refresh = true,
	ignorePlaying = false
) {
	profile('deleteKara');
	// If we get a single song, it's a user deleting it (most probably)
	try {
		const usersNeedingUpdate: Set<string> = new Set();
		const playlistsNeedingUpdate: Set<string> = new Set();
		const plcsNeedingDelete: any[] = [];
		for (const plc_id of plc_ids) {
			if (isNaN(plc_id)) throw new ErrorKM('INVALID_DATA', 400, false);
		}
		const plcs = await getPLCInfoMini(plc_ids);
		for (const plc_id of plc_ids) {
			if (!plcs.find(plc => plc.plcid === plc_id)) {
				throw new ErrorKM('UNKNOWN_PLAYLIST_ITEM', 404, false);
			}
		}
		for (const plc of plcs) {
			if (token.role !== 'admin' && plc.username !== token.username.toLowerCase()) {
				throw new ErrorKM('CHECK_YOUR_PRIVILEGES', 403, false);
			}
			if (token.role !== 'admin' && plc.upvotes > 0) {
				throw new ErrorKM('PL_DELETE_UPVOTED', 403, false);
			}
			if (
				plc.flag_playing &&
				getState().player.playerStatus === 'play' &&
				plc.plaid === getState().currentPlaid &&
				!ignorePlaying
			) {
				throw new ErrorKM('PL_DELETE_PLAYING_ERROR', 403, false);
			}
			usersNeedingUpdate.add(plc.username);
			playlistsNeedingUpdate.add(plc.plaid);
			plcsNeedingDelete.push({
				id: plc.plcid,
				plaid: plc.plaid,
				kid: plc.kid,
			});
		}
		logger.debug(`Deleting songs ${plcsNeedingDelete.map(p => p.id).toString()}`, { service });
		await deleteKaraFromPlaylist(plcsNeedingDelete.map((p: any) => p.id));
		const pubPLID = getState().publicPlaid;
		const KIDsNeedingUpdate: Set<string> = new Set();
		for (const plc of plcsNeedingDelete) {
			if (plc.plaid === pubPLID) {
				KIDsNeedingUpdate.add(plc.kid);
			}
		}
		emitWS(
			'KIDUpdated',
			[...KIDsNeedingUpdate].map(kid => {
				return {
					kid,
					plc_id: [],
				};
			})
		);
		for (const plaid of playlistsNeedingUpdate.values()) {
			await Promise.all([updatePlaylistDuration(plaid), updatePlaylistKaraCount(plaid), reorderPlaylist(plaid)]);
			updatePlaylistLastEditTime(plaid);

			if (refresh) {
				emitWS('playlistContentsUpdated', plaid);
				emitWS('playlistInfoUpdated', plaid);
			}
			if (plaid === getState().currentPlaid) {
				writeStreamFiles('next_song_name_and_requester');
				writeStreamFiles('current_playlist_info');
			}
			if (plaid === getState().publicPlaid) {
				writeStreamFiles('public_kara_count');
			}
			const pl = await getPlaylistInfo(plaid, adminToken);
			if (pl.flag_public || pl.flag_current) {
				for (const username of usersNeedingUpdate.values()) {
					updateSongsLeft(username);
				}
			}
		}
	} catch (err) {
		logger.error(`Error deleting song from a playlist : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_DELETE_SONG_ERROR');
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
	const PLCsToResetAccepted = publicPL.filter(
		pubPLC =>
			pubPLC.flag_accepted &&
			!currentPL.find(curPLC => curPLC.kid === pubPLC.kid && pubPLC.username === curPLC.username)
	);
	await editPLC(
		PLCsToResetAccepted.map(plc => plc.plcid),
		{ flag_accepted: false }
	);
}

/** Randomize songs in playlist */
export async function randomizePLC(plc_ids: number[]) {
	try {
		profile('randomizPLC');
		const plcs = await getPLCInfoMini(plc_ids);
		const pls_in_plcs = new Set();
		for (const plc of plcs) {
			pls_in_plcs.add(plc.plaid);
		}
		if (pls_in_plcs.size > 1) throw new ErrorKM('INVALID_DATA', 400, false);
		const pl = await getPlaylistContentsMini(plcs[0].plaid);
		// Determine where the flag_playing is in our PL and what's the latest position
		const playingPos = pl.find(plc => plc.flag_playing)?.pos || 0;
		const maxPos = Math.max(...pl.map(plc => plc.pos));
		for (const plc of plcs) {
			const randomPos = Math.floor(Math.random() * (maxPos - playingPos) + playingPos);
			await editPLC([plc.plcid], { pos: randomPos });
		}
	} catch (err) {
		logger.error(`Error randomizing PLCs : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_RANDOMIZE_ERROR');
	} finally {
		profile('randomizPLC');
	}
}

/** Edit PLC's properties in a playlist */
export async function editPLC(plc_ids: number[], params: PLCEditParams, refresh = true) {
	profile('editPLC');
	try {
		if (params.flag_playing === false) {
			// Cannot be unset.
			throw new ErrorKM('INVALID_DATA', 400, false);
		}
		if (params.flag_playing === true && plc_ids.length > 1) {
			// Cannot be set to multiple songs at once
			throw new ErrorKM('INVALID_DATA', 400, false);
		}
		if (params.flag_free === false) throw new ErrorKM('INVALID_DATA', 400, false);
		const plcs = await getPLCInfoMini(plc_ids);
		const pls = await getPlaylists(adminToken);
		if (params.flag_playing && plc_ids.length > 1) {
			// Only one PLCID can be set as playing, do you want to destroy the universe?
			throw new ErrorKM('INVALID_DATA', 409, false);
		}
		if (params.pos && plc_ids.length > 1) {
			// Only one PLCID can be positionned, do you want to destroy the universe?
			throw new ErrorKM('INVALID_DATA', 409, false);
		}
		for (const plc_id of plc_ids) {
			const plc = plcs.find(pc => pc.plcid === plc_id);
			if (!plc) throw new ErrorKM('UNKNOWN_PLAYLIST_ITEM', 404, false);
			if (!pls.find(pl => pl.plaid === plc.plaid)) throw new ErrorKM('UNKNOWN_PLAYLIST', 404, false);
		}

		// Validations donne
		const plsUpdated: Set<string> = new Set();
		for (const plc of plcs) {
			plsUpdated.add(plc.plaid);
		}
		const songsLeftToUpdate: Set<any> = new Set();
		const PLCsToDeleteFromCurrent = [];
		let currentPlaylist: DBPLCBase[] = [];
		if (params.flag_accepted === false || params.flag_refused === true) {
			// If we are cancelling flag_accepted, we'll need to remove songs from the current playlist
			// Then we need to fetch the current playlist somehow
			currentPlaylist = await selectPlaylistContentsMicro(getState().currentPlaid);
		}
		// This can only happen with the first PLC anyways
		if (params.flag_playing === true) {
			await setPlaying(plcs[0].plcid, plcs[0].plaid);
			// This only occurs to one playlist anyway
			const pl = pls.find(p => p.plaid === plcs[0].plaid);
			const playerStatus = getState().player.playerStatus;
			if (pl.flag_current && playerStatus && playerStatus !== 'stop') playPlayer(true);
		}
		if (params.flag_accepted === true) {
			params.flag_free = true;
			// Just in case someone tries something stupid.
			params.flag_refused = false;
			try {
				await copyKaraToPlaylist(plc_ids, getState().currentPlaid);
			} catch (err) {
				// This is allowed to fail
			}
			await Promise.all([updatePLCAccepted(plc_ids, true), updatePLCRefused(plc_ids, false)]);
		}
		// Remember kids, flags can also be undefined, that's the magic.
		if (params.flag_accepted === false) {
			// Let's find our PLC in the current playlist
			for (const plc of plcs) {
				const currentPLC = currentPlaylist.find(
					curplc => curplc.kid === plc.kid && curplc.username === plc.username
				);
				if (currentPLC) PLCsToDeleteFromCurrent.push(plc_ids);
			}
			await updatePLCAccepted(plc_ids, params.flag_accepted);
		}
		if (params.flag_refused === true) {
			for (const plc of plcs) {
				const currentPLC = currentPlaylist.find(
					curplc => curplc.kid === plc.kid && curplc.username === plc.username
				);
				if (currentPLC) PLCsToDeleteFromCurrent.push(plc_ids);
			}
			params.flag_free = true;
			await Promise.all([updatePLCAccepted(plc_ids, false), updatePLCRefused(plc_ids, true)]);
		}
		if (PLCsToDeleteFromCurrent.length > 0) {
			removeKaraFromPlaylist(PLCsToDeleteFromCurrent, adminToken).catch(() => {});
		}
		if (params.flag_refused === false) {
			await updatePLCRefused(plc_ids, params.flag_refused);
		}
		if (params.flag_free === true) {
			await freePLC(plc_ids);
			for (const plc of plcs) {
				songsLeftToUpdate.add({
					username: plc.username,
					plaid: plc.plaid,
				});
			}
		}
		if (params.flag_visible === true) await updatePLCVisible(plc_ids);
		if (params.flag_visible === false) await updatePLCInvisible(plc_ids);
		if (params.pos) {
			// Pos works with only the first PLC
			// If -1 move the song right after the one playing.
			const plc = plcs[0];
			plsUpdated.add(plc.plaid);
			if (params.pos === -1) {
				const pl = pls.find(p => p.plaid === plc.plaid);
				const plContents = await selectPlaylistContentsMicro(plc.plaid);
				const playingPLC = plContents.find(pc => pc.plcid === pl.plcid_playing);
				params.pos = playingPLC?.pos + 1;
			}
			await shiftPosInPlaylist(plc.plaid, params.pos, 1);
			await updatePos(plc.plcid, params.pos);
			await reorderPlaylist(plc.plaid);
			const currentSong = getState().player.currentSong;
			// If our new PLC has a position higher or equal than the current song pos in state, we need to update getCurrentSong's position
			if (currentSong && currentSong.pos <= params.pos && plc.plaid === getState().currentPlaid) {
				setState({ player: { currentSong: await getCurrentSong() } });
			}
			if (plc.plaid === getState().currentPlaid) {
				writeStreamFiles('next_song_name_and_requester');
				writeStreamFiles('current_playlist_info');
			}
			songsLeftToUpdate.add({
				username: plc.username,
				plaid: plc.plaid,
			});
		}
		if (params.criterias) {
			await updatePLCCriterias(plc_ids, params.criterias);
		}
		for (const songUpdate of songsLeftToUpdate.values()) {
			updateSongsLeft(songUpdate.username, songUpdate.plaid);
		}
		if (refresh) {
			for (const plaid of plsUpdated) {
				updatePlaylistLastEditTime(plaid);
				emitWS('playlistContentsUpdated', plaid);
				emitWS('playlistInfoUpdated', plaid);
			}
		}
		return {
			plaids: pls.values(),
		};
	} catch (err) {
		logger.error(`Error editing PLCs : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_MODIFY_CONTENT_ERROR');
	} finally {
		profile('editPLC');
	}
}

/** Reorders playlist with positions */
export function reorderPlaylist(plaid: string) {
	return reorderPL(plaid);
}

/** Export playlist as JSON */
export async function exportPlaylist(plaid: string) {
	try {
		const pl = await getPlaylistInfo(plaid);
		if (!pl) throw new ErrorKM('UNKNOWN_PLAYLIST', 404);
		logger.debug(`Exporting playlist ${plaid}`, { service });
		const plContents = await getPlaylistContentsMini(plaid);
		const playlist: PlaylistExport = {};
		// We only need a few things
		const plExport = pl;
		const plCriterias = await getCriterias(plaid, null, false);
		playlist.Header = {
			version: 4,
			description: 'Karaoke Mugen Playlist File',
		};
		playlist.PlaylistInformation = plExport;
		playlist.PlaylistContents = plContents;
		playlist.PlaylistCriterias = plCriterias;
		return playlist;
	} catch (err) {
		logger.error(`Error exporting playlist ${plaid} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_EXPORT_ERROR');
	}
}

/** Import playlist from JSON */
export async function importPlaylist(playlist: PlaylistExport, username: string, plaid?: string) {
	// If all tests pass, then add playlist, then add karas
	// Playlist can end up empty if no karaokes are found in database
	const task = new Task({
		text: 'IMPORTING_PLAYLIST',
	});
	try {
		logger.debug('Importing playlist', { service, obj: playlist });
		const validationErrors = check(playlist, PLImportConstraints);
		if (validationErrors) {
			logger.error(`Invalid data from an imported playlist : ${JSON.stringify(validationErrors)}`, { service });
			throw new ErrorKM('INVALID_DATA', 400);
		}
		task.update({
			subtext: playlist.PlaylistInformation.name,
		});
		const playingKara: Partial<DBPLC> = {
			plaid: null,
		};
		let flag_playingDetected = false;
		const users = new Map();
		for (const kara of playlist.PlaylistContents) {
			kara.username = kara.username.toLowerCase();
			let user: User = users.get(kara.username);
			if (!user) {
				user = await getUser(kara.username);
				if (!user) {
					// If user isn't found locally, replacing it with admin user
					kara.username = kara.username = 'admin';
					user = await getUser('admin');
					kara.nickname = user.nickname;
				}
				users.set(user.login, user);
			}
			if (kara.flag_playing === true) {
				if (flag_playingDetected) {
					throw new ErrorKM('INVALID_DATA', 400);
				}
				flag_playingDetected = true;
				playingKara.kid = kara.kid;
				playingKara.username = kara.username;
			}
		}
		// Validations done. First creating playlist.
		if (!plaid) {
			plaid = await createPlaylist(playlist.PlaylistInformation, username);
		} else {
			await emptyPlaylist(plaid);
		}
		const repos = getRepos();
		const unknownRepos: Set<string> = new Set();
		playlist.PlaylistContents.forEach((_: any, i: number) => {
			// Do not replace here to not break old exports/imports
			playlist.PlaylistContents[i].plaid = plaid;
			const repo = playlist.PlaylistContents[i].repository;
			if (repo && !repos.find(r => r.Name === repo)) {
				// Repository not found
				unknownRepos.add(repo);
			}
		});

		if (playlist.PlaylistContents?.length > 0) await insertKaraIntoPlaylist(playlist.PlaylistContents);
		if (playingKara?.kid) {
			const plcPlaying = await getPLCByKIDUser(playingKara.kid, playingKara.username, plaid);
			await setPlaying(plcPlaying?.plcid || 0, plaid);
		}
		if (playlist.PlaylistCriterias?.length > 0) {
			await addCriteria(
				playlist.PlaylistCriterias.map((c: any) => {
					return {
						type: c.type,
						value: c.value,
						plaid,
					};
				})
			);
			if (playlist.PlaylistInformation.flag_smart) await updateSmartPlaylist(plaid);
		}
		await Promise.all([updatePlaylistKaraCount(plaid), updatePlaylistDuration(plaid)]);
		emitWS('playlistsUpdated');
		return {
			plaid,
			reposUnknown: [...unknownRepos],
		};
	} catch (err) {
		logger.error(`Error importing playlist : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_IMPORT_ERROR');
	} finally {
		task.end();
	}
}

/** Find flag_playing index in a playlist */
export async function findPlaying(plaid: string): Promise<number> {
	const pl = await selectPlaylistContentsMicro(plaid);
	return pl.findIndex(plc => plc.flag_playing);
}

/** Shuffle (smartly or not) a playlist */
export async function shufflePlaylist(plaid: string, method: ShuffleMethods, fullShuffle = false) {
	try {
		profile('shuffle');
		const pl = await getPlaylistInfo(plaid);
		if (!pl) throw new ErrorKM('UNKNOWN_PLAYLIST', 404, false);
		// We check if the playlist to shuffle is the current one. If it is, we will only shuffle
		// the part after the song currently being played.
		let playlist = await getPlaylistContentsMini(plaid);
		if (!pl.flag_current || fullShuffle) {
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
		logger.info(`Playlist ${pl.name} shuffled (method: ${method})`, { service });
		emitWS('playlistContentsUpdated', plaid);
	} catch (err) {
		logger.error(`Error shuffling playlist ${plaid} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('PL_SHUFFLE_ERROR');
	} finally {
		profile('shuffle');
	}
}

export function shufflePlaylistWithList(playlist: DBPLC[], method: ShuffleMethods) {
	if (method === 'normal') {
		return shuffle(playlist);
	}
	if (method === 'smart') {
		return smartShuffle(playlist);
	}
	if (method === 'balance') {
		return balancePlaylist(playlist);
	}
	if (method === 'upvotes') {
		return sortPlaylistByUpvote(playlist);
	}
	return playlist;
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
	if (playlist.length - 6 > 0) {
		// We do nothing if the playlist length is too low
		let userTest = 1;
		const userTestArray = [playlist[0].nickname];
		for (const playlistItem of playlist) {
			if (!userTestArray.includes(playlistItem.nickname)) {
				userTestArray.push(playlistItem.nickname);
				userTest += 1;
			}
		}
		if (userTest > 5) userShuffleBoolean = true;
		let user_iterator = 0;
		if (userShuffleBoolean) {
			while (playlist.length - user_iterator > 0) {
				if (playlist.length - user_iterator > 6) {
					const playlist_temp = playlist.slice(user_iterator, user_iterator + 6);
					for (let i = 0; i < 5; i += 1) {
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

			for (let i = user_iterator; i < playlist_temp.length - 1; i += 1) {
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
				for (let i = 0; i < 4; i += 1) {
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

/* Balance playlist */
function balancePlaylist(playlist: DBPLC[]) {
	// This function uses balanceUID property of playlists.
	// This can have a username or tag+type string
	// This allows to balance playlists which have a user + tag&type constraint, like "favorites from N people + songs with tag 1 + songs with tag 2, etc."
	// By default this should only contain usernames though.
	const balance: Map<string, DBPLC>[] = [];

	// Organization of karaokes
	for (const content of playlist) {
		let hasBeenInserted = false;
		for (const i in balance) {
			if (!balance[i].has(content.balanceUID || content.username)) {
				balance[i].set(content.balanceUID || content.username, content);
				hasBeenInserted = true;
				break;
			}
		}
		if (!hasBeenInserted) balance.push(new Map().set(content.balanceUID || content.username, content));
	}

	// Re-insertion
	const newPlaylist: DBPLC[] = [];
	for (const pool of balance) {
		const values = [...pool.values()];
		// If last of previous pool and first of current pool have same user
		if (newPlaylist.length > 0 && newPlaylist[newPlaylist.length - 1].balanceUID === values[0].balanceUID) {
			values.push(values.shift());
		}
		newPlaylist.push(...values);
	}

	const state = getState();
	state.usersBalance.clear();

	return newPlaylist;
}

/** Get previous song */
export async function getPreviousSong() {
	const plaid = getState().currentPlaid;
	const playlist = await selectPlaylistContentsMicro(plaid);
	if (playlist.length === 0) throw 'Playlist is empty!';
	const index = playlist.findIndex(plc => plc.flag_playing);
	// If index ends up being -1 then we're at the beginning of the playlist and can't go to the previous song
	if (index < 0) throw 'No playing kara in current playlist';
	if (index === 0) throw 'Current position is first song!';
	return playlist[index - 1];
}

/** Move to next song */
export async function getNextSong(): Promise<DBPLC> {
	const conf = getConfig();
	profile('NextSong');
	let playlist: DBPLCBase[];
	try {
		playlist = await selectPlaylistContentsMicro(getState().currentPlaid);
	} catch (err) {
		sentry.error(err);
		profile('NextSong');
		throw err;
	}
	// Test if we're at the end of the playlist and if RepeatPlaylist is set.
	try {
		if (playlist.length === 0) throw 'Playlist is empty!';
		let currentPos = playlist.findIndex(plc => plc.flag_playing);
		if (currentPos + 1 >= playlist.length && conf.Playlist.EndOfPlaylistAction !== 'repeat') {
			logger.debug('End of playlist', { service });
			// Current position is last song, not quite an error.
			return null;
		}
		// If we're here, it means either we're beyond the length of the playlist
		// OR that RepeatPlaylist is set.
		// We test again if we're at the end of the playlist. If so we go back to first song.
		if (conf.Playlist.EndOfPlaylistAction === 'repeat' && currentPos + 1 >= playlist.length) currentPos = -1;
		const kara = playlist[currentPos + 1];
		if (!kara) throw 'Karaoke received is empty!';
		return await getPLCInfo(kara.plcid, false, 'admin');
	} catch (err) {
		throw err;
	} finally {
		profile('NextSong');
	}
}

export async function notificationNextSong(): Promise<void> {
	try {
		const kara = await getNextSong();
		if (kara?.flag_visible) {
			const pl = await getPlaylistInfo(kara.plaid);
			if (pl.flag_visible) emitWS('nextSong', kara);
		}
	} catch (err) {
		// Non-fatal, it usually means we're at the last song
	}
}

export async function getCurrentSongPLCID(): Promise<number> {
	const plaid = getState().currentPlaid;
	const playlist = await selectPlaylistContentsMicro(plaid);
	// Search for currently playing song
	let updatePlayingKara = false;
	let currentPos = playlist.findIndex(plc => plc.flag_playing);
	if (currentPos === -1) {
		currentPos = 0;
		updatePlayingKara = true;
	}
	if (!playlist[currentPos]) throw 'No karaoke found in playlist object';
	// If there's no kara with a playing flag, we set the first one in the playlist
	if (updatePlayingKara) await setPlaying(playlist[currentPos].plcid, plaid);
	return playlist[currentPos].plcid;
}

/** Get currently playing song's data */
export async function getCurrentSong(): Promise<CurrentSong> {
	try {
		profile('getCurrentSong');
		const plcid = await getCurrentSongPLCID();
		const plaid = getState().currentPlaid;
		const kara = await getPLCInfo(plcid, false, 'admin');
		if (!kara) throw `No current song available : PLCID ${plcid} with kara ${JSON.stringify(kara)}`;
		// Let's add details to our object so the player knows what to do with it.
		kara.plaid = plaid;
		const songInfos = await getSongInfosForPlayer(kara);
		return {
			...kara,
			...songInfos,
		};
	} catch (err) {
		logger.error('Error selecting current song to play', { service, obj: err });
	} finally {
		profile('getCurrentSong');
	}
}

/** Flag songs as free if they are older than X minutes */
async function freeOrphanedSongs() {
	try {
		await updateFreeOrphanedSongs(now(true) - getConfig().Karaoke.Quota.FreeAutoTime * 60);
	} catch (err) {
		logger.error('Failed to free orphaned songs (will try again)', { service, obj: err });
		emitWS(
			'operatorNotificationError',
			APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYLIST_FREE_ORPHANED_SONGS', err)
		);
	}
}

/** Initialize playlist tasks */
export async function initPlaylistSystem() {
	profile('initPL');
	freeOrphanedSongsIntervalID = setInterval(freeOrphanedSongs, 60 * 1000);
	const pls = await selectPlaylists(false);
	pls.forEach(pl => reorderPlaylist(pl.plaid));
	await testPlaylists();
	updateAllSmartPlaylists();
	logger.debug('Playlists initialized', { service });
	profile('initPL');
}

export function stopPlaylistSystem() {
	if (freeOrphanedSongsIntervalID) clearInterval(freeOrphanedSongsIntervalID);
}

/** Update all user quotas affected by a PLC getting freed/played */
export async function updateUserQuotas(kara: DBPLCBase) {
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
		getPlaylistContentsMini(state.currentPlaid),
	]);
	const freeTasks = [];
	const usersNeedingUpdate: Set<string> = new Set();
	const freeSongs = currentPlaylist.filter(
		curplc => curplc.flag_free && publicPlaylist.find(pubplc => pubplc.kid === curplc.kid)
	);
	freePLC(freeSongs.map(f => f.plcid));
	for (const freeSong of freeSongs) {
		usersNeedingUpdate.add(freeSong.username);
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

export async function createAutoMix(params: AutoMixParams, username: string): Promise<AutoMixPlaylistInfo> {
	try {
		profile('AutoMix');
		// Now we need to get our different lists depending on what filters we have.
		// For each list we add the balanceUID needed to balance our songs later.
		// If this doesn't give expected results due to async optimizations (for years and/or karas) we should try using Maps or Sets instead of arrays. Or use .push on each element
		const uniqueList = new Map<string, DBPLC>();
		let allUsers = [];
		if (params.filters?.usersFavorites?.includes('*') || params.filters?.usersAnimeList?.includes('*')) {
			allUsers = await getUsers({ full: true });
			// Filter all logged in users that are not guests
			// Guests have no rights! :p
			allUsers = allUsers.filter(e => e.flag_logged_in === true && e.type < 2).map(e => e.login);
		}
		if (params.filters?.usersFavorites) {
			let users = params.filters.usersFavorites;
			if (users.includes('*')) {
				// Remove the joker user, concatenate all users and make it a unique list
				users = [...new Set(users.filter(e => e === '*').concat(allUsers))];
			}
			let favs = await getAllFavorites(users);
			favs = shuffle(favs);
			favs.forEach(f => uniqueList.set(f.kid, f as any));
		}
		if (params.filters?.usersAnimeList) {
			let users = params.filters.usersAnimeList;
			if (users.includes('*')) {
				// Remove the joker user, concatenate all users and make it a unique list
				users = [...new Set(users.filter(e => e === '*').concat(allUsers))];
			}
			for (const userlogin of users) {
				const user = await getUser(userlogin, true);
				if (user.anime_list_to_fetch) {
					const karas = await getKaras({ userAnimeList: userlogin });
					karas.content.forEach(k => uniqueList.set(k.kid, k as any));
				}
			}
		}
		let karaTags: DBKara[] = [];
		if (params.filters?.tags) {
			for (const tagAndType of params.filters.tags) {
				const tag = `${tagAndType.tid}~${tagAndType.type}`;
				const karas = await getKaras({
					q: `t:${tag}`,
				});
				karas.content.forEach((_, i) => (karas.content[i].balanceUID = `${tag}`));
				karaTags = [].concat(karaTags, karas.content);
				karaTags = shuffle(karaTags);
			}
			karaTags.forEach(k => uniqueList.set(k.kid, k as any));
		}
		let years: DBKara[] = [];
		if (params.filters?.years) {
			for (const year of params.filters.years) {
				const karas = await getKaras({
					q: `y:${year}`,
				});
				karas.content.forEach((_, i) => (karas.content[i].balanceUID = `${year}`));
				years = [].concat(years, karas.content);
				years = shuffle(years);
			}
			years.forEach(y => uniqueList.set(y.kid, y as any));
		}
		// Test if our list has at least one song
		if (uniqueList.size === 0) {
			throw new ErrorKM('AUTOMIX_NO_SONGS_MEET_CRITERIAS_ERROR', 410, false);
		}

		// Let's balance what we have here.

		let balancedList = shufflePlaylistWithList([...uniqueList.values()], 'balance');

		const autoMixPLName = params.playlistName || `AutoMix ${date()} ${time2()}`;
		const plaid = await createPlaylist(
			{
				name: autoMixPLName,
				flag_visible: true,
				username,
			},
			username
		);
		// Cut playlist after duration/number of songs
		if (params.limitNumber) {
			balancedList = await trimPlaylist(balancedList, params.limitNumber, params.limitType);
		}
		// Let's reshuffle normally now that the playlist is trimmed.
		balancedList = shuffle(balancedList);
		await addKaraToPlaylist({
			kids: balancedList.map(k => k.kid),
			requester: username,
			plaid,
			visible: params.surprisePlaylist !== true,
		});
		emitWS('playlistsUpdated');
		return {
			plaid,
			playlist_name: autoMixPLName,
		};
	} catch (err) {
		logger.error('Failed to create AutoMix', { service, obj: err });
		if (err?.code === 404 || err?.code === 416) throw err;
		sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
		sentry.error(err);
		throw err;
	} finally {
		profile('AutoMix');
	}
}

// Actions took when a new fallback playlist is set
function fallbackPlaylistHook(plaid: string) {
	const oldFallbackPlaylist_id = getState().fallbackPlaid;
	updatePlaylistLastEditTime(oldFallbackPlaylist_id);
	emitWS('playlistInfoUpdated', oldFallbackPlaylist_id);
	setState({ fallbackPlaid: plaid });
}
