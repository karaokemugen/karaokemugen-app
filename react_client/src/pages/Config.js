import axios from 'axios';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Input, Layout, Button, Table} from 'antd';

import {loading, infoMessage, errorMessage} from '../actions/navigation';

class Config extends Component {

	saveSetting(record, value) {
		axios.put('/api/config', {
			setting: record.key,
			value: value
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
				onPressEnter={(event) => this.saveSetting(record, event.target.value)}
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
		axios.get('/api/config')
			.then(res => this.setState({config: this.configKeyValue(res.data), error: ''}))
			.catch(err => this.props.errorMsg('Unable to fetch configuration ' + err));
	}

	configKeyValue = (data) => Object.entries(data).map(([k,v]) => ({key: k, value: v}));

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

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	infoMessage: (message) => dispatch(infoMessage(message)),
	errorMessage: (message) => dispatch(errorMessage(message))
});


export default connect(null, mapDispatchToProps)(Config);