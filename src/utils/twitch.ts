import logger from '../lib/utils/logger';
import { addPollVoteIndex } from '../services/poll';
import tmi from 'tmi.js';
import { getConfig } from '../lib/utils/config';

let client: any;

export function getTwitchClient() {
	return client;
}

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
		client = new tmi.client(opts);
		await client.connect();
		listenVoteEvents(client);
	} catch(err) {
		logger.error(`[Twitch] Unable to login to chat : ${err}`);
	}
}

function listenVoteEvents(chat: any) {
	chat.on('message', (target: string, context: any, msg: string, self: boolean) => {
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

export async function stopTwitch() {
	if (client) try {
		client.disconnect();
	} catch(err) {
		//Non fatal.
	}
	client = null;
}