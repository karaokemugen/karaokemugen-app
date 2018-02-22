import {insertUpvote,getUpvotesByPLC} from '../_dao/upvote';
import {isAPublicPlaylist, getPLCInfo} from '../_services/playlist';
import {findUserByName} from '../_services/user';

export async function addUpvote(plc_id,username) {
	try {
		const plc = await getPLCInfo(plc_id);
		if (!plc) throw {message: 'PLC ID unknown'};
		const publicPlaylistID = await isAPublicPlaylist();
		if (plc.playlist_id != publicPlaylistID) throw {message: 'PLC ID not on a public playlist'};
		const user = await findUserByName(username);
		const userList = await getUpvotesByPLC(plc_id);
		if (userList.includes(user.id)) throw {code: 'UPVOTE_ALREADY_DONE'};		
		await insertUpvote(plc_id,user.id);
		const upvotes = plc.upvotes + 1;
		return {
			upvotes: upvotes,
			song: `${plc.serie} - ${plc.songtype}${plc.songorder} - ${plc.title}`
		};
	} catch(err) {
		if (!err.code) err.code = 'UPVOTE_FAILED';
		throw err;
	}
}