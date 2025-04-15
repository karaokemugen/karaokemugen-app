import {
	ClearOutlined,
	DeleteOutlined,
	DownloadOutlined,
	DownOutlined,
	EditOutlined,
	FolderViewOutlined,
	FontColorsOutlined,
	PlayCircleOutlined,
	UploadOutlined,
} from '@ant-design/icons';
import { Alert, Button, Cascader, Col, Dropdown, Input, Menu, Modal, Row, Table } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { DownloadedStatus } from '../../../../src/lib/types/database/download';
import { DBKara, DBKaraTag } from '../../../../src/lib/types/database/kara';
import type { DBTag } from '../../../../src/lib/types/database/tag';
import { KaraDownloadRequest } from '../../../../src/types/download';
import GlobalContext from '../../store/context';
import {
	buildKaraTitle,
	getSerieOrSingerGroupsOrSingers,
	getTagInLocale,
	getTagInLocaleList,
	getTitleInLocale,
	sortTagByPriority,
} from '../../utils/kara';
import { commandBackend, getSocket } from '../../utils/socket';
import { tagTypes } from '../../utils/tagTypes';
import { isModifiable, isRepoOnline, isRepoOnlineAndMaintainer } from '../../utils/tools';
import { ItemType } from 'antd/es/menu/interface';
import { WS_CMD } from '../../utils/ws';

interface KaraListProps {
	tagFilter?: string;
	tagFilterType?: 'AND' | 'OR';
}

function KaraList(props: KaraListProps) {
	const context = useContext(GlobalContext);

	const [karas, setKaras] = useState<DBKara[]>([]);
	const [karasRemoving, setKarasRemoving] = useState<string[]>([]);
	const [currentPage, setCurrentPage] = useState(parseInt(localStorage.getItem('karaPage')) || 1);
	const [currentPageSize, setCurrentPageSize] = useState(parseInt(localStorage.getItem('karaPageSize')) || 100);
	const [i18nTag, setI18nTag] = useState([]);
	const [totalCount, setTotalCount] = useState(0);
	const [filter, setFilter] = useState(props.tagFilter ? '' : localStorage.getItem('karaFilter') || '');
	const [tags, setTags] = useState<DBTag[]>([]);
	const [tagOptions, setTagOptions] = useState([]);
	const [tagFilter, setTagFilter] = useState(props.tagFilter || '');
	const tagFilterType: 'AND' | 'OR' = props.tagFilterType || 'AND';

	useEffect(() => {
		refresh();
		getTags();
	}, []);

	useEffect(() => {
		filterTagCascaderOption();
	}, [tags]);

	useEffect(() => {
		getSocket().on('KIDUpdated', KIDUpdated);
		return () => {
			getSocket().off('KIDUpdated', KIDUpdated);
		};
	}, [karas]);

	useEffect(() => {
		refresh();
	}, [tagFilter, currentPage]);

	const KIDUpdated = async (
		event: {
			kid: string;
			download_status: DownloadedStatus;
		}[]
	) => {
		if (
			event.length > 0 &&
			event[0].download_status &&
			karas.filter((kara: DBKara) => kara.kid === event[0].kid).length > 0
		) {
			refresh();
		}
	};

	const refresh = async () => {
		const res = await commandBackend(
			WS_CMD.GET_KARAS,
			{
				filter: filter,
				q: tagFilter,
				qType: tagFilterType,
				from: (currentPage - 1) * currentPageSize,
				size: currentPageSize,
				ignoreCollections: true,
			},
			undefined,
			300000
		);
		setKaras(res.content);
		setI18nTag(res.i18n);
		setTotalCount(res.infos.count);
	};

	const getTags = async () => {
		const res = await commandBackend(WS_CMD.GET_TAGS, undefined, false, 300000);
		setTags(res.content);
	};

	const filterTagCascaderOption = () => {
		const options = Object.keys(tagTypes).map(type => {
			const typeID = tagTypes[type].type;

			const option = {
				value: typeID,
				label: i18next.t(`TAG_TYPES.${type}_other`),
				children: [],
			};
			for (const tag of tags.filter(tag => tag.types.length && tag.types.indexOf(typeID) >= 0)) {
				option.children.push({
					value: tag.tid,
					label: getTagInLocale(context?.globalState.settings.data, tag as unknown as DBKaraTag).i18n,
					search: [tag.name].concat(tag.aliases, Object.values(tag.i18n)),
				});
			}
			return option;
		});
		setTagOptions(options);
	};

	const filterTagCascaderFilter = (inputValue, path) => {
		return path.some((option: { search: string[] }) => {
			return option.search?.filter(value => value.toLowerCase().includes(inputValue.toLowerCase())).length > 0;
		});
	};

	const handleFilterTagSelection = value => {
		let t = '';
		if (value && value[1]) t = 't:' + value[1] + '~' + value[0];
		setTagFilter(t);
		setCurrentPage(0);
		localStorage.setItem('karaPage', '1');
	};

	const confirmDeleteKara = kara => {
		Modal.confirm({
			title: i18next.t('KARA.DELETE_KARA_MODAL'),
			okText: i18next.t('YES'),
			cancelText: i18next.t('NO'),
			onOk: close => {
				close();
				deleteKaras([kara.kid]);
			},
		});
	};

	const changeFilter = event => {
		setFilter(event.target.value);
		localStorage.setItem('karaFilter', event.target.value);
	};

	const searchFilter = () => {
		if (currentPage !== 1) {
			setCurrentPage(1);
			localStorage.setItem('karaPage', '1');
		} else {
			refresh();
		}
	};

	const deleteKaras = async (kids: string[]) => {
		const karasRemovingUpdated = karasRemoving;
		karasRemovingUpdated.push(...kids);
		setKarasRemoving(karasRemovingUpdated);
		await commandBackend(WS_CMD.DELETE_KARAS, { kids: kids }, true);
		setKarasRemoving(karasRemoving.filter(value => !kids.includes(value)));
		setKaras(karas.filter(value => !kids.includes(value.kid)));
	};

	const handleTableChange = pagination => {
		setCurrentPage(pagination.current);
		setCurrentPageSize(pagination.pageSize);
		localStorage.setItem('karaPage', pagination.current);
		localStorage.setItem('karaPageSize', pagination.pageSize);
	};

	const confirmDeleteAllVisibleKara = () => {
		const karaDeletable = karas.filter(kara => isModifiable(context, kara.repository));
		Modal.confirm({
			title: i18next.t('KARA.DELETE_KARA_TITLE', { count: karaDeletable.length }),
			okText: i18next.t('YES'),
			cancelText: i18next.t('NO'),
			onOk: close => {
				close();
				if (karaDeletable.length > 0) deleteKaras(karaDeletable.map(value => value.kid));
			},
		});
	};

	const downloadMedia = kara => {
		const downloadObject: KaraDownloadRequest = {
			mediafile: kara.mediafile,
			kid: kara.kid,
			size: kara.mediasize,
			name: buildKaraTitle(context.globalState.settings.data, kara, true) as string,
			repository: kara.repository,
		};
		commandBackend(WS_CMD.ADD_DOWNLOADS, { downloads: [downloadObject] }).catch(() => {});
	};

	const getMenu = (record: DBKara) => {
		const menu: ItemType[] = [];
		const deleteButton = {
			key: '1',
			label: i18next.t('KARA.DELETE_KARA'),
			icon: <DeleteOutlined />,
			danger: true,
			onClick: () => confirmDeleteKara(record),
		};

		const deleteMediaButton = {
			key: '2',
			label: i18next.t('KARA.DELETE_MEDIA_TOOLTIP'),
			icon: <ClearOutlined />,
			danger: true,
			onClick: () => commandBackend(WS_CMD.DELETE_MEDIAS, { kids: [record.kid] }, true),
		};
		const uploadMediaButton = {
			key: '3',
			label: i18next.t('KARA.UPLOAD_MEDIA_TOOLTIP'),
			icon: <UploadOutlined />,
			onClick: () => commandBackend(WS_CMD.UPLOAD_MEDIA, { kid: record.kid }),
		};
		const showMediaButton = {
			key: '4',
			label: i18next.t('KARA.SHOW_MEDIA_IN_FOLDER'),
			icon: <FolderViewOutlined />,
			onClick: () => commandBackend(WS_CMD.SHOW_MEDIA_IN_FOLDER, { kid: record.kid }),
		};
		const showLyricsButton = {
			key: '5',
			label: i18next.t('KARA.SHOW_LYRICS_IN_FOLDER'),
			icon: <FolderViewOutlined />,
			onClick: () => commandBackend(WS_CMD.SHOW_LYRICS_IN_FOLDER, { kid: record.kid }),
		};
		if (record.lyrics_infos[0]) {
			menu.push(showLyricsButton);
		}
		if (record.download_status === 'DOWNLOADED') {
			menu.push(showMediaButton);
			if (isRepoOnlineAndMaintainer(context, record.repository)) {
				menu.push(uploadMediaButton);
			}
			if (isRepoOnline(context, record.repository)) {
				menu.push(deleteMediaButton);
			}
		}
		menu.push(deleteButton);
		return menu;
	};

	const columns = [
		{
			title: i18next.t('TAG_TYPES.LANGS_other'),
			dataIndex: 'langs',
			key: 'langs',
			render: langs => getTagInLocaleList(context.globalState.settings.data, langs, i18nTag).join(', '),
		},
		{
			title: i18next.t('KARA.FROM_DISPLAY_TYPE_COLUMN'),
			dataIndex: 'series',
			key: 'series',
			render: (_series, record: DBKara) =>
				getSerieOrSingerGroupsOrSingers(context?.globalState.settings.data, record, i18nTag),
		},
		{
			title: i18next.t('TAG_TYPES.SONGTYPES_other'),
			dataIndex: 'songtypes',
			key: 'songtypes',
			render: (songtypes, record) =>
				getTagInLocaleList(context.globalState.settings.data, songtypes.sort(sortTagByPriority), i18nTag).join(
					', '
				) +
				' ' +
				(record.songorder || ''),
		},
		{
			title: i18next.t('TAG_TYPES.FAMILIES_other'),
			dataIndex: 'families',
			key: 'families',
			render: families => getTagInLocaleList(context.globalState.settings.data, families, i18nTag).join(', '),
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
			render: versions =>
				getTagInLocaleList(context.globalState.settings.data, versions.sort(sortTagByPriority), i18nTag).join(
					', '
				),
		},
		{
			title: i18next.t('KARA.REPOSITORY'),
			dataIndex: 'repository',
			key: 'repository',
		},
		{
			title: i18next.t('TAG_TYPES.COLLECTIONS_other'),
			dataIndex: 'collections',
			key: 'collections',
			render: versions =>
				getTagInLocaleList(context.globalState.settings.data, versions.sort(sortTagByPriority), i18nTag).join(
					', '
				),
		},
		{
			title: (
				<span>
					{i18next.t('ACTION')}
					<Button
						title={i18next.t('KARA.DELETE_ALL_TOOLTIP')}
						type="default"
						onClick={confirmDeleteAllVisibleKara}
						style={{ marginLeft: '1em' }}
					>
						<DeleteOutlined />
					</Button>
				</span>
			),
			key: 'action',
			render: (_text, record: DBKara) => {
				if (isModifiable(context, record.repository)) {
					const editLink: JSX.Element = (
						<Link to={`/system/karas/${record.kid}`} style={{ marginRight: '0.75em' }}>
							<Button type="primary" icon={<EditOutlined />} title={i18next.t('KARA.EDIT_KARA')} />
						</Link>
					);
					let lyricsButton: JSX.Element = (
						<Button
							type="primary"
							icon={<FontColorsOutlined />}
							title={i18next.t('KARA.LYRICS_FILE')}
							onClick={() => commandBackend(WS_CMD.OPEN_LYRICS_FILE, { kid: record.kid }).catch(() => {})}
							style={{ marginRight: '0.75em' }}
						/>
					);

					let downloadVideoButton: JSX.Element = (
						<Button
							type="primary"
							onClick={() => downloadMedia(record)}
							icon={<DownloadOutlined />}
							title={i18next.t('KARA_DETAIL.DOWNLOAD_MEDIA')}
							style={{ marginRight: '0.75em' }}
						/>
					);

					let playVideoButton: JSX.Element = (
						<Button
							onClick={() => commandBackend(WS_CMD.PLAY_KARA, { kid: record.kid }).catch(() => {})}
							icon={<PlayCircleOutlined />}
							title={i18next.t('KARA.PLAY_KARAOKE')}
							style={{ marginRight: '0.75em' }}
						/>
					);

					if (record.download_status !== 'MISSING' || !isRepoOnline(context, record.repository)) {
						downloadVideoButton = null;
					}
					if (record.download_status !== 'DOWNLOADED') {
						playVideoButton = null;
					}
					if (record.lyrics_infos?.length === 0 || record.lyrics_infos[0] === null) {
						lyricsButton = null;
					}
					return (
						<div style={{ display: 'flex' }}>
							{editLink}
							{lyricsButton}
							{playVideoButton}
							{downloadVideoButton}
							<Dropdown overlay={<Menu items={getMenu(record)} />}>
								<Button icon={<DownOutlined />} loading={karasRemoving.indexOf(record.kid) >= 0} />
							</Dropdown>
						</div>
					);
				} else if (record.download_status === 'DOWNLOADED') {
					return (
						<div style={{ display: 'flex' }}>
							<Button
								type="primary"
								danger
								title={i18next.t('KARA.DELETE_MEDIA_TOOLTIP')}
								icon={<ClearOutlined />}
								onClick={() => commandBackend(WS_CMD.DELETE_MEDIAS, { kids: [record.kid] }, true)}
								style={{ marginRight: '0.75em' }}
							/>
						</div>
					);
				} else if (record.download_status === 'DOWNLOADING') {
					return (
						<div style={{ display: 'flex' }}>
							<Button
								type="primary"
								disabled
								icon={<DownloadOutlined />}
								title={i18next.t('KARA_DETAIL.DOWNLOAD_MEDIA')}
								style={{ marginRight: '0.75em' }}
							/>
						</div>
					);
				} else if (record.download_status === 'MISSING') {
					return (
						<div style={{ display: 'flex' }}>
							<Button
								type="primary"
								onClick={() => downloadMedia(record)}
								icon={<DownloadOutlined />}
								title={i18next.t('KARA_DETAIL.DOWNLOAD_MEDIA')}
								style={{ marginRight: '0.75em' }}
							/>
						</div>
					);
				} else {
					return null;
				}
			},
		},
	];

	return (
		<>
			{context.globalState.settings.data.config.System.Repositories.findIndex(
				repo => repo.Online && !repo.MaintainerMode
			) !== -1 ? (
				<Alert
					type="info"
					showIcon
					style={{ marginBottom: '10px' }}
					message={i18next.t('KARA.ONLINE_REPOSITORIES')}
				/>
			) : null}
			<Row>
				<Col flex={3} style={{ marginRight: '10px' }}>
					<Input.Search
						placeholder={i18next.t('SEARCH_FILTER')}
						value={filter}
						onChange={event => changeFilter(event)}
						enterButton={i18next.t('SEARCH')}
						onSearch={searchFilter}
					/>
				</Col>
				{props.tagFilter ? null : (
					<Col flex={1}>
						<Cascader
							style={{ width: '90%' }}
							options={tagOptions}
							showSearch={{
								filter: filterTagCascaderFilter,
								matchInputWidth: false,
							}}
							onChange={handleFilterTagSelection}
							placeholder={i18next.t('KARA.TAG_FILTER')}
						/>
					</Col>
				)}
			</Row>
			<Table
				onChange={handleTableChange}
				dataSource={karas}
				columns={columns}
				rowKey="kid"
				pagination={{
					position: ['topRight', 'bottomRight'],
					current: currentPage || 1,
					defaultPageSize: currentPageSize,
					pageSize: currentPageSize,
					pageSizeOptions: ['10', '25', '50', '100', '500'],
					showTotal: (total, range) => {
						const to = range[1];
						const from = range[0];
						return i18next.t('KARA.SHOWING', { from: from, to: to, total: total });
					},
					total: totalCount,
					showQuickJumper: true,
				}}
				scroll={{
					x: true,
				}}
				expandable={{
					showExpandColumn: false,
				}}
			/>
		</>
	);
}

export default KaraList;
