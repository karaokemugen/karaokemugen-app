import discordRPC from 'discord-rpc';
import i18next from 'i18next';
import sample from 'lodash.sample';

import { getConfig } from '../lib/utils/config';
import { sentryError } from '../lib/utils/sentry';
import { version } from '../version';

const clientId = '718211141033263145';

let rpc: any;

discordRPC.register(clientId);

export function setDiscordActivity(activityType: 'song' | 'idle', activityData?: any) {
	try {
		if (!getConfig().Online.Discord.DisplayActivity || !rpc) return;
		const startTimestamp = new Date();
		let activity: string;
		let activityDetail = 'Zzz...';
		if (activityType === 'idle') {
			activity = sample(i18next.t('DISCORD.IDLING', {returnObjects: true}));
		}
		if (activityType === 'song') {
			activity = activityData.title,
			activityDetail = activityData.singer;
		}
		rpc.setActivity({
			details: activity.substring(0, 128),
			state: activityDetail.substring(0, 128),
			startTimestamp,
			largeImageKey: 'nanami-smile',
			largeImageText: 'Karaoke Mugen',
			smallImageKey: activityType === 'song' ? 'nanami-xd' : 'nanami-hehe2',
			smallImageText: `Version ${version.number} - ${version.name}`,
			instance: false,
		});
	} catch(err) {
		sentryError(err);
		throw err;
	}
}

export function stopDiscordRPC() {
	if (rpc) {
		rpc.clearActivity();
		rpc.destroy();
		rpc = null;
	}
}

export function initDiscordRPC() {
	if (rpc) return;
	if (!getConfig().Online.Discord.DisplayActivity) return;
	rpc = new discordRPC.Client({ transport: 'ipc' });

	rpc.on('ready', () => {
		setDiscordActivity('idle');
		// activity can only be set every 15 seconds
	});
	rpc.login({ clientId }).catch(console.error);

}