import { ArrowRightOutlined } from '@ant-design/icons';
import { Collapse, Layout, Select,Timeline } from 'antd';
import Axios from 'axios';
import React, { Component } from 'react';
import openSocket from 'socket.io-client';

import i18n from '../i18n';
import GlobalContext from '../store/context';

interface LogState {
	log: { level: string, message: string, timestamp: string, service: string, obj?: any }[],
	error: string,
	level: string
}

class Log extends Component<unknown, LogState> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>

	constructor(props) {
		super(props);
		this.state = {
			log: [],
			error: '',
			level: 'info'
		};
	}

	componentDidMount() {
		this.refresh();
		const url = window.location.port === '3000' ? `${window.location.protocol}//${window.location.hostname}:1337` : window.location.origin;
		const socket = openSocket(`${url}/${this.context.globalState.settings.data.state.wsLogNamespace}`);
		socket.on('log', (log) => {
			const logs = this.state.log;
			logs.push(log);
			this.setState({ log: logs });
		});
	}

	refresh = async () => {
		const res = await Axios.get(`/log/${this.state.level}`);
		this.setState({ log: res.data });
	}

	setLevel = async (level) => {
		await this.setState({ level, log: [] });
		this.refresh();
	}

	render() {
		return (
			<>
				<Layout.Header style={{ padding: '0 1em' }}>
					<Select defaultValue="info" onChange={this.setLevel}>
						<Select.Option value="error">Erreurs</Select.Option>
						<Select.Option value="warn">Avertissements</Select.Option>
						<Select.Option value="info">Informations</Select.Option>
						<Select.Option value="debug">Débogage</Select.Option>
					</Select>
				</Layout.Header>
				<Layout.Content style={{ padding: '25px 50px', textAlign: 'left' }}>

					<Timeline reverse={true}>
						{
							this.state.log.map((line, i) => {
								let color = '#a6e22d'; // green
								if (line.level === 'warn') color = '#e6db74'; // yellow
								if (line.level === 'error') color = '#f9265d'; // red
								if (line.level === 'debug') color = '#999999'; // grey
								return (
									<Timeline.Item key={i} style={{ color: color }}>
										<strong>{new Date(line.timestamp).toLocaleString()}</strong> - <strong>{line.service}</strong>
										<ArrowRightOutlined style={{ margin: '0 0.5em' }} />
										<code style={{ whiteSpace: 'pre-wrap' }}>{line.message}</code>
										{line.obj !== undefined ?
											<Collapse>
												<Collapse.Panel header={i18n.t('SHOW_DETAILS')} key="1">
													<pre>{JSON.stringify(line.obj, null, 2)}</pre>
												</Collapse.Panel>
											</Collapse>
											: ''}
									</Timeline.Item>
								);
							})
						}
					</Timeline>
				</Layout.Content>
			</>
		);
	}
}

export default Log;
