import { Button, Cascader, Col, Layout, Radio, Row, Select, Table } from 'antd';
import i18next from 'i18next';
import { ReactNode, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { DBKara } from '../../../../../src/lib/types/database/kara';
import type { TagTypeNum } from '../../../../../src/lib/types/tag';
import GlobalContext from '../../../store/context';
import {
	buildKaraTitle,
	getSerieOrSingerGroupsOrSingers,
	getTagInLocaleList,
	getTitleInLocale,
} from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import Title from '../../components/Title';
import type { DBTag } from '../../../../../src/lib/types/database/tag';
import { WS_CMD } from '../../../utils/ws';
import type { BatchActions, KaraList } from '../../../../../src/lib/types/kara';
import type { DBPL } from '../../../../../src/types/database/playlist';

function KaraBatchEdit() {
	const context = useContext(GlobalContext);

	const [karas, setKaras] = useState<DBKara[]>([]);
	const [i18n, setI18n] = useState<Record<string, Record<string, string>>>();
	const [tags, setTags] = useState([]);
	const [playlists, setPlaylists] = useState<DBPL[]>([]);
	const [plaid, setPlaid] = useState<string>();
	const [tid, setTid] = useState<string>();
	const [kid, setKid] = useState<string>();
	const [action, setAction] = useState<BatchActions>();
	const [type, setType] = useState<TagTypeNum>();
	const [karaSearch, setKaraSearch] = useState<{ label: ReactNode; value: string }[]>([]);

	useEffect(() => {
		getPlaylists();
		getTags();
		searchKaras('');
	}, []);

	const getPlaylists = async () => {
		const playlists = await commandBackend(WS_CMD.GET_PLAYLISTS);
		setPlaylists(playlists);
	};

	const getTags = async () => {
		const tags = await commandBackend(WS_CMD.GET_TAGS);
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
			const karas = await commandBackend(WS_CMD.GET_PLAYLIST_CONTENTS, { plaid });
			setPlaid(plaid);
			setKaras(karas.content);
			setI18n(karas.i18n);
		} catch (_) {
			// already display
		}
	};

	const batchEdit = async () => {
		await commandBackend(WS_CMD.EDIT_KARAS, {
			plaid: plaid,
			action: action,
			id: action === 'addParent' || action === 'removeParent' ? kid : tid,
			type: type,
		});
	};

	const mapTagTypesToSelectOption = (tagType: string) => (
		<Select.Option key={tagType} value={tagType ? tagTypes[tagType].type : null}>
			{i18next.t(tagType ? `TAG_TYPES.${tagType}_one` : 'TAG_TYPES.DEFAULT')}
		</Select.Option>
	);

	const searchKaras = value => {
		setTimeout(async () => {
			const karas: KaraList = await commandBackend(WS_CMD.GET_KARAS, {
				filter: value,
				size: 50,
				ignoreCollections: true,
			}).catch(() => {
				return { content: [], avatars: undefined, i18n: undefined, infos: { count: 0, from: 0, to: 0 } };
			});
			if (karas.content) {
				setKaraSearch(
					karas.content.map((k: DBKara) => {
						return {
							label: buildKaraTitle(context.globalState.settings.data, k, true, karas.i18n),
							value: k.kid,
						};
					})
				);
			}
		}, 1000);
	};

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
				<Row justify="space-between" style={{ flexWrap: 'nowrap', marginBottom: '0.5em', gap: '0.5em' }}>
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
						<Row>
							<Radio checked={action === 'addTag'} onChange={() => setAction('addTag')}>
								{i18next.t('KARA.BATCH_EDIT.ADD_TAG')}
							</Radio>
							<Radio checked={action === 'removeTag'} onChange={() => setAction('removeTag')}>
								{i18next.t('KARA.BATCH_EDIT.REMOVE_TAG')}
							</Radio>
						</Row>
						<Row>
							<Radio checked={action === 'addParent'} onChange={() => setAction('addParent')}>
								{i18next.t('KARA.BATCH_EDIT.ADD_PARENT')}
							</Radio>
							<Radio checked={action === 'removeParent'} onChange={() => setAction('removeParent')}>
								{i18next.t('KARA.BATCH_EDIT.REMOVE_PARENT')}
							</Radio>
						</Row>
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
								onChange={(value: TagTypeNum) => setType(value)}
							>
								{Object.keys(tagTypes).concat('').map(mapTagTypesToSelectOption)}
							</Select>
						</Col>
					) : null}
					{action === 'addTag' || action === 'removeTag' ? (
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
					) : null}
					{action === 'addParent' || action === 'removeParent' ? (
						<Col flex={4} style={{ display: 'flex', flexDirection: 'column' }}>
							<label>{i18next.t('KARA.BATCH_EDIT.SELECT_PARENT')}</label>
							<Select showSearch onSearch={searchKaras} onChange={setKid} options={karaSearch} />
						</Col>
					) : null}
					<Col flex={1}>
						<Button
							disabled={
								!plaid ||
								!action ||
								(!tid && (action === 'addTag' || action === 'removeTag')) ||
								(!kid && (action === 'addParent' || action === 'removeParent'))
							}
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
