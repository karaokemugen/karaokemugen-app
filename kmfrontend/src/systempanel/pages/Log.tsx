import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Collapse, Layout, Select, Timeline } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';

import GlobalContext from '../../store/context';
import i18n from '../../utils/i18n';
import { commandBackend, getSocket, isRemote } from '../../utils/socket';
import Title from '../components/Title';
import dayjs from 'dayjs';

interface LogState {
	log: { level: string; message: string; timestamp: string; service: string; obj?: any }[];
	error: string;
	level: string;
}

class Log extends Component<unknown, LogState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;

	state = {
		log: [],
		error: '',
		level: 'info',
	};

	interval: NodeJS.Timeout;

	componentDidMount() {
		this.refresh().then(() => {
			if (this.context.globalState.settings?.data.state) {
				if (!isRemote()) {
					getSocket().on('log', log => {
						const logs = [...this.state.log];
						logs.push(log);
						this.setState({ log: logs });
					});
				} else {
					// Event-based logs aren't available on remote, use polling-method instead
					this.interval = setInterval(this.refresh.bind(this), 4500);
				}
			}
		});
	}

	componentWillUnmount() {
		if (this.interval) {
			clearInterval(this.interval);
		}
	}

	refresh = async () => {
		const res = await commandBackend('getLogs', { level: this.state.level });
		if (res) this.setState({ log: res });
	};

	setLevel = level => {
		this.setState({ level, log: [] }, this.refresh);
	};

	openLogFile = () => {
		commandBackend('openLogFile');
	};

	render() {
		return (
			<>
				<Title title={i18next.t('HEADERS.LOGS.TITLE')} description={i18next.t('HEADERS.LOGS.DESCRIPTION')} />
				<Layout.Content>
					<Select defaultValue="info" onChange={this.setLevel} style={{ marginBottom: '1em' }}>
						<Select.Option value="error">{i18next.t('LOGS.LEVELS.ERROR')}</Select.Option>
						<Select.Option value="warn">{i18next.t('LOGS.LEVELS.WARNING')}</Select.Option>
						<Select.Option value="info">{i18next.t('LOGS.LEVELS.INFO')}</Select.Option>
						<Select.Option value="debug">{i18next.t('LOGS.LEVELS.DEBUG')}</Select.Option>
					</Select>
					<Button type="primary" style={{ marginRight: '1em' }} onClick={this.openLogFile}>
						{i18next.t('LOGS.SELECT_LOG')}
					</Button>
					<Timeline reverse={true}>
						{this.state.log.map((line, i) => {
							let color = '#a6e22d'; // green
							if (line.level === 'warn') color = '#e6db74'; // yellow
							if (line.level === 'error') color = '#f9265d'; // red
							if (line.level === 'debug') color = '#999999'; // grey
							return (
								<Timeline.Item key={i} style={{ color: color }}>
									<strong>{dayjs(line.timestamp).format('L LTS')}</strong> -{' '}
									<strong>{line.service}</strong>
									<ArrowRightOutlined style={{ margin: '0 0.5em' }} />
									<code style={{ whiteSpace: 'pre-wrap' }}>{line.message}</code>
									{line.obj !== undefined ? (
										<Collapse>
											<Collapse.Panel header={i18n.t('LOGS.SHOW_DETAILS')} key="1">
												<pre>{JSON.stringify(line.obj, null, 2)}</pre>
											</Collapse.Panel>
										</Collapse>
									) : (
										''
									)}
								</Timeline.Item>
							);
						})}
					</Timeline>
				</Layout.Content>
			</>
		);
	}
}

export default Log;
