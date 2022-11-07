import { spawn } from 'child_process';
import { dirname, resolve } from 'path';

import { date } from '../lib/utils/date';
import logger from '../lib/utils/logger';
import { findCommand } from './files';
import Sentry from './sentry';
import { getState } from './state';

const service = 'Logger';

export async function selectLogFile() {
	try {
		let command = '';
		const options = [];
		let fpath = resolve(getState().dataPath, `logs/karaokemugen-${date()}.log`);
		switch (process.platform) {
			case 'darwin':
				command = 'open';
				options.push('-R');
				options.push(fpath);
				break;
			case 'win32':
				command = 'explorer.exe';
				options.push(`/select,${fpath}`);
				break;
			// Linux
			default:
				fpath = dirname(fpath);
				// Find out which command works... Thank you Linux for your endless list of file explorers
				if (await findCommand('xdg-open')) {
					command = 'xdg-open';
				} else if (await findCommand('nautilus')) {
					command = 'nautilus';
				} else if (await findCommand('dolphin')) {
					command = 'dolphin';
				} else {
					logger.error('Unable to find file explorer for Linux', { service });
					const err = new Error();
					Sentry.error(err);
					throw err;
				}
				options.push(fpath);
				break;
		}
		spawn(command, options);
	} catch (err) {
		logger.error(`Unable to open file explorer on log directory: ${err}`, { service });
		throw err;
	}
}
