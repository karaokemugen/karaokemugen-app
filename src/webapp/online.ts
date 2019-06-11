import {getConfig} from '../lib/utils/config';
import {configureHost} from '../utils/config';
import got from 'got';
import logger from '../lib/utils/logger';
import { getState } from '../utils/state';

export async function publishURL() {
	configureHost();
	const conf = getConfig();
	const localHost = conf.Karaoke.Display.ConnectionInfo.Host || getState().osHost;
	try {
		await got(`https://${conf.Online.Host}/api/shortener`, {
			body: {
				localIP: localHost,
				localPort: conf.Frontend.Port,
				IID: conf.App.InstanceID
			},
			form: true
		});
		logger.debug('[ShortURL] Server accepted our publish');
		configureHost();
	} catch(err) {
		logger.error(`Failed publishing our IP to ${conf.Online.Host} : ${err}`);
	}
}

export async function initOnlineURLSystem() {
	// This is the only thing it does for now. Will be extended later.
	logger.debug('[ShortURL] Publishing...');
	return await publishURL();
}