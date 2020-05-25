import React, {Component} from 'react';
import {Button, Layout, Table} from 'antd';
import {ColumnProps} from 'antd/lib/table';
import {getNameTagInLocaleList} from "../../utils/kara";
import i18next from 'i18next';
import Axios from 'axios';
import { DBKara } from '../../../../src/lib/types/database/kara';

interface KaraListState {
	karas: DBKara[]
}

class KaraList extends Component<{}, KaraListState> {

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
		let res = await Axios.get('/karas/history');
		this.setState({karas: res.data});
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Table
					dataSource={this.state.karas}
					columns={this.columns}
					rowKey='played_at'
				/>
				<Button type='primary' onClick={this.refresh}>{i18next.t('REFRESH')}</Button>
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

export default KaraList;
