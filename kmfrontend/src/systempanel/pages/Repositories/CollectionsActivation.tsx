import { Checkbox, Table } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { Tag } from '../../../../../src/lib/types/tag';
import GlobalContext from '../../../store/context';

import { commandBackend } from '../../../utils/socket';
import { getDescriptionInLocale } from '../../../utils/kara';

function CollectionsActivation() {
	const context = useContext(GlobalContext);
	const [collections, setCollections] = useState<Tag[]>([]);

	useEffect(() => {
		refresh();
	}, []);

	const enableCollection = (tid: string) => {
		const collections = context.globalState.settings.data.config.Karaoke.Collections;
		collections[tid] = !collections[tid];
		commandBackend('updateSettings', {
			setting: {
				Karaoke: {
					Collections: collections,
				},
			},
		}).catch(() => {});
	};

	const refresh = async () => {
		const res = await commandBackend('getTags', { type: 16 });
		setCollections(res.content);
	};

	const columns = [
		{
			title: i18next.t('COLLECTIONS.ENABLED'),
			dataIndex: 'tid',
			key: 'tid',
			render: tid => (
				<Checkbox
					disabled={
						Object.values(context.globalState.settings.data.config.Karaoke.Collections).filter(c => c)
							.length === 1 && context.globalState.settings.data.config.Karaoke.Collections[tid]
					}
					checked={context.globalState.settings.data.config.Karaoke.Collections[tid]}
					onClick={() => enableCollection(tid)}
				/>
			),
		},
		{
			title: i18next.t('COLLECTIONS.NAME'),
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: i18next.t('TAGS.DESCRIPTION'),
			dataIndex: 'description',
			key: 'description',
			render: description => getDescriptionInLocale(context.globalState.settings.data, description),
		},
	];

	return (
		<Table
			dataSource={collections}
			columns={columns}
			rowKey="tid"
			scroll={{
				x: true,
			}}
			expandable={{
				showExpandColumn: false,
			}}
		/>
	);
}

export default CollectionsActivation;
