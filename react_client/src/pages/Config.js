import axios from 'axios';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Layout, Button, Table} from 'antd';

import {errorMessage} from '../actions/navigation';

const columns = [{
	title: 'Propriété',
	dataIndex: 'key',
	key: 'key',
}, {
	title: 'Valeur',
	dataIndex: 'value',
	key: 'value',
}];

class Config extends Component {

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
				<Table
					columns={columns}
					dataSource={this.state.config}
					pagination={false}
				/>
				<Button type='primary' onClick={this.refresh.bind(this)}>Refresh</Button>
				<Button type='primary' onClick={this.configBackup.bind(this)}>Backup config file</Button>
			</Layout.Content>
		);
	}
}

const mapDispatchToProps = (dispatch) => ({
	errorMsg: (message) => dispatch(errorMessage(message))
});

export default connect(null, mapDispatchToProps)(Config);