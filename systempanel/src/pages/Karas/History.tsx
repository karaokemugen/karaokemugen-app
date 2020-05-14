import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Button, Layout, Table} from 'antd';

import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import {ReduxMappedProps} from '../../react-app-env';
import {ColumnProps} from 'antd/lib/table';
import {getNameTagInLocaleList} from "../../utils/kara";
import i18next from 'i18next';

interface KaraListProps extends ReduxMappedProps {}

interface KaraListState {
	karas: any[],
	kara: any
}

class KaraList extends Component<KaraListProps, KaraListState> {

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
		axios.get('/api/karas/history')
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
					rowKey='played_at'
				/>
				<Button type='primary' onClick={this.refresh.bind(this)}>{i18next.t('REFRESH')}</Button>
			</Layout.Content>
		);
	}

	columns: ColumnProps<any>[] = [{
		title: i18next.t('KARA.LANGUAGES'),
		dataIndex: 'langs',
		key: 'langs',
		render: langs => getNameTagInLocaleList(langs).join(', ')
	}, {
		title: `${i18next.t('KARA.SERIES')} / ${i18next.t('KARA.SINGERS')}`,
		dataIndex: 'series',
		key: 'series',
		render: (series, record) => getNameTagInLocaleList(series).join(', ') || getNameTagInLocaleList(record.singers).join(', ')
	}, {
		title: i18next.t('KARA.TYPE'),
		dataIndex: 'songtypes',
		key: 'songtypes',
		render: (songtypes, record) => getNameTagInLocaleList(songtypes)[0] + ' ' + (record.songorder || '')
	}, {
		title: i18next.t('KARA.TITLE'),
		dataIndex: 'title',
		key: 'title'
	}, {
		title: i18next.t('KARA.PLAYED'),
		dataIndex: 'played',
		key: 'played',
		render: played => played,
	}, {
		title: i18next.t('KARA.PLAYED_AT'),
		dataIndex: 'played_at',
		key: 'played_at',
		render: played_at => (new Date(played_at)).toLocaleString('en'),
		defaultSortOrder: 'descend',
		sorter: (a,b) => a.played_at - b.played_at
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

export default connect(mapStateToProps, mapDispatchToProps)(KaraList);
