
import {getConfig} from '../lib/utils/config';
import {copyKaraToPlaylist, getPlaylistContentsMini} from './playlist';
import sample from 'lodash.sample';
import sampleSize from 'lodash.samplesize';
import {emitWS} from '../lib/utils/ws';
import {promisify} from 'util';
import logger from '../lib/utils/logger';
import {timer} from '../lib/utils/date';
import {getState, setState} from '../utils/state';
import { Token } from '../lib/types/user';
import { message, displayInfo } from '../player/player';
import { PollResults, PollItem } from '../types/poll';
import { on } from '../lib/utils/pubsub';
import { State } from '../types/state';
import i18n from 'i18next';
const sleep = promisify(setTimeout);

let poll: PollItem[] = [];
let voters = new Set();
let pollDate: Date;
let pollEnding = false;
let clock: any;

on('stateUpdated', (state: State) => {
	if (!state.songPoll === false && poll.length > 0) stopPoll();
});

async function displayPoll(winner?: number) {
	const data = await getPoll({role: 'admin', username: 'admin'}, 0, 999999999);
	let maxVotes = 0;
	data.poll.forEach(s => maxVotes = maxVotes + s.votes);
	const votes = data.poll.map(kara => {
		let percentage = (kara.votes / maxVotes) * 100;
		let boldWinnerOpen = '';
		let boldWinnerClose = '';
		if (kara.index === winner) {
			boldWinnerOpen = '{\\b1}';
			boldWinnerClose = '{\\b0}';
		}
		if (isNaN(percentage)) percentage = 0;
		// If series is empty, pick singer information instead

		let series = kara.serie;
		if (!kara.serie) series = kara.singers.map(s => s.name).join(', ');

		// If song order is 0, don't display it (we don't want things like OP0, ED0...)
		let songorder: string = `${kara.songorder}`;
		if (!kara.songorder || kara.songorder === 0) songorder = '';

		return `${boldWinnerOpen}${kara.index}. ${percentage}% : ${kara.langs[0].name.toUpperCase()} - ${series} - ${kara.songtypes[0].name}${songorder}${kara.title}${boldWinnerClose}`;
	})
	const voteMessage = winner
		? i18n.t('VOTE_MESSAGE_SCREEN_WINNER')
		: i18n.t('VOTE_MESSAGE_SCREEN');
	message('{\\fscx80}{\\fscy80}{\\b1}'+voteMessage+'{\\b0}\\N{\\fscx70}{\\fscy70}'+votes.join('\\N'), 1000000, 4);
}

/** Create poll timer so it ends after a time */
export async function timerPoll() {
	const internalDate = pollDate = new Date();
	const conf = getConfig();
	const duration = conf.Karaoke.Poll.Timeout;
	clock = new timer(() => {}, duration * 1000);
	await sleep(duration * 1000);
	if (internalDate === pollDate) endPoll();
}

/** Ends poll and emits results through websockets */
export async function endPoll() {
	if (poll.length > 0) {
		const winner = await getPollResults();
		if (getConfig().Karaoke.StreamerMode.Enabled && getState().status !== 'play') displayPoll(winner.index);
		pollEnding = true;
		logger.debug(`[Poll] Ending poll with ${JSON.stringify(winner)}`);
		emitWS('songPollResult', winner);
		stopPoll();
	}
}

/** Stop polls completely */
export function stopPoll() {
	logger.debug('[Poll] Stopping poll');
	poll = [];
	voters = new Set();
	pollEnding = false;
	emitWS('songPollEnded');
}

/** Get poll results once a poll has ended */
export async function getPollResults(): Promise<PollResults> {
	logger.debug('[Poll] Getting poll results');
	const maxVotes = Math.max.apply(Math, poll.map(choice => choice.votes ));
	// We check if winner isn't the only one...
	let winners = poll.filter(c => +c.votes === +maxVotes);
	let winner = sample(winners);
	const playlist_id = getState().currentPlaylistID;
	await copyKaraToPlaylist([winner.playlistcontent_id], playlist_id);
	emitWS('playlistInfoUpdated', playlist_id);
	emitWS('playlistContentsUpdated', playlist_id);
	const kara = `${winner.serie || winner.singers[0].name} - ${winner.songtypes[0].name}${winner.songorder ? winner.songorder : ''} ${winner.title}`;
	logger.info(`[Poll] Winner is "${kara}" with ${maxVotes} votes`);
	return {
		votes: maxVotes,
		kara: kara,
		index: winner.index
	};
}

export async function addPollVoteIndex(index: number, nickname: string) {
	try {
		await addPollVote(index, {
			username: nickname,
			role: 'guest',
		})
		return 'POLL_VOTED';
	} catch(err) {
		throw err.code;
	}
}

/** Add a vote to a poll option */
export async function addPollVote(index: number, token: Token) {
	if (poll.length === 0 || pollEnding) throw {
		code: 'POLL_NOT_ACTIVE'
	};
	if (!poll[index - 1]) throw {
		code: 'POLL_VOTE_ERROR'
	};
	if (voters.has(token.username)) throw {
		code: 'POLL_USER_ALREADY_VOTED'
	};
	const choiceFound = poll.some((choice, i) => {
		if (+choice.index === index) {
			poll[i].votes++;
			return true;
		}
		return false;
	});
	if (!choiceFound) throw {
		code: 'POLL_VOTE_ERROR',
		message: 'This song is not in the poll'
	};
	voters.add(token.username);
	if (getConfig().Karaoke.StreamerMode.Enabled) displayPoll();
	return {
		code: 'POLL_VOTED',
		data: poll
	};
}

/** Start poll system */
export async function startPoll() {
	const conf = getConfig();
	if (poll.length > 0) {
		logger.info('[Poll] Unable to start poll, another one is already in progress');
		return false;
	}
	logger.info('[Poll] Starting a new poll');
	poll = [];
	voters = new Set();
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
	const availableKaras = pubpl.filter(k => !curpl.map(ktr => ktr.kid).includes(k.kid));
	let pollChoices = conf.Karaoke.Poll.Choices;
	if (availableKaras.length < pollChoices) pollChoices = availableKaras.length;
	poll = sampleSize(availableKaras, pollChoices);
	//Init votes to 0 and index for each poll item
	for (const index in poll) {
		poll[index].votes = 0;
		poll[index].index = +index + 1;
	}
	logger.debug(`[Poll] New poll : ${JSON.stringify(poll)}`);
	// Do not display modal for clients if twitch is enabled
	if (!conf.Karaoke.StreamerMode.Twitch.Enabled) emitWS('newSongPoll',poll);
	timerPoll();
	if (getConfig().Karaoke.StreamerMode.Enabled) displayPoll();
}

/** Get current poll options */
export async function getPoll(token: Token, from: number, size: number) {
	if (poll.length === 0) throw {
		code: 'POLL_NOT_ACTIVE'
	};
	return {
		infos: {
			count: poll.length,
			from: +from,
			to: +from + +size
		},
		poll: poll,
		timeLeft: clock.getTimeLeft(),
		flag_uservoted: voters.has(token.username)
	};
}

/** Toggle song poll on/off */
export function setSongPoll(enabled: boolean) {
	const state = getState();
	const oldState = state.songPoll;
	setState({songPoll: enabled});
	if (!oldState && enabled) startPoll();
	if (oldState && !enabled) {
		if (getConfig().Karaoke.StreamerMode.Enabled) displayInfo();
		stopPoll();
	}
}
