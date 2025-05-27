import { Button, Layout, Table } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../store/context';
import { getSerieOrSingerGroupsOrSingers, getTagInLocaleList, getTitleInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import Title from '../../components/Title';
import { SortOrder } from 'antd/es/table/interface';
import { WS_CMD } from '../../../utils/ws';

function Viewcounts() {
	const context = useContext(GlobalContext);

	const [karas, setKaras] = useState<DBKara[]>([]);
	const [i18n, setI18n] = useState([]);

	useEffect(() => {
		refresh();
	}, []);

	const refresh = async () => {
		try {
			const res = await commandBackend(WS_CMD.GET_KARAS, { order: 'played', ignoreCollections: true });
			setKaras(res.content);
			setI18n(res.i18n);
		} catch (_) {
			// already display
		}
	};

	const columns = [
		{
			key: 'kid',
			render: null,
		},
		{
			title: i18next.t('TAG_TYPES.LANGS_other'),
			dataIndex: 'langs',
			key: 'langs',
			render: langs => getTagInLocaleList(context.globalState.settings.data, langs, i18n).join(', '),
		},
		{
			title: i18next.t('KARA.FROM_DISPLAY_TYPE_COLUMN'),
			dataIndex: 'series',
			key: 'series',
			render: (_series, record) =>
				getSerieOrSingerGroupsOrSingers(context?.globalState.settings.data, record, i18n),
		},
		{
			title: i18next.t('TAG_TYPES.SONGTYPES_other'),
			dataIndex: 'songtypes',
			key: 'songtypes',
			render: (songtypes, record) =>
				getTagInLocaleList(context.globalState.settings.data, songtypes, i18n).sort().join(', ') +
				' ' +
				(record.songorder || ''),
		},
		{
			title: i18next.t('KARA.TITLE'),
			dataIndex: 'titles',
			key: 'titles',
			render: (titles, record) =>
				getTitleInLocale(context.globalState.settings.data, titles, record.titles_default_language),
		},
		{
			title: i18next.t('TAG_TYPES.VERSIONS_other'),
			dataIndex: 'versions',
			key: 'versions',
			render: versions => getTagInLocaleList(context.globalState.settings.data, versions, i18n).join(', '),
		},
		{
			title: i18next.t('KARA.PLAYED'),
			dataIndex: 'played',
			key: 'played',
			defaultSortOrder: 'descend' as SortOrder,
			render: viewcount => viewcount,
			sorter: (a, b) => a.viewcount - b.viewcount,
		},
	];

	return (
		<>
			<Title
				title={i18next.t('HEADERS.MOST_PLAYED.TITLE')}
				description={i18next.t('HEADERS.MOST_PLAYED.DESCRIPTION')}
			/>
			<Layout.Content>
				<Button style={{ margin: '1em' }} type="primary" onClick={refresh}>
					{i18next.t('REFRESH')}
				</Button>
				<Table
					dataSource={karas}
					columns={columns}
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

export default Viewcounts;
