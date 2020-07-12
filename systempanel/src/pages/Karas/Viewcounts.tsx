import {Button, Layout, Table} from 'antd';
import {ColumnProps} from 'antd/lib/table';
import Axios from 'axios';
import i18next from 'i18next';
import React, {Component} from 'react';

import {DBKara} from '../../../../src/lib/types/database/kara';
import GlobalContext from '../../store/context';
import {getSerieLanguage,getTagInLocaleList} from '../../utils/kara';

interface ViewcountsState {
	karas: DBKara[]
}

class Viewcounts extends Component<unknown, ViewcountsState> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>
	
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
		const res = await Axios.get('/karas/viewcounts');
		this.setState({karas: res.data});
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Button style={{margin: '1em'}} type='primary' onClick={this.refresh}>{i18next.t('REFRESH')}</Button>
				<Table
					dataSource={this.state.karas}
					columns={this.columns}
					rowKey='kid'
				/>
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
		render: langs => getTagInLocaleList(langs).join(', ')
	}, {
		title: `${i18next.t('KARA.SERIES')} / ${i18next.t('KARA.SINGERS')}`,
		dataIndex: 'series',
		key: 'series',
		render: (series, record) => (series && series.length > 0) ?
			series.map(serie => getSerieLanguage(this.context.globalState.settings.data, serie, record.langs[0].name)).join(', ') 
			: getTagInLocaleList(record.singers).join(', ')
	}, {
		title: i18next.t('KARA.SONGTYPES'),
		dataIndex: 'songtypes',
		key: 'songtypes',
		render: (songtypes, record) => getTagInLocaleList(songtypes).sort().join(', ') + ' ' + (record.songorder || '')
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
