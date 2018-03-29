import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Button, Layout, Table} from 'antd';

import {loading, errorMessage} from '../../actions/navigation';
import {Link} from 'react-router-dom';

const columns = [{
	title: 'ID',
	dataIndex: 'user_id',
	key: 'user_id',
	render: userId => <Link to={`/users/${userId}`}>{userId}</Link>
}, {
	title: 'Type',
	dataIndex: 'type',
	key: 'type',
}, {
	title: 'Avatar',
	dataIndex: 'avatar_file',
	key: 'avatar_file',
}, {
	title: 'Login',
	dataIndex: 'login',
	key: 'login',
}, {
	title: 'Pseudo',
	dataIndex: 'nickname',
	key: 'nickname',
}, {
	title: 'Dernière connexion',
	dataIndex: 'last_login',
	key: 'last_login',
}, {
	title: 'En ligne',
	dataIndex: 'flag_online',
	key: 'flag_online',
}, {
	title: 'Administrateur',
	dataIndex: 'flag_admin',
	key: 'flag_admin',
}];

class Users extends Component {

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
				<Button type='primary' onClick={this.refresh.bind(this)}>Rafraîchir</Button>
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

export default connect(mapStateToProps, mapDispatchToProps)(Users);