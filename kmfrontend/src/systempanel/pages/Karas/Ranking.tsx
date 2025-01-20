import { Button, Layout, Table } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../store/context';
import { getSerieOrSingerGroupsOrSingers, getTagInLocaleList, getTitleInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import Title from '../../components/Title';

function Ranking() {
	const context = useContext(GlobalContext);

	const [karas, setKaras] = useState<DBKara[]>([]);
	const [i18n, setI18n] = useState([]);

	useEffect(() => {
		refresh();
	}, []);

	const refresh = async () => {
		try {
			const res = await commandBackend('getKaras', { order: 'requestedLocal', ignoreCollections: true });
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
			title: i18next.t('KARA.REQUESTED'),
			dataIndex: 'requested',
			key: 'requested',
			render: requested => requested,
		},
	];

	return (
		<>
			<Title
				title={i18next.t('HEADERS.MOST_REQUESTED.TITLE')}
				description={
					context.globalState.settings.data.config?.Online?.FetchPopularSongs
						? i18next.t('HEADERS.MOST_REQUESTED.DESCRIPTION_ONLINE')
						: i18next.t('HEADERS.MOST_REQUESTED.DESCRIPTION')
				}
			/>
			<Layout.Content>
				<Button style={{ margin: '1em' }} type="primary" onClick={refresh}>
					{i18next.t('REFRESH')}
				</Button>
				<Table
					dataSource={karas}
					columns={columns}
					rowKey="requested"
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

export default Ranking;
