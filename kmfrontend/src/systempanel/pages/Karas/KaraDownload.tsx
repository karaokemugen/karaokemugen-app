import {
	CheckCircleTwoTone,
	ClockCircleTwoTone,
	DownloadOutlined,
	InfoCircleTwoTone,
	SortAscendingOutlined,
	SortDescendingOutlined,
	SyncOutlined,
	WarningTwoTone,
} from '@ant-design/icons';
import { Button, Cascader, Col, Input, Layout, Modal, Radio, Row, Select, Space, Table } from 'antd';
import i18next from 'i18next';
import prettyBytes from 'pretty-bytes';
import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { DBKara, DBKaraTag } from '../../../../../src/lib/types/database/kara';
import { DBTag } from '../../../../../src/lib/types/database/tag';
import { DBStats } from '../../../../../src/types/database/database';
import { DBDownload } from '../../../../../src/types/database/download';
import { KaraDownloadRequest } from '../../../../../src/types/download';
import GlobalContext from '../../../store/context';
import {
	buildKaraTitle,
	getSerieOrSingerGroupsOrSingers,
	getTagInLocale,
	getTagInLocaleList,
	getTitleInLocale,
} from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import { getProtocolForOnline } from '../../../utils/tools';
import Title from '../../components/Title';
import { DefaultOptionType } from 'antd/es/cascader';
import { Repository } from '../../../../../src/lib/types/repo';
import { WS_CMD } from '../../../utils/ws';

function KaraDownload() {
	const context = useContext(GlobalContext);

	const [karas, setKaras] = useState<DBKara[]>([]);
	const [i18n, setI18n] = useState([]);
	const [karasCount, setKarasCount] = useState(0);
	const [karasQueue, setKarasQueue] = useState<DBDownload[]>([]);
	const [currentPage, setCurrentPage] = useState(parseInt(localStorage.getItem('karaDownloadPage')) || 1);
	const [currentPageSize, setCurrentPageSize] = useState(
		parseInt(localStorage.getItem('karaDownloadPageSize')) || 100
	);
	const [filter, setFilter] = useState(localStorage.getItem('karaDownloadFilter') || '');
	const [tagFilter, setTagFilter] = useState('');
	const [tags, setTags] = useState<DBTag[]>([]);
	const [downloadStatus, setDownloadStatus] = useState<'MISSING' | 'DOWNLOADING' | ''>('MISSING');
	const [order, setOrder] = useState<'mediasize' | 'requested' | 'recent' | ''>('');
	const [direction, setDirection] = useState<'desc' | 'asc'>('asc');
	const [totalMediaSize, setTotalMediaSize] = useState('');
	const [tagOptions, setTagOptions] = useState<DefaultOptionType[]>([]);
	const [preview, setPreview] = useState('');
	const [syncModal, setSyncModal] = useState(false);
	const [repositories, setRepositories] = useState<{ label: string; value: string }[]>([]);
	const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);

	useEffect(() => {
		getRepositories();
		getKaras();
		getTotalMediaSize();
		readKaraQueue();
		getTags();
		getSocket().on('downloadQueueStatus', readKaraQueue);
		return () => {
			getSocket().off('downloadQueueStatus', readKaraQueue);
		};
	}, []);

	useEffect(() => {
		getTotalMediaSize();
	}, [selectedRepositories]);

	useEffect(() => {
		filterTagCascaderOption();
	}, [tags]);

	useEffect(() => {
		getKaras();
	}, [direction, currentPage, currentPageSize, downloadStatus]);

	const getRepositories = async () => {
		const res: Repository[] = await commandBackend(WS_CMD.GET_REPOS);
		setRepositories(
			res
				.filter(r => r.Online)
				.map(r => {
					return { label: r.Name, value: r.Name };
				})
		);
	};

	const getTags = async () => {
		try {
			const res = await commandBackend(WS_CMD.GET_TAGS, undefined, false, 300000);
			setTags(res.content);
		} catch (_) {
			// already display
		}
	};

	const changeFilter = event => {
		setFilter(event.target.value);
		setCurrentPage(0);
		localStorage.setItem('karaDownloadFilter', event.target.value);
	};

	const downloadKara = (kara: DBKara) => {
		const downloadObject: KaraDownloadRequest = {
			mediafile: kara.mediafile,
			kid: kara.kid,
			size: kara.mediasize,
			name: buildKaraTitle(context.globalState.settings.data, kara, true) as string,
			repository: kara.repository,
		};
		postToDownloadQueue([downloadObject]);
	};

	const downloadAll = async () => {
		const karasToDownload: KaraDownloadRequest[] = [];
		if (!karas?.length) {
			return;
		}
		for (const kara of karas) {
			karasToDownload.push({
				mediafile: kara.mediafile,
				kid: kara.kid,
				size: kara.mediasize,
				name: kara.songname,
				repository: kara.repository,
			});
		}
		postToDownloadQueue(karasToDownload);
	};

	const getKaras = async () => {
		try {
			const p = Math.max(0, currentPage - 1);
			const psz = currentPageSize;
			const pfrom = p * psz;
			const res = await commandBackend(
				WS_CMD.GET_KARAS,
				{
					filter: filter,
					q: `${tagFilter}!m:${downloadStatus}`,
					from: pfrom,
					size: psz,
					order: order,
					direction: direction,
				},
				false,
				300000
			);
			setKaras(res.content);
			setKarasCount(res.infos.count || 0);
			setI18n(res.i18n);
		} catch (_) {
			// already display
		}
	};

	const getTotalMediaSize = async () => {
		try {
			const res: DBStats = await commandBackend(
				WS_CMD.GET_STATS,
				{
					repoNames: selectedRepositories?.length > 0 ? selectedRepositories : undefined,
				},
				false,
				300000
			);
			setTotalMediaSize(prettyBytes(res.total_media_size));
		} catch (_) {
			// already display
		}
	};

	const readKaraQueue = async () => {
		const res = await commandBackend(WS_CMD.GET_DOWNLOADS, undefined, false, 300000);
		setKarasQueue(res);
	};

	const handleTableChange = pagination => {
		setCurrentPage(pagination.current);
		setCurrentPageSize(pagination.pageSize);
		localStorage.setItem('karaDownloadPage', pagination.current);
		localStorage.setItem('karaDownloadPageSize', pagination.pageSize);
	};

	const handleFilterTagSelection = value => {
		let t = '';
		if (value && value[1]) t = 't:' + value[1] + '~' + value[0];

		setTagFilter(t);
		setCurrentPage(0);
		localStorage.setItem('karaDownloadPage', '0');
		localStorage.setItem('karaDownloadtagFilter', t);
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

	const getGroupsTags = () => {
		return tags
			.filter(
				(tag, index, self) =>
					tag.types.includes(tagTypes.GROUPS.type) && index === self.findIndex(t => t.tid === tag.tid)
			)
			.map(tag => {
				return {
					value: tag.tid,
					label: tag.name,
				};
			});
	};

	const filterTagCascaderFilter = function (inputValue, path) {
		return path.some((option: { search: string[] }) => {
			return option.search?.filter(value => value.toLowerCase().includes(inputValue.toLowerCase())).length > 0;
		});
	};

	// START karas download queue
	const putToDownloadQueueStart = () => {
		commandBackend(WS_CMD.START_DOWNLOAD_QUEUE).catch(() => {});
	};

	// PAUSE karas download queue
	const putToDownloadQueuePause = () => {
		commandBackend(WS_CMD.PAUSE_DOWNLOADS).catch(() => {});
	};

	// POST (add) items to download queue
	const postToDownloadQueue = (downloads: KaraDownloadRequest[]) => {
		commandBackend(WS_CMD.ADD_DOWNLOADS, {
			downloads,
		}).catch(() => {});
	};

	const isLocalKara = kara => {
		const karaLocal = karas.find(item => item.kid === kara.kid);
		return karaLocal.download_status === 'DOWNLOADED';
	};

	const isQueuedKara = (kara: DBKara) => {
		return karasQueue.find(item => item.mediafile === kara.mediafile);
	};

	const showPreview = kara => {
		setPreview(
			`${getProtocolForOnline(context, kara.repository)}://${kara.repository}/downloads/medias/${encodeURIComponent(kara.mediafile)}`
		);
		document.addEventListener('keyup', closeVideo);
	};

	const closeVideo = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			setPreview(undefined);
			document.removeEventListener('keyup', closeVideo);
		}
	};

	const syncMedias = () => {
		commandBackend(WS_CMD.UPDATE_ALL_MEDIAS, {
			repoNames: selectedRepositories?.length > 0 ? selectedRepositories : undefined,
		}).catch(() => {});
		setSyncModal(false);
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
			render: (_series, record) =>
				getSerieOrSingerGroupsOrSingers(context?.globalState.settings.data, record, i18n),
		},
		{
			title: i18next.t('TAG_TYPES.SONGTYPES_other'),
			dataIndex: 'songtypes',
			key: 'songtypes',
			render: (songtypes, record) => {
				const songorder = record.songorder || '';
				return (
					getTagInLocaleList(context.globalState.settings.data, songtypes, i18n).sort().join(', ') +
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
		{
			title: i18next.t('KARA.VIDEO_PREVIEW'),
			key: 'preview',
			render: (_text, record) => {
				return (
					<Button type="default" onClick={() => showPreview(record)}>
						<InfoCircleTwoTone />
					</Button>
				);
			},
		},
		{
			title: (
				<span>
					<Button title={i18next.t('KARA.DOWNLOAD_ALL_TOOLTIP')} type="default" onClick={downloadAll}>
						<DownloadOutlined />
					</Button>
					{i18next.t('KARA.DOWNLOAD')}
				</span>
			),
			key: 'download',
			render: (_text, record) => {
				let button = null;
				if (isLocalKara(record)) {
					button = (
						<Button disabled type="default">
							<CheckCircleTwoTone twoToneColor="#52c41a" />
						</Button>
					);
				} else {
					const queue = isQueuedKara(record);
					if (queue) {
						if (queue.status === 'DL_RUNNING') {
							button = (
								<span>
									<Button disabled type="default">
										<SyncOutlined spin />
									</Button>
								</span>
							);
						} else if (queue.status === 'DL_PLANNED') {
							button = (
								<Button disabled type="default">
									<ClockCircleTwoTone twoToneColor="#dc4e41" />
								</Button>
							);
						} else if (queue.status === 'DL_DONE') {
							button = (
								<Button disabled type="default">
									<CheckCircleTwoTone twoToneColor="#52c41a" />
								</Button>
							);
						} else if (queue.status === 'DL_FAILED') {
							button = (
								<span>
									<Button type="default" onClick={() => downloadKara(record)}>
										<WarningTwoTone twoToneColor="#f24848" />
									</Button>
								</span>
							);
						}
					} else {
						button = (
							<Button type="default" onClick={() => downloadKara(record)}>
								<DownloadOutlined />
							</Button>
						);
					}
				}
				return (
					<span style={{ whiteSpace: 'nowrap' }}>
						{button} {prettyBytes(Number(record.mediasize))}
					</span>
				);
			},
		},
	];

	return (
		<>
			<Title
				title={i18next.t('HEADERS.DOWNLOAD.TITLE')}
				description={i18next.t('HEADERS.DOWNLOAD.DESCRIPTION')}
			/>
			<Layout.Content>
				<Modal
					title={i18next.t('KARA.SYNC_WARNING_TITLE')}
					open={syncModal}
					onOk={() => syncMedias()}
					onCancel={() => setSyncModal(false)}
					okText={i18next.t('YES')}
					cancelText={i18next.t('NO')}
				>
					<p>{i18next.t('KARA.SYNC_WARNING_DESCRIPTION')}</p>
					<p>{i18next.t('CONFIRM_SURE')}</p>
				</Modal>
				<Row justify="space-between">
					<Col flex={3} style={{ marginRight: '10px' }}>
						<Row>
							<Input.Search
								placeholder={i18next.t('SEARCH_FILTER')}
								value={filter}
								onChange={event => changeFilter(event)}
								enterButton={i18next.t('SEARCH')}
								onSearch={getKaras}
							/>
						</Row>
						<Row>
							<label style={{ margin: '0.5em' }}>{i18next.t('KARA.FILTER_MEDIA_STATUS')}</label>
							<Radio
								style={{ margin: '0.5em' }}
								checked={downloadStatus === ''}
								onChange={() => {
									setDownloadStatus('');
									setCurrentPage(0);
								}}
							>
								{i18next.t('KARA.FILTER_ALL')}
							</Radio>
							<Radio
								style={{ margin: '0.5em' }}
								checked={downloadStatus === 'DOWNLOADING'}
								onChange={() => {
									setDownloadStatus('DOWNLOADING');
									setCurrentPage(0);
								}}
							>
								{i18next.t('KARA.FILTER_IN_PROGRESS')}
							</Radio>
							<Radio
								style={{ margin: '0.5em' }}
								checked={downloadStatus === 'MISSING'}
								onChange={() => {
									setDownloadStatus('MISSING');
									setCurrentPage(0);
								}}
							>
								{i18next.t('KARA.FILTER_NOT_DOWNLOADED')}
							</Radio>
						</Row>
						<Row>
							<label style={{ margin: '0.5em' }}>{i18next.t('KARA.ORDER_MEDIA')}</label>
							<Space.Compact>
								<Select
									defaultValue={''}
									popupMatchSelectWidth={false}
									onChange={(value: 'mediasize' | 'requested' | 'recent' | '') => {
										setOrder(value);
										setCurrentPage(0);
									}}
									options={[
										{ value: '', label: i18next.t('KARA.ORDER_MEDIA_STANDARD') },
										{ value: 'recent', label: i18next.t('KARA.ORDER_MEDIA_NEW') },
										{ value: 'requested', label: i18next.t('KARA.ORDER_MEDIA_POPULAR') },
										{ value: 'mediasize', label: i18next.t('KARA.ORDER_MEDIA_MEDIASIZE') },
									]}
								/>
								<Button
									onClick={() => setDirection(direction === 'asc' ? 'desc' : 'asc')}
									title={i18next.t('KARA.CHANGE_ORDER_DIRECTION')}
								>
									{direction === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
								</Button>
							</Space.Compact>
						</Row>
						<Row style={{ marginTop: '2em', marginLeft: '0.5em' }}>
							<Col>
								<label>
									{i18next.t('KARA.TOTAL_MEDIA_SIZE')} {totalMediaSize}
								</label>
								<Select
									options={repositories}
									mode="multiple"
									style={{ width: '90%', marginTop: '0.5em', marginBottom: '0.5em' }}
									placeholder={i18next.t('KARA.SYNCHRONIZE_REPOSITORIES')}
									onChange={setSelectedRepositories}
								/>
							</Col>
							<Col style={{ display: 'flex', alignItems: 'center' }}>
								<Button
									style={{ width: '200px', marginBottom: '0.5em' }}
									type="primary"
									key="synchronize"
									title={i18next.t('KARA.SYNCHRONIZE_DESC')}
									onClick={() => setSyncModal(true)}
								>
									{i18next.t('KARA.SYNCHRONIZE')}
								</Button>
							</Col>
						</Row>
					</Col>
					<Col flex={2}>
						<Row>
							<Cascader
								style={{ width: '90%' }}
								options={tagOptions}
								showSearch={{ filter: filterTagCascaderFilter, matchInputWidth: false }}
								onChange={handleFilterTagSelection}
								placeholder={i18next.t('KARA.TAG_FILTER')}
							/>
						</Row>
						<Row style={{ marginTop: '1.5em' }}>
							<Select
								allowClear
								style={{ width: '90%' }}
								onChange={value => handleFilterTagSelection([tagTypes.GROUPS.type, value])}
								placeholder={i18next.t('KARA.TAG_GROUP_FILTER')}
								key={'tid'}
								options={getGroupsTags()}
							/>
						</Row>
					</Col>
					<Col flex={2}>
						<Row>
							<label>{i18next.t('KARA.QUEUE_LABEL')}</label>
						</Row>
						<Row>
							<label>
								{i18next.t('KARA.QUEUE_LABEL_SONGS', {
									numberSongs: karasQueue.filter(
										kara => kara.status !== 'DL_DONE' && kara.status !== 'DL_FAILED'
									).length,
								})}
							</label>
						</Row>
						<Row>
							<Col style={{ margin: '0.5em' }}>
								<Link to="/system/karas/download/queue">
									<Button style={{ width: '100px' }} type="primary" key="queueView">
										{i18next.t('KARA.VIEW_DOWNLOAD_QUEUE')}
									</Button>
								</Link>
							</Col>
							<Col style={{ margin: '0.5em' }}>
								<Button
									style={{ width: '100px' }}
									type="primary"
									key="queueDelete"
									onClick={() => commandBackend(WS_CMD.DELETE_DOWNLOADS).catch(() => {})}
								>
									{i18next.t('KARA.WIPE_DOWNLOAD_QUEUE')}
								</Button>
							</Col>
						</Row>
						<Row>
							<Col style={{ margin: '0.5em' }}>
								<Button
									style={{ width: '100px' }}
									type="primary"
									key="queueStart"
									onClick={putToDownloadQueueStart}
								>
									{i18next.t('KARA.START_DOWNLOAD_QUEUE')}
								</Button>
							</Col>
							<Col style={{ margin: '0.5em' }}>
								<Button
									style={{ width: '100px' }}
									type="primary"
									key="queuePause"
									onClick={putToDownloadQueuePause}
								>
									{i18next.t('KARA.PAUSE_DOWNLOAD_QUEUE')}
								</Button>
							</Col>
						</Row>
					</Col>
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
						total: karasCount,
						showQuickJumper: true,
					}}
					scroll={{
						x: true,
					}}
					expandable={{
						showExpandColumn: false,
					}}
				/>
			</Layout.Content>
			{preview ? (
				<div
					className="overlay"
					onClick={() => {
						setPreview(undefined);
						document.removeEventListener('keyup', closeVideo);
					}}
				>
					<video id="video" autoPlay src={preview} />
				</div>
			) : null}
		</>
	);
}

export default KaraDownload;
