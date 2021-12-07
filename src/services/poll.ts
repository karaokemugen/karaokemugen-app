import i18n from 'i18next';
import sample from 'lodash.sample';
import sampleSize from 'lodash.samplesize';
import { setTimeout as sleep } from 'timers/promises';

import { APIMessage } from '../controllers/common';
import { Token } from '../lib/types/user';
import { getConfig } from '../lib/utils/config';
import { timer } from '../lib/utils/date';
import logger from '../lib/utils/logger';
import { emit, on } from '../lib/utils/pubsub';
import { emitWS } from '../lib/utils/ws';
import { DBPLC } from '../types/database/playlist';
import { PollItem, PollResults } from '../types/poll';
import { State } from '../types/state';
import { getState, setState } from '../utils/state';
import { sayTwitch } from '../utils/twitch';
import { getSongSeriesSingers, getSongTitle, getSongVersion } from './kara';
import { displayInfo, playerMessage } from './player';
import { copyKaraToPlaylist, editPLC, getPlaylistContentsMini } from './playlist';

let poll: PollItem[] = [];
let voters = new Set();
let pollDate: Date;
let pollEnding = false;
let clock: any;

on('stateUpdated', (state: State) => {
	if (!state.songPoll === false && poll.length > 0) stopPoll();
});

async function displayPoll(winner?: number) {
	const data = getPoll({ role: 'admin', username: 'admin' });
	let maxVotes = 0;
	data.poll.forEach(s => (maxVotes = maxVotes + s.votes));
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
		const series = getSongSeriesSingers(kara);
		// If song order is 0, don't display it (we don't want things like OP0, ED0...)
		const songorder = !kara.songorder || kara.songorder === 0 ? `${kara.songorder}` : '';
		const version = getSongVersion(kara);
		return `${boldWinnerOpen}${
			kara.index
		}. ${percentageStr}% : ${kara.langs[0].name.toUpperCase()} - ${series} - ${kara.songtypes
			.map(s => s.name)
			.join(' ')}${songorder} - ${getSongTitle(kara)}${version}${boldWinnerClose}`;
	});
	const voteMessage = winner ? i18n.t('VOTE_MESSAGE_SCREEN_WINNER') : i18n.t('VOTE_MESSAGE_SCREEN');
	await playerMessage(
		'{\\fscx80}{\\fscy80}{\\b1}' + voteMessage + '{\\b0}\\N{\\fscx70}{\\fscy70}' + votes.join('\\N'),
		-1,
		4,
		'poll'
	);
}

/** Create poll timer so it ends after a time */
export async function timerPoll() {
	const internalDate = (pollDate = new Date());
	const conf = getConfig();
	const duration = conf.Karaoke.Poll.Timeout;
	clock = new timer(() => {}, duration * 1000);
	await sleep(duration * 1000);
	if (internalDate === pollDate) endPoll();
}

async function displayPollWinnerTwitch(winner: PollResults) {
	try {
		await sayTwitch(`Poll winner : ${winner.kara} (${winner.votes} votes)`);
	} catch (err) {
		//Non fatal
	}
}

/** Ends poll and emits results through websockets */
export async function endPoll() {
	if (poll.length > 0) {
		const winner = await getPollResults();
		const streamConfig = getConfig().Karaoke.StreamerMode;
		if (streamConfig.Enabled) {
			const state = getState();
			if (state.player.mediaType === 'poll') displayPoll(winner.index);
			if (streamConfig.Twitch.Channel) displayPollWinnerTwitch(winner);
		}
		pollEnding = true;
		logger.debug('Ending poll', { service: 'Poll', obj: winner });
		emit('songPollResult', winner);
		emitWS('songPollResult', winner);
		emitWS('operatorNotificationInfo', APIMessage('NOTIFICATION.OPERATOR.INFO.POLL_WINNER', winner));
		stopPoll();
	}
}

/** Stop polls completely */
export function stopPoll() {
	logger.debug('Stopping poll', { service: 'Poll' });
	poll = [];
	voters = new Set();
	pollEnding = false;
	emitWS('songPollEnded');
}

/** Get poll results once a poll has ended */
export async function getPollResults(): Promise<PollResults> {
	logger.debug('Getting poll results', { service: 'Poll' });
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

	const version = getSongVersion(winner);
	const kara = `${winner.series ? winner.series[0]?.name : winner.singers[0]?.name} - ${winner.songtypes
		.map(s => s.name)
		.join(' ')}${winner.songorder ? winner.songorder : ''} - ${getSongTitle(winner)}${version}`;
	logger.info(`Winner is "${kara}" with ${maxVotes} votes`, { service: 'Poll' });
	return {
		votes: maxVotes,
		kara: kara,
		index: winner.index,
	};
}

export function addPollVoteIndex(index: number, nickname: string) {
	try {
		addPollVote(index, {
			username: nickname,
			role: 'guest',
		});
		return 'POLL_VOTED';
	} catch (err) {
		throw err.code;
	}
}

/** Add a vote to a poll option */
export function addPollVote(index: number, token: Token) {
	if (poll.length === 0 || pollEnding)
		throw {
			code: 425,
			msg: 'POLL_NOT_ACTIVE',
		};
	if (!poll[index - 1])
		throw {
			code: 404,
			msg: 'POLL_VOTE_ERROR',
		};
	if (voters.has(token.username.toLowerCase()))
		throw {
			code: 429,
			msg: 'POLL_USER_ALREADY_VOTED',
		};
	poll[index - 1].votes++;
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
		logger.info('Unable to start poll, another one is already in progress', { service: 'Poll' });
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.POLL_ALREADY_STARTED'));

		return false;
	}
	logger.info('Starting a new poll', { service: 'Poll' });
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
			logger.info('Public playlist is empty, cannot select songs for poll', { service: 'Poll' });
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
			{ service: 'Poll' }
		);
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.POLL_NOT_ENOUGH_SONGS'));
		return false;
	}
	if (availableKaras.length < pollChoices) pollChoices = availableKaras.length;
	poll = sampleSize(availableKaras, pollChoices);
	//Init votes to 0 and index for each poll item
	for (const index in poll) {
		poll[index].votes = 0;
		poll[index].index = +index + 1;
	}
	logger.debug('New poll', { service: 'Poll', obj: poll });
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
		logger.info('Announcing vote on Twitch', { service: 'Poll' });
		await sayTwitch(i18n.t('TWITCH.CHAT.VOTE'));
		for (const kara of poll) {
			const series = getSongSeriesSingers(kara);
			// If song order is 0, don't display it (we don't want things like OP0, ED0...)
			let songorder = `${kara.songorder}`;
			if (!kara.songorder || kara.songorder === 0) songorder = '';
			await sleep(1000);
			const version = getSongVersion(kara);
			await sayTwitch(
				`${kara.index}. ${kara.langs[0].name.toUpperCase()} - ${series} - ${
					kara.songtypes[0].name
				}${songorder} - ${getSongTitle(kara)}${version}`
			);
		}
	} catch (err) {
		logger.error('Unable to post poll on twitch', { service: 'Poll', obj: err });
	}
}

/** Get current poll options */
export function getPoll(token: Token) {
	if (poll.length === 0)
		throw {
			code: 425,
			msg: 'POLL_NOT_ACTIVE',
		};
	return {
		infos: {
			count: poll.length,
			from: 0,
			to: poll.length,
		},
		poll: poll,
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
			logger.debug('SongPoll Toggle DI', { service: 'Player' });
			displayInfo();
		}
		stopPoll();
	}
}
