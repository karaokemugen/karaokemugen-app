import { Layout } from 'antd';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { User } from '../../../../../src/lib/types/user';
import { commandBackend } from '../../../utils/socket';
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
	const [save, setSave] = useState<(user: User) => void>();

	const saveNew = async user => {
		await commandBackend('createUser', user, true);
		navigate('/system/users');
	};

	const saveUpdate = async user => {
		await commandBackend('editUser', user, true);
		navigate('/system/users');
	};

	const loadUser = async () => {
		if (username) {
			try {
				const res = await commandBackend('getUser', { username });
				setUser(res);
				setSave(saveUpdate);
			} catch (e) {
				// already display
			}
		} else {
			setUser({ ...newUser });
			setSave(saveNew);
		}
	};

	useEffect(() => {
		loadUser();
	}, []);

	return (
		<>
			<Layout.Header>
				<div className="title">
					{i18next.t(username ? 'HEADERS.USER_EDIT.TITLE' : 'HEADERS.USER_NEW.TITLE')}
				</div>
				<div className="description">
					{i18next.t(username ? 'HEADERS.USER_EDIT.DESCRIPTION' : 'HEADERS.USER_NEW.DESCRIPTION')}
				</div>
			</Layout.Header>
			<Layout.Content>{user && <UserForm user={user} save={save} />}</Layout.Content>
		</>
	);
}

export default UserEdit;
