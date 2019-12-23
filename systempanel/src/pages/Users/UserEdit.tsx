import React, {Component} from 'react';
import {Layout} from 'antd';
import UserForm from './UserForm';
import axios from 'axios/index';
import {connect} from 'react-redux';
import {push} from 'connected-react-router';
import {errorMessage, infoMessage, loading, warnMessage} from '../../actions/navigation';
import {ReduxMappedProps} from '../../react-app-env';
import i18next from 'i18next';

interface UserEditProps extends ReduxMappedProps {
	push: (string) => any,
	match?: any,
}

interface UserEditState {
	user: any,
	save: any,
}

const newUser = {
	type: 1,
	login: null,
	password: null,
	nickname: null
};

class UserEdit extends Component<UserEditProps, UserEditState> {

	state = {
		user: null,
		save: () => {}
	};

	componentDidMount() {
		this.loadUser();
	}

	saveNew = (user) => {
		axios.post('/api/users', user)
			.then(() => {
				this.props.infoMessage(i18next.t('USERS.CREATED'));
				this.props.push('/system/km/users');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	saveUpdate = (user) => {
		axios.put(`/api/users/${user.login}`, user)
			.then(() => {
				this.props.infoMessage(i18next.t('USERS.EDITED'));
				this.props.push('/system/km/users');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	loadUser = () => {
		this.props.loading(true);
		if (this.props.match && this.props.match.params.userLogin) {
			axios.get(`/api/users/${this.props.match.params.userLogin}`)
				.then(res => {
					this.setState({user: res.data, save: this.saveUpdate});
					this.props.loading(false);
				})
				.catch(err => {
					this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
					this.props.loading(false);
				});
		} else {
			this.setState({user: {...newUser}, save: this.saveNew});
			this.props.loading(false);
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

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	infoMessage: (message) => dispatch(infoMessage(message)),
	errorMessage: (message) => dispatch(errorMessage(message)),
	warnMessage: (message) => dispatch(warnMessage(message)),
	push: (url: string) => dispatch(push(url))
});

export default connect(mapStateToProps, mapDispatchToProps)(UserEdit);