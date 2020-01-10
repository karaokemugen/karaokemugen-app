// Node modules
import tmi, { Client, ChatUserstate } from 'tmi.js';

// KM Imports
import logger from '../lib/utils/logger';
import { addPollVoteIndex } from '../services/poll';
import { getConfig } from '../lib/utils/config';

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
		const conf = getConfig();
		const opts = {
			identity: {
				username: 'KaraokeMugen',
				password: conf.Karaoke.StreamerMode.Twitch.OAuth
			},
			channels: [conf.Karaoke.StreamerMode.Twitch.Channel]
		};
		client = tmi.client(opts);
		await client.connect();
		listenVoteEvents(client);
	} catch(err) {
		logger.error(`[Twitch] Unable to login to chat : ${err}`);
	}
}

/** Simple function to say something to Twitch chat */
export function sayTwitch(message: string) {
	if (client) try {
		client.say(getConfig().Karaoke.StreamerMode.Twitch.Channel, message);
	} catch(err) {
		logger.warn(`[Twitch] Unable to say to channel : ${err}`);
		throw err;
	}
}

/** Vote Events are listened here and reacted upon */
function listenVoteEvents(chat: Client) {
	chat.on('message', (target: string, context: ChatUserstate, msg: string, self: boolean) => {
		// If it's something we said, don't do anything
		if (self) return;
		if (msg.startsWith('!vote ')) {
			const choice = msg.split(' ')[1];
			if (!isNaN(+choice)) {
				addPollVoteIndex(+choice, context.username)
					.catch(err => {
						if (err === 'POLL_VOTE_ERROR') chat.say(target, `${context.username} : Invalid choice`);
						if (err === 'POLL_NOT_ACTIVE') chat.say(target, `${context.username} : No active poll at this moment`);
						if (err === 'POLL_USER_ALREADY_VOTED') chat.say(target, `${context.username} : You already voted, sorrymasen.`);
					});
			}
		}
	});
}

/** Stops Twitch chat and disconnects */
export async function stopTwitch() {
	// Let's properly stop Twitch. If it fails, it's not a big issue
	if (client) try {
		await client.disconnect();
	} catch(err) {
		//Non fatal.
	} finally {
		client = null;
	}
}