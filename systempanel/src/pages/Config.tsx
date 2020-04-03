import axios from 'axios';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Input, Layout, Button, Table, Switch, Select} from 'antd';

import {loading, infoMessage, errorMessage, warnMessage} from '../actions/navigation';
import {ReduxMappedProps} from '../react-app-env';
import i18next from 'i18next';
import { Link } from 'react-router-dom';
import FoldersElement from './Components/FoldersElement';

interface ConfigProps extends ReduxMappedProps {}

interface ConfigState {
	config: any[],
	error: string,
	appPath: string,
	dataPath: string,
	os: string;
	recordModal?: Record;
	indexModal?: number;
	newValueModal?:string | Array<string>;
	visibleModal: boolean;
	files: Array<string>
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
			files: []
		};
	}

	async componentDidMount() {
		await this.refresh();
		var files = this.state.files;
		for (const elem of configWithSelectFileInFolder) {
			files[elem] = await this.getListFiles(elem);
		}
		this.setState({files: files});
	}

	async refresh() {
		await axios.get('/api/settings')
			.then(res => this.setState({config: this.configKeyValue(res.data.config), error: '',
				appPath: res.data.state.appPath, dataPath: res.data.state.dataPath, 
				os: res.data.state.os}))
			.catch(err => this.props.errorMessage(i18next.t('CONFIG.FETCH_ERROR')+ ' ' + err));
	}

	dotify(obj:any) {
		//Code from the package node-dotify
		let res:any = {};
		function recurse(obj:any, current?:any) {
			for (var key in obj) {
				let value = obj[key];
				let newKey = (current ? current + '.' + key : key);  // joined key with dot
				if (value && typeof value === 'object' && !Array.isArray(value)) {
					recurse(value, newKey);  // it's a nested object, so do it again
				} else {
					res[newKey] = value;  // it's not an object, so set the property
				}
			}
		}
		recurse(obj);
		return res;
	};

	expand = (str, val) => {
		return str.split('.').reduceRight((acc, currentValue) => {
			return { [currentValue]: acc };
		}, val);
	};

	saveSetting(key:string, value:any) {
		axios.put('/api/settings', {
			setting: this.expand(key, value)
		})
			.then(() => this.settingSaved(key, value))
			.catch((err) => this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`));
	}

	settingSaved(key, value) {
		this.props.infoMessage(i18next.t('CONFIG.SETTING_SAVED', {key: key, value:value}));
		this.refresh();
	}

	openFileSystemModal(record:Record, index?:number) {
		this.setState({recordModal: record, indexModal: index, visibleModal: true})
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

	getRecord(key):Record {
		var configToSearch = this.getConfigToSearch(key);
		var record;
		this.state.config.forEach(elem => {
			if (elem.key === configToSearch) {
				record = elem;
				return elem;
			}
		});
		return record;
	}

	async getListFiles(key) {
		var record = this.getRecord(key);
		var files = [];
		for (const element of record.value) {
			try {
				var response = await axios.post('/api/fs', 
					{ path: `${this.getPathForFileSystem(record)}${element}`, onlyMedias:true});
					files = files.concat(response.data.contents.filter(elem => !elem.isDirectory).map(elem => elem.name));
			} catch (error) {
				// Folder don't exist so skip
			}
		}
		return files;
	}

	columns = [{
		title: i18next.t('CONFIG.PROPERTY'),
		dataIndex: 'key',
		key: 'key',
	}, {
		title: i18next.t('CONFIG.VALUE'),
		dataIndex: 'value',
		key: 'value',
		render: (text, record:Record) => 
			record.key === 'System.Repositories' ?
				<label><Link to={`/system/km/repositories`}>{i18next.t('CONFIG.REPOSITORIES_PAGES')}</Link></label> :
				(typeof record.value === 'boolean' ? 
					<Switch onChange={(e) => this.saveSetting(record.key, e)} defaultChecked={record.value} /> : 
						(typeof record.value === 'number' ? 
							<Input type='number'
								onPressEnter={(e) => {
									const target = e.target as HTMLInputElement;
									this.saveSetting(record.key, target.value)
								}}
								defaultValue={record.value}
							/> :
							((record.key.includes('System.Binaries') || record.key.includes('System.Path')) ? 
								(Array.isArray(record.value) ? 
									<FoldersElement keyModal={record.key} value={record.value} openDirectory={true} onChange={(value) => this.saveSetting(record.key, value)} /> :
									<FoldersElement keyModal={record.key} value={record.value} openFile={true} onChange={(value) => this.saveSetting(record.key, value)} />)
								:
								(configWithSelectFileInFolder.includes(record.key) ?
									<Select style={{ width: '100%'}} onChange={(value) => {
											this.saveSetting(record.key, value ? value : null);
										}}
										value={record.value} allowClear={true}>
										{this.state.files[record.key] && this.state.files[record.key].map((value) => {
											return <Select.Option key={Math.random()} value={value}>{value}</Select.Option>;
									})}
									</Select> :
									<Input
										onPressEnter={(e) => {
											const target = e.target as HTMLInputElement;
											this.saveSetting(record.key, target.value)
										}}
										defaultValue={record.value}
									/>
								)
							)
					)
				)
	}];

	configKeyValue = data => {
		return Object.entries(this.dotify(data)).map(([k,v]) => ({key: k, value: v, primary : Array.isArray(v) ? v[0] : undefined}));
	};

	configBackup() {
		this.props.loading(true);
		axios.post('/api/settings/backup')
			.then(res => {
				this.props.loading(false);
				this.props.infoMessage(res.data);
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	getPathForFileSystem(record:Record) {
		var regexp = this.state.os === 'win32' ? '^[a-zA-Z]:' : '^/';
		if ((Array.isArray(record.value) && record.value[0].match(regexp) === null) 
			|| (!Array.isArray(record.value) && record.value.match(regexp) === null)) {
			var path = record.key.includes('System.Binaries') ? this.state.appPath : this.state.dataPath
			return `${path}${this.state.os === 'win32' ? '\\' : '/'}`
		} else {
			return ''
		}
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Button style={{ margin: '10px'}} type='primary' 
					onClick={this.refresh.bind(this)}>{i18next.t('REFRESH')}</Button>
				<Button style={{ margin: '10px'}} type='primary' 
					onClick={this.configBackup.bind(this)}>{i18next.t('CONFIG.BACKUP_CONFIG_FILE')}</Button>
				<p>{i18next.t('CONFIG.MESSAGE')}</p>
				<Table
					columns={this.columns}
					dataSource={this.state.config}
					pagination={false}
				/>
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

export default connect(mapStateToProps, mapDispatchToProps)(Config);