import { shell } from 'electron';
import { resolve } from 'path';

import { resolvedPath } from '../lib/utils/config.js';
import { date } from '../lib/utils/date.js';
import { ErrorKM } from '../lib/utils/error.js';
import logger from '../lib/utils/logger.js';
import Sentry from './sentry.js';

const service = 'Logger';

export async function selectLogFile() {
	try {
		const fpath = resolve(resolvedPath('Logs'), `karaokemugen-${date()}.log`);
		shell.showItemInFolder(fpath);
	} catch (err) {
		logger.error(`Unable to open file explorer on log directory: ${err}`, { service });
		Sentry.error(err);
		throw new ErrorKM('LOG_VIEW_ERROR');
	}
}
