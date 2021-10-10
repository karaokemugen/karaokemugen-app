import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Input, Layout, Select, Switch, Table, Tooltip } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';
import { Link } from 'react-router-dom';

import { commandBackend } from '../../utils/socket';
import { dotify, expand } from '../../utils/tools';
import FoldersElement from '../components/FoldersElement';

interface ConfigProps {
	properties?: string[]
}

interface ConfigState {
	config: any[],
	error: string,
	appPath: string,
	dataPath: string,
	os: string,
	recordModal?: Record,
	indexModal?: number,
	newValueModal?: string | string[],
	visibleModal: boolean,
	files: string[],
	filter: string,
}

interface Record {
	key: string;
	value: any;
	primary: string;
}

// Transforms object to dot notation
// Transforms dot notation to object and value

const configWithSelectFileInFolder = [
	'Player.Background',
	'Playlist.Medias.Intros.File',
	'Playlist.Medias.Encores.File',
	'Playlist.Medias.Outros.File'
];

class Config extends Component<ConfigProps, ConfigState> {

	constructor(props) {
		super(props);
		this.state = {
			config: [],
			error: '',
			dataPath: '',
			appPath: '',
			os: '',
			visibleModal: false,
			files: [],
			filter: ''
		};
	}

	async componentDidMount() {
		await this.refresh();
		const files = this.state.files;
		for (const elem of configWithSelectFileInFolder) {
			files[elem] = await this.getListFiles(elem);
		}
		this.setState({ files: files });
	}

	refresh = async () => {
		try {
			const res = await commandBackend('getSettings');
			this.setState({
				config: this.configKeyValue(res.config), error: '',
				appPath: res.state.appPath, dataPath: res.state.dataPath,
				os: res.state.os
			});
		} catch (e) {
			//already display
		}
	}

	saveSetting = async (key: string, value: any) => {
		await commandBackend('updateSettings', {
			setting: expand(key, value)
		}).catch(() => {});
		this.refresh();
	}

	putPlayerCommando = (value: any, name: string, command: string) => {
		commandBackend('sendPlayerCommand', {
			command: command,
			options: value
		});
		this.saveSetting(name, value);
	};

	openFileSystemModal(record: Record, index?: number) {
		this.setState({ recordModal: record, indexModal: index, visibleModal: true });
	}

	getConfigToSearch(key) {
		if (key === 'Player.Background') {
			return 'System.Path.Backgrounds';
		} else if (key === 'Playlist.Medias.Intros.File') {
			return 'System.Path.Intros';
		} else if (key === 'Playlist.Medias.Encores.File') {
			return 'System.Path.Encores';
		} else if (key === 'Playlist.Medias.Outros.File') {
			return 'System.Path.Outros';
		}
	}

	getRecord(key): Record {
		const configToSearch = this.getConfigToSearch(key);
		let record;
		for (const elem of this.state.config) {
			if (elem.key === configToSearch) {
				record = elem;
				return elem;
			}
		}
		return record;
	}

	async getListFiles(key) {
		const record = this.getRecord(key);
		let files = [];
		if (record) {
			for (const element of record.value) {
				try {
					const response = await commandBackend('getFS',
						{ path: `${this.getPathForFileSystem(record.value)}${element}`, onlyMedias: true });
					files = files.concat(response.contents.filter(elem => !elem.isDirectory).map(elem => elem.name));
				} catch (error) {
					// Folder don't exist so skip
				}
			}
		}
		return files;
	}

	columns = [{
		title: i18next.t('CONFIG.PROPERTY'),
		dataIndex: 'key',
		key: 'key',
		render: (text) => {
			return this.props.properties ? <span>{i18next.t(`CONFIG.PROPERTIES.${text.toUpperCase().replace(/\./g, '_')}`)}&nbsp;
				{i18next.t(`CONFIG.PROPERTIES.${text.toUpperCase().replace('.', '_')}_TOOLTIP`)
					!== `CONFIG.PROPERTIES.${text.toUpperCase().replace('.', '_')}_TOOLTIP` ?
					<Tooltip title={i18next.t(`CONFIG.PROPERTIES.${text.toUpperCase().replace('.', '_')}_TOOLTIP`)}>
						<QuestionCircleOutlined />
					</Tooltip> : null
				}
			</span> : text;
		}
	}, {
		title: i18next.t('CONFIG.VALUE'),
		dataIndex: 'value',
		key: 'value',
		render: (text, record: Record) =>
			record.key === 'Player.HardwareDecoding' ? <Select style={{ width: '100%' }} onChange={(value) => {
				this.putPlayerCommando(value, 'Player.HardwareDecoding', 'setHwDec');
			}} value={record.value}>
				<Select.Option value="auto-safe"> {i18next.t('CONFIG.PROPERTIES.PLAYER_HARDWAREDECODING_OPTIONS.AUTOSAFE')} </Select.Option>
				<Select.Option value="no"> {i18next.t('CONFIG.PROPERTIES.PLAYER_HARDWAREDECODING_OPTIONS.NO')} </Select.Option>
				<Select.Option value="yes"> {i18next.t('CONFIG.PROPERTIES.PLAYER_HARDWAREDECODING_OPTIONS.FORCE')} </Select.Option>
			</Select> :
				(record.key === 'System.Repositories' ?
					<label><Link to={'/system/repositories'}>{i18next.t('CONFIG.REPOSITORIES_PAGES')}</Link></label> :
					(typeof record.value === 'boolean' ?
						<Switch onChange={(e) => this.saveSetting(record.key, e)} defaultChecked={record.value} /> :
						(typeof record.value === 'number' ?
							<Input type='number' style={{ maxWidth: '700px' }}
								onPressEnter={(e) => {
									const target = e.target as HTMLInputElement;
									this.saveSetting(record.key, target.value);
								}}
								onBlur={(e) => {
									const target = e.target as HTMLInputElement;
									this.saveSetting(record.key, target.value);
								}}
								defaultValue={record.value}
							/> :
							((record.key.includes('System.Binaries') || record.key.includes('System.Path')) ?
								(Array.isArray(record.value) || record.key.includes('System.Path') ?
									<FoldersElement keyModal={record.key} value={record.value} openDirectory={true}
										onChange={(value) => this.saveSetting(record.key, value)} /> :
									<FoldersElement keyModal={record.key} value={record.value} openFile={true}
										onChange={(value) => this.saveSetting(record.key, value)} />) :
								(configWithSelectFileInFolder.includes(record.key) ?
									<Select style={{ width: '100%' }} value={record.value} allowClear={true}
										onChange={(value) => this.saveSetting(record.key, value ? value : null)}>
										{this.state.files[record.key] && this.state.files[record.key].map((value) => {
											return <Select.Option key={Math.random()} value={value}>{value}</Select.Option>;
										})}
									</Select> :
									<Input style={{ maxWidth: '700px' }}
										onPressEnter={(e) => {
											const target = e.target as HTMLInputElement;
											this.saveSetting(record.key, target.value);
										}}
										onBlur={(e) => {
											const target = e.target as HTMLInputElement;
											this.saveSetting(record.key, target.value);
										}}
										defaultValue={record.value}
									/>
								)
							)
						)
					)
				)
	}];

	configKeyValue = data => {
		return Object.entries(dotify(data)).map(([k, v]) => {
			if (this.props.properties && !this.props.properties.includes(k)) {
				return undefined;
			}
			return ({ key: k, value: v, primary: Array.isArray(v) ? v[0] : undefined });
		}).filter(value => value);
	};

	configBackup = async () => {
		await commandBackend('backupSettings');
	}

	getPathForFileSystem(value: string) {
		const regexp = this.state.os === 'win32' ? '^[a-zA-Z]:' : '^/';
		if (value.match(regexp) === null) {
			return `${this.state.dataPath}${this.state.os === 'win32' ? '\\' : '/'}`;
		} else {
			return '';
		}
	}

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t(this.props.properties ? 
						'HEADERS.SYSTEM_PREFERENCES.TITLE' :
						'HEADERS.CONFIGURATION.TITLE'
					)}</div>
					<div className='description'>{i18next.t(this.props.properties ? 
						'HEADERS.SYSTEM_PREFERENCES.DESCRIPTION' : 
						'HEADERS.CONFIGURATION.DESCRIPTION'
					)}</div>
				</Layout.Header>
				<Layout.Content>
					<Button style={{ margin: '0.75em' }} type='primary'
						onClick={this.refresh}>{i18next.t('CONFIG.SAVE')}</Button>
					{this.props.properties ? null :
						<>
							<Button style={{ margin: '0.75em' }} type='primary'
								onClick={this.configBackup}>{i18next.t('CONFIG.BACKUP_CONFIG_FILE')}</Button>
							<p>{i18next.t('CONFIG.MESSAGE')}</p>
							<Input.Search
								placeholder={i18next.t('SEARCH_FILTER')}
								value={this.state.filter}
								onChange={event => this.setState({ filter: event.target.value })}
								enterButton={i18next.t('SEARCH')}
								style={{marginBottom: '0.75em'}}
							/>
						</>
					}
					<Table
						columns={this.columns}
						dataSource={this.state.config.filter(property => (property.key as string)
							.toLowerCase().includes(this.state.filter.toLowerCase()))}
						pagination={false}
					/>
				</Layout.Content>
			</>
		);
	}
}

export default Config;
