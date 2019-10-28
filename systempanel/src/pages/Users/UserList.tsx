import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Avatar, Button, Checkbox, Divider, Icon, Layout, Modal, Table} from 'antd';

import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import {Link} from 'react-router-dom';
import {ReduxMappedProps} from '../../react-app-env';

interface UserListProps extends ReduxMappedProps {
}

interface UserListState {
	users: any[],
	deleteModal: boolean,
	user: any,
}

class UserList extends Component<UserListProps, UserListState> {

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

	refresh() {
		this.props.loading(true);
		axios.get('/api/system/users')
			.then(res => {
				this.props.loading(false);
				this.setState({users: res.data});
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	delete = (userLogin) => {
		axios.delete(`/api/system/users/${userLogin}`)
			.then(() => {
				this.props.warnMessage('User deleted.');
				this.setState({deleteModal: false, user: {}});
				this.refresh();
			})
			.catch(err => {
				this.props.errorMessage(`Error ${err.response.status} while deleting user: ${err.response.statusText}. ${err.response.data}`);
				this.setState({deleteModal: false, user: {}});
			});
	};

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Table
					dataSource={this.state.users}
					columns={this.columns}
					rowKey='nickname'
				/>
				<Button type='primary' onClick={this.refresh.bind(this)}>Refresh</Button>
				<Modal
					title='Confirm user delete'
					visible={this.state.deleteModal}
					onOk={() => this.delete(this.state.user.login)}
					onCancel={() => this.setState({deleteModal: false, user: {}})}
					okText='yes'
					cancelText='no'
				>
					<p>Delete user <b>{this.state.user.login}</b></p>
					<p>Are you sure?</p>
				</Modal>
			</Layout.Content>
		);
	}

	columns = [{
		title: 'Type',
		dataIndex: 'type',
		key: 'type',
		filters: [
			{ text: 'Admin', value: '0' },
			{ text: 'User', value: '1' },
			{ text: 'Guest', value: '2' },
		],
		render: text => {
			if (+text === 0) return 'Admin';
			if (+text === 1) return 'User';
			if (+text === 2) return 'Guest';
		},
		filterMultiple: false,
		onFilter: (value, record) => `${record.type}` === value,
	}, {
		title: 'Avatar',
		dataIndex: 'avatar_file',
		key: 'avatar_file',
		render: (text, record) => <Avatar shape="square" size="large" src={`/avatars/${record.avatar_file}`}/>,
		sorter: (a, b) => a.avatar_file.localeCompare(b.avatar_file)
	}, {
		title: 'Username',
		dataIndex: 'login',
		key: 'login',
		render: (text, record) => <Link to={`/system/km/users/${record.user_id}`}>{text}</Link>,
		sorter: (a, b) => a.login.localeCompare(b.login)
	}, {
		title: 'Nickname',
		dataIndex: 'nickname',
		key: 'nickname',
		render: (text, record) => <Link to={`/system/km/users/${record.user_id}`}>{text}</Link>,
		sorter: (a, b) => a.nickname.localeCompare(b.nickname)
	}, {
		title: 'Last seen on',
		dataIndex: 'last_login_at',
		key: 'last_login_at',
		render: (date) => (new Date(date)).toLocaleString('en'),
		sorter: (a,b) => a.last_login - b.last_login
	}, {
		title: 'Logged in?',
		dataIndex: 'flag_online',
		key: 'flag_online',
		filters: [
			{ text: 'Online', value: '1' },
			{ text: 'Offline', value: '0' },
		],
		render: text => <Checkbox disabled defaultChecked={text === 1} />,
		filterMultiple: false,
		onFilter: (value, record) => `${record.flag_online}` === value,
	}, {
		title: 'Action',
		key: 'action',
		render: (text, record) => (<span>
			<Link to={`/system/km/users/${record.login}`}><Icon type='edit'/></Link>
			<Divider type="vertical"/>
			<Button type='danger' icon='delete' onClick={
				() => this.setState({deleteModal: true, user: record})
			}/>
		</span>)
	}];
}

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	infoMessage: (message) => dispatch(infoMessage(message)),
	errorMessage: (message) => dispatch(errorMessage(message)),
	warnMessage: (message) => dispatch(warnMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(UserList);
