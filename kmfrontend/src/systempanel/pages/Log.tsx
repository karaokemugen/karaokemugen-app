import { ArrowRightOutlined } from '@ant-design/icons';
import { Collapse, Layout, Select,Timeline } from 'antd';
import i18next from 'i18next';
import React, { Component } from 'react';

import GlobalContext from '../../store/context';
import i18n from '../../utils/i18n';
import { commandBackend, getSocket } from '../../utils/socket';

interface LogState {
	log: { level: string, message: string, timestamp: string, service: string, obj?: any }[],
	error: string,
	level: string
}

class Log extends Component<unknown, LogState> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>

	state = {
		log: [],
		error: '',
		level: 'info'
	};

	componentDidMount() {
		this.refresh().then(() => {
			if (this.context.globalState.settings?.data.state) {
				getSocket().on('log', (log) => {
					const logs = this.state.log;
					logs.push(log);
					this.setState({ log: logs });
				});
			}
		});
	}

	refresh = async () => {
		const res = await commandBackend('getLogs', {level: this.state.level});
		if (res) this.setState({ log: res });
	}

	setLevel = (level) => {
		this.setState({ level, log: [] }, this.refresh);
	}

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.LOGS.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.LOGS.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Select defaultValue="info" onChange={this.setLevel} style={{marginBottom: '1em'}}>
						<Select.Option value="error">Erreurs</Select.Option>
						<Select.Option value="warn">Avertissements</Select.Option>
						<Select.Option value="info">Informations</Select.Option>
						<Select.Option value="debug">Débogage</Select.Option>
					</Select>
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
