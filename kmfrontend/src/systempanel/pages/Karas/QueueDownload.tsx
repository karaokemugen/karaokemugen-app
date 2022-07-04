import { ClockCircleTwoTone, InfoCircleTwoTone, SyncOutlined, WarningTwoTone } from '@ant-design/icons';
import { Button, Cascader, Col, Input, Layout, Row, Select, Table } from 'antd';
import i18next from 'i18next';
import prettyBytes from 'pretty-bytes';
import { Component } from 'react';

import { DBKara, DBKaraTag } from '../../../../../src/lib/types/database/kara';
import { DBTag } from '../../../../../src/lib/types/database/tag';
import { DBDownload } from '../../../../../src/types/database/download';
import { KaraDownloadRequest } from '../../../../../src/types/download';
import GlobalContext from '../../../store/context';
import { buildKaraTitle, getTagInLocale, getTagInLocaleList, getTitleInLocale } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';

interface KaraDownloadState {
	karas: DBKara[];
	i18nTag: any;
	karasCount: number;
	karasQueue: DBDownload[];

	currentPage: number;
	currentPageSize: number;
	filter: string;
	tagFilter: string;
	tags: DBTag[];
	tagOptions: any[];
	preview: string;
}

class QueueDownload extends Component<unknown, KaraDownloadState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;

	constructor(props) {
		super(props);
		this.state = {
			karas: [],
			i18nTag: {},
			karasCount: 0,
			karasQueue: [],

			currentPage: 1,
			currentPageSize: 100,
			filter: '',
			tagFilter: '',
			tags: [],
			tagOptions: [],
			preview: '',
		};
	}

	componentDidMount() {
		this.readKaraQueue();
		this.getKaras();
		this.getTags();
		getSocket().on('downloadQueueStatus', this.downloadQueueStatus);
	}

	componentWillUnmount() {
		getSocket().off('downloadQueueStatus', this.downloadQueueStatus);
	}

	downloadQueueStatus = (data?: any) => {
		this.setState({ karasQueue: data });
	};

	async getTags() {
		try {
			const res = await commandBackend('getTags', undefined, false, 300000);
			this.setState({ tags: res.content }, () => this.filterTagCascaderOption());
		} catch (e) {
			// already display
		}
	}

	changeFilter = event => {
		this.setState({ filter: event.target.value, currentPage: 0 });
	};

	downloadKara = (kara: DBKara) => {
		const downloadObject: KaraDownloadRequest = {
			mediafile: kara.mediafile,
			kid: kara.kid,
			size: kara.mediasize,
			name: buildKaraTitle(this.context.globalState.settings.data, kara, true) as string,
			repository: kara.repository,
		};
		this.postToDownloadQueue([downloadObject]);
	};

	getKaras = async () => {
		try {
			const p = Math.max(0, this.state.currentPage - 1);
			const psz = this.state.currentPageSize;
			const pfrom = p * psz;
			const res = await commandBackend(
				'getKaras',
				{
					filter: this.state.filter,
					q: `${this.state.tagFilter}!m:DOWNLOADING`,
					from: pfrom,
					size: psz,
				},
				false,
				300000
			);

			this.setState({
				karas: res.content,
				karasCount: res.infos.count || 0,
				i18nTag: res.i18n,
			});
		} catch (e) {
			// already display
		}
	};

	readKaraQueue = async () => {
		const res = await commandBackend('getDownloads', undefined, false, 300000);
		this.setState({ karasQueue: res });
	};

	handleTableChange = pagination => {
		this.setState({
			currentPage: pagination.current,
			currentPageSize: pagination.pageSize,
		});
		setTimeout(this.getKaras, 10);
	};

	handleFilterTagSelection = value => {
		let t = '';
		if (value && value[1]) t = 't:' + value[1] + '~' + value[0];

		this.setState({ tagFilter: t, currentPage: 0 }, () => {
			localStorage.setItem('karaDownloadPage', '0');
			localStorage.setItem('karaDownloadtagFilter', this.state.tagFilter);
			setTimeout(this.getKaras, 10);
		});
	};

	filterTagCascaderOption = () => {
		const options = Object.keys(tagTypes).map(type => {
			const typeID = tagTypes[type].type;

			const option = {
				value: typeID,
				label: i18next.t(`TAG_TYPES.${type}_other`),
				children: [],
			};
			for (const tag of this.state.tags.filter(tag => tag.types.length && tag.types.indexOf(typeID) >= 0)) {
				option.children.push({
					value: tag.tid,
					label: getTagInLocale(this.context?.globalState.settings.data, tag as unknown as DBKaraTag),
				});
			}
			return option;
		});
		this.setState({ tagOptions: options });
	};

	getGroupsTags = () => {
		return this.state.tags
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

	filterTagCascaderFilter = function (inputValue, path) {
		return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
	};

	// START karas download queue
	putToDownloadQueueStart = () => {
		commandBackend('startDownloadQueue').catch(() => {});
	};

	// PAUSE karas download queue
	putToDownloadQueuePause = () => {
		commandBackend('pauseDownloads').catch(() => {});
	};

	// POST (add) items to download queue
	postToDownloadQueue = (downloads: KaraDownloadRequest[]) => {
		commandBackend('addDownloads', {
			downloads,
		}).catch(() => {});
	};

	isQueuedKara = (kara: DBKara) => {
		return this.state.karasQueue.find(item => item.mediafile === kara.mediafile);
	};
	showPreview = kara => {
		this.setState({ preview: `https://${kara.repository}/downloads/medias/${encodeURIComponent(kara.mediafile)}` });
		document.addEventListener('keyup', this.closeVideo);
	};

	closeVideo = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			this.setState({ preview: undefined });
			document.removeEventListener('keyup', this.closeVideo);
		}
	};

	render() {
		return (
			<>
				<Layout.Header>
					<div className="title">{i18next.t('HEADERS.DOWNLOAD_QUEUE.TITLE')}</div>
					<div className="description">{i18next.t('HEADERS.DOWNLOAD_QUEUE.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Row justify="space-between">
						<Col flex={3} style={{ marginRight: '10px' }}>
							<Input.Search
								placeholder={i18next.t('SEARCH_FILTER')}
								value={this.state.filter}
								onChange={event => this.changeFilter(event)}
								enterButton={i18next.t('SEARCH')}
								onSearch={this.getKaras}
							/>
						</Col>
						<Col flex={1} style={{ textAlign: 'center' }}></Col>
						<Col flex={2}>
							<Select
								allowClear
								style={{ width: '90%' }}
								onChange={value => this.handleFilterTagSelection([tagTypes.GROUPS, value])}
								placeholder={i18next.t('KARA.TAG_GROUP_FILTER')}
								key={'tid'}
								options={this.getGroupsTags()}
							/>
						</Col>
						<Col flex={2}>
							<Cascader
								style={{ width: '90%' }}
								options={this.state.tagOptions}
								showSearch={{ filter: this.filterTagCascaderFilter, matchInputWidth: false }}
								onChange={this.handleFilterTagSelection}
								placeholder={i18next.t('KARA.TAG_FILTER')}
							/>
						</Col>
					</Row>
					<Row style={{ marginLeft: '0.5em', marginTop: '0.5em' }}>
						<label>{i18next.t('KARA.QUEUE_LABEL')}</label>
						<label>
							&nbsp;
							{i18next.t('KARA.QUEUE_LABEL_SONGS', {
								numberSongs: this.state.karasQueue.filter(
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
							onClick={this.putToDownloadQueueStart}
						>
							{i18next.t('KARA.START_DOWNLOAD_QUEUE')}
						</Button>
						<Button
							style={{ width: '100px', margin: '0.5em' }}
							type="primary"
							key="queuePause"
							onClick={this.putToDownloadQueuePause}
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
						onChange={this.handleTableChange}
						dataSource={this.state.karas}
						columns={this.columns}
						rowKey="kid"
						pagination={{
							position: ['topRight', 'bottomRight'],
							current: this.state.currentPage || 1,
							defaultPageSize: this.state.currentPageSize,
							pageSize: this.state.currentPageSize,
							pageSizeOptions: ['10', '25', '50', '100', '500'],
							showTotal: (total, range) => {
								const to = range[1];
								const from = range[0];
								return i18next.t('KARA.SHOWING', { from: from, to: to, total: total });
							},
							total: this.state.karasCount,
							showQuickJumper: true,
						}}
						childrenColumnName="childrenColumnName"
					/>
				</Layout.Content>
				{this.state.preview ? (
					<div
						className="overlay"
						onClick={() => {
							this.setState({ preview: undefined });
							document.removeEventListener('keyup', this.closeVideo);
						}}
					>
						<video id="video" autoPlay src={this.state.preview} />
					</div>
				) : null}
			</>
		);
	}

	columns = [
		{
			title: i18next.t('TAG_TYPES.LANGS_other'),
			dataIndex: 'langs',
			key: 'langs',
			render: langs => {
				return getTagInLocaleList(this.context.globalState.settings.data, langs, this.state.i18nTag).join(', ');
			},
		},
		{
			title: `${i18next.t('TAG_TYPES.SERIES_other')} / ${i18next.t('KARA.SINGERS_BY')}`,
			dataIndex: 'series',
			key: 'series',
			render: (series, record) => {
				return series && series.length > 0
					? series
							.map(serie =>
								getTagInLocale(this.context?.globalState.settings.data, serie, this.state.i18nTag)
							)
							.join(', ')
					: getTagInLocaleList(
							this.context.globalState.settings.data,
							record.singers,
							this.state.i18nTag
					  ).join(', ');
			},
		},
		{
			title: i18next.t('TAG_TYPES.SONGTYPES_other'),
			dataIndex: 'songtypes',
			key: 'songtypes',
			render: (songtypes, record) => {
				const songorder = record.songorder || '';
				return (
					getTagInLocaleList(this.context.globalState.settings.data, songtypes, this.state.i18nTag)
						.sort()
						.join(', ') +
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
				return getTagInLocaleList(this.context.globalState.settings.data, families, this.state.i18nTag).join(
					', '
				);
			},
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
				getTagInLocaleList(this.context.globalState.settings.data, versions, this.state.i18nTag).join(', '),
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
					<Button type="default" onClick={() => this.showPreview(record)}>
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
				const queue = this.isQueuedKara(record);
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
							<Button type="default" onClick={() => this.downloadKara(record)}>
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
}

export default QueueDownload;
