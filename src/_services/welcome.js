import {getConfig} from '../_common/utils/config';
import {editUser} from '../_services/user';
import randomstring from 'randomstring';
import opn from 'opn';

function generateAdminPassword() {
	const adminPassword = randomstring.generate(8);
	editUser('admin',
		{
			password: adminPassword,
			nickname: 'Dummy Plug System',
			type: 1,
			flag_admin: 1
		},
		null,
		'admin');
	return adminPassword;
}

export async function welcomeToYoukousoKaraokeMugen(port) {
	const conf = getConfig();
	if (+conf.appFirstRun === 1) {
		const adminPassword = generateAdminPassword();
		if (!conf.isDemo && !conf.isTest) opn(`http://localhost:${port}/welcome?admpwd=${adminPassword}`);
		console.log('\nAdmin password is : '+adminPassword+'\nPlease keep it in a safe place, it will not be displayed ever again.\nTo reset admin password, set appFirstRun to 1 in config.ini\n');
	} else {
		if (!conf.optNoBrowser && !conf.isDemo && !conf.isTest) {
			opn(`http://localhost:${port}/welcome`);
		}
	}
}