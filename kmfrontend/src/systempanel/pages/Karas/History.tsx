import { Button, Layout, Table } from 'antd';
import i18next from 'i18next';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../store/context';
import { getSerieOrSingerGroupsOrSingers, getTagInLocaleList, getTitleInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import Title from '../../components/Title';
import dayjs from 'dayjs';
import { SortOrder } from 'antd/es/table/interface';
import { useContext, useEffect, useState } from 'react';
import { WS_CMD } from '../../../utils/ws';

function KaraHistory() {
	const context = useContext(GlobalContext);

	const [karas, setKaras] = useState<DBKara[]>([]);
	const [i18n, setI18n] = useState([]);

	useEffect(() => {
		refresh();
	}, []);

	const refresh = async () => {
		try {
			const res = await commandBackend(WS_CMD.GET_KARAS, { order: 'history', ignoreCollections: true });
			setKaras(res.content);
			setI18n(res.i18n);
		} catch (_) {
			// already display
		}
	};

	const columns = [
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
			render: (_series, record: DBKara) =>
				getSerieOrSingerGroupsOrSingers(context.globalState.settings.data, record, i18n),
		},
		{
			title: i18next.t('TAG_TYPES.SONGTYPES_other'),
			dataIndex: 'songtypes',
			key: 'songtypes',
			render: (songtypes, record) =>
				getTagInLocaleList(context.globalState.settings.data, songtypes, i18n).join(', ') +
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
			render: played => played,
		},
		{
			title: i18next.t('KARA.PLAYED_AT'),
			dataIndex: 'lastplayed_at',
			key: 'lastplayed_at',
			render: played_at => dayjs(played_at).format('L LTS'),
			defaultSortOrder: 'descend' as SortOrder,
			sorter: (a, b) => a.lastplayed_at - b.lastplayed_at,
		},
	];

	return (
		<>
			<Title title={i18next.t('HEADERS.HISTORY.TITLE')} description={i18next.t('HEADERS.HISTORY.DESCRIPTION')} />
			<Layout.Content>
				<Button style={{ margin: '1em' }} type="primary" onClick={refresh}>
					{i18next.t('REFRESH')}
				</Button>
				<Table
					dataSource={karas}
					columns={columns}
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

export default KaraHistory;
