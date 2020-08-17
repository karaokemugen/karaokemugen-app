import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Input, Layout, Select, Switch, Table, Tooltip } from 'antd';
import Axios from 'axios';
import i18next from 'i18next';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import FoldersElement from './Components/FoldersElement';

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
	newValueModal?: string | Array<string>,
	visibleModal: boolean,
	files: Array<string>,
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
		const res = await Axios.get('/settings');
		this.setState({
			config: this.configKeyValue(res.data.config), error: '',
			appPath: res.data.state.appPath, dataPath: res.data.state.dataPath,
			os: res.data.state.os
		});
	}

	dotify(obj: any) {
		//Code from the package node-dotify
		const res: any = {};
		function recurse(obj: any, current?: any) {
			for (const key in obj) {
				const value = obj[key];
				const newKey = (current ? current + '.' + key : key);  // joined key with dot
				if (value && typeof value === 'object' && !Array.isArray(value)) {
					recurse(value, newKey);  // it's a nested object, so do it again
				} else {
					res[newKey] = value;  // it's not an object, so set the property
				}
			}
		}
		recurse(obj);
		return res;
	}

	expand = (str, val) => {
		return str.split('.').reduceRight((acc, currentValue) => {
			return { [currentValue]: acc };
		}, val);
	};

	saveSetting = async (key: string, value: any) => {
		await Axios.put('/settings', {
			setting: this.expand(key, value)
		});
		this.refresh();
	}

	putPlayerCommando = (value: any, name: string, command: string) => {
		Axios.put('/player', {
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
					const response = await Axios.post('/fs',
						{ path: `${this.getPathForFileSystem(record.value)}${element}`, onlyMedias: true });
					files = files.concat(response.data.contents.filter(elem => !elem.isDirectory).map(elem => elem.name));
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
					<label><Link to={'/system/km/repositories'}>{i18next.t('CONFIG.REPOSITORIES_PAGES')}</Link></label> :
					(typeof record.value === 'boolean' ?
						<Switch onChange={(e) => this.saveSetting(record.key, e)} defaultChecked={record.value} /> :
						(typeof record.value === 'number' ?
							<Input type='number' style={{ maxWidth: '700px' }}
								onPressEnter={(e) => {
									const target = e.target as HTMLInputElement;
									this.saveSetting(record.key, target.value);
								}}
								defaultValue={record.value}
							/> :
							((record.key.includes('System.Binaries') || record.key.includes('System.Path')) ?
								(Array.isArray(record.value) ?
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
										defaultValue={record.value}
									/>
								)
							)
						)
					)
				)
	}];

	configKeyValue = data => {
		return Object.entries(this.dotify(data)).map(([k, v]) => {
			if (this.props.properties && !this.props.properties.includes(k)) {
				return undefined;
			}
			return ({ key: k, value: v, primary: Array.isArray(v) ? v[0] : undefined });
		}).filter(value => value);
	};

	configBackup = async () => {
		await Axios.post('/settings/backup');
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
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Button style={{ margin: '10px' }} type='primary'
							onClick={this.refresh}>{i18next.t('CONFIG.SAVE')}</Button>
						{this.props.properties ? null :
							<Button style={{ margin: '10px' }} type='primary'
								onClick={this.configBackup}>{i18next.t('CONFIG.BACKUP_CONFIG_FILE')}</Button>
						}
						{this.props.properties ? null :
							<p>{i18next.t('CONFIG.MESSAGE')}</p>
						}
						{this.props.properties ? null :
							<Input.Search
								placeholder={i18next.t('SEARCH_FILTER')}
								value={this.state.filter}
								onChange={event => this.setState({ filter: event.target.value })}
								enterButton={i18next.t('SEARCH')}
							/>
						}
					</Layout.Header>
					<Layout.Content>
						<Table
							columns={this.columns}
							dataSource={this.state.config.filter(property => (property.key as string)
								.toLowerCase().includes(this.state.filter.toLowerCase()))}
							pagination={false}
						/>
					</Layout.Content>
				</Layout>
			</Layout.Content>
		);
	}
}

export default Config;
