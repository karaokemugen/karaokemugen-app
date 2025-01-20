// Node modules
import internet from 'internet-available';
import { xml2js } from 'xml-js';

import { getRepoManifest } from '../lib/services/repo.js';
import HTTP from '../lib/utils/http.js';
// KM Imports
import logger from '../lib/utils/logger.js';
// Types
import { Feed } from '../types/feeds.js';
import { SystemMessage } from '../types/state.js';
import { getState, setState } from '../utils/state.js';
import { getRepos } from './repo.js';

const service = 'Feeds';

const feeds = [
	{
		name: 'git_app',
		url: 'https://gitlab.com/karaokemugen/code/karaokemugen-app/-/releases?format=atom&sort=updated_desc',
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
		for (const repo of getRepos()) {
			const manifest = getRepoManifest(repo.Name);
			if (manifest?.feedURL) {
				feedPromises.push(fetchFeed(manifest.feedURL, `repo_${repo.Name}`));
			}
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
	let body: any;
	try {
		const response = await HTTP.get(url);
		const feed: any = xml2js(response.data as any, { compact: true });
		// For Mastodon, we filter out #KaraokeMugen toots because we don't want to be spammed.
		if (name === 'mastodon') {
			feed.rss.channel.item = feed.rss.channel.item.filter((item: any) => {
				if (item.category) {
					if (Array.isArray(item.category)) return !item.category.find(c => c._text === 'karaokemugen');
					return item.category._text !== 'karaokemugen';
				}
				return true;
			});
		} else {
			feed.feed.entry.forEach((element: any) => {
				if (element.content._text)
					element.content._text = element.content._text.replace(/href="\//g, 'href="https://gitlab.com/');
			});
		}
		body = JSON.stringify(feed);
	} catch (err) {
		logger.warn(`Unable to fetch feed ${name}`, { service, obj: err });
		body = null;
	} finally {
		return {
			name,
			body,
		};
	}
}
