import {configureHost, getConfig} from '../_utils/config';
import got from 'got';
import logger from 'winston';

export async function publishURL() {
	configureHost();
	const conf = getConfig();
	const localHost = conf.EngineDisplayConnectionInfoHost || conf.osHost;
	try {
		await got(`https://${conf.OnlineHost}:${conf.OnlinePort}/api/shortener`, {
			body: {
				localIP: localHost,
				localPort: conf.appFrontendPort,
				IID: conf.appInstanceID
			},
			form: true
		});
		logger.debug('[ShortURL] Server accepted our publish');
		configureHost();
	} catch(err) {
		throw `Failed publishing our IP to ${conf.OnlineHost} : ${err.response.body}`;
	}
}

export async function initOnlineSystem() {
	// This is the only thing it does for now. Will be extended later.
	logger.debug('[ShortURL] Publishing...');
	return await publishURL();
}