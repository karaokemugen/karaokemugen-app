import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Button, Layout, Table} from 'antd';

import {loading, errorMessage, warnMessage} from '../../actions/navigation';

class KaraList extends Component {

	constructor(props) {
		super(props);
		this.state = {
			karas: [],
			kara: {}
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		this.props.loading(true);
		axios.get('/api/system/karas/ranking')
			.then(res => {
				this.props.loading(false);
				this.setState({karas: res.data});
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
					dataSource={this.state.karas}
					columns={this.columns}
					rowKey='requested'
				/>
				<Button type='primary' onClick={this.refresh.bind(this)}>Refresh</Button>
			</Layout.Content>
		);
	}

	columns = [{
		title: 'Requested',
		dataIndex: 'requested',
		key: 'requested',
		render: requested => requested,
	}, {
		title: 'Language',
		dataIndex: 'language',
		key: 'language',
		render: language => (language.toUpperCase())
	}, {
		title: 'Series/Singer',
		dataIndex: 'serie',
		key: 'serie',
		render: (serie, record) => (serie || record.singer)
	}, {
		title: 'Type',
		dataIndex: 'songtype',
		key: 'songtype',
		render: (songtype, record) => (songtype.replace('TYPE_','') + ' ' + record.songorder)
	}, {
		title: 'Title',
		dataIndex: 'title',
		key: 'title'
	}];
}

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	errorMessage: (message) => dispatch(errorMessage(message)),
	warnMessage: (message) => dispatch(warnMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(KaraList);
