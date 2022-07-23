import {
	ClearOutlined,
	DeleteOutlined,
	EditOutlined,
	FontColorsOutlined,
	UploadOutlined,
	DownloadOutlined,
	DownOutlined,
	PlayCircleOutlined,
} from '@ant-design/icons';
import { Alert, Button, Cascader, Col, Dropdown, Input, Layout, Menu, Modal, Row, Table } from 'antd';
import { ItemType } from 'antd/lib/menu/hooks/useItems';
import i18next from 'i18next';
import { Component } from 'react';
import { Link } from 'react-router-dom';

import { DBKara, DBKaraTag } from '../../../../../src/lib/types/database/kara';
import { DBTag } from '../../../../../src/lib/types/database/tag';
import { KaraDownloadRequest } from '../../../../../src/types/download';
import GlobalContext from '../../../store/context';
import {
	buildKaraTitle,
	getTagInLocale,
	getTagInLocaleList,
	getTitleInLocale,
	sortTagByPriority,
} from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import { isModifiable } from '../../../utils/tools';

interface KaraListState {
	karas: DBKara[];
	karasRemoving: string[];
	currentPage: number;
	currentPageSize: number;
	filter: string;
	i18nTag: any[];
	totalCount: number;
	tags: DBTag[];
	tagOptions: any[];
	tagFilter: string;
}

class KaraList extends Component<unknown, KaraListState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;

	constructor(props) {
		super(props);
		this.state = {
			karas: [],
			karasRemoving: [],
			currentPage: parseInt(localStorage.getItem('karaPage')) || 1,
			currentPageSize: parseInt(localStorage.getItem('karaPageSize')) || 100,
			filter: localStorage.getItem('karaFilter') || '',
			i18nTag: [],
			totalCount: 0,
			tags: [],
			tagOptions: [],
			tagFilter: '',
		};
	}

	componentDidMount() {
		this.refresh();
		this.getTags();
	}

	refresh = async () => {
		const res = await commandBackend(
			'getKaras',
			{
				filter: this.state.filter,
				q: this.state.tagFilter,
				from: (this.state.currentPage - 1) * this.state.currentPageSize,
				size: this.state.currentPageSize,
				ignoreCollections: true,
			},
			undefined,
			300000
		);
		this.setState({ karas: res.content, i18nTag: res.i18n, totalCount: res.infos.count });
	};

	changeFilter(event) {
		this.setState({ filter: event.target.value, currentPage: 1 });
		localStorage.setItem('karaPage', '1');
		localStorage.setItem('karaFilter', event.target.value);
	}

	confirmDeleteKara = kara => {
		Modal.confirm({
			title: i18next.t('KARA.DELETE_KARA_MODAL'),
			okText: i18next.t('YES'),
			cancelText: i18next.t('NO'),
			onOk: close => {
				close();
				this.deleteKaras([kara.kid]);
			},
		});
	};

	deleteKaras = async (kids: string[]) => {
		const karasRemoving = this.state.karasRemoving;
		karasRemoving.push(...kids);
		this.setState({
			karasRemoving: karasRemoving,
		});
		await commandBackend('deleteKaras', { kids: kids }, true);
		this.setState({
			karasRemoving: this.state.karasRemoving.filter(value => !kids.includes(value)),
			karas: this.state.karas.filter(value => !kids.includes(value.kid)),
		});
	};

	handleTableChange = pagination => {
		this.setState({
			currentPage: pagination.current,
			currentPageSize: pagination.pageSize,
		});
		localStorage.setItem('karaPage', pagination.current);
		localStorage.setItem('karaPageSize', pagination.pageSize);
		setTimeout(this.refresh, 10);
	};

	async getTags() {
		const res = await commandBackend('getTags', undefined, false, 300000);
		this.setState({ tags: res.content }, () => this.filterTagCascaderOption());
	}

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

	filterTagCascaderFilter = function (inputValue, path) {
		return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
	};

	handleFilterTagSelection = value => {
		let t = '';
		if (value && value[1]) t = 't:' + value[1] + '~' + value[0];

		this.setState({ tagFilter: t, currentPage: 0 }, () => {
			localStorage.setItem('karaPage', '1');
			setTimeout(this.refresh, 10);
		});
	};

	confirmDeleteAllVisibleKara = () => {
		const karaDeletable = this.state.karas.filter(kara => isModifiable(this.context, kara.repository));
		Modal.confirm({
			title: i18next.t('KARA.DELETE_KARA_TITLE', { count: karaDeletable.length }),
			okText: i18next.t('YES'),
			cancelText: i18next.t('NO'),
			onOk: close => {
				close();
				if (karaDeletable.length > 0) this.deleteKaras(karaDeletable.map(value => value.kid));
			},
		});
	};

	downloadMedia = kara => {
		const downloadObject: KaraDownloadRequest = {
			mediafile: kara.mediafile,
			kid: kara.kid,
			size: kara.mediasize,
			name: buildKaraTitle(this.context.globalState.settings.data, kara, true) as string,
			repository: kara.repository,
		};
		commandBackend('addDownloads', { downloads: [downloadObject] }).catch(() => {});
	};

	getMenu = record => {
		const menu: ItemType[] = [];
		const deleteButton = {
			key: '1',
			label: i18next.t('KARA.DELETE_KARA'),
			icon: <DeleteOutlined />,
			danger: true,
			onClick: () => this.confirmDeleteKara(record),
		};

		const deleteMediaButton = {
			key: '2',
			label: i18next.t('KARA.DELETE_MEDIA_TOOLTIP'),
			icon: <ClearOutlined />,
			danger: true,
			onClick: () => commandBackend('deleteMedias', { kids: [record.kid] }, true),
		};
		const uploadMediaButton = {
			key: '3',
			label: i18next.t('KARA.UPLOAD_MEDIA_TOOLTIP'),
			icon: <UploadOutlined />,
			onClick: () => commandBackend('uploadMedia', { kid: record.kid }),
		};
		if (record.download_status === 'DOWNLOADED') {
			menu.push(uploadMediaButton);
			menu.push(deleteMediaButton);
		}
		menu.push(deleteButton);
		return menu;
	};

	render() {
		return (
			<>
				<Layout.Header>
					<div className="title">{i18next.t('HEADERS.KARAOKE_LIST.TITLE')}</div>
					<div className="description">{i18next.t('HEADERS.KARAOKE_LIST.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					{this.context.globalState.settings.data.config.System.Repositories.findIndex(
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
								value={this.state.filter}
								onChange={event => this.changeFilter(event)}
								enterButton={i18next.t('SEARCH')}
								onSearch={this.refresh}
							/>
						</Col>
						<Col flex={1}>
							<Cascader
								style={{ width: '90%' }}
								options={this.state.tagOptions}
								showSearch={{
									filter: this.filterTagCascaderFilter,
									matchInputWidth: false,
								}}
								onChange={this.handleFilterTagSelection}
								placeholder={i18next.t('KARA.TAG_FILTER')}
							/>
						</Col>
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
							total: this.state.totalCount,
							showQuickJumper: true,
						}}
						childrenColumnName="childrenColumnName"
					/>
				</Layout.Content>
			</>
		);
	}

	columns = [
		{
			title: i18next.t('TAG_TYPES.LANGS_other'),
			dataIndex: 'langs',
			key: 'langs',
			render: langs =>
				getTagInLocaleList(this.context.globalState.settings.data, langs, this.state.i18nTag).join(', '),
		},
		{
			title: `${i18next.t('TAG_TYPES.SERIES_other')} / ${i18next.t('KARA.SINGERS_BY')}`,
			dataIndex: 'series',
			key: 'series',
			render: (series, record: DBKara) =>
				series && series.length > 0
					? series
							.map(serie =>
								getTagInLocale(this.context?.globalState.settings.data, serie, this.state.i18nTag)
							)
							.join(', ')
					: getTagInLocaleList(
							this.context.globalState.settings.data,
							record.singers,
							this.state.i18nTag
					  ).join(', '),
		},
		{
			title: i18next.t('TAG_TYPES.SONGTYPES_other'),
			dataIndex: 'songtypes',
			key: 'songtypes',
			render: (songtypes, record) =>
				getTagInLocaleList(
					this.context.globalState.settings.data,
					songtypes.sort(sortTagByPriority),
					this.state.i18nTag
				).join(', ') +
				' ' +
				(record.songorder || ''),
		},
		{
			title: i18next.t('TAG_TYPES.FAMILIES_other'),
			dataIndex: 'families',
			key: 'families',
			render: families =>
				getTagInLocaleList(this.context.globalState.settings.data, families, this.state.i18nTag).join(', '),
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
				getTagInLocaleList(
					this.context.globalState.settings.data,
					versions.sort(sortTagByPriority),
					this.state.i18nTag
				).join(', '),
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
				getTagInLocaleList(
					this.context.globalState.settings.data,
					versions.sort(sortTagByPriority),
					this.state.i18nTag
				).join(', '),
		},
		{
			title: (
				<span>
					{i18next.t('ACTION')}
					<Button
						title={i18next.t('KARA.DELETE_ALL_TOOLTIP')}
						type="default"
						onClick={this.confirmDeleteAllVisibleKara}
						style={{ marginLeft: '1em' }}
					>
						<DeleteOutlined />
					</Button>
				</span>
			),
			key: 'action',
			render: (_text, record: DBKara) => {
				if (isModifiable(this.context, record.repository)) {
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
							onClick={() => commandBackend('openLyricsFile', { kid: record.kid }).catch(() => {})}
							style={{ marginRight: '0.75em' }}
						/>
					);

					let downloadVideoButton: JSX.Element = (
						<Button
							type="primary"
							onClick={() => this.downloadMedia(record)}
							icon={<DownloadOutlined />}
							title={i18next.t('KARA_DETAIL.DOWNLOAD_MEDIA')}
							style={{ marginRight: '0.75em' }}
						/>
					);

					let playVideoButton: JSX.Element = (
						<Button
							onClick={() => commandBackend('playKara', { kid: record.kid }).catch(() => {})}
							icon={<PlayCircleOutlined />}
							title={i18next.t('KARA.PLAY_KARAOKE')}
							style={{ marginRight: '0.75em' }}
						/>
					);

					if (record.download_status !== 'MISSING') {
						downloadVideoButton = null;
					}
					if (record.download_status !== 'DOWNLOADED') {
						playVideoButton = null;
					}
					if (record.subfile === null) {
						lyricsButton = null;
					}
					return (
						<div style={{ display: 'flex' }}>
							{editLink}
							{lyricsButton}
							{playVideoButton}
							{downloadVideoButton}
							<Dropdown overlay={<Menu items={this.getMenu(record)} />}>
								<Button
									icon={<DownOutlined />}
									loading={this.state.karasRemoving.indexOf(record.kid) >= 0}
								/>
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
								onClick={() => commandBackend('deleteMedias', { kids: [record.kid] }, true)}
								style={{ marginRight: '0.75em' }}
							/>
						</div>
					);
				} else if (record.download_status === 'MISSING') {
					return (
						<div style={{ display: 'flex' }}>
							<Button
								type="primary"
								onClick={() => this.downloadMedia(record)}
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
}

export default KaraList;
