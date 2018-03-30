import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Button, Checkbox, Layout, Table} from 'antd';

import {loading, errorMessage} from '../../actions/navigation';
import {Link} from 'react-router-dom';

const columns = [{
	title: 'ID',
	dataIndex: 'user_id',
	key: 'user_id',
	render: user_id => <Link to={`/users/${user_id}`}>{user_id}</Link>,
	defaultSortOrder: 'ascend',
	sorter: (a, b) => a.user_id - b.user_id
}, {
	title: 'Type',
	dataIndex: 'type',
	key: 'type',
	filters: [
		{ text: 'User', value: '1' },
		{ text: 'Guest', value: '2' },
	],
	render: text => text === 1 ? 'User' : 'Guest',
	filterMultiple: false,
	onFilter: (value, record) => `${record.type}` === value,
}, {
	title: 'Avatar',
	dataIndex: 'avatar_file',
	key: 'avatar_file',
	sorter: (a, b) => a.avatar_file.localeCompare(b.avatar_file)
}, {
	title: 'Username',
	dataIndex: 'login',
	key: 'login',
	render: (text, record) => <Link to={`/users/${record.user_id}`}>{text}</Link>,
	sorter: (a, b) => a.login.localeCompare(b.login)
}, {
	title: 'Nickname',
	dataIndex: 'nickname',
	key: 'nickname',
	render: (text, record) => <Link to={`/users/${record.user_id}`}>{text}</Link>,
	sorter: (a, b) => a.nickname.localeCompare(b.nickname)
}, {
	title: 'Last seen on',
	dataIndex: 'last_login',
	key: 'last_login',
	render: (date) => (new Date(+date)).toLocaleString('fr-FR'),
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
	title: 'Admin?',
	dataIndex: 'flag_admin',
	key: 'flag_admin',
	filters: [
		{ text: 'Admin', value: '1' },
		{ text: 'Standard', value: '0' },
	],
	render: text => <Checkbox disabled defaultChecked={text === 1} />,
	filterMultiple: false,
	onFilter: (value, record) => `${record.flag_admin}` === value,
}];

class UserList extends Component {

	constructor(props) {
		super(props);
		this.state = {
			users: []
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		this.props.loading(true);
		axios.get('/api/users')
			.then(res => {
				this.props.loading(false);
				this.setState({users: res.data});
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Table
					dataSource={this.state.users}
					columns={columns}
					rowKey='user_id'
				/>
				<Button type='primary' onClick={this.refresh.bind(this)}>Refresh</Button>
			</Layout.Content>
		);
	}
}

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	errorMessage: (message) => dispatch(errorMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(UserList);
