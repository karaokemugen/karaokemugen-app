import publicIP from 'public-ip';

import { APIMessage } from '../controllers/common';
import { getInstanceID } from '../lib/dao/database';
import {getConfig} from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { emitWS } from '../lib/utils/ws';
import {OnlineForm} from '../types/online';
import {configureHost, determineV6Prefix} from '../utils/config';
import {commandKMServer} from '../utils/kmserver';
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
	if (!form.IID) logger.error('Could not get Instance ID', {service: 'ShortURL'});
	try {
		form.IP4 = await publicIP.v4({timeout: 1000, onlyHttps: true});
		form.IP6 = await publicIP.v6({timeout: 1000, onlyHttps: true});
		form.IP6Prefix = await determineV6Prefix(form.IP6);
	} catch (err) {
		logger.debug('Cannot find IPv6 network information, IPv4-only fallback.', {service: 'ShortURL', obj: err});
	}
	try {
		const res: boolean = await commandKMServer('shortener publish', {body: form});
		if (res) {
			logger.debug(`Server (${conf.Online.Host}) accepted our publish`, {service: 'ShortURL'});
			configureHost();
		} else {
			logger.warn(`Server (${conf.Online.Host}) refused our publish`, {service: 'ShortURL'});
			emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.SHORTENER'));
		}
	} catch (err) {
		logger.error(`Failed publishing our IP to ${conf.Online.Host}`, {service: 'ShortURL'});
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.SHORTENER'));
	}
}

/** Initialize online shortener system */
export function initOnlineURLSystem() {
	// This is the only thing it does for now. Will be extended later.
	logger.debug('Publishing...', {service: 'ShortURL'});
	return publishURL();
}
