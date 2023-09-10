import { deleteUpvote, insertUpvote, selectUpvotesByPLC } from '../dao/upvote.js';
import { getConfig } from '../lib/utils/config.js';
import { ErrorKM } from '../lib/utils/error.js';
import logger from '../lib/utils/logger.js';
import { emitWS } from '../lib/utils/ws.js';
import Sentry from '../utils/sentry.js';
import { getState } from '../utils/state.js';
import { freePLC, getPLCInfoMini } from './playlist.js';
import { getUsers, updateSongsLeft } from './user.js';

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
		if (!plc) throw new ErrorKM('UNKNOWN_PLAYLIST_ITEM', 404, false);
		if (plc.plaid !== getState().publicPlaid) throw new ErrorKM('UPVOTE_FAILED', 403, false);
		if (plc.username === username) throw new ErrorKM('UPVOTE_NO_SELF', 403, false);
		const userList = await selectUpvotesByPLC(plc_id);
		if (userList.some(u => u.username === username)) throw new ErrorKM('UPVOTE_ALREADY_DONE', 403, false);

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
		logger.error(`Upvote of PLC ${plc_id} by ${username} failed : ${err}`, { service });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('UPVOTE_FAILED');
	}
}

/** Downvote a song */
export async function removeUpvote(plc_id: number, username: string) {
	try {
		username = username.toLowerCase();
		const plc = (await getPLCInfoMini([plc_id]))[0];
		if (!plc) throw new ErrorKM('UNKNOWN_PLAYLIST_ITEM', 404, false);
		if (plc.plaid !== getState().publicPlaid) throw new ErrorKM('DOWNVOTE_FAILED', 403, false);
		if (plc.username === username) throw new ErrorKM('DOWNVOTE_NO_SELF', 403, false);
		const userList = await selectUpvotesByPLC(plc_id);
		const users = userList.map(u => u.username);
		if (!users.includes(username)) throw new ErrorKM('DOWNVOTE_ALREADY_DONE', 403, false);
		await deleteUpvote(plc_id, username);
		// Karaokes are not 'un-freed' when downvoted.^
		plc.upvotes -= 1;
		if (plc.plaid === getState().publicPlaid) {
			emitWS('KIDUpdated', [{ kid: plc.kid, flag_upvoted: false, username }]);
		}
		// If playlist has autosort, playlist contents updated is already triggered by the shuffle.
		emitWS('playlistContentsUpdated', plc.plaid);
	} catch (err) {
		logger.error(`Upvote of PLC ${plc_id} by ${username} failed : ${err}`, { service });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('DOWNVOTE_FAILED');
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
