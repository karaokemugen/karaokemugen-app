import React, {Component} from 'react';
import {Layout, Timeline} from 'antd';
import {connect} from 'react-redux';
import axios from 'axios';
import {loading, infoMessage, errorMessage, warnMessage} from '../actions/navigation';
import {ReduxMappedProps} from '../react-app-env';
import i18next from 'i18next';
import openSocket from 'socket.io-client';

interface LogProps extends ReduxMappedProps {}

interface LogState {
	log: {level:string, message:string, timestamp:string}[],
	error: string,
}

class Log extends Component<LogProps, LogState> {
	constructor(props) {
		super(props);
		this.state = {
			log: [],
			error: ''
		};
	}

	refresh() {
		this.props.loading(true);
		axios.get('/api/log')
			.then(res => {
				this.props.loading(false);
				this.parseLogs(res.data);
			})
			.catch(err => this.props.errorMessage(i18next.t('CONFIG.LOG_FAILED') + ' ' + err));

		axios.get('/api/settings')
			.then(res => {
				let url = window.location.port === '3000' ? `${window.location.protocol}//${window.location.hostname}:1337` : window.location.origin;
				const socket = openSocket(`${url}/${res.data.state.wsLogNamespace}`);
				socket.on('log', (log) => {
					let logs = this.state.log;
					logs.push(log);
					this.setState({log: logs});
				});
			})
			.catch(err => this.props.errorMessage(i18next.t('CONFIG.FETCH_ERROR')+ ' ' + err));
	}

	parseLogs(data: string) {
		const logs = [];
		const lines = data.split("\n")
		lines.forEach(line => {
			if (line) {
				logs.push(JSON.parse(line));
			}
		})
		this.setState({log: logs});
	}

	componentDidMount() {
		this.refresh();
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'left' }}>
			<Timeline reverse={true}>
				{
					this.state.log.map((line,i) => {
						let color = '#a6e22d'; // green
						if (line.level === 'warn') { color = '#e6db74'; } // yellow
						if (line.level === 'error') { color = '#f9265d'; } // red
						if (line.level === 'debug') { color = '#999999'; } // grey
						return (
							<Timeline.Item key={i} style={{color: color }}>
								<code style={{whiteSpace:'pre-wrap'}}>{new Date(line.timestamp).toString()} {line.message}</code>
							</Timeline.Item>
						);
					})
				}
			</Timeline>
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
	warnMessage: (message) => dispatch(warnMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(Log);
