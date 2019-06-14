import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Button, Layout, Table} from 'antd';

import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import {ReduxMappedProps} from '../../react-app-env';
import {ColumnProps} from 'antd/lib/table';

interface ViewcountsProps extends ReduxMappedProps {
}

interface ViewcountsState {
	karas: any[],
	kara: any,
}

class Viewcounts extends Component<ViewcountsProps, ViewcountsState> {

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
		axios.get('/api/system/karas/viewcounts')
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
					rowKey='viewcount'
				/>
				<Button type='primary' onClick={this.refresh.bind(this)}>Refresh</Button>
			</Layout.Content>
		);
	}

	columns: ColumnProps<any>[] = [{
		title: 'Language',
		dataIndex: 'languages',
		key: 'languages',
		render: languages => (languages[0].name.toUpperCase())
	}, {
		title: 'Series/Singer',
		dataIndex: 'serie',
		key: 'serie',
		render: (serie, record) => (serie || record.singers[0].name)
	}, {
		title: 'Type',
		dataIndex: 'songtype',
		key: 'songtype',
		render: (songtype, record) => (songtype[0].name.replace('TYPE_','') + ' ' + (record.songorder || ''))
	}, {
		title: 'Title',
		dataIndex: 'title',
		key: 'title'
	}, {
		title: 'View count',
		dataIndex: 'viewcount',
		key: 'viewcount',
		defaultSortOrder: 'descend',
		render: viewcount => viewcount,
		sorter: (a,b) => a.viewcount - b.viewcount
	}];
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

export default connect(mapStateToProps, mapDispatchToProps)(Viewcounts);
