import React, {Component} from 'react';
import {Layout, Timeline} from 'antd';
import openSocket from 'socket.io-client';
import Axios from 'axios';
import GlobalContext from '../store/context';

interface LogState {
	log: {level:string, message:string, timestamp:string}[],
	error: string,
}

class Log extends Component<{}, LogState> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>
	
	constructor(props) {
		super(props);
		this.state = {
			log: [],
			error: ''
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		let res = await Axios.get('/log')
		this.setState({log: res.data});
		let url = window.location.port === '3000' ? `${window.location.protocol}//${window.location.hostname}:1337` : window.location.origin;
		const socket = openSocket(`${url}/${this.context.globalState.settings.data.state.wsLogNamespace}`);
		socket.on('log', (log) => {
			let logs = this.state.log;
			logs.push(log);
			this.setState({log: logs});
		});
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

export default Log;
