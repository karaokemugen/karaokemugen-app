import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Avatar, Button, Checkbox, Divider, Layout, Modal,Table } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';
import {Link} from 'react-router-dom';

import { User } from '../../../../../src/lib/types/user';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import { commandBackend } from '../../../utils/socket';

interface UserListState {
	users: User[],
	deleteModal: boolean,
	user: User,
}

class UserList extends Component<unknown, UserListState> {

	constructor(props) {
		super(props);
		this.state = {
			users: [],
			deleteModal: false,
			user: {}
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		const res = await commandBackend('getUsers');
		this.setState({users: res});
	}

	delete = async (userLogin) => {
		await commandBackend('deleteUser', {username: userLogin}, true);
		this.refresh();
		this.setState({deleteModal: false, user: {}});
	};

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.USER_LIST.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.USER_LIST.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Link to={'/system/users/create'}>
						<Button style={{ margin: '0.75em' }} type='primary'>
							{i18next.t('USERS.NEW_USER')}
							<PlusOutlined />
						</Button>
					</Link>
					<Table
						dataSource={this.state.users}
						columns={this.columns}
						rowKey='nickname'
					/>
					<Modal
						title={i18next.t('USERS.USER_DELETED_CONFIRM')}
						visible={this.state.deleteModal}
						onOk={() => this.delete(this.state.user.login)}
						onCancel={() => this.setState({deleteModal: false, user: {}})}
						okText={i18next.t('YES')}
						cancelText={i18next.t('NO')}
					>
						<p>{i18next.t('USERS.DELETE_USER_CONFIRM')} <b>{this.state.user.login}</b></p>
						<p>{i18next.t('CONFIRM_SURE')}</p>
					</Modal>
				</Layout.Content>
			</>
		);
	}

	columns = [{
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
	}, {
		title: i18next.t('USERS.AVATAR'),
		dataIndex: 'avatar_file',
		key: 'avatar_file',
		// render: (text, record) => <Avatar shape="square" size="large" src={`/avatars/${record.avatar_file}`}/>,
		render: (text, record) => <span className="ant-avatar ant-avatar-lg ant-avatar-square ant-avatar-image">
			<ProfilePicture user={record} />
		</span>,
		sorter: (a, b) => a.avatar_file.localeCompare(b.avatar_file)
	}, {
		title: i18next.t('USERS.LOGIN'),
		dataIndex: 'login',
		key: 'login',
		render: (text, record) => <Link to={`/system/users/${record.login}`}>{text}</Link>,
		sorter: (a, b) => a.login.localeCompare(b.login)
	}, {
		title: i18next.t('USERS.NICKNAME'),
		dataIndex: 'nickname',
		key: 'nickname',
		render: (text, record) => <Link to={`/system/users/${record.login}`}>{text}</Link>,
		sorter: (a, b) => a.nickname.localeCompare(b.nickname)
	}, {
		title: i18next.t('USERS.LAST_LOGIN_AT'),
		dataIndex: 'last_login_at',
		key: 'last_login_at',
		render: (date) => (new Date(date)).toLocaleString(),
		sorter: (a,b) => a.last_login - b.last_login
	}, {
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
	}, {
		title: i18next.t('ACTION'),
		key: 'action',
		render: (text, record) => (<span>
			<Link to={`/system/users/${record.login}`}><Button type="primary" icon={<EditOutlined />} /></Link>
			<Divider type="vertical"/>
			<Button type="primary" danger icon={<DeleteOutlined />} onClick={
				() => this.setState({deleteModal: true, user: record})
			}/>
		</span>)
	}];
}

export default UserList;
