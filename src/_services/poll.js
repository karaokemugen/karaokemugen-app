
import {on} from '../_common/utils/pubsub';
import {getConfig} from '../_common/utils/config';
import {fetchPoll, addPollChoices, closePoll, addPoll} from '../_dao/poll';
import {translateKaraInfo,isAllKarasInPlaylist, isACurrentPlaylist, isAPublicPlaylist, getPlaylistContents} from '../_services/playlist';
import {sampleSize} from 'lodash';
import {emitWS} from '../_ws/websocket';

let state = {};

on('engineStatusChange', (newstate) => {
	state.engine = newstate[0];	
});

export async function initPollSystem() {
	await closePoll();
}

export async function startPoll() {
	const conf = getConfig();
	await closePoll();
	// Create new poll
	const [publicPlaylist_id, currentPlaylist_id] = await Promise.all([		
		isAPublicPlaylist(),
		isACurrentPlaylist(),
	]);	
	// Get a list of karaokes to add to the poll
	const [poll_id, pubpl, curpl] = await Promise.all([
		addPoll(),
		getPlaylistContents(publicPlaylist_id),
		getPlaylistContents(currentPlaylist_id)
	]);
	const availableKaras = isAllKarasInPlaylist(pubpl, curpl);
	let pollChoices = conf.EngineSongPollChoices;
	if (availableKaras.length < pollChoices) pollChoices = availableKaras.length;
	const karasInPoll = sampleSize(availableKaras,pollChoices);
	await addPollChoices(karasInPoll,poll_id);
	emitWS('newSongPoll');
}

function hasUserVoted(poll,username) {
	return poll.some(choice => {
		const users = choice.username.split(',');
		if (users.includes(username)) return true;
		return false;
	});
}

export async function getPoll(token, lang, from, size) {
	let poll = await fetchPoll();
	if (!poll) throw {
		code: 'POLL_NOT_ACTIVE'
	};	
	poll = translateKaraInfo(poll,lang);
	return {
		infos: { 
			count: poll.length,
			from: parseInt(from),
			to: parseInt(from)+parseInt(size)
		},
		poll: poll,
		flag_uservoted: hasUserVoted(poll,token.username)
	};	
}
