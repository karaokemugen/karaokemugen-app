import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Avatar, Button, Checkbox, Divider, Input, Layout, Modal, Table } from 'antd';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { User } from '../../../../../src/lib/types/user';
import { commandBackend } from '../../../utils/socket';
import Title from '../../components/Title';

function UserList() {
	const [users, setUsers] = useState([] as User[]);
	const [deleteModal, setDeleteModal] = useState(false);
	const [user, setUser] = useState({} as User);
	const [filter, setFilter] = useState('');

	const columns = [
		{
			title: 'Type',
			dataIndex: 'type',
			key: 'type',
			filters: [
				{ text: i18next.t('USERS.ADMIN'), value: '0' },
				{ text: i18next.t('USERS.USER'), value: '1' },
				{ text: i18next.t('USERS.GUEST'), value: '2' },
			],
			render: text => {
				if (+text === 0) return i18next.t('USERS.ADMIN');
				if (+text === 1) return i18next.t('USERS.USER');
				if (+text === 2) return i18next.t('USERS.GUEST');
			},
			filterMultiple: false,
			onFilter: (value, record) => `${record.type}` === value,
		},
		{
			title: i18next.t('USERS.AVATAR'),
			dataIndex: 'avatar_file',
			key: 'avatar_file',
			// render: (text, record) => <Avatar shape="square" size="large" src={`/avatars/${record.avatar_file}`}/>,
			render: (text, record) => <Avatar shape="square" size="large" src={`/avatars/${record.avatar_file}`} />,
			sorter: (a, b) => a.avatar_file.localeCompare(b.avatar_file),
		},
		{
			title: i18next.t('USERS.LOGIN'),
			dataIndex: 'login',
			key: 'login',
			render: (text, record) => <Link to={`/system/users/${record.login}`}>{text}</Link>,
			sorter: (a, b) => a.login.localeCompare(b.login),
		},
		{
			title: i18next.t('USERS.NICKNAME'),
			dataIndex: 'nickname',
			key: 'nickname',
			render: (text, record) => <Link to={`/system/users/${record.login}`}>{text}</Link>,
			sorter: (a, b) => a.nickname.localeCompare(b.nickname),
		},
		{
			title: i18next.t('USERS.LAST_LOGIN_AT'),
			dataIndex: 'last_login_at',
			key: 'last_login_at',
			render: date => new Date(date).toLocaleString(),
			sorter: (a, b) => new Date(a.last_login_at).valueOf() - new Date(b.last_login_at).valueOf(),
		},
		{
			title: i18next.t('USERS.FLAG_LOGGED_IN'),
			dataIndex: 'flag_logged_in',
			key: 'flag_logged_in',
			filters: [
				{ text: i18next.t('USERS.ONLINE'), value: true },
				{ text: i18next.t('USERS.OFFLINE'), value: false },
			],
			render: text => <Checkbox disabled defaultChecked={text === true} />,
			filterMultiple: false,
			onFilter: (value, record) => `${record.flag_logged_in}` === value,
		},
		{
			title: i18next.t('ACTION'),
			key: 'action',
			render: (text, record) => (
				<span>
					<Link to={`/system/users/${record.login}`}>
						<Button type="primary" icon={<EditOutlined />} />
					</Link>
					<Divider type="vertical" />
					<Button
						type="primary"
						danger
						icon={<DeleteOutlined />}
						onClick={() => {
							setUser(record);
							setDeleteModal(true);
						}}
					/>
				</span>
			),
		},
	];

	useEffect(() => {
		refresh();
	});

	const refresh = async () => {
		const res = await commandBackend('getUsers');
		setUsers(res);
	};
	const deleteUser = async username => {
		await commandBackend('deleteUser', { username }, true);
		setDeleteModal(false);
		refresh();
	};

	return (
		<>
			<Title
				title={i18next.t('HEADERS.USER_LIST.TITLE')}
				description={i18next.t('HEADERS.USER_LIST.DESCRIPTION')}
			/>
			<Layout.Content>
				<Link to={'/system/users/create'}>
					<Button style={{ margin: '0.75em' }} type="primary">
						{i18next.t('USERS.NEW_USER')}
						<PlusOutlined />
					</Button>
				</Link>
				<Input.Search
					style={{ marginBottom: '0.75em' }}
					placeholder={i18next.t('SEARCH_FILTER')}
					value={filter}
					onChange={event => setFilter(event.target.value)}
				/>
				<Table
					dataSource={users.filter(user => user.login.includes(filter) || user.nickname.includes(filter))}
					columns={columns}
					rowKey="nickname"
					scroll={{
						x: true,
					}}
					expandable={{
						showExpandColumn: false,
					}}
				/>
				<Modal
					title={i18next.t('USERS.USER_DELETED_CONFIRM')}
					open={deleteModal}
					onOk={() => deleteUser(user.login)}
					onCancel={() => setDeleteModal(false)}
					okText={i18next.t('YES')}
					cancelText={i18next.t('NO')}
				>
					<p>
						{i18next.t('USERS.DELETE_USER_CONFIRM')} <b>{user.login}</b>
					</p>
					<p>{i18next.t('CONFIRM_SURE')}</p>
				</Modal>
			</Layout.Content>
		</>
	);
}

export default UserList;
