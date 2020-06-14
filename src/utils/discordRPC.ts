import discordRPC from 'discord-rpc';
import i18next from 'i18next';
import sample from 'lodash.sample';

import { getConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import sentry from '../utils/sentry';
import { version } from '../version';

const clientId = '718211141033263145';

let rpc: any;

discordRPC.register(clientId);

export async function setDiscordActivity(activityType: 'song' | 'idle', activityData?: any) {
	try {
		if (!getConfig().Online.Discord.DisplayActivity) return;
		if (!rpc) {
			try {
				await initDiscordRPC(false);
			} catch(err) {
				// Non-fatal, we'll try next time
				return;
			}
		}
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
			smallImageKey: activityType === 'song' ? 'play' : 'pause',
			smallImageText: `Version ${version.number} - ${version.name}`,
			instance: false,
		});
	} catch(err) {
		sentry.error(err, 'Warning');
		// Non-fatal
	}
}

export function stopDiscordRPC() {
	if (rpc) {
		rpc.clearActivity();
		rpc.destroy();
		rpc = null;
	}
}

export async function initDiscordRPC(setIdle = true) {
	if (rpc || !getConfig().Online.Discord.DisplayActivity) return;
	try {
		rpc = new discordRPC.Client({ transport: 'ipc' });

		if (setIdle) rpc.on('ready', () => {
			setDiscordActivity('idle');
			// activity can only be set every 15 seconds
		});
		await rpc.login({ clientId });
	} catch(err) {
		// Non-fatal, Discord is probably not running
		logger.debug(`[Discord] Failed to connect to Discord client via IPC : ${err}`);
	}
}