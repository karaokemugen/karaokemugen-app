import {getConfig} from '../utils/config';
import {getState} from '../utils/state';
import {generateAdminPassword} from '../services/user';
import open from 'open';

export async function welcomeToYoukousoKaraokeMugen(port: number) {
	const conf = getConfig();
	const state = getState();
	if (conf.App.FirstRun) {
		const adminPassword = await generateAdminPassword();
		if (!state.isDemo && !state.isTest) open(`http://localhost:${port}/welcome?admpwd=${adminPassword}`);
		console.log(`\nAdmin password is : ${adminPassword}\nPlease keep it in a safe place, it will not be displayed ever again.\nTo reset admin password, set appFirstRun to true in config.yml\n`);
	} else {
		if (!state.opt.noBrowser && !state.isDemo && !state.isTest) {
			open(`http://localhost:${port}/welcome`);
		}
	}
}