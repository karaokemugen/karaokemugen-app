import i18next from 'i18next';
import Transport from 'winston-transport';

import { win } from './electron';
import { setTipLoop } from "../utils/tips";

let errorHappened = false;

export function initStep(step: string, lastEvent?: boolean) {
	emitIPC('initStep', {message: step, lastEvent: lastEvent});
}

export function errorStep(step: string) {
	// Not triggering if one error already happened
	if (win && !errorHappened) {
		errorHappened = true;
		initStep(i18next.t('INIT_ERROR'));
		emitIPC('error', {message: step});
		setTipLoop('errors');
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
		emitIPC('log', info);
		callback();
	}
}

