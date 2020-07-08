import * as SentryElectron from '@sentry/electron';
import * as SentryNode from '@sentry/node';
import Transport from 'winston-transport';

import {getConfig} from '../lib/utils/config';
import SentryLogger from '../lib/utils/sentry';
import {version} from '../version';
import {sentryDSN} from './constants';

class ElectronSentryLogger extends SentryLogger {
    // @ts-ignore: Excuse me god. We don't use any of the properties
    Sentry: typeof SentryElectron | typeof SentryNode;

    constructor(sentry_sdk: typeof SentryElectron) {
    	super(sentry_sdk);
    }

    init(electron?: any) {
    	this.Sentry = electron ? SentryElectron:SentryNode;
    	if (process.env.CI_SERVER || process.env.SENTRY_TEST === 'true') {
    		console.log('CI detected/SENTRY_TEST enabled - Sentry disabled');
    		console.log('Have a nice day, sentries won\'t fire at you~');
    		return;
    	}
    	this.Sentry.init({
    		dsn: process.env.SENTRY_DSN || sentryDSN,
    		environment: process.env.SENTRY_ENVIRONMENT || 'release',
    		enableJavaScript: false,
    		release: version.number
    	});
    	this.SentryInitialized = true;
    }
}

const Sentry = new ElectronSentryLogger(SentryElectron);
export default Sentry;

export class SentryTransport extends Transport {
	constructor(opts: any) {
		super(opts);
	}

	log(info: any, callback: any) {
		// Testing for precise falseness. If errortracking is undefined or if getconfig doesn't return anything, errors are sent.
		if (getConfig()?.Online?.ErrorTracking !== true && !Sentry.SentryInitialized) {
			callback();
			return;
		}
		if (info.level === 'debug') Sentry.addErrorInfo('debug', `${info.message}`);
		callback();
	}
}
