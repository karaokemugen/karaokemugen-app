import {getConfig} from '../_utils/config';
import {getState} from '../_utils/state';
import {editUser} from '../_services/user';
import randomstring from 'randomstring';
import open from 'open';

function generateAdminPassword() {
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

export async function welcomeToYoukousoKaraokeMugen(port) {
	const conf = getConfig();
	const state = getState();
    if (conf.App.FirstRun) {
		const adminPassword = generateAdminPassword();
		if (!state.isDemo && !state.isTest) open(`http://localhost:${port}/welcome?admpwd=${adminPassword}`);
		console.log(`\nAdmin password is : ${adminPassword}\nPlease keep it in a safe place, it will not be displayed ever again.\nTo reset admin password, set appFirstRun to 1 in config.ini\n`);
	} else {
		if (!state.opt.noBrowser && !state.isDemo && !state.isTest) {
			open(`http://localhost:${port}/welcome`);
		}
	}
}