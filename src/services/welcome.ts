import {getConfig} from '../utils/config';
import {Config} from '../types/config';
import {State} from '../types/state';
import {getState} from '../utils/state';
import {editUser} from './user';
import randomstring from 'randomstring';
import open from 'open';

function generateAdminPassword(): string {
	// Resets admin's password when appFirstRun is set to true.
	// Returns the generated password.
	const adminPassword = randomstring.generate(8);
	editUser('admin',
		{
			password: adminPassword,
			nickname: 'Dummy Plug System',
			type: 0
		},
		null,
		'admin');
	return adminPassword;
}

export async function welcomeToYoukousoKaraokeMugen(port: number) {
	const conf: Config = getConfig();
	const state: State = getState();
	if (conf.App.FirstRun) {
		const adminPassword = generateAdminPassword();
		if (!state.isDemo && !state.isTest) open(`http://localhost:${port}/welcome?admpwd=${adminPassword}`);
		console.log(`\nAdmin password is : ${adminPassword}\nPlease keep it in a safe place, it will not be displayed ever again.\nTo reset admin password, set appFirstRun to true in config.yml\n`);
	} else {
		if (!state.opt.noBrowser && !state.isDemo && !state.isTest) {
			open(`http://localhost:${port}/welcome`);
		}
	}
}