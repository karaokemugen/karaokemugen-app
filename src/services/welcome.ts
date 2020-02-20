import {getConfig} from '../lib/utils/config';
import {getState} from '../utils/state';
import {generateAdminPassword} from './user';
import open from 'open';



/** Set admin password on first run, and open browser on welcome page.
 * One, two, three /
 * Welcome to youkoso japari paaku /
 * Kyou mo dottan battan oosawagi /
 * Sugata katachi mo juunin toiro dakara hikareau no /
 */
export async function welcomeToYoukousoKaraokeMugen(port: number) {
	const conf = getConfig();
	const state = getState();
	if (conf.App.FirstRun) {
		const adminPassword = await generateAdminPassword();
		if (!state.opt.noBrowser && !state.isDemo && !state.isTest) open(`http://localhost:${port}/welcome?admpwd=${adminPassword}`);
	} else {
		if (!state.opt.noBrowser && !state.isDemo && !state.isTest) {
			open(`http://localhost:${port}/welcome`);
		}
	}
}