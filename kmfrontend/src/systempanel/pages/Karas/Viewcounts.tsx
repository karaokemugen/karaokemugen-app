import { Button, Layout, Table, TableColumnProps } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../store/context';
import { getSerieOrSingerGroupsOrSingers, getTagInLocaleList, getTitleInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import Title from '../../components/Title';

interface ViewcountsState {
	karas: DBKara[];
	i18n: any[];
}

class Viewcounts extends Component<unknown, ViewcountsState> {
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
			const res = await commandBackend('getKaras', { order: 'played', ignoreCollections: true });
			this.setState({ karas: res.content, i18n: res.i18n });
		} catch (_) {
			// already display
		}
	};

	render() {
		return (
			<>
				<Title
					title={i18next.t('HEADERS.MOST_PLAYED.TITLE')}
					description={i18next.t('HEADERS.MOST_PLAYED.DESCRIPTION')}
				/>
				<Layout.Content>
					<Button style={{ margin: '1em' }} type="primary" onClick={this.refresh}>
						{i18next.t('REFRESH')}
					</Button>
					<Table
						dataSource={this.state.karas}
						columns={this.columns}
						rowKey="kid"
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
			key: 'kid',
			render: null,
		},
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
			render: (_series, record) =>
				getSerieOrSingerGroupsOrSingers(this.context?.globalState.settings.data, record, this.state.i18n),
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
			title: i18next.t('KARA.PLAYED'),
			dataIndex: 'played',
			key: 'played',
			defaultSortOrder: 'descend',
			render: viewcount => viewcount,
			sorter: (a, b) => a.viewcount - b.viewcount,
		},
	];
}

export default Viewcounts;
