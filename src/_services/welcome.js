import {getConfig} from '../_utils/config';
import {editUser} from '../_services/user';
import randomstring from 'randomstring';
import open from 'open';

function generateAdminPassword() {
	// Resets admin's password when appFirstRun is set to 1.
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
	if (+conf.appFirstRun === 1) {
		const adminPassword = generateAdminPassword();
		if (!conf.isDemo && !conf.isTest) open(`http://localhost:${port}/welcome?admpwd=${adminPassword}`);
		console.log(`\nAdmin password is : ${adminPassword}\nPlease keep it in a safe place, it will not be displayed ever again.\nTo reset admin password, set appFirstRun to 1 in config.ini\n`);
	} else {
		if (!conf.optNoBrowser && !conf.isDemo && !conf.isTest) {
			open(`http://localhost:${port}/welcome`);
		}
	}
}