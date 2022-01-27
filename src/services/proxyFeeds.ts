// Node modules
import internet from 'internet-available';
import { xml2json } from 'xml-js';

import HTTP from '../lib/utils/http';
// KM Imports
import logger from '../lib/utils/logger';
// Types
import { Feed } from '../types/feeds';
import { SystemMessage } from '../types/state';
import { getState, setState } from '../utils/state';

const feeds = [
	{
		name: 'git_base',
		url: 'https://gitlab.com/karaokemugen/bases/karaokebase/-/tags?feed_token=L1P1ToueksLoKyCbTTjh&format=atom',
	},
	{
		name: 'git_app',
		url: 'https://gitlab.com/karaokemugen/karaokemugen-app/-/tags?feed_token=L1P1ToueksLoKyCbTTjh&format=atom',
	},
	{
		name: 'mastodon',
		url: 'https://shelter.moe/users/KaraokeMugen.rss',
	},
];

/** Get Karaoke Mugen main news feeds */
export async function getFeeds() {
	const feedPromises = [];
	try {
		await internet();
		for (const feed of feeds) {
			feedPromises.push(fetchFeed(feed.url, feed.name));
		}
	} catch (err) {
		logger.warn('This instance is not connected to the internets, cannot get online feeds', {
			service: 'Feed',
			obj: err,
		});
	}
	feedPromises.push(fetchSystemMessages());
	return Promise.all(feedPromises);
}

/** Get System Messages * */
async function fetchSystemMessages(): Promise<Feed> {
	return {
		name: 'system',
		body: JSON.stringify(getState().systemMessages),
	};
}

export function addSystemMessage(message: SystemMessage) {
	setState({ systemMessages: [...getState().systemMessages, message] });
}

/** Fetch and process a RSS feed */
async function fetchFeed(url: string, name: string): Promise<Feed> {
	try {
		const response = await HTTP.get(url);
		const feed = JSON.parse(xml2json(response.data as any, { compact: true }));
		// For Mastodon, we filter out UnJourUnKaraoke toots because we don't want to be spammed.
		if (name === 'mastodon') {
			feed.rss.channel.item = feed.rss.channel.item.filter(
				(item: any) => !item.description._text.includes('UnJourUnKaraoke')
			);
		} else {
			feed.feed.entry.forEach((element: any) => {
				element.content._text = element.content._text.replace(/href="\//g, 'href="https://gitlab.com/');
			});
		}
		return {
			name,
			body: JSON.stringify(feed),
		};
	} catch (err) {
		logger.error(`Unable to fetch feed ${name}`, { service: 'Feeds', obj: err });
		return {
			name,
			body: null,
		};
	}
}
