import { Layout } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { User } from '../../../../../src/lib/types/user';
import { commandBackend } from '../../../utils/socket';
import UserForm from './UserForm';

interface UserEditState {
	user: User;
	save: (user: User) => void;
}

const newUser = {
	type: 1,
	login: null,
	password: null,
	nickname: null,
};

class UserEdit extends Component<RouteComponentProps<{ userLogin: string }>, UserEditState> {
	state = {
		user: null,
		save: () => {},
	};

	componentDidMount() {
		this.loadUser();
	}

	saveNew = async user => {
		await commandBackend('createUser', user, true);
		this.props.history.push('/system/users');
	};

	saveUpdate = async user => {
		await commandBackend('editUser', user, true);
		this.props.history.push('/system/users');
	};

	loadUser = async () => {
		if (this.props.match.params.userLogin) {
			try {
				const res = await commandBackend('getUser', { username: this.props.match.params.userLogin });
				this.setState({ user: res, save: this.saveUpdate });
			} catch (e) {
				// already display
			}
		} else {
			this.setState({ user: { ...newUser }, save: this.saveNew });
		}
	};

	render() {
		return (
			<>
				<Layout.Header>
					<div className="title">
						{i18next.t(
							this.props.match.params.userLogin ? 'HEADERS.USER_EDIT.TITLE' : 'HEADERS.USER_NEW.TITLE'
						)}
					</div>
					<div className="description">
						{i18next.t(
							this.props.match.params.userLogin
								? 'HEADERS.USER_EDIT.DESCRIPTION'
								: 'HEADERS.USER_NEW.DESCRIPTION'
						)}
					</div>
				</Layout.Header>
				<Layout.Content>
					{this.state.user && <UserForm user={this.state.user} save={this.state.save} />}
				</Layout.Content>
			</>
		);
	}
}

export default withRouter(UserEdit);
