import {Layout} from 'antd';
import Axios from 'axios';
import React, {Component} from 'react';
import { RouteComponentProps,withRouter } from 'react-router-dom';

import { Session } from '../../../../src/types/session';
import { getAxiosInstance } from '../../axiosInterceptor';
import SessionForm from './SessionsForm';

interface SessionEditState {
	session: Session,
	sessions: Array<Session>,
	save: (session:Session) => void,
	loadSession: boolean
}

const newsession:Session = {
	name: null,
	seid: null,
	started_at: new Date(),
	ended_at: null
};

class SessionEdit extends Component<RouteComponentProps<{seid: string}>, SessionEditState> {

	state = {
		session: null,
		sessions: [],
		save: () => {},
		loadSession: false
	};

	componentDidMount() {
		this.loadsession();
	}

	saveNew = async (session:Session) => {
		await getAxiosInstance().post('/sessions', session);
		this.props.history.push('/system/km/sessions');
	};

	saveUpdate = async (session:Session) => {
		await getAxiosInstance().put(`/sessions/${session.seid}`, session);
		this.props.history.push('/system/km/sessions');
	};

	handleSessionMerge = async (seid1:string, seid2:string) => {
		await getAxiosInstance().post('/sessions/merge/', {seid1: seid1, seid2:seid2});
		this.props.history.push('/system/km/sessions/');
	}

	loadsession = async () => {
		if (this.props.match.params.seid) {
			const res = await Axios.get('/sessions/');
			const sessions = res.data.filter(session => session.seid === this.props.match.params.seid);
			this.setState({sessions:res.data, session: sessions[0], save: this.saveUpdate, loadSession: true});
		} else {
			this.setState({session: {...newsession}, save: this.saveNew, loadSession: true});
		}
	};


	render() {
		return (
			<Layout.Content style={{padding: '25px 50px', textAlign: 'center'}}>
				{this.state.loadSession && (<SessionForm session={this.state.session} sessions={this.state.sessions} 
					save={this.state.save} mergeAction={this.handleSessionMerge} />)}
			</Layout.Content>
		);
	}
}

export default withRouter(SessionEdit);