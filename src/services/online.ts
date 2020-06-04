import * as publicIP from 'public-ip';

import { getInstanceID } from '../lib/dao/database';
import {getConfig} from '../lib/utils/config';
import HTTP from '../lib/utils/http';
import logger from '../lib/utils/logger';
import {OnlineForm} from '../types/online';
import {configureHost, determineV6Prefix} from '../utils/config';
import { getState } from '../utils/state';

/** Send IP to KM Server's URL shortener */
export async function publishURL() {
	configureHost();
	const conf = getConfig();
	const localHost = conf.Karaoke.Display.ConnectionInfo.Host || getState().osHost.v4;
	const form: OnlineForm = {
		localIP4: localHost,
		localPort: conf.Frontend.Port,
		IID: await getInstanceID()
	};
	try {
		form.IP4 = await publicIP.v4({timeout: 1000, onlyHttps: true});
		form.IP6 = await publicIP.v6({timeout: 1000, onlyHttps: true});
		form.IP6Prefix = await determineV6Prefix(form.IP6);
	} catch (err) {
		logger.debug(`[ShortURL] Cannot find IPv6 network information: ${err.toString()}, IPv4-only fallback.`);
	}
	try {
		await HTTP.post(`https://${conf.Online.Host}/api/shortener`, {
			form,
			timeout: 5000
		});
		logger.debug('[ShortURL] Server accepted our publish');
		configureHost();
	} catch(err) {
		logger.error(`Failed publishing our IP to ${conf.Online.Host} : ${err}`);
	}
}

/** Initialize online shortener system */
export function initOnlineURLSystem() {
	// This is the only thing it does for now. Will be extended later.
	logger.debug('[ShortURL] Publishing...');
	return publishURL();
}