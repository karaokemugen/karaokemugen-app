import { Button, Layout, Table } from 'antd';
import { ColumnProps } from 'antd/lib/table';
import i18next from 'i18next';
import { Component } from 'react';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../store/context';
import { getTagInLocale, getTagInLocaleList, getTitleInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';

interface KaraListState {
	karas: DBKara[];
	i18n: any[];
}

class KaraList extends Component<unknown, KaraListState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;

	state = {
		karas: [],
		i18n: [],
	};

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		try {
			const res = await commandBackend('getKaras', { order: 'history' });
			this.setState({ karas: res.content, i18n: res.i18n });
		} catch (e) {
			// already display
		}
	};

	render() {
		return (
			<>
				<Layout.Header>
					<div className="title">{i18next.t('HEADERS.HISTORY.TITLE')}</div>
					<div className="description">{i18next.t('HEADERS.HISTORY.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Button style={{ margin: '1em' }} type="primary" onClick={this.refresh}>
						{i18next.t('REFRESH')}
					</Button>
					<Table dataSource={this.state.karas} columns={this.columns} rowKey="lastplayed_at" />
				</Layout.Content>
			</>
		);
	}

	columns: ColumnProps<any>[] = [
		{
			title: i18next.t('TAG_TYPES.LANGS_other'),
			dataIndex: 'langs',
			key: 'langs',
			render: (langs) =>
				getTagInLocaleList(this.context.globalState.settings.data, langs, this.state.i18n).join(', '),
		},
		{
			title: `${i18next.t('TAG_TYPES.SERIES_other')} / ${i18next.t('KARA.SINGERS_BY')}`,
			dataIndex: 'series',
			key: 'series',
			render: (series, record) =>
				series && series.length > 0
					? series
							.map((serie) =>
								getTagInLocale(this.context?.globalState.settings.data, serie, this.state.i18n)
							)
							.join(', ')
					: getTagInLocaleList(this.context.globalState.settings.data, record.singers, this.state.i18n).join(
							', '
					  ),
		},
		{
			title: i18next.t('TAG_TYPES.SONGTYPES_other'),
			dataIndex: 'songtypes',
			key: 'songtypes',
			render: (songtypes, record) =>
				getTagInLocaleList(this.context.globalState.settings.data, songtypes, this.state.i18n).join(', ') +
				' ' +
				(record.songorder || ''),
		},
		{
			title: i18next.t('KARA.TITLE'),
			dataIndex: 'titles',
			key: 'titles',
			render: (titles) => getTitleInLocale(this.context.globalState.settings.data, titles),
		},
		{
			title: i18next.t('TAG_TYPES.VERSIONS_other'),
			dataIndex: 'versions',
			key: 'versions',
			render: (versions) =>
				getTagInLocaleList(this.context.globalState.settings.data, versions, this.state.i18n).join(', '),
		},
		{
			title: i18next.t('KARA.PLAYED'),
			dataIndex: 'played',
			key: 'played',
			render: (played) => played,
		},
		{
			title: i18next.t('KARA.PLAYED_AT'),
			dataIndex: 'lastplayed_at',
			key: 'lastplayed_at',
			render: (played_at) => new Date(played_at).toLocaleString(),
			defaultSortOrder: 'descend',
			sorter: (a, b) => a.lastplayed_at - b.lastplayed_at,
		},
	];
}

export default KaraList;
