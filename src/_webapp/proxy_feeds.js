import got from 'got';
import logger from 'winston';
import xml2js from 'xml2js';
import {promisify} from 'util';
import internet from 'internet-available';

const parser = new xml2js.Parser();
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

async function parseXML(...args) {
	return promisify(parser.parseString)(...args);
}

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

async function fetchFeed(url, name) {
	try {
		const response = await got(url);
		return {
			name: name,
			body: await parseXML(response.body)
		};
	} catch(err) {
		logger.error(`[Feeds] Unable to fetch feed ${name}. Is this instance connected to Internet?`);
		return {
			name: name,
			body: null
		};
	}
}