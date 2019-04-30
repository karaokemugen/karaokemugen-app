import got from 'got';
import logger from 'winston';
import {xml2json} from 'xml-js';
import internet from 'internet-available';

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
		url:
		'https://shelter.moe/users/KaraokeMugen.rss'
	}
];

export async function getFeeds() {
	try {
		await internet();
	} catch(err) {
		throw 'This instance is not connected to the internets';
	}
	let feedPromises = [];
	for (const feed of feeds) {
		feedPromises.push(fetchFeed(feed.url, feed.name));
	}
	return await Promise.all(feedPromises);
}

async function fetchFeed(url: string, name: string) {
	try {
		const response = await got(url);
		return {
			name: name,
			body: xml2json(response.body, {compact: true})
		};
	} catch(err) {
		logger.error(`[Feeds] Unable to fetch feed ${name}. Is this instance connected to Internet?`);
		return {
			name: name,
			body: null
		};
	}
}