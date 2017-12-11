import {getUserDb} from './database';
import {selectUsers, createUser} from '../_common/db/user';

export function listUsers() {
	return getUserDb().all(selectUsers);
}

export function addUser(user) {
	return getUserDb().run(
		createUser,
		{
			$type: user.type,
			$login: user.login,
			$password: user.password,
			$nickname: user.nickname,
			$NORM_nickname: user.NORM_nickname,
			$last_login: user.last_login,
			$flag_online: user.flag_online,
			$flag_admin: user.flag_admin
		}
	);
}
