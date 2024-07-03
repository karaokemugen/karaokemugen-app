import { Button, Layout, Table, TableColumnProps } from 'antd';
import Title from '../../components/Title';
import i18next from 'i18next';
import { Component } from 'react';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../store/context';
import { getSerieOrSingerGroupsOrSingers, getTagInLocaleList, getTitleInLocale } from '../../../utils/kara';
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
			const res = await commandBackend('getKaras', { order: 'history', ignoreCollections: true });
			this.setState({ karas: res.content, i18n: res.i18n });
		} catch (e) {
			// already display
		}
	};

	render() {
		return (
			<>
				<Title
					title={i18next.t('HEADERS.HISTORY.TITLE')}
					description={i18next.t('HEADERS.HISTORY.DESCRIPTION')}
				/>
				<Layout.Content>
					<Button style={{ margin: '1em' }} type="primary" onClick={this.refresh}>
						{i18next.t('REFRESH')}
					</Button>
					<Table
						dataSource={this.state.karas}
						columns={this.columns}
						rowKey="lastplayed_at"
						scroll={{
							x: true,
						}}
						expandable={{
							showExpandColumn: false,
						}}
					/>
				</Layout.Content>
			</>
		);
	}

	columns: TableColumnProps<any>[] = [
		{
			title: i18next.t('TAG_TYPES.LANGS_other'),
			dataIndex: 'langs',
			key: 'langs',
			render: langs =>
				getTagInLocaleList(this.context.globalState.settings.data, langs, this.state.i18n).join(', '),
		},
		{
			title: i18next.t('KARA.FROM_DISPLAY_TYPE_COLUMN'),
			dataIndex: 'series',
			key: 'series',
			render: (_series, record: DBKara) =>
				getSerieOrSingerGroupsOrSingers(this.context.globalState.settings.data, record, this.state.i18n),
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
			title: i18next.t('KARA.PLAYED'),
			dataIndex: 'played',
			key: 'played',
			render: played => played,
		},
		{
			title: i18next.t('KARA.PLAYED_AT'),
			dataIndex: 'lastplayed_at',
			key: 'lastplayed_at',
			render: played_at => new Date(played_at).toLocaleString(),
			defaultSortOrder: 'descend',
			sorter: (a, b) => a.lastplayed_at - b.lastplayed_at,
		},
	];
}

export default KaraList;
