import { ClockCircleTwoTone, InfoCircleTwoTone, SyncOutlined, WarningTwoTone } from '@ant-design/icons';
import { Button, Cascader, Col, Input, Layout, Row, Select, Table } from 'antd';
import i18next from 'i18next';
import prettyBytes from 'pretty-bytes';
import { useContext, useEffect, useState } from 'react';

import { DBKara, DBKaraTag } from '../../../../../src/lib/types/database/kara';
import { DBTag } from '../../../../../src/lib/types/database/tag';
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
import { DefaultOptionType } from 'antd/es/select';

function QueueDownload() {
	const context = useContext(GlobalContext);

	const [karas, setKaras] = useState<DBKara[]>([]);
	const [i18n, setI18n] = useState([]);
	const [karasCount, setKarasCount] = useState(0);
	const [karasQueue, setKarasQueue] = useState<DBDownload[]>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [currentPageSize, setCurrentPageSize] = useState(100);
	const [filter, setFilter] = useState('');
	const [tagFilter, setTagFilter] = useState('');
	const [tags, setTags] = useState<DBTag[]>([]);
	const [tagOptions, setTagOptions] = useState<DefaultOptionType[]>([]);
	const [preview, setPreview] = useState('');

	useEffect(() => {
		getKaras();
		readKaraQueue();
		getTags();
		getSocket().on('downloadQueueStatus', readKaraQueue);
		return () => {
			getSocket().off('downloadQueueStatus', readKaraQueue);
		};
	}, []);

	useEffect(() => {
		filterTagCascaderOption();
	}, [tags]);

	useEffect(() => {
		getKaras();
	}, [currentPage, currentPageSize]);

	const getTags = async () => {
		try {
			const res = await commandBackend('getTags', undefined, false, 300000);
			setTags(res.content);
		} catch (_) {
			// already display
		}
	};

	const changeFilter = event => {
		setFilter(event.target.value);
		setCurrentPage(0);
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

	const getKaras = async () => {
		try {
			const p = Math.max(0, currentPage - 1);
			const psz = currentPageSize;
			const pfrom = p * psz;
			const res = await commandBackend(
				'getKaras',
				{
					filter: filter,
					q: `${tagFilter}!m:DOWNLOADING`,
					from: pfrom,
					size: psz,
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

	const readKaraQueue = async () => {
		const res = await commandBackend('getDownloads', undefined, false, 300000);
		setKarasQueue(res);
	};

	const handleTableChange = pagination => {
		setCurrentPage(pagination.current);
		setCurrentPageSize(pagination.pageSize);
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
		commandBackend('startDownloadQueue').catch(() => {});
	};

	// PAUSE karas download queue
	const putToDownloadQueuePause = () => {
		commandBackend('pauseDownloads').catch(() => {});
	};

	// POST (add) items to download queue
	const postToDownloadQueue = (downloads: KaraDownloadRequest[]) => {
		commandBackend('addDownloads', {
			downloads,
		}).catch(() => {});
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
			title: <span>{i18next.t('KARA.DOWNLOAD')}</span>,
			key: 'download',
			render: (_text, record) => {
				let button = null;
				const queue = isQueuedKara(record);
				if (queue?.status === 'DL_RUNNING') {
					button = (
						<span>
							<Button disabled type="default">
								<SyncOutlined spin />
							</Button>
						</span>
					);
				} else if (queue?.status === 'DL_PLANNED') {
					button = (
						<Button disabled type="default">
							<ClockCircleTwoTone twoToneColor="#dc4e41" />
						</Button>
					);
				} else if (queue?.status === 'DL_FAILED') {
					button = (
						<span>
							<Button type="default" onClick={() => downloadKara(record)}>
								<WarningTwoTone twoToneColor="#f24848" />
							</Button>
						</span>
					);
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
				title={i18next.t('HEADERS.DOWNLOAD_QUEUE.TITLE')}
				description={i18next.t('HEADERS.DOWNLOAD_QUEUE.DESCRIPTION')}
			/>
			<Layout.Content>
				<Row justify="space-between">
					<Col flex={3} style={{ marginRight: '10px' }}>
						<Input.Search
							placeholder={i18next.t('SEARCH_FILTER')}
							value={filter}
							onChange={event => changeFilter(event)}
							enterButton={i18next.t('SEARCH')}
							onSearch={getKaras}
						/>
					</Col>
					<Col flex={1} style={{ textAlign: 'center' }}></Col>
					<Col flex={2}>
						<Select
							allowClear
							style={{ width: '90%' }}
							onChange={value => handleFilterTagSelection([tagTypes.GROUPS, value])}
							placeholder={i18next.t('KARA.TAG_GROUP_FILTER')}
							key={'tid'}
							options={getGroupsTags()}
						/>
					</Col>
					<Col flex={2}>
						<Cascader
							style={{ width: '90%' }}
							options={tagOptions}
							showSearch={{ filter: filterTagCascaderFilter, matchInputWidth: false }}
							onChange={handleFilterTagSelection}
							placeholder={i18next.t('KARA.TAG_FILTER')}
						/>
					</Col>
				</Row>
				<Row style={{ marginLeft: '0.5em', marginTop: '0.5em' }}>
					<label>{i18next.t('KARA.QUEUE_LABEL')}</label>
					<label>
						&nbsp;
						{i18next.t('KARA.QUEUE_LABEL_SONGS', {
							numberSongs: karasQueue.filter(
								kara => kara.status !== 'DL_DONE' && kara.status !== 'DL_FAILED'
							).length,
						})}
					</label>
				</Row>
				<Row>
					<Button
						style={{ width: '100px', margin: '0.5em' }}
						type="primary"
						key="queueStart"
						onClick={putToDownloadQueueStart}
					>
						{i18next.t('KARA.START_DOWNLOAD_QUEUE')}
					</Button>
					<Button
						style={{ width: '100px', margin: '0.5em' }}
						type="primary"
						key="queuePause"
						onClick={putToDownloadQueuePause}
					>
						{i18next.t('KARA.PAUSE_DOWNLOAD_QUEUE')}
					</Button>
					<Button
						style={{ width: '100px', margin: '0.5em' }}
						type="primary"
						key="queueDelete"
						onClick={() => commandBackend('deleteDownloads').catch(() => {})}
					>
						{i18next.t('KARA.WIPE_DOWNLOAD_QUEUE')}
					</Button>
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

export default QueueDownload;
