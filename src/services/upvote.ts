import { deleteUpvote, insertUpvote, selectUpvotesByPLC } from '../dao/upvote';
import { getConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { emitWS } from '../lib/utils/ws';
import { getState } from '../utils/state';
import { freePLC, getPLCInfoMini } from './playlist';
import { getUsers, updateSongsLeft } from './user';

const service = 'Upvote';

/** (Up|Down)vote a song. */
export function vote(plc_id: number, username: string, downvote: boolean) {
	if (downvote) return removeUpvote(plc_id, username);
	return addUpvote(plc_id, username);
}

/** Upvotes a song */
export async function addUpvote(plc_id: number, username: string) {
	try {
		username = username.toLowerCase();
		const plc = (await getPLCInfoMini([plc_id]))[0];
		if (!plc) throw { code: 404 };
		if (plc.plaid !== getState().publicPlaid) throw { code: 403, msg: 'UPVOTE_FAILED' };
		if (plc.username === username) throw { code: 403, msg: 'UPVOTE_NO_SELF' };
		const userList = await selectUpvotesByPLC(plc_id);
		if (userList.some(u => u.username === username)) throw { code: 403, msg: 'UPVOTE_ALREADY_DONE' };

		await insertUpvote(plc_id, username);
		plc.upvotes += 1;
		if (!getConfig().Karaoke.Quota.FreeUpVotes) return;
		tryToFreeKara(plc_id, plc.upvotes, plc.username, getState().publicPlaid);
		if (plc.plaid === getState().publicPlaid) {
			emitWS('KIDUpdated', [{ kid: plc.kid, flag_upvoted: true, username }]);
		}
		// If playlist has autosort, playlist contents updated is already triggered by the shuffle.
		emitWS('playlistContentsUpdated', plc.plaid);
	} catch (err) {
		if (!err.msg) err.msg = 'UPVOTE_FAILED';
		throw err;
	}
}

/** Downvote a song */
export async function removeUpvote(plc_id: number, username: string) {
	try {
		username = username.toLowerCase();
		const plc = (await getPLCInfoMini([plc_id]))[0];
		if (!plc) throw { code: 404, msg: 'PLC ID unknown' };
		if (plc.plaid !== getState().publicPlaid) throw { code: 403, msg: 'DOWNVOTE_FAILED' };
		if (plc.username === username) throw { code: 403, msg: 'DOWNVOTE_NO_SELF' };
		const userList = await selectUpvotesByPLC(plc_id);
		const users = userList.map(u => u.username);
		if (!users.includes(username)) throw { code: 403, msg: 'DOWNVOTE_ALREADY_DONE' };
		await deleteUpvote(plc_id, username);
		// Karaokes are not 'un-freed' when downvoted.^
		plc.upvotes -= 1;
		if (plc.plaid === getState().publicPlaid) {
			emitWS('KIDUpdated', [{ kid: plc.kid, flag_upvoted: false, username }]);
		}
		// If playlist has autosort, playlist contents updated is already triggered by the shuffle.
		emitWS('playlistContentsUpdated', plc.plaid);
	} catch (err) {
		if (!err.msg) err.msg = 'DOWNVOTE_FAILED';
		throw err;
	}
}

/** Free song if it's sufficiently upvoted */
async function tryToFreeKara(plc_id: number, upvotes: number, username: string, plaid: string) {
	const allUsersList = await getUsers();
	const onlineUsers = allUsersList.filter(user => user.flag_logged_in);
	const upvotePercent = (upvotes / onlineUsers.length) * 100;
	const conf = getConfig();
	if (
		upvotePercent >= +conf.Karaoke.Quota.FreeUpVotesRequiredPercent &&
		upvotes >= +conf.Karaoke.Quota.FreeUpVotesRequiredMin
	) {
		await freePLC([plc_id]);
		updateSongsLeft(username, plaid);
		logger.debug(`PLC ${plc_id} got freed with ${upvotes} (${upvotePercent}%)`, { service });
	}
}
