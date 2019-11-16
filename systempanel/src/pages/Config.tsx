import axios from 'axios';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Input, Layout, Button, Table} from 'antd';

import {loading, infoMessage, errorMessage, warnMessage} from '../actions/navigation';
import {ReduxMappedProps} from '../react-app-env';

interface ConfigProps extends ReduxMappedProps {}

interface ConfigState {
	config: any[],
	error: string,
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
		if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}
		axios.put('/api/system/config', {
			setting: this.expand(record.key, value)
		})
			.then(() => this.settingSaved(record.key, value))
			.catch((err) => this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`));
	}

	settingSaved(key, value) {
		this.props.infoMessage(`Setting '${key}' saved as '${value}'`);
		this.refresh();
	}

	columns = [{
		title: 'Property',
		dataIndex: 'key',
		key: 'key',
	}, {
		title: 'Value',
		dataIndex: 'value',
		key: 'value',
		render: (text, record) => (<span>
			<Input
				onPressEnter={(e) => {
					const target = e.target as HTMLInputElement;
					this.saveSetting(record, target.value)
				}}
				defaultValue={record.value}
			/>
		</span>)
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
		axios.get('/api/system/config')
			.then(res => this.setState({config: this.configKeyValue(res.data), error: ''}))
			.catch(err => this.props.errorMessage('Unable to fetch configuration ' + err));
	}

	configKeyValue = data => {
		return Object.entries(this.dotify(data)).map(([k,v]) => ({key: k, value: v}));
	};

	configBackup() {
		this.props.loading(true);
		axios.post('/api/system/config/backup')
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
				<Button type='primary' onClick={this.refresh.bind(this)}>Refresh</Button>
				<Button type='primary' onClick={this.configBackup.bind(this)}>Backup config file</Button>
				<p>To modify a setting, just edit it and press enter. Not all settings are editable and will return an error if you try anywyay.</p>
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