import i18n from 'i18next';
import { sample, sampleSize } from 'lodash';
import { setTimeout as sleep } from 'timers/promises';

import { APIMessage } from '../lib/services/frontend.js';
import { DBPLC } from '../lib/types/database/playlist.js';
import { OldJWTToken } from '../lib/types/user.js';
import { getConfig } from '../lib/utils/config.js';
import { Timer } from '../lib/utils/date.js';
import { ErrorKM } from '../lib/utils/error.js';
import logger from '../lib/utils/logger.js';
import { emit, on } from '../lib/utils/pubsub.js';
import { emitWS } from '../lib/utils/ws.js';
import { PollItem, PollObject, PollResults } from '../types/poll.js';
import { State } from '../types/state.js';
import { adminToken } from '../utils/constants.js';
import { getState, setState } from '../utils/state.js';
import { sayTwitch } from '../utils/twitch.js';
import { displayInfo, playerMessage } from './player.js';
import { copyKaraToPlaylist, editPLC, getPlaylistContentsMini } from './playlist.js';

const service = 'Poll';

let poll: PollItem[] = [];
let voters = new Set();
let pollDate: Date;
let pollEnding = false;
let clock: Timer;

on('stateUpdated', (state: State) => {
	if (!state.songPoll === false && poll.length > 0) stopPoll();
});

async function displayPoll(winner?: number) {
	const data = getPoll(adminToken);
	let maxVotes = 0;
	data.poll.forEach(s => (maxVotes += s.votes));
	const votes = data.poll.map(kara => {
		let percentage = (kara.votes / maxVotes) * 100;
		let boldWinnerOpen = '';
		let boldWinnerClose = '';
		if (kara.index === winner) {
			boldWinnerOpen = '{\\b1}';
			boldWinnerClose = '{\\b0}';
		}
		if (isNaN(percentage)) percentage = 0;
		const percentageStr = percentage < 1 ? `0${percentage.toFixed(1)}` : percentage.toFixed(1);
		// If series is empty, pick singer information instead
		return `${boldWinnerOpen}${kara.index}. ${percentageStr}% : ${kara.songname}${boldWinnerClose}`;
	});
	const voteMessage = winner ? i18n.t('VOTE_MESSAGE_SCREEN_WINNER') : i18n.t('VOTE_MESSAGE_SCREEN');
	await playerMessage(
		`{\\fscx80}{\\fscy80}{\\b1}${voteMessage}{\\b0}\\N{\\fscx70}{\\fscy70}${votes.join('\\N')}`,
		-1,
		4,
		'poll'
	);
}

/** Create poll timer so it ends after a time */
export async function timerPoll() {
	pollDate = new Date();
	const internalDate = pollDate;
	const conf = getConfig();
	const duration = conf.Karaoke.Poll.Timeout;
	clock = new Timer(duration * 1000);
	await clock.wait();
	// Hey, Axel from a while ago, why are you writing this?
	if (internalDate === pollDate) endPoll();
}

async function displayPollWinnerTwitch(pollResults: PollResults) {
	try {
		await sayTwitch(
			`Poll winner : ${pollResults.winner.songname} (${pollResults.winner.votes} votes out of ${pollResults.votes})`
		);
	} catch (err) {
		// Non fatal
	}
}

/** Ends poll and emits results through websockets */
export async function endPoll() {
	if (poll.length > 0) {
		const pollResults = await getPollResults();
		const streamConfig = getConfig().Karaoke.StreamerMode;
		if (streamConfig.Enabled) {
			const state = getState();
			if (state.player.mediaType === 'poll') displayPoll(pollResults.index);
			if (streamConfig.Twitch.Channel) displayPollWinnerTwitch(pollResults);
		}
		pollEnding = true;
		logger.debug('Ending poll', { service, obj: pollResults });
		emit('songPollResult', pollResults);
		emitWS('songPollResult', pollResults);
		emitWS('operatorNotificationInfo', APIMessage('NOTIFICATION.OPERATOR.INFO.POLL_WINNER', pollResults));
		stopPoll();
	}
}

/** Stop polls completely */
export function stopPoll() {
	logger.debug('Stopping poll', { service });
	poll = [];
	voters = new Set();
	pollEnding = false;
	emitWS('songPollEnded');
}

/** Get poll results once a poll has ended */
async function getPollResults(): Promise<PollResults> {
	logger.debug('Getting poll results', { service });
	const maxVotes = Math.max(...poll.map(choice => choice.votes));
	// We check if winner isn't the only one...
	const winners = poll.filter(c => +c.votes === +maxVotes);
	const winner = sample(winners);
	const state = getState();
	const plaid = getState().currentPlaid;
	if (state.publicPlaid !== state.currentPlaid) {
		await copyKaraToPlaylist([winner.plcid], plaid);
	} else {
		await editPLC([winner.plcid], {
			pos: -1,
		});
	}

	emitWS('playlistInfoUpdated', plaid);
	emitWS('playlistContentsUpdated', plaid);

	logger.info(`Winner is "${winner.songname}" with ${maxVotes} votes`, { service });
	return {
		votes: maxVotes,
		winner,
		index: winner.index,
	};
}

export function addPollVoteIndex(index: number, nickname: string) {
	try {
		addPollVote(index, {
			username: nickname,
			role: 'guest',
			iat: new Date().getTime().toString(),
			passwordLastModifiedAt: new Date().getTime().toString(),
		});
		return 'POLL_VOTED';
	} catch (err) {
		throw err.code;
	}
}

/** Add a vote to a poll option */
export function addPollVote(index: number, token: OldJWTToken) {
	if (poll.length === 0 || pollEnding) {
		throw new ErrorKM('POLL_NOT_ACTIVE', 425);
	}
	if (!poll[index - 1]) {
		throw new ErrorKM('POLL_VOTE_ERROR', 404);
	}
	if (voters.has(token.username.toLowerCase())) {
		throw new ErrorKM('POLL_USER_ALREADY_VOTED', 429);
	}
	poll[index - 1].votes += 1;
	voters.add(token.username.toLowerCase());
	if (getState().player.mediaType === 'poll') displayPoll();
	emitWS('songPollUpdated', poll);
	return {
		code: 'POLL_VOTED',
		data: poll,
	};
}

/** Start poll system */
export async function startPoll(): Promise<boolean> {
	const conf = getConfig();
	setState({ songPoll: true });
	if (poll.length > 0) {
		logger.info('Unable to start poll, another one is already in progress', { service });
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.POLL_ALREADY_STARTED'));

		return false;
	}
	if (getState().quiz.running) {
		// No poll in quiz mode
		return false;
	}
	logger.info('Starting a new poll', { service });
	poll = [];
	voters = new Set();
	pollEnding = false;
	// Create new poll
	// Get a list of karaokes to add to the poll
	const publicPlaylistID = getState().publicPlaid;
	const currentPlaylistID = getState().currentPlaid;
	let availableKaras: DBPLC[];
	if (publicPlaylistID !== currentPlaylistID) {
		const [pubpl, curpl] = await Promise.all([
			getPlaylistContentsMini(getState().publicPlaid),
			getPlaylistContentsMini(getState().currentPlaid),
		]);
		if (pubpl.length === 0) {
			logger.info('Public playlist is empty, cannot select songs for poll', { service });
			emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.POLL_PUBLIC_PL_EMPTY'));
			return false;
		}
		availableKaras = pubpl.filter(k => !curpl.map(ktr => ktr.kid).includes(k.kid));
	} else {
		const pl = await getPlaylistContentsMini(getState().publicPlaid);
		const currentKara = pl.find(plc => plc.flag_playing === true);
		availableKaras = pl.filter(plc => plc.pos > currentKara.pos);
	}

	let pollChoices = conf.Karaoke.Poll.Choices;
	if (availableKaras.length === 0) {
		logger.error(
			'Unable to start poll : public playlist has no available songs (have they all been added to current playlist already?)',
			{ service }
		);
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.POLL_NOT_ENOUGH_SONGS'));
		return false;
	}
	if (availableKaras.length < pollChoices) pollChoices = availableKaras.length;
	poll = sampleSize(availableKaras, pollChoices);
	// Init votes to 0 and index for each poll item
	poll.forEach((_, i) => {
		poll[i].votes = 0;
		poll[i].index = +i + 1;
	});
	logger.debug('New poll', { service, obj: poll });
	emitWS('operatorNotificationInfo', APIMessage('NOTIFICATION.OPERATOR.INFO.POLL_STARTING'));
	// Do not display modal for clients if twitch is enabled
	if (conf.Karaoke.StreamerMode.Twitch.Enabled) {
		displayPollTwitch();
	} else {
		emitWS('songPollStarted', poll);
	}
	timerPoll();
	if (getState().player.mediaType === 'poll') displayPoll();
	return true;
}

async function displayPollTwitch() {
	try {
		logger.info('Announcing vote on Twitch', { service });
		await sayTwitch(i18n.t('TWITCH.CHAT.VOTE'));
		for (const kara of poll) {
			await sleep(1000);
			await sayTwitch(`${kara.index}. ${kara.songname}`);
		}
	} catch (err) {
		logger.error('Unable to post poll on twitch', { service, obj: err });
	}
}

/** Get current poll options */
export function getPoll(token: OldJWTToken): PollObject {
	if (poll.length === 0) {
		throw new ErrorKM('POLL_NOT_ACTIVE', 425, false);
	}
	return {
		infos: {
			count: poll.length,
			from: 0,
			to: poll.length,
		},
		poll,
		timeLeft: clock.getTimeLeft(),
		flag_uservoted: voters.has(token.username.toLowerCase()),
	};
}

/** Toggle song poll on/off */
export function setSongPoll(enabled: boolean) {
	const state = getState();
	const oldState = state.songPoll;
	setState({ songPoll: enabled });
	if (!oldState && enabled) startPoll();
	if (oldState && !enabled) {
		if (getConfig().Karaoke.StreamerMode.Enabled) {
			logger.debug('SongPoll Toggle DI', { service });
			displayInfo();
		}
		stopPoll();
	}
}
