import {getUserDb, transaction} from './database';
import {now} from 'unix-timestamp';
const sql = require('../_common/db/poll');

export async function addPoll() {
	const poll = await getUserDb().run(sql.insertSongPoll, {$datetime: now()});
	return poll.lastID;
}

export async function closePoll() {
	return await getUserDb().run(sql.closeSongPoll);
}

export async function addPollChoices(karaList,poll_id) {
	const data = karaList.map((kara) => ({
		$poll_id: poll_id,
		$playlistcontent_id: kara.playlistcontent_id
	}));
	return await transaction(data,sql.addPollChoices);	
}

export async function fetchPoll() {
	return await getUserDb().all(sql.getPoll);
}