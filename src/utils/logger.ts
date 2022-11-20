import { shell } from 'electron';
import { resolve } from 'path';

import { resolvedPath } from '../lib/utils/config';
import { date } from '../lib/utils/date';
import logger from '../lib/utils/logger';

const service = 'Logger';

export async function selectLogFile() {
	try {
		const fpath = resolve(resolvedPath('Logs'), `karaokemugen-${date()}.log`);
		shell.showItemInFolder(fpath);
	} catch (err) {
		logger.error(`Unable to open file explorer on log directory: ${err}`, { service });
		throw err;
	}
}
