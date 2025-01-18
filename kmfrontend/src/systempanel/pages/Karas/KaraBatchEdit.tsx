import { Button, Cascader, Col, Layout, Radio, Row, Select, Table } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { DBKara } from '../../../../../src/lib/types/database/kara';
import type { TagTypeNum } from '../../../../../src/lib/types/tag';
import GlobalContext from '../../../store/context';
import { getSerieOrSingerGroupsOrSingers, getTagInLocaleList, getTitleInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import Title from '../../components/Title';
import { DBTag } from '../../../../../src/lib/types/database/tag';

interface PlaylistElem {
	plaid: string;
	name: string;
	karacount?: number;
	flag_current?: boolean;
	flag_public?: boolean;
	flag_visible?: boolean;
}

function KaraBatchEdit() {
	const context = useContext(GlobalContext);

	const [karas, setKaras] = useState<DBKara[]>([]);
	const [i18n, setI18n] = useState([]);
	const [tags, setTags] = useState([]);
	const [playlists, setPlaylists] = useState<PlaylistElem[]>([]);
	const [plaid, setPlaid] = useState<string>();
	const [tid, setTid] = useState<string>();
	const [action, setAction] = useState<'add' | 'remove' | 'fromDisplayType'>();
	const [type, setType] = useState<TagTypeNum | ''>();

	useEffect(() => {
		getPlaylists();
		getTags();
	}, []);

	const getPlaylists = async () => {
		const playlists = await commandBackend('getPlaylists');
		setPlaylists(playlists);
	};

	const getTags = async () => {
		const tags = await commandBackend('getTags');
		const options = Object.keys(tagTypes).map(type => {
			const typeID = tagTypes[type].type;

			const option = {
				value: typeID,
				label: i18next.t(`TAG_TYPES.${type}_other`),
				children: [],
			};
			for (const tag of tags.content as DBTag[]) {
				if (tag.types.length && tag.types.indexOf(typeID) >= 0)
					option.children.push({
						value: tag.tid,
						label: tag.name,
						search: [tag.name].concat(tag.aliases, Object.values(tag.i18n)),
					});
			}
			return option;
		});
		setTags(options);
	};

	const filterTagCascaderFilter = function (inputValue, path) {
		return path.some((option: { search: string[] }) => {
			return option.search?.filter(value => value.toLowerCase().includes(inputValue.toLowerCase())).length > 0;
		});
	};

	const changePlaylist = async (plaid: string) => {
		try {
			const karas = await commandBackend('getPlaylistContents', { plaid });
			setPlaid(plaid);
			setKaras(karas.content);
			setI18n(karas.i18n);
		} catch (_) {
			// already display
		}
	};

	const batchEdit = async () => {
		await commandBackend('editKaras', {
			plaid: plaid,
			action: action,
			tid: tid,
			type: type,
		});
	};

	const mapTagTypesToSelectOption = (tagType: string) => (
		<Select.Option key={tagType} value={tagType ? tagTypes[tagType].type : null}>
			{i18next.t(tagType ? `TAG_TYPES.${tagType}_one` : 'TAG_TYPES.DEFAULT')}
		</Select.Option>
	);

	const columns = [
		{
			title: i18next.t('TAG_TYPES.LANGS_other'),
			dataIndex: 'langs',
			key: 'langs',
			render: langs => {
				return getTagInLocaleList(context.globalState.settings.data, langs, i18n).join(', ');
			},
		},
		{
			title: i18next.t('KARA.FROM_DISPLAY_TYPE_COLUMN'),
			dataIndex: 'series',
			key: 'series',
			render: (_series, record: DBKara) =>
				getSerieOrSingerGroupsOrSingers(context?.globalState.settings.data, record, i18n),
		},
		{
			title: i18next.t('TAG_TYPES.SONGTYPES_other'),
			dataIndex: 'songtypes',
			key: 'songtypes',
			render: (songtypes, record) => {
				const songorder = record.songorder || '';
				return (
					getTagInLocaleList(context.globalState.settings.data, songtypes, i18n).join(', ') +
						' ' +
						songorder || ''
				);
			},
		},
		{
			title: i18next.t('TAG_TYPES.FAMILIES_other'),
			dataIndex: 'families',
			key: 'families',
			render: families => {
				return getTagInLocaleList(context.globalState.settings.data, families, i18n).join(', ');
			},
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
			title: i18next.t('KARA.REPOSITORY'),
			dataIndex: 'repository',
			key: 'repository',
		},
	];

	return (
		<>
			<Title
				title={i18next.t('HEADERS.KARATAG_BATCH_EDIT.TITLE')}
				description={i18next.t('HEADERS.KARATAG_BATCH_EDIT.DESCRIPTION')}
			/>
			<Layout.Content>
				<Row justify="space-between" style={{ flexWrap: 'nowrap', marginBottom: '0.5em' }}>
					<Col flex={'15%'} style={{ marginRight: '0.5em' }}>
						<Link to="/admin">{i18next.t('KARA.BATCH_EDIT.CREATE_PLAYLIST')}</Link>
					</Col>
					<Col flex={4} style={{ display: 'flex', flexDirection: 'column' }}>
						<label>{i18next.t('KARA.BATCH_EDIT.SELECT_PLAYLIST')}</label>
						<Select
							style={{ maxWidth: '20%', minWidth: '150px', marginTop: '0.5em' }}
							onChange={changePlaylist}
							placeholder={i18next.t('KARA.BATCH_EDIT.SELECT')}
						>
							{playlists.map(playlist => {
								return (
									<Select.Option key={playlist.plaid} value={playlist.plaid}>
										{playlist.name}
									</Select.Option>
								);
							})}
						</Select>
					</Col>
					<Col flex={4} style={{ display: 'flex', flexDirection: 'column' }}>
						<label>{i18next.t('KARA.BATCH_EDIT.SELECT_ACTION')}</label>
						<Radio checked={action === 'add'} onChange={() => setAction('add')}>
							{i18next.t('KARA.BATCH_EDIT.ADD_TAG')}
						</Radio>
						<Radio checked={action === 'remove'} onChange={() => setAction('remove')}>
							{i18next.t('KARA.BATCH_EDIT.REMOVE_TAG')}
						</Radio>
						<Radio checked={action === 'fromDisplayType'} onChange={() => setAction('fromDisplayType')}>
							{i18next.t('KARA.BATCH_EDIT.EDIT_DISPLAY_TYPE')}
						</Radio>
					</Col>
					{action === 'fromDisplayType' ? (
						<Col flex={4} style={{ display: 'flex', flexDirection: 'column' }}>
							<label>{i18next.t('KARA.BATCH_EDIT.SELECT_TAG_TYPE')}</label>
							<Select
								defaultValue={null}
								style={{ maxWidth: '180px', marginTop: '0.5em' }}
								onChange={(value: TagTypeNum | '') => setType(value)}
							>
								{Object.keys(tagTypes).concat('').map(mapTagTypesToSelectOption)}
							</Select>
						</Col>
					) : (
						<Col flex={4} style={{ display: 'flex', flexDirection: 'column' }}>
							<label>{i18next.t('KARA.BATCH_EDIT.SELECT_TAG')}</label>
							<Cascader
								style={{ maxWidth: '250px', marginTop: '0.5em' }}
								options={tags}
								placeholder={i18next.t('KARA.BATCH_EDIT.SELECT')}
								showSearch={{ filter: filterTagCascaderFilter, matchInputWidth: false }}
								onChange={value => {
									if (value) {
										setTid(value[1] as string);
										setType(value[0] as TagTypeNum);
									}
								}}
							/>
						</Col>
					)}
					<Col flex={1}>
						<Button
							disabled={!plaid || !action || (!tid && action !== 'fromDisplayType')}
							onClick={batchEdit}
						>
							{i18next.t('KARA.BATCH_EDIT.EDIT')}
						</Button>
					</Col>
				</Row>
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

export default KaraBatchEdit;
