import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Button, Layout, Table} from 'antd';

import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import {ReduxMappedProps} from '../../react-app-env';
import {ColumnProps} from 'antd/lib/table';
import {getNameTagInLocaleList} from "../../utils/kara";
import i18next from 'i18next';

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
					rowKey='kid'
				/>
				<Button type='primary' onClick={this.refresh.bind(this)}>{i18next.t('REFRESH')}</Button>
			</Layout.Content>
		);
	}

	columns: ColumnProps<any>[] = [{
		key: 'kid',
		render: null
	}, {
		title: i18next.t('KARA.LANGUAGES'),
		dataIndex: 'langs',
		key: 'langs',
		render: langs => getNameTagInLocaleList(langs).join(', ')
	}, {
		title: `${i18next.t('KARA.SERIES')} / ${i18next.t('KARA.SINGERS')}`,
		dataIndex: 'serie',
		key: 'serie',
		render: (serie, record) => serie || getNameTagInLocaleList(record.singers).join(', ')
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
