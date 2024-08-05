import { Layout } from 'antd';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { User } from '../../../../../src/lib/types/user';
import { commandBackend } from '../../../utils/socket';
import Title from '../../components/Title';
import UserForm from './UserForm';

const newUser = {
	type: 1,
	login: null,
	password: null,
	nickname: null,
};

function UserEdit() {
	const navigate = useNavigate();
	const { username } = useParams();

	const [user, setUser] = useState<User>();

	const saveNew = async (user: User) => {
		try {
			await commandBackend('createUser', user, true);
			navigate('/system/users');
		} catch (e) {
			// already display
		}
	};

	const saveUpdate = async (userSaved: User) => {
		try {
			userSaved.old_login = user.login;
			await commandBackend('editUser', userSaved, true);
			navigate('/system/users');
		} catch (e) {
			// already display
		}
	};

	useEffect(() => {
		const loadUser = async () => {
			if (username) {
				try {
					const res = await commandBackend('getUser', { username });
					setUser(res);
				} catch (e) {
					// already display
				}
			} else {
				setUser({ ...newUser });
			}
		};
		loadUser();
	}, [username]);

	return (
		<>
			<Title
				title={i18next.t(username ? 'HEADERS.USER_EDIT.TITLE' : 'HEADERS.USER_NEW.TITLE')}
				description={i18next.t(username ? 'HEADERS.USER_EDIT.DESCRIPTION' : 'HEADERS.USER_NEW.DESCRIPTION')}
			/>
			<Layout.Content>{user && <UserForm user={user} save={username ? saveUpdate : saveNew} />}</Layout.Content>
		</>
	);
}

export default UserEdit;
