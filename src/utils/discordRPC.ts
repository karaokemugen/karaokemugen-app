import discordRPC from 'discord-rpc';
import i18next from 'i18next';
import { sample } from 'lodash';

import { getConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { discordClientID } from './constants';
import { getState } from './state';

const service = 'Discord';

let rpc: discordRPC.Client;

interface ActivityData {
	title: string;
	source: string;
}

// Sanitize text for processing in Discord (32-128 chars min-max)
function sanitizeText(str: string): string {
	if (str.length > 128) {
		return `${str.substring(0, 127)}…`;
	}
	if (str.length < 32) {
		return `${str}                          `; // Spaces!!!!
	}
	return str;
}

export async function setDiscordActivity(activityType: 'song' | 'idle', activityData?: ActivityData) {
	try {
		if (!getConfig().Online.Discord.DisplayActivity || !rpc) {
			if (!rpc) startCheckingDiscordRPC();
			return;
		}
		const startTimestamp = new Date();
		let activity: string;
		let activityDetail = 'Zzz...';
		if (activityType === 'idle') {
			activity = sample(i18next.t('DISCORD.IDLING', { returnObjects: true }));
		}
		if (activityType === 'song') {
			activity = activityData.title;
			activityDetail = activityData.source;
		}
		const buttons = [];
		if (getState().remoteAccess && 'host' in getState().remoteAccess) {
			buttons.push({
				label: i18next.t('SUGGEST_SONGS'),
				url: getState().osURL,
			});
		}
		buttons.push({
			label: i18next.t('OFFICIAL_WEBSITE'),
			url: 'https://karaokes.moe',
		});
		await rpc.setActivity({
			details: sanitizeText(activity),
			state: sanitizeText(activityDetail),
			startTimestamp,
			largeImageKey: 'nanami-singing2',
			largeImageText: 'Karaoke Mugen',
			smallImageKey: activityType === 'song' ? 'play' : 'pause',
			smallImageText: `Version ${getState().version.number} - ${getState().version.name}`,
			instance: false,
			buttons,
		});
	} catch (err) {
		// Non-fatal
	}
}

export async function stopDiscordRPC() {
	if (rpc) {
		try {
			await rpc.destroy();
		} catch (err) {
			// Non fatal
		}
		rpc = null;
	}
	if (!getConfig().Online.Discord.DisplayActivity) stopCheckingDiscordRPC();
}

let intervalIDDiscordRPCSetup: any;

export function initDiscordRPC() {
	startCheckingDiscordRPC();
	setupDiscordRPC();
}

function startCheckingDiscordRPC() {
	if (!intervalIDDiscordRPCSetup) intervalIDDiscordRPCSetup = setInterval(setupDiscordRPC, 15000);
}

/** Stop checking if we can setup Discord RPC */
function stopCheckingDiscordRPC() {
	if (intervalIDDiscordRPCSetup) clearInterval(intervalIDDiscordRPCSetup);
	intervalIDDiscordRPCSetup = undefined;
}

export function setupDiscordRPC() {
	try {
		if (rpc || !getConfig().Online.Discord.DisplayActivity) return;
		rpc = new discordRPC.Client({ transport: 'ipc' });

		rpc.on('ready', () => {
			setDiscordActivity('idle');
			stopCheckingDiscordRPC();
			// activity can only be set every 15 seconds
		});
		rpc.login({ clientId: discordClientID }).catch(() => {
			stopDiscordRPC();
			if (getConfig().Online.Discord.DisplayActivity) startCheckingDiscordRPC();
		});
	} catch (err) {
		logger.error('Failed to setup Discord Rich Presence', { service, obj: err });
	}
}
