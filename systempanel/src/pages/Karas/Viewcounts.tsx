import React, {Component} from 'react';
import {Button, Layout, Table} from 'antd';
import {ColumnProps} from 'antd/lib/table';
import {getNameTagInLocaleList} from "../../utils/kara";
import i18next from 'i18next';
import Axios from 'axios';
import {DBKara} from '../../../../src/lib/types/database/kara';

interface ViewcountsState {
	karas: DBKara[]
}

class Viewcounts extends Component<{}, ViewcountsState> {

	constructor(props) {
		super(props);
		this.state = {
			karas: []
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		let res = await Axios.get('/karas/viewcounts');
		this.setState({karas: res.data});
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Table
					dataSource={this.state.karas}
					columns={this.columns}
					rowKey='kid'
				/>
				<Button type='primary' onClick={this.refresh}>{i18next.t('REFRESH')}</Button>
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
		dataIndex: 'series',
		key: 'series',
		render: (series, record) => getNameTagInLocaleList(series).join(', ') || getNameTagInLocaleList(record.singers).join(', ')
	}, {
		title: i18next.t('KARA.SONGTYPES'),
		dataIndex: 'songtypes',
		key: 'songtypes',
		render: (songtypes, record) => getNameTagInLocaleList(songtypes).join(', ') + ' ' + (record.songorder || '')
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

export default Viewcounts;
