import {insertUpvote,removeUpvote, getUpvotesByPLC} from '../dao/upvote';
import {freePLC, getPLCInfoMini} from './playlist';
import {listUsers, updateSongsLeft} from './user';
import {getConfig} from '../lib/utils/config';
import logger from 'winston';
import {getState} from '../utils/state';

/** (Up|Down)vote a song. */
export async function vote(plc_id: number, username: string, downvote: boolean) {
	if (downvote) return await deleteUpvote(plc_id, username);
	return await addUpvote(plc_id, username);
}

/** Upvotes a song */
export async function addUpvote(plc_id: number, username: string) {
	try {
		const plc = await getPLCInfoMini(plc_id);
		if (!plc) throw {message: 'PLC ID unknown'};
		if (plc.username === username) throw {code: 'UPVOTE_NO_SELF'};
		const userList = await getUpvotesByPLC(plc_id);
		if (userList.some(u => u.username === username)) throw {code: 'UPVOTE_ALREADY_DONE'};
		await insertUpvote(plc_id, username);
		plc.upvotes++;
		const ret = {
			upvotes: plc.upvotes,
			song: `${plc.serie} - ${plc.title}`,
			playlist_id: plc.playlist_id,
			code: 'UPVOTE_DONE'
		};
		if (!getConfig().Karaoke.Quota.FreeUpVotes) return ret;
		tryToFreeKara(plc_id, plc.upvotes, plc.username, getState().modePlaylistID);
		return ret;
	} catch(err) {
		if (!err.code) err.code = 'UPVOTE_FAILED';
		throw err;
	}
}

/** Downvote a song */
export async function deleteUpvote(plc_id: number, username: string) {
	try {
		const plc = await getPLCInfoMini(plc_id);
		if (!plc) throw {message: 'PLC ID unknown'};
		if (plc.username === username) throw {code: 'DOWNVOTE_NO_SELF'};
		const userList = await getUpvotesByPLC(plc_id);
		const users = userList.map(u => u.username);
		if (!users.includes(username)) throw {code: 'DOWNVOTE_ALREADY_DONE'};
		await removeUpvote(plc_id, username);
		// Karaokes are not 'un-freed' when downvoted.
		return {
			upvotes: plc.upvotes - 1,
			song: `${plc.serie} - ${plc.title}`,
			playlist_id: plc.playlist_id,
			code: 'DOWNVOTE_DONE'
		};
	} catch(err) {
		if (!err.code) err.code = 'DOWNVOTE_FAILED';
		throw err;
	}
}

/** Free song if it's sufficiently upvotes */
async function tryToFreeKara(plc_id :number, upvotes: number, username: string, playlist_id: number) {
	const allUsersList = await listUsers();
	const onlineUsers = allUsersList.filter(user => user.flag_online);
	const upvotePercent = (upvotes / onlineUsers.length) * 100;
	const conf = getConfig();
	if (upvotePercent >= +conf.Karaoke.Quota.FreeUpVotesRequiredPercent &&
		upvotes >= +conf.Karaoke.Quota.FreeUpVotesRequiredMin) {
		await freePLC(plc_id);
		updateSongsLeft(username, playlist_id);
		logger.debug(`[Upvote] PLC ${plc_id} got freed with ${upvotes} (${upvotePercent}%)`);
	}
}