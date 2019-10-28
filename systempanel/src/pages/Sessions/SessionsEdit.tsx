import React, {Component} from 'react';
import {Layout} from 'antd';
import SessionForm from './SessionsForm';
import axios from 'axios/index';
import {connect} from 'react-redux';
import {push} from 'connected-react-router';
import {errorMessage, infoMessage, loading, warnMessage} from '../../actions/navigation';

import {ReduxMappedProps} from '../../react-app-env';

interface SessionEditProps extends ReduxMappedProps {
	push: (string) => any,
	match?: any
}

interface SessionEditState {
	session: any,
	sessions: any,
	save: any
}

const newsession = {
	name: null,
	started_at: new Date()
};

class SessionEdit extends Component<SessionEditProps, SessionEditState> {

	state = {
		session: null,
		sessions: [],
		save: () => {}
	};

	componentDidMount() {
		this.loadsession();
	}

	saveNew = (session) => {
		axios.post('/api/system/sessions', session)
			.then(() => {
				this.props.infoMessage('sessions successfully created');
				this.props.push('/system/km/sessions');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	saveUpdate = (session) => {
		axios.put(`/api/system/sessions/${session.seid}`, session)
			.then(() => {
				this.props.infoMessage('sessions successfully edited');
				this.props.push('/system/km/sessions');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	handleSessionMerge = (seid1,seid2) => {
		axios.post('/api/system/sessions/merge/', {seid1: seid1, seid2:seid2})
			.then((data) => {
				this.props.infoMessage('Sessions successfully merged');
				this.props.push('/system/km/sessions/');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	loadsession = () => {
		this.props.loading(true);
		if (this.props.match && this.props.match.params.seid) {
			axios.get(`/api/system/sessions/`)
				.then(res => {
					var sessions = res.data.filter(session => session.seid === this.props.match.params.seid);
					this.setState({sessions:res.data, session: sessions[0], save: this.saveUpdate});
					this.props.loading(false);
				})
				.catch(err => {
					this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
					this.props.loading(false);
				});
		} else {
			this.setState({session: {...newsession}, save: this.saveNew});
			this.props.loading(false);
		}
	};


	render() {
		return (
			<Layout.Content style={{padding: '25px 50px', textAlign: 'center'}}>
				{this.state.session && (<SessionForm session={this.state.session} sessions={this.state.sessions} 
					save={this.state.save} mergeAction={this.handleSessionMerge.bind(this)} />)}
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
	push: (url) => dispatch(push(url))
});

export default connect(mapStateToProps, mapDispatchToProps)(SessionEdit);