// Node modules
import internet from 'internet-available';
import {xml2json} from 'xml-js';

import HTTP from '../lib/utils/http';
// KM Imports
import logger from '../lib/utils/logger';
// Types
import { Feed } from '../types/feeds';

const feeds = [
	{
		name: 'git_base',
		url: 'https://lab.shelter.moe/karaokemugen/karaokebase/tags?feed_token=dCGJUCzzHWNTqCp1FraN&format=atom'
	},
	{
		name: 'git_app',
		url: 'https://lab.shelter.moe/karaokemugen/karaokemugen-app/tags?feed_token=dCGJUCzzHWNTqCp1FraN&format=atom'
	},
	{
		name: 'mastodon',
		url: 'https://shelter.moe/users/KaraokeMugen.rss'
	}
];

/** Get Karaoke Mugen main news feeds */
export async function getFeeds() {
	try {
		await internet();
	} catch(err) {
		throw 'This instance is not connected to the internets';
	}
	const feedPromises = [];
	feeds.forEach(feed => feedPromises.push(fetchFeed(feed.url, feed.name)));
	return Promise.all(feedPromises);
}

/** Fetch and process a RSS feed */
async function fetchFeed(url: string, name: string): Promise<Feed> {
	try {
		const response = await HTTP(url);
		const feed = JSON.parse(xml2json(response.body, {compact: true}));
		// For Mastodon, we filter out UnJourUnKaraoke toots because we don't want to be spammed.
		if (name === 'mastodon') {
			feed.rss.channel.item = feed.rss.channel.item.filter((item: any) => !item.description._text.includes('UnJourUnKaraoke'));
		} else {
			feed.feed.entry.forEach((element: any) => {
				element.content._text = element.content._text.replace(/href="\//g, 'href="https://lab.shelter.moe/');
			});
		}
		return {
			name: name,
			body: JSON.stringify(feed)
		};
	} catch(err) {
		logger.error(`[Feeds] Unable to fetch feed ${name} : ${err}`);
		return {
			name: name,
			body: null
		};
	}
}