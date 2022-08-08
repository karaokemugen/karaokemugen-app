import { Button, Layout, Table } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../store/context';
import { getTagInLocale, getTagInLocaleList, getTitleInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import Title from '../../components/Title';

interface RankingState {
	karas: DBKara[];
	i18n: any[];
}

class Ranking extends Component<unknown, RankingState> {
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
			const res = await commandBackend('getKaras', { order: 'requestedLocal', ignoreCollections: true });
			this.setState({ karas: res.content, i18n: res.i18n });
		} catch (e) {
			// already display
		}
	};

	render() {
		return (
			<>
				<Title
					title={i18next.t('HEADERS.MOST_REQUESTED.TITLE')}
					description={
						this.context.globalState.settings.data.config?.Online?.FetchPopularSongs
							? i18next.t('HEADERS.MOST_REQUESTED.DESCRIPTION_ONLINE')
							: i18next.t('HEADERS.MOST_REQUESTED.DESCRIPTION')
					}
				/>
				<Layout.Content>
					<Button style={{ margin: '1em' }} type="primary" onClick={this.refresh}>
						{i18next.t('REFRESH')}
					</Button>
					<Table dataSource={this.state.karas} columns={this.columns} rowKey="requested" />
				</Layout.Content>
			</>
		);
	}

	columns = [
		{
			title: i18next.t('TAG_TYPES.LANGS_other'),
			dataIndex: 'langs',
			key: 'langs',
			render: langs =>
				getTagInLocaleList(this.context.globalState.settings.data, langs, this.state.i18n).join(', '),
		},
		{
			title: `${i18next.t('TAG_TYPES.SERIES_other')} / ${i18next.t('KARA.SINGERS_BY')}`,
			dataIndex: 'series',
			key: 'series',
			render: (series, record) =>
				series && series.length > 0
					? series
							.map(serie =>
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
				getTagInLocaleList(this.context.globalState.settings.data, songtypes, this.state.i18n)
					.sort()
					.join(', ') +
				' ' +
				(record.songorder || ''),
		},
		{
			title: i18next.t('KARA.TITLE'),
			dataIndex: 'titles',
			key: 'titles',
			render: (titles, record) =>
				getTitleInLocale(this.context.globalState.settings.data, titles, record.titles_default_language),
		},
		{
			title: i18next.t('TAG_TYPES.VERSIONS_other'),
			dataIndex: 'versions',
			key: 'versions',
			render: versions =>
				getTagInLocaleList(this.context.globalState.settings.data, versions, this.state.i18n).join(', '),
		},
		{
			title: i18next.t('KARA.REQUESTED'),
			dataIndex: 'requested',
			key: 'requested',
			render: requested => requested,
		},
	];
}

export default Ranking;
