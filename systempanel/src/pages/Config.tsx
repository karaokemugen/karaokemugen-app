import axios from 'axios';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Input, Layout, Button, Table, Switch} from 'antd';

import {loading, infoMessage, errorMessage, warnMessage} from '../actions/navigation';
import {ReduxMappedProps} from '../react-app-env';
import i18next from 'i18next';

interface ConfigProps extends ReduxMappedProps {}

interface ConfigState {
	config: any[],
	error: string,
}

interface Record {
	key: string;
	value: string;
}

// Transforms object to dot notation
// Transforms dot notation to object and value

class Config extends Component<ConfigProps, ConfigState> {

	dotify = obj => {
		//Code from the package node-dotify
		let res = {};
		function recurse(obj: any, current?: any) {
			for (var key in obj) {
				let value = obj[key];
				let newKey = (current ? current + '.' + key : key);  // joined key with dot
				if (value && typeof value === 'object') {
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

	saveSetting(record, value) {
		axios.put('/api/config', {
			setting: this.expand(record.key, value)
		})
			.then(() => this.settingSaved(record.key, value))
			.catch((err) => this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`));
	}

	settingSaved(key, value) {
		this.props.infoMessage(i18next.t('CONFIG.SETTING_SAVED', {key: key, value:value}));
		this.refresh();
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
			typeof record.value === 'boolean' ? 
				<Switch onChange={(e) => this.saveSetting(record, e)} defaultChecked={record.value} /> : 
					(typeof record.value === 'number' ? 
						<Input type='number'
							onPressEnter={(e) => {
								const target = e.target as HTMLInputElement;
								this.saveSetting(record, target.value)
							}}
							defaultValue={record.value}
						/> :
						(record.key.includes('System.Binaries') || record.key.includes('System.Path') ? 
							<Input
								onPressEnter={(e) => {
									const target = e.target as HTMLInputElement;
									this.saveSetting(record, target.value)
								}}
								defaultValue={record.value}
							/> :
							<Input
								onPressEnter={(e) => {
									const target = e.target as HTMLInputElement;
									this.saveSetting(record, target.value)
								}}
								defaultValue={record.value}
							/>
						)
				)
	}];

	constructor(props) {
		super(props);
		this.state = {
			config: [],
			error: ''
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		axios.get('/api/config')
			.then(res => this.setState({config: this.configKeyValue(res.data), error: ''}))
			.catch(err => this.props.errorMessage(i18next.t('CONFIG.FETCH_ERROR')+ ' ' + err));
	}

	configKeyValue = data => {
		return Object.entries(this.dotify(data)).map(([k,v]) => ({key: k, value: v}));
	};

	configBackup() {
		this.props.loading(true);
		axios.post('/api/config/backup')
			.then(res => {
				this.props.loading(false);
				this.props.infoMessage(res.data);
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
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