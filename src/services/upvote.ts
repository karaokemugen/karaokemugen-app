import logger from 'winston';

import {getUpvotesByPLC,insertUpvote,removeUpvote} from '../dao/upvote';
import {getConfig} from '../lib/utils/config';
import { emitWS } from '../lib/utils/ws';
import {getState} from '../utils/state';
import {freePLC, getPLCInfoMini} from './playlist';
import {listUsers, updateSongsLeft} from './user';

/** (Up|Down)vote a song. */
export function vote(plc_id: number, username: string, downvote: boolean) {
	if (downvote) return deleteUpvote(plc_id, username);
	return addUpvote(plc_id, username);
}

/** Upvotes a song */
export async function addUpvote(plc_id: number, username: string) {
	try {
		const plc = await getPLCInfoMini(plc_id);
		if (!plc) throw {code: 404, msg: 'PLC ID unknown'};
		if (plc.playlist_id !== getState().publicPlaylistID) throw {code: 403, msg: 'UPVOTE_FAILED'};
		if (plc.username === username) throw {code: 403, msg: 'UPVOTE_NO_SELF'};
		const userList = await getUpvotesByPLC(plc_id);
		if (userList.some(u => u.username === username)) throw {code: 403, msg: 'UPVOTE_ALREADY_DONE'};

		await insertUpvote(plc_id, username);
		plc.upvotes++;
		if (!getConfig().Karaoke.Quota.FreeUpVotes) return;
		tryToFreeKara(plc_id, plc.upvotes, plc.username, getState().publicPlaylistID);
		if (plc.playlist_id === getState().publicPlaylistID) {
			emitWS('KIDUpdated', [{kid: plc.kid, flag_upvoted: true, username: username}]);
		}
		emitWS('playlistContentsUpdated', plc.playlist_id);
	} catch(err) {
		if (!err.msg) err.msg = 'UPVOTE_FAILED';
		throw err;
	}
}

/** Downvote a song */
export async function deleteUpvote(plc_id: number, username: string) {
	try {
		const plc = await getPLCInfoMini(plc_id);
		if (!plc) throw {code: 404, msg: 'PLC ID unknown'};
		if (plc.playlist_id !== getState().publicPlaylistID) throw {code: 403, msg: 'DOWNVOTE_FAILED'};
		if (plc.username === username) throw {code: 403, msg: 'DOWNVOTE_NO_SELF'};
		const userList = await getUpvotesByPLC(plc_id);
		const users = userList.map(u => u.username);
		if (!users.includes(username)) throw {code: 403, msg: 'DOWNVOTE_ALREADY_DONE'};
		await removeUpvote(plc_id, username);
		// Karaokes are not 'un-freed' when downvoted.^
		plc.upvotes--;
		if (plc.playlist_id === getState().publicPlaylistID) {
			emitWS('KIDUpdated', [{kid: plc.kid, flag_upvoted: false, username: username}]);
		}
		emitWS('playlistContentsUpdated', plc.playlist_id);
	} catch(err) {
		if (!err.msg) err.msg = 'DOWNVOTE_FAILED';
		throw err;
	}
}

/** Free song if it's sufficiently upvoted */
async function tryToFreeKara(plc_id :number, upvotes: number, username: string, playlist_id: number) {
	const allUsersList = await listUsers();
	const onlineUsers = allUsersList.filter(user => user.flag_online);
	const upvotePercent = (upvotes / onlineUsers.length) * 100;
	const conf = getConfig();
	if (upvotePercent >= +conf.Karaoke.Quota.FreeUpVotesRequiredPercent &&
		upvotes >= +conf.Karaoke.Quota.FreeUpVotesRequiredMin) {
		await freePLC(plc_id);
		updateSongsLeft(username, playlist_id);
		logger.debug(`PLC ${plc_id} got freed with ${upvotes} (${upvotePercent}%)`, {service: 'Upvote'});
	}
}

/** Add several upvotes at once */
export async function addUpvotes(plc_id: number[], username: string) {
	for (const plc of plc_id) {
		try {
			await addUpvote(plc, username);
		} catch(err) {
			//Non-fatal : already upvoted songs won't be upvoted again anyway
		}
	}
}
