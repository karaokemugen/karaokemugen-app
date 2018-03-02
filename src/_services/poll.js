
import {on} from '../_common/utils/pubsub';
import {getConfig} from '../_common/utils/config';
import {translateKaraInfo,isAllKarasInPlaylist, isACurrentPlaylist, isAPublicPlaylist, getPlaylistContents} from '../_services/playlist';
import {sampleSize} from 'lodash';
import {emitWS} from '../_ws/websocket';

let state = {};
let poll = [];
let pollEnding = false;

on('engineStatusChange', (newstate) => {
	state.engine = newstate[0];	
});

on('songNearEnd', () => {
	pollEnding = true;
	getPollResults();
});

export function getPollResults() {
	
}

export function addPollVote(playlistcontent_id,token) { 
	if (poll.length == 0 || pollEnding) throw {
		code: 'POLL_NOT_ACTIVE'
	};		
	if (hasUserVoted(poll,token.username)) throw {
		code: 'POLL_USER_ALREADY_VOTED'
	};
	const choiceFound = poll.some((choice, index) => {
		if (choice.playlistcontent_id == playlistcontent_id) {
			poll[index].votes++;
			return true;
		}
		return false;
	});
	if (!choiceFound) throw {
		code: 'POLL_VOTE_ERROR',
		message: 'This song is not in the poll'
	};
	emitWS('songPollUpdated', poll);
	return {
		code: 'POLL_VOTED'
	};
}

export async function startPoll() {
	const conf = getConfig();
	poll = [];	
	pollEnding = false;
	// Create new poll
	const [publicPlaylist_id, currentPlaylist_id] = await Promise.all([		
		isAPublicPlaylist(),
		isACurrentPlaylist(),
	]);	
	// Get a list of karaokes to add to the poll
	const [pubpl, curpl] = await Promise.all([
		getPlaylistContents(publicPlaylist_id),
		getPlaylistContents(currentPlaylist_id)
	]);
	const availableKaras = isAllKarasInPlaylist(pubpl, curpl);
	let pollChoices = conf.EngineSongPollChoices;
	if (availableKaras.length < pollChoices) pollChoices = availableKaras.length;
	poll = sampleSize(availableKaras,pollChoices);
	for (const index in poll) {
		poll[index].votes = 0;
	}
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
	if (poll.length == 0) throw {
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
