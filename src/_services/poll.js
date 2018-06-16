
import {on} from '../_common/utils/pubsub';
import {getConfig} from '../_common/utils/config';
import {copyKaraToPlaylist, translateKaraInfo, isAllKarasInPlaylist, isACurrentPlaylist, getPlaylistContentsMini} from '../_services/playlist';
import sample from 'lodash.sample';
import sampleSize from 'lodash.samplesize'; 
import {emitWS} from '../_webapp/frontend';
import {promisify} from 'util';
import uuidV4 from 'uuid/v4';
import logger from '../_common/utils/logger';
import {timer} from '../_common/utils/timer';
const sleep = promisify(setTimeout);

let state = {};
let poll = [];
let voters = [];
let pollUUID;
let pollEnding = false;
let clock;

on('engineStatusChange', (newstate) => {
	state.engine = newstate[0];
	if (!state.engine.songPoll && poll.length > 0) stopPoll();
});

export async function timerPoll() {
	const internalUUID = pollUUID = uuidV4();
	clock = new timer(() => {}, getConfig().EngineSongPollTimeout * 1000);
	await sleep(getConfig().EngineSongPollTimeout * 1000);
	if (internalUUID === pollUUID) endPoll();
}

export function endPoll() {
	if (poll.length > 0) getPollResults().then(winner => {
		pollEnding = true;
		logger.debug('[Poll] Ending poll with '+JSON.stringify(winner));
		emitWS('songPollResult',winner);
		stopPoll();
	});
}

export function stopPoll() {
	logger.debug('[Poll] Stopping poll');
	poll = [];
	voters = [];
	pollEnding = false;
	emitWS('songPollEnded');
}

export async function getPollResults() {
	logger.debug('[Poll] Getting poll results');
	const maxVotes = Math.max.apply(Math,poll.map((choice) => {
		return choice.votes;
	}));
	// We check if winner isn't the only one...
	let winners = [];
	for (const choice of poll) {
		if (+choice.votes === +maxVotes) winners.push(choice);
	}
	let winner = sample(winners);
	winner = translateKaraInfo(winner);
	const playlist_id = await isACurrentPlaylist();
	await copyKaraToPlaylist([winner[0].playlistcontent_id],playlist_id);
	emitWS('playlistInfoUpdated',playlist_id);
	emitWS('playlistContentsUpdated',playlist_id);
	const kara = `${winner[0].serie} - ${winner[0].songtype_i18n_short}${winner[0].songorder} - ${winner[0].title}`;
	logger.info(`[Poll] Winner is "${kara}" with ${maxVotes} votes`);
	return {
		votes: maxVotes,
		kara: kara
	};
}

export async function addPollVote(playlistcontent_id,token) { 
	if (poll.length === 0 || pollEnding) throw {
		code: 'POLL_NOT_ACTIVE'
	};		
	if (hasUserVoted(token.username)) throw {
		code: 'POLL_USER_ALREADY_VOTED'
	};
	const choiceFound = poll.some((choice, index) => {
		if (+choice.playlistcontent_id === +playlistcontent_id) {
			poll[index].votes++;
			return true;
		}
		return false;
	});
	if (!choiceFound) throw {
		code: 'POLL_VOTE_ERROR',
		message: 'This song is not in the poll'
	};
	voters.push(token.username);	
	return {
		code: 'POLL_VOTED',
		data: poll
	};
}

export async function startPoll(publicPlaylist_id, currentPlaylist_id) {
	const conf = getConfig();	
	if (poll.length > 0) {
		logger.info('[Poll] Unable to start poll, another one is already in progress');
		return false;
	}
	logger.info('[Poll] Starting a new poll');
	poll = [];	
	voters = [];
	pollEnding = false;
	// Create new poll	
	// Get a list of karaokes to add to the poll
	const [pubpl, curpl] = await Promise.all([
		getPlaylistContentsMini(publicPlaylist_id),
		getPlaylistContentsMini(currentPlaylist_id)
	]);
	if (pubpl.length === 0) {
		logger.info('[Poll] Public playlist is empty, cannot select songs for poll');
		return false;
	}
	const availableKaras = isAllKarasInPlaylist(pubpl, curpl);
	let pollChoices = conf.EngineSongPollChoices;
	if (availableKaras.length < pollChoices) pollChoices = availableKaras.length;
	poll = sampleSize(availableKaras,pollChoices);
	for (const index in poll) {
		poll[index].votes = 0;
	}
	poll = translateKaraInfo(poll);
	logger.debug('[Poll] New poll : '+JSON.stringify(poll));
	emitWS('newSongPoll',poll);
	timerPoll();
}

function hasUserVoted(username) {
	return voters.includes(username);	
}

export async function getPoll(token, lang, from, size) {	
	if (poll.length === 0) throw {
		code: 'POLL_NOT_ACTIVE'
	};	
	poll = translateKaraInfo(poll,lang);	
	return {
		infos: { 
			count: poll.length,
			from: parseInt(from,10),
			to: parseInt(from,10)+parseInt(size,10)
		},
		poll: poll,
		timeLeft: clock.getTimeLeft(),
		flag_uservoted: hasUserVoted(token.username)
	};	
}