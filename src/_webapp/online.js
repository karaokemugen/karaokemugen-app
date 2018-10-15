import {configureHost, getConfig} from '../_common/utils/config';
import {stringify} from 'querystring';
import got from 'got';

export async function publishURL() {
	configureHost();
	const conf = getConfig();
	let localHost = conf.osHost;
	if (conf.EngineDisplayConnectionInfoHost) localHost = conf.EngineDisplayConnectionInfoHost;
	try {
		await got(`http://${conf.OnlineHost}:${conf.OnlinePort}/api/shortener`, {
			body: JSON.stringify({
				localIP: localHost,
				localPort: conf.appFrontendPort,
				IID: conf.appInstanceID
			})
		});
		configureHost();
	} catch(err) {
		throw `Failed publishing our IP to ${conf.OnlineHost} : ${err}`;
	}
}

export async function initOnlineSystem() {
	// This is the only thing it does for now. Will be extended later.
	return await publishURL();
}