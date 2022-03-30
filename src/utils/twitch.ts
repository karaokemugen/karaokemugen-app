// Node modules
import i18next from 'i18next';
import tmi, { ChatUserstate, Client } from 'tmi.js';

import { getConfig } from '../lib/utils/config';
// KM Imports
import logger, { profile } from '../lib/utils/logger';
import { getSongSeriesSingers, getSongTitle } from '../services/kara';
import { playerComment } from '../services/player';
import { getCurrentSong } from '../services/playlist';
import { addPollVoteIndex } from '../services/poll';
import { getState } from './state';

const service = 'Twitch';

// We declare our client here se we can interact with it from different functions.
let client: Client = null;

/** Returns twitch client */
export function getTwitchClient(): Client {
	return client;
}

/** Initialize Twitch with provided OAuth token in config */
export async function initTwitch() {
	if (client) return;
	try {
		profile('initTwitch');
		const conf = getConfig();
		const opts = {
			identity: {
				username: 'KaraokeMugen',
				password: conf.Karaoke.StreamerMode.Twitch.OAuth,
			},
			channels: [conf.Karaoke.StreamerMode.Twitch.Channel],
		};
		client = tmi.client(opts);
		await client.connect();
		listenChat(client);
		logger.info('Twitch initialized', { service });
	} catch (err) {
		logger.error('Unable to login to chat', { service, obj: err });
	} finally {
		profile('initTwitch');
	}
}

/** Simple function to say something to Twitch chat */
export async function sayTwitch(message: string) {
	if (client) {
		try {
			await client.say(getConfig().Karaoke.StreamerMode.Twitch.Channel, message);
		} catch (err) {
			logger.warn('Unable to say to channel', { service, obj: err });
			throw err;
		}
	}
}

/** Vote Events are listened here and reacted upon */
function listenChat(chat: Client) {
	chat.on('message', async (target: string, context: ChatUserstate, msg: string, self: boolean) => {
		// If it's something we said, don't do anything
		if (self) return;
		if (msg.startsWith('!vote ')) {
			const choice = msg.split(' ')[1];
			if (!isNaN(+choice)) {
				try {
					addPollVoteIndex(+choice, context.username);
				} catch (err) {
					if (err === 'POLL_VOTE_ERROR') {
						chat.say(target, `@${context.username} : ${i18next.t('TWITCH.CHAT.INVALID_CHOICE')}`);
					}
					if (err === 'POLL_NOT_ACTIVE') {
						chat.say(target, `@${context.username} : ${i18next.t('TWITCH.CHAT.NO_ACTIVE_POLL')}`);
					}
					if (err === 'POLL_USER_ALREADY_VOTED') {
						chat.say(target, `@${context.username} : ${i18next.t('TWITCH.CHAT.YOU_ALREADY_VOTED')}`);
					}
				}
			}
		} else if (msg === '!song') {
			const song = await getCurrentSong();
			const str = `@${context.username} : ${getSongTitle(song)} - ${getSongSeriesSingers(song)} (${
				/\./.test(song.repository)
					? `https://${song.repository}/base/kara/${song.kid}`
					: `${getState().osURL}/public/plc/${song.plcid}`
			})`;
			chat.say(target, str);
		} else if (getConfig().Player.LiveComments) {
			// Any other message is treated here for the display message function
			// We need to strip emotes first
			msg = stripEmotes(msg, context);
			if (msg.length < 100) playerComment(msg);
		}
	});
}

function stripEmotes(msg: string, context: ChatUserstate) {
	if (!context.emotes) return msg;
	const emotes = Object.keys(context.emotes);
	const arr = msg.split('');
	for (const e of emotes) {
		for (const pos of context.emotes[e]) {
			const [emoteStart, emoteEnd] = pos.split('-');
			for (let i = +emoteStart; i <= +emoteEnd; i += 1) {
				delete arr[i];
			}
		}
	}
	return arr.join('').replace(/\s{2,}/g, ' ');
}

/** Stops Twitch chat and disconnects */
export async function stopTwitch() {
	// Let's properly stop Twitch. If it fails, it's not a big issue
	if (client) {
		try {
			await client.disconnect();
		} catch (err) {
			// Non fatal.
		} finally {
			client = null;
		}
	}
}
