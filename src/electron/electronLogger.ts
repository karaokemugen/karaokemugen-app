import i18next from 'i18next';
import Transport from 'winston-transport';

import { setTipLoop } from '../utils/tips';
import { win } from './electron';

let errorHappened = false;

export function initStep(step: string, lastEvent?: boolean) {
	emitIPC('initStep', {message: step, lastEvent: lastEvent});
}

export function errorStep(step: string) {
	// Not triggering if one error already happened
	if (win && !errorHappened) {
		errorHappened = true;
		initStep(i18next.t('INIT_ERROR'));
		setTipLoop('errors');
		emitIPC('error', {message: step});
	}
}

export function emitIPC(type: string, data: any) {
	if (win) win.webContents.send(type, data);
}

export class IPCTransport extends Transport {
	constructor(opts: any) {
		super(opts);
	}

	log(info: any, callback: any) {
		try {
			emitIPC('log', info);
		} catch(err) {
			// Non fatal. We can safely ignore
		} finally {
			callback();
		}
	}
}

