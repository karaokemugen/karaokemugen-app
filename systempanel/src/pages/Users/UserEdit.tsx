import {Layout} from 'antd';
import Axios from 'axios';
import React, {Component} from 'react';
import { RouteComponentProps,withRouter } from 'react-router';

import { User } from '../../../../src/lib/types/user';
import { getAxiosInstance } from '../../axiosInterceptor';
import UserForm from './UserForm';

interface UserEditState {
	user: User,
	save: (user:User) => void,
}

const newUser = {
	type: 1,
	login: null,
	password: null,
	nickname: null
};

class UserEdit extends Component<RouteComponentProps<{userLogin:string}>, UserEditState> {

	state = {
		user: null,
		save: () => {}
	};

	componentDidMount() {
		this.loadUser();
	}

	saveNew = async (user) => {
		await getAxiosInstance().post('/users', user);
		this.props.history.push('/system/km/users');
	};

	saveUpdate = async (user) => {
		await getAxiosInstance().put(`/users/${user.login}`, user);
		this.props.history.push('/system/km/users');
	};

	loadUser = async () => {
		if (this.props.match.params.userLogin) {
			const res = await Axios.get(`/users/${this.props.match.params.userLogin}`);
			this.setState({user: res.data, save: this.saveUpdate});
		} else {
			this.setState({user: {...newUser}, save: this.saveNew});
		}
	};


	render() {
		return (
			<Layout.Content style={{padding: '25px 50px', textAlign: 'center'}}>
				{this.state.user && (<UserForm user={this.state.user} save={this.state.save} />)}
			</Layout.Content>
		);
	}
}

export default withRouter(UserEdit);