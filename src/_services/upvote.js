import {insertUpvote,getUpvotesByPLC} from '../_dao/upvote';
import {freePLC, updateSongsLeft, isACurrentPlaylist, isAPublicPlaylist, getPLCInfo} from '../_services/playlist';
import {listUsers, findUserByName} from '../_services/user';
import {getConfig} from '../_common/utils/config';
import logger from 'winston';

export async function vote(plc_id,username,downvote) {
	if (downvote) return await deleteUpvote(plc_id,username);
	return await addUpvote(plc_id,username);
}

export async function addUpvote(plc_id,username) {
	try {
		const plc = await getPLCInfo(plc_id);
		if (!plc) throw {message: 'PLC ID unknown'};
		const user = await findUserByName(username);
		const userList = await getUpvotesByPLC(plc_id);
		if (userList.includes(user.id)) throw {code: 'UPVOTE_ALREADY_DONE'};		
		await insertUpvote(plc_id,user.id);
		const upvotes = plc.upvotes + 1;
		const ret = {
			upvotes: upvotes,
			song: `${plc.serie} - ${plc.title}`,
			playlist_id: plc.playlist_id,
			code: 'UPVOTE_DONE'
		};
		const conf = getConfig();
		if (!conf.EngineFreeUpvotes) return ret;
		let modePlaylist_id;
		if (conf.EnginePrivateMode) {
			modePlaylist_id = await isACurrentPlaylist();
		} else {
			modePlaylist_id = await isAPublicPlaylist();
		}
		tryToFreeKara(plc_id, upvotes, username, modePlaylist_id);
		return ret;
	} catch(err) {
		if (!err.code) err.code = 'UPVOTE_FAILED';
		throw err;
	}
}

export async function deleteUpvote(plc_id,username) {
	try {
		const plc = await getPLCInfo(plc_id);
		if (!plc) throw {message: 'PLC ID unknown'};
		const user = await findUserByName(username);
		const userList = await getUpvotesByPLC(plc_id);
		if (!userList.includes(user.id)) throw {code: 'DOWNVOTE_ALREADY_DONE'};		
		await deleteUpvote(plc_id,user.id);
		const upvotes = plc.upvotes - 1;
		const ret = {
			upvotes: upvotes,
			song: `${plc.serie} - ${plc.title}`,
			playlist_id: plc.playlist_id,
			code: 'DOWNVOTE_DONE'
		};
		// Karaokes are not 'un-freed' when downvoted.
		return ret;
	} catch(err) {
		if (!err.code) err.code = 'DOWNVOTE_FAILED';
		throw err;
	}
}

async function tryToFreeKara(plc_id, upvotes, username, playlist_id) {
	const allUsersList = await listUsers();
	const onlineUsers = allUsersList.filter(user => user.flag_online === 1);
	const upvotePercent = (upvotes / onlineUsers.length) * 100;
	const conf = getConfig();
	if (upvotePercent >= conf.EngineFreeUpvotesRequiredPercent &&
		upvotes >= conf.EngineFreeUpvotesRequiredMin) {
		await freePLC(plc_id);
		updateSongsLeft(username, playlist_id);
		logger.debug(`[Upvote] PLC ${plc_id} got freed with ${upvotes} (${upvotePercent}%)`);		
	}
}