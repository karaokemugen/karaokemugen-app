import {insertUpvote,removeUpvote, getUpvotesByPLC} from '../_dao/upvote';
import {freePLC, updateSongsLeft, getPLCInfoMini} from '../_services/playlist';
import {listUsers} from '../_services/user';
import {getConfig} from '../_utils/config';
import logger from 'winston';
import {getState} from '../_utils/state';

export async function vote(plc_id,username,downvote) {
	if (downvote) return await deleteUpvote(plc_id,username);
	return await addUpvote(plc_id,username);
}

export async function addUpvote(plc_id,username) {
	try {
		const plc = await getPLCInfoMini(plc_id);
		if (!plc) throw {message: 'PLC ID unknown'};
		if (plc.username === username) throw {code: 'UPVOTE_NO_SELF'};
		const userList = await getUpvotesByPLC(plc_id);
		if (userList.some(u => u.username === username)) throw {code: 'UPVOTE_ALREADY_DONE'};
		await insertUpvote(plc_id,username);
		plc.upvotes++;
		const ret = {
			upvotes: plc.upvotes,
			song: `${plc.serie} - ${plc.title}`,
			playlist_id: plc.playlist_id,
			code: 'UPVOTE_DONE'
		};
		if (!getConfig().Karaoke.Quota.FreeUpvotes) return ret;
		tryToFreeKara(plc_id, upvotes, plc.username, getState().modePlaylistID);
		return ret;
	} catch(err) {
		if (!err.code) err.code = 'UPVOTE_FAILED';
		throw err;
	}
}

export async function deleteUpvote(plc_id,username) {
	try {
		const plc = await getPLCInfoMini(plc_id);
		if (!plc) throw {message: 'PLC ID unknown'};
		if (plc.username === username) throw {code: 'DOWNVOTE_NO_SELF'};
		const userList = await getUpvotesByPLC(plc_id);
		const users = userList.map(u => u.login);
		if (!users.includes(username)) throw {code: 'DOWNVOTE_ALREADY_DONE'};
		await removeUpvote(plc_id,username);
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

async function tryToFreeKara(plc_id, upvotes, username, playlist_id) {
	const allUsersList = await listUsers();
	const onlineUsers = allUsersList.filter(user => user.flag_online);
	const upvotePercent = (upvotes / onlineUsers.length) * 100;
	const conf = getConfig();
	if (upvotePercent >= +conf.Karaoke.Quota.FreeUpvotesRequiredPercent &&
		upvotes >= +conf.Karaoke.Quota.FreeUpvotesRequiredMin) {
		await freePLC(plc_id);
		updateSongsLeft(username, playlist_id);
		logger.debug(`[Upvote] PLC ${plc_id} got freed with ${upvotes} (${upvotePercent}%)`);
	}
}