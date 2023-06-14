// Node modules
import internet from 'internet-available';
import { xml2js } from 'xml-js';

import HTTP from '../lib/utils/http.js';
// KM Imports
import logger from '../lib/utils/logger.js';
// Types
import { Feed } from '../types/feeds.js';
import { SystemMessage } from '../types/state.js';
import { getState, setState } from '../utils/state.js';

const service = 'Feeds';

const feeds = [
	{
		name: 'git_base',
		url: 'https://gitlab.com/karaokemugen/bases/karaokebase/-/tags?format=atom&sort=updated_desc',
	},
	{
		name: 'git_app',
		url: 'https://gitlab.com/karaokemugen/code/karaokemugen-app/-/tags?format=atom&sort=updated_desc',
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
			service,
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
		const feed: any = xml2js(response.data as any, { compact: true });
		// For Mastodon, we filter out #Karaoke + #KaraokeMugen toots because we don't want to be spammed.
		if (name === 'mastodon') {
			feed.rss.channel.item = feed.rss.channel.item.filter(
				(item: any) => !item.description._text.includes('#Karaoke #KaraokeMugen')
			);
		} else {
			feed.feed.entry.forEach((element: any) => {
				if (element.content._text)
					element.content._text = element.content._text.replace(/href="\//g, 'href="https://gitlab.com/');
			});
		}
		return {
			name,
			body: JSON.stringify(feed),
		};
	} catch (err) {
		logger.error(`Unable to fetch feed ${name}`, { service, obj: err });
		return {
			name,
			body: null,
		};
	}
}
