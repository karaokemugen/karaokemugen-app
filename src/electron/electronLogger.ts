import Transport from 'winston-transport';
import {win} from './electron';
import i18next from 'i18next';

let errorHappened = false;

export function initStep(step: string, lastEvent?: boolean) {
	if (win) win.webContents.send('initStep', {message: step, lastEvent: lastEvent});
}

export function errorStep(step: string) {
	// Not triggering if one error already happened
	if (win && !errorHappened) {
		errorHappened = true;
		initStep(i18next.t('INIT_ERROR'));
		win.webContents.send('error', {message: step});
	}
}

// Display the tip in the space near Nanami
export function techTip(tip: string) {
	if (win) win.webContents.send('tip', {message: tip});
}

export class IPCTransport extends Transport {
	constructor(opts: any) {
		super(opts);
	}

	log(info: any, callback: any) {
		if (win) win.webContents.send('log', info);
		callback();
	}
}

