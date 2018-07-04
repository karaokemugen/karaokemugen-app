import req from 'request-promise-native';
import {configureHost, getConfig} from '../_common/utils/config';

export async function publishURL() {
	configureHost();
	const conf = getConfig();
	let localHost = conf.osHost;
	if (conf.EngineDisplayConnectionInfoHost) localHost = conf.EngineDisplayConnectionInfoHost;
	const options = {
		url: `http://${conf.OnlineHost}:${conf.OnlinePort}`,
		method: 'POST',
		form: {
			localIP: localHost,
			localPort: conf.appFrontendPort,
			IID: conf.appInstanceID
		},
		headers: {
	        'content-type': 'application/x-www-form-urlencoded'
    	}
	};
	try {
		await req(options);
		configureHost();
	} catch(err) {
		throw `Failed publishing our URL to ${conf.OnlineHost} : ${err}`;
	}
}

export async function initOnlineSystem() {
	// This is the only thing it does for now. Will be extended later.
	return await publishURL();
}