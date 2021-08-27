import open from 'open';

import {getConfig} from '../lib/utils/config';
import {getState} from '../utils/state';
import {generateAdminPassword} from './user';

/** Set admin password on first run, and open browser on welcome page.
 * One, two, three /
 * Welcome to youkoso japari paaku /
 * Kyou mo dottan battan oosawagi /
 * Sugata katachi mo juunin toiro dakara hikareau no /
 */
export async function welcomeToYoukousoKaraokeMugen(): Promise<string> {
	const conf = getConfig();
	const state = getState();
	let url = `http://localhost:${state.frontendPort}/welcome`;
	if (conf.App.FirstRun) {
		const adminPassword = await generateAdminPassword();
		url = `http://localhost:${conf.System.FrontendPort}/setup?admpwd=${adminPassword}`;
	}
	if (!state.opt.noBrowser && !state.isTest && state.opt.cli) open(url);
	return url;
}
