import {configureHost, getConfig} from '../_common/utils/config';
import {stringify} from 'querystring';
import {post} from 'axios';

export async function publishURL() {
	configureHost();
	const conf = getConfig();
	let localHost = conf.osHost;
	if (conf.EngineDisplayConnectionInfoHost) localHost = conf.EngineDisplayConnectionInfoHost;
	try {
		await post(`http://${conf.OnlineHost}:${conf.OnlinePort}/publish`, stringify({
			localIP: localHost,
			localPort: conf.appFrontendPort,
			IID: conf.appInstanceID
		}));
		configureHost();
	} catch(err) {
		throw `Failed publishing our URL to ${conf.OnlineHost} : ${err}`;
	}
}

export async function initOnlineSystem() {
	// This is the only thing it does for now. Will be extended later.
	return await publishURL();
}