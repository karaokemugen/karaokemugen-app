import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Input, Layout, Select, Switch, Table, Tooltip } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';
import { Link } from 'react-router-dom';

import { commandBackend } from '../../utils/socket';
import { dotify, expand } from '../../utils/tools';
import FoldersElement from '../components/FoldersElement';
import Title from '../components/Title';
import { WS_CMD } from '../../utils/ws';
import { PlayerCommand } from '../../../../src/types/player';

interface ConfigProps {
	properties?: string[];
}

interface ConfigState {
	config: any[];
	error: string;
	filter: string;
}

interface Record {
	key: string;
	value: any;
	primary: string;
}

// Transforms object to dot notation
// Transforms dot notation to object and value

class Config extends Component<ConfigProps, ConfigState> {
	constructor(props) {
		super(props);
		this.state = {
			config: [],
			error: '',
			filter: '',
		};
	}

	async componentDidMount() {
		await this.refresh();
	}

	refresh = async () => {
		try {
			const res = await commandBackend(WS_CMD.GET_SETTINGS);
			this.setState({
				config: this.configKeyValue(res.config),
				error: '',
			});
		} catch (_) {
			//already display
		}
	};

	saveSetting = async (key: string, value: any) => {
		await commandBackend(WS_CMD.UPDATE_SETTINGS, {
			setting: expand(key, value),
		}).catch(() => {});
		this.refresh();
	};

	putPlayerCommando = (value: any, name: string, command: PlayerCommand) => {
		commandBackend(WS_CMD.SEND_PLAYER_COMMAND, {
			command: command,
			options: value,
		});
		this.saveSetting(name, value);
	};

	columns = [
		{
			title: i18next.t('CONFIG.PROPERTY'),
			dataIndex: 'key',
			key: 'key',
			render: text => {
				return this.props.properties ? (
					<span>
						{i18next.t(`CONFIG.PROPERTIES.${text.toUpperCase().replace(/\./g, '_')}`)}&nbsp;
						{i18next.t(`CONFIG.PROPERTIES.${text.toUpperCase().replace('.', '_')}_TOOLTIP`) !==
						`CONFIG.PROPERTIES.${text.toUpperCase().replace('.', '_')}_TOOLTIP` ? (
							<Tooltip
								title={i18next.t(`CONFIG.PROPERTIES.${text.toUpperCase().replace('.', '_')}_TOOLTIP`)}
							>
								<QuestionCircleOutlined />
							</Tooltip>
						) : null}
					</span>
				) : (
					text
				);
			},
		},
		{
			title: i18next.t('CONFIG.VALUE'),
			dataIndex: 'value',
			key: 'value',
			render: (_, record: Record) =>
				record.key === 'Player.HardwareDecoding' ? (
					<Select
						style={{ width: '100%' }}
						onChange={value => {
							this.putPlayerCommando(value, 'Player.HardwareDecoding', 'setHwDec');
						}}
						value={record.value}
					>
						<Select.Option value="auto-safe">
							{' '}
							{i18next.t('CONFIG.PROPERTIES.PLAYER_HARDWAREDECODING_OPTIONS.AUTOSAFE')}{' '}
						</Select.Option>
						<Select.Option value="no">
							{' '}
							{i18next.t('CONFIG.PROPERTIES.PLAYER_HARDWAREDECODING_OPTIONS.NO')}{' '}
						</Select.Option>
						<Select.Option value="yes">
							{' '}
							{i18next.t('CONFIG.PROPERTIES.PLAYER_HARDWAREDECODING_OPTIONS.FORCE')}{' '}
						</Select.Option>
					</Select>
				) : record.key === 'System.Repositories' ? (
					<label>
						<Link to={'/system/repositories'}>{i18next.t('CONFIG.REPOSITORIES_PAGES')}</Link>
					</label>
				) : typeof record.value === 'boolean' ? (
					<Switch onChange={e => this.saveSetting(record.key, e)} defaultChecked={record.value} />
				) : typeof record.value === 'number' ? (
					<Input
						type="number"
						style={{ maxWidth: '700px' }}
						onPressEnter={e => {
							const target = e.target as HTMLInputElement;
							this.saveSetting(record.key, target.value);
						}}
						onBlur={e => {
							const target = e.target as HTMLInputElement;
							this.saveSetting(record.key, target.value);
						}}
						defaultValue={record.value}
					/>
				) : record.key.includes('System.Binaries') ||
				  record.key.includes('System.Path') ||
				  record.key.includes('System.MediaPath') ? (
					Array.isArray(record.value) ||
					record.key.includes('System.Path') ||
					record.key.includes('System.MediaPath') ? (
						<FoldersElement
							keyModal={record.key}
							value={record.value}
							openDirectory={true}
							onChange={value => this.saveSetting(record.key, value)}
						/>
					) : (
						<FoldersElement
							keyModal={record.key}
							value={record.value}
							openFile={true}
							onChange={value => this.saveSetting(record.key, value)}
						/>
					)
				) : (
					<Input
						style={{ maxWidth: '700px' }}
						onPressEnter={e => {
							const target = e.target as HTMLInputElement;
							this.saveSetting(record.key, target.value);
						}}
						onBlur={e => {
							const target = e.target as HTMLInputElement;
							this.saveSetting(record.key, target.value);
						}}
						defaultValue={record.value}
					/>
				),
		},
	];

	configKeyValue = data => {
		return Object.entries(dotify(data))
			.map(([k, v]) => {
				if (this.props.properties && !this.props.properties.includes(k)) {
					return undefined;
				}
				return { key: k, value: v, primary: Array.isArray(v) ? v[0] : undefined };
			})
			.filter(value => value);
	};

	configBackup = async () => {
		await commandBackend(WS_CMD.BACKUP_SETTINGS);
	};

	render() {
		return (
			<>
				<Title
					title={i18next.t(
						this.props.properties
							? navigator.platform.indexOf('Mac') === 0
								? 'HEADERS.SYSTEM_PREFERENCES.TITLEMAC'
								: 'HEADERS.SYSTEM_PREFERENCES.TITLE'
							: 'HEADERS.CONFIGURATION.TITLE'
					)}
					description={i18next.t(
						this.props.properties
							? 'HEADERS.SYSTEM_PREFERENCES.DESCRIPTION'
							: 'HEADERS.CONFIGURATION.DESCRIPTION'
					)}
				/>
				<Layout.Content>
					<Button style={{ margin: '0.75em' }} type="primary" onClick={this.refresh}>
						{i18next.t('CONFIG.SAVE')}
					</Button>
					{this.props.properties ? null : (
						<>
							<Button style={{ margin: '0.75em' }} type="primary" onClick={this.configBackup}>
								{i18next.t('CONFIG.BACKUP_CONFIG_FILE')}
							</Button>
							<p>{i18next.t('CONFIG.MESSAGE')}</p>
							<Input.Search
								placeholder={i18next.t('SEARCH_FILTER')}
								value={this.state.filter}
								onChange={event => this.setState({ filter: event.target.value })}
								enterButton={i18next.t('SEARCH')}
								style={{ marginBottom: '0.75em' }}
							/>
						</>
					)}
					<Table
						columns={this.columns}
						dataSource={this.state.config.filter(property =>
							(property.key as string).toLowerCase().includes(this.state.filter.toLowerCase())
						)}
						pagination={false}
						scroll={{
							x: true,
						}}
						expandable={{
							showExpandColumn: false,
						}}
					/>
				</Layout.Content>
			</>
		);
	}
}

export default Config;
