import {Button, Layout, Table} from 'antd';
import i18next from 'i18next';
import React, {Component} from 'react';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../store/context';
import {getSerieLanguage,getTagInLocaleList} from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';

interface RankingState {
	karas: DBKara[]
}

class Ranking extends Component<unknown, RankingState> {
	static contextType = GlobalContext;
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
		const res = await commandBackend('getKarasRequested');
		this.setState({karas: res});
	}

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.MOST_REQUESTED.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.MOST_REQUESTED.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Button style={{margin: '1em'}} type='primary' onClick={this.refresh}>{i18next.t('REFRESH')}</Button>
					<Table
						dataSource={this.state.karas}
						columns={this.columns}
						rowKey='requested'
					/>
				</Layout.Content>
			</>
		);
	}

	columns = [{
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
		title: i18next.t('KARA.REQUESTED'),
		dataIndex: 'requested',
		key: 'requested',
		render: requested => requested,
	}];
}

export default Ranking;
