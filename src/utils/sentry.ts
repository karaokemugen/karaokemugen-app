import * as SentryElectron from '@sentry/electron/main';
import Transport from 'winston-transport';

import { getConfig } from '../lib/utils/config';
import SentryLogger from '../lib/utils/sentry';
import { sentryDSN } from './constants';
import { getState } from './state';

class ElectronSentryLogger extends SentryLogger {
	// @ts-ignore: Excuse me god. We don't use any of the properties
	Sentry: typeof SentryElectron | typeof SentryNode;

	init(strictMode?: boolean) {
		this.Sentry = SentryElectron;

		if (strictMode || process.env.CI_SERVER || process.env.SENTRY_TEST === 'true') {
			console.log('Strict Mode / CI detected / SENTRY_TEST enabled - Disabling Sentry');
			console.log("Have a nice day, sentries won't fire at you~");
			return;
		}
		if (!process.env.SENTRY_DSN && !sentryDSN) {
			// No DSN provided, return.
			return;
		}
		const options: any = {
			dsn: process.env.SENTRY_DSN || sentryDSN,
			environment: process.env.SENTRY_ENVIRONMENT || 'release',
			release: getState().version.number,
			ignoreErrors: ['Maximum call stack size exceeded', 'No karaoke found in playlist object'],
			beforeBreadcrumb: (breadcrumb, _hint) => {
				// Disabling socket.io HTTP breadcrumbs for sentry errors
				if (breadcrumb.data?.url?.includes('socket.io')) {
					return null;
				}
			},
			beforeSend: (event, _hint) => {
				// Testing for precise falseness. If errortracking is undefined or if getconfig doesn't return anything, errors are not sent.
				if (getConfig()?.Online?.ErrorTracking !== true || !this.SentryInitialized) return null;
				return event;
			},
		};
		options.enableJavaScript = false;
		this.Sentry.init(options);
		this.SentryInitialized = true;
	}
}

const Sentry = new ElectronSentryLogger(SentryElectron);
export default Sentry;

export class SentryTransport extends Transport {
	log(info: any, callback: any) {
		// Testing for precise falseness. If errortracking is undefined or if getconfig doesn't return anything, errors are sent.
		if (getConfig()?.Online?.ErrorTracking !== true && !Sentry.SentryInitialized) {
			callback();
			return;
		}
		if (info.level === 'debug') Sentry.addErrorInfo('debug', `[${info.service}] ${info.message}`, info?.obj);
		callback();
	}
}
