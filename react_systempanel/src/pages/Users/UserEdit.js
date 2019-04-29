import React, {Component} from 'react';
import {Layout} from 'antd';
import UserForm from './UserForm';
import axios from 'axios/index';
import {connect} from 'react-redux';
import {push} from 'react-router-redux';
import {errorMessage, infoMessage, loading} from '../../actions/navigation';

const newUser = {
	type: 1,
	login: null,
	password: null,
	nickname: null
};

class UserEdit extends Component {

	state = {
		user: null,
		save: () => {}
	};

	componentDidMount() {
		this.loadUser();
	}

	saveNew = (user) => {
		axios.post('/api/system/users', user)
			.then(() => {
				this.props.infoMessage('User successfully created');
				this.props.push('/system/users');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	saveUpdate = (user) => {
		axios.put(`/api/system/users/${user.id}`, user)
			.then(() => {
				this.props.infoMessage('User successfully edited');
				this.props.push('/system/users');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	loadUser = () => {
		this.props.loading(true);
		if (this.props.match && this.props.match.params.userLogin) {
			axios.get(`/api/system/users/${this.props.match.params.userLogin}`)
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
	push: (url) => dispatch(push(url))
});

export default connect(mapStateToProps, mapDispatchToProps)(UserEdit);