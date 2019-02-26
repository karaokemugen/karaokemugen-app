
import {on} from '../_utils/pubsub';
import {getConfig} from '../_utils/config';
import {copyKaraToPlaylist, translateKaraInfo, isAllKarasInPlaylist, getPlaylistContentsMini} from '../_services/playlist';
import sample from 'lodash.sample';
import sampleSize from 'lodash.samplesize';
import {emitWS} from '../_webapp/frontend';
import {promisify} from 'util';
import logger from 'winston';
import {timer} from '../_utils/timer';
import {getState, setState} from '../_utils/state';
const sleep = promisify(setTimeout);

let poll = [];
let voters = [];
let pollDate;
let pollEnding = false;
let clock;

on('stateUpdated', state => {
	if (!state.songPoll && poll.length > 0) stopPoll();
});

export async function timerPoll() {
	const internalDate = pollDate = new Date();
	clock = new timer(() => {}, getConfig().EngineSongPollTimeout * 1000);
	await sleep(getConfig().EngineSongPollTimeout * 1000);
	if (internalDate === pollDate) endPoll();
}

export function endPoll() {
	if (poll.length > 0) getPollResults().then(winner => {
		pollEnding = true;
		logger.debug(`[Poll] Ending poll with ${JSON.stringify(winner)}`);
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
	const maxVotes = Math.max.apply(Math, poll.map(choice => choice.votes ));
	// We check if winner isn't the only one...
	let winners = poll.filter(c => +c.votes === +maxVotes);
	let winner = sample(winners);
	winner = translateKaraInfo(winner);
	const playlist_id = getState().currentPlaylistID;
	await copyKaraToPlaylist([winner[0].playlistcontent_id],playlist_id);
	emitWS('playlistInfoUpdated',playlist_id);
	emitWS('playlistContentsUpdated',playlist_id);
	const kara = `${winner[0].serie} - ${winner[0].songtypes[0].replace('TYPE_','')}${winner[0].songorder} - ${winner[0].title}`;
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

export async function startPoll() {
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
		getPlaylistContentsMini(getState().publicPlaylistID),
		getPlaylistContentsMini(getState().currentPlaylistID)
	]);
	if (pubpl.length === 0) {
		logger.info('[Poll] Public playlist is empty, cannot select songs for poll');
		return false;
	}
	const availableKaras = isAllKarasInPlaylist(pubpl, curpl);
	let pollChoices = conf.EngineSongPollChoices;
	if (availableKaras.length < pollChoices) pollChoices = availableKaras.length;
	poll = sampleSize(availableKaras, pollChoices);
	//Init votes to 0 for each poll item
	for (const index in poll) {
		poll[index].votes = 0;
	}
	poll = translateKaraInfo(poll);
	logger.debug(`[Poll] New poll : ${JSON.stringify(poll)}`);
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
			from: +from,
			to: +from + +size
		},
		poll: poll,
		timeLeft: clock.getTimeLeft(),
		flag_uservoted: hasUserVoted(token.username)
	};
}

export function setSongPoll(enabled) {
	const state = getState();
	const oldState = state.songPoll;
	setState({songPoll: enabled});
	if (!oldState && enabled) startPoll(state.publicPlaylistID,state.currentPlaylistID);
	if (oldState && !enabled) stopPoll();
}
