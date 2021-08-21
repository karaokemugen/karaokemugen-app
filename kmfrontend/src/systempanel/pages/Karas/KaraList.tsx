import { ClearOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Alert, Button, Cascader, Col, Divider, Input, Layout, Modal, Row, Table } from 'antd';
import i18next from 'i18next';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import { DBKara, DBKaraTag } from '../../../../../src/lib/types/database/kara';
import { DBTag } from '../../../../../src/lib/types/database/tag';
import GlobalContext from '../../../store/context';
import { getTagInLocale, getTagInLocaleList, sortTagByPriority } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import { is_touch_device, isModifiable } from '../../../utils/tools';

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
	context: React.ContextType<typeof GlobalContext>

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
			tagFilter: ''
		};
	}

	componentDidMount() {
		this.refresh();
		this.getTags();
	}

	refresh = async () => {
		const res = await commandBackend('getKaras', {
			filter: this.state.filter,
			q: this.state.tagFilter,
			from: (this.state.currentPage - 1) * this.state.currentPageSize,
			size: this.state.currentPageSize
		}, undefined, 300000);
		this.setState({ karas: res.content, i18nTag: res.i18n, totalCount: res.infos.count });
	}

	changeFilter(event) {
		this.setState({ filter: event.target.value, currentPage: 1 });
		localStorage.setItem('karaPage', '1');
		localStorage.setItem('karaFilter', event.target.value);
	}

	confirmDeleteKara = (kara) => {
		Modal.confirm({
			title: i18next.t('KARA.DELETE_KARA'),
			okText: i18next.t('YES'),
			cancelText: i18next.t('NO'),
			onOk: (close) => {
				close();
				this.deleteKaras([kara.kid]);
			}
		});
	}

	deleteKaras = async (kids: string[]) => {
		const karasRemoving = this.state.karasRemoving;
		karasRemoving.push(...kids);
		this.setState({
			karasRemoving: karasRemoving
		});
		await commandBackend('deleteKaras', { kids: kids }, true);
		this.setState({
			karasRemoving: this.state.karasRemoving.filter(value => !kids.includes(value)),
			karas: this.state.karas.filter(value => !kids.includes(value.kid))
		});
	}

	handleTableChange = (pagination) => {
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
				label: i18next.t(`TAG_TYPES.${type}`),
				children: []
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
	}

	filterTagCascaderFilter = function (inputValue, path) {
		return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
	}

	handleFilterTagSelection = (value) => {
		let t = '';
		if (value && value[1])
			t = 't:' + value[1] + '~' + value[0];

		this.setState({ tagFilter: t, currentPage: 0 }, () => {
			localStorage.setItem('karaPage', '1');
			setTimeout(this.refresh, 10);
		});
	}

	confirmDeleteAllVisibleKara = () => {
		const karaDeletable = this.state.karas.filter(kara => isModifiable(this.context, kara.repository));
		Modal.confirm({
			title: i18next.t('KARA.DELETE_KARA_TITLE', { count: karaDeletable.length }),
			okText: i18next.t('YES'),
			cancelText: i18next.t('NO'),
			onOk: (close) => {
				close();
				if (karaDeletable.length > 0) this.deleteKaras(karaDeletable.map(value => value.kid));
			}
		});
	}

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.KARAOKE_LIST.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.KARAOKE_LIST.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					{this.context.globalState.settings.data.config.System.Repositories.findIndex(repo => repo.Online && !repo.MaintainerMode) !== -1 ?
						<Alert type="info" showIcon style={{ marginBottom: '10px' }}
							message={i18next.t('KARA.ONLINE_REPOSITORIES')} /> : null}
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
							<Cascader style={{ width: '90%' }} options={this.state.tagOptions}
								showSearch={{ filter: this.filterTagCascaderFilter, matchInputWidth: false }}
								onChange={this.handleFilterTagSelection} placeholder={i18next.t('KARA.TAG_FILTER')} />
						</Col>
					</Row>
					<Table
						onChange={this.handleTableChange}
						dataSource={this.state.karas}
						columns={this.columns}
						rowKey='kid'
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
							showQuickJumper: true
						}}
					/>
				</Layout.Content>
			</>
		);
	}

	columns = [{
		title: i18next.t('KARA.LANGUAGES'),
		dataIndex: 'langs',
		key: 'langs',
		render: langs => getTagInLocaleList(this.context.globalState.settings.data, langs, this.state.i18nTag).join(', ')
	}, {
		title: `${i18next.t('KARA.SERIES')} / ${i18next.t('KARA.SINGERS_BY')}`,
		dataIndex: 'series',
		key: 'series',
		render: (series, record: DBKara) => (series && series.length > 0) ?
			series.map(serie => getTagInLocale(this.context?.globalState.settings.data, serie, this.state.i18nTag)).join(', ')
			: getTagInLocaleList(this.context.globalState.settings.data, record.singers, this.state.i18nTag).join(', ')
	}, {
		title: i18next.t('KARA.SONGTYPES'),
		dataIndex: 'songtypes',
		key: 'songtypes',
		render: (songtypes, record) => getTagInLocaleList(this.context.globalState.settings.data, songtypes.sort(sortTagByPriority), this.state.i18nTag).join(', ') + ' ' + (record.songorder || '')
	}, {
		title: i18next.t('KARA.FAMILIES'),
		dataIndex: 'families',
		key: 'families',
		render: (families) => getTagInLocaleList(this.context.globalState.settings.data, families, this.state.i18nTag).join(', ')
	}, {
		title: i18next.t('KARA.TITLE'),
		dataIndex: 'title',
		key: 'title'
	}, {
		title: i18next.t('TAG_TYPES.VERSIONS', { count: 2 }),
		dataIndex: 'versions',
		key: 'versions',
		render: (versions) => getTagInLocaleList(this.context.globalState.settings.data, versions.sort(sortTagByPriority), this.state.i18nTag).join(', ')
	}, {
		title: i18next.t('KARA.REPOSITORY'),
		dataIndex: 'repository',
		key: 'repository'
	}, {
		title: <span><Button title={i18next.t('KARA.DELETE_ALL_TOOLTIP')} type="default"
			onClick={this.confirmDeleteAllVisibleKara}><DeleteOutlined /></Button>{i18next.t('ACTION')}
		</span>,
		key: 'action',
		render: (_text, record: DBKara) => isModifiable(this.context, record.repository) ? (<span>
			<Link to={`/system/karas/${record.kid}`}>
				<Button type="primary" icon={<EditOutlined />} />
			</Link>
			{!is_touch_device() ? <Divider type="vertical" /> : null}
			<Button type="primary" danger loading={this.state.karasRemoving.indexOf(record.kid) >= 0}
				icon={<DeleteOutlined />} onClick={() => this.confirmDeleteKara(record)} />
		</span>) :
			(record.download_status === 'DOWNLOADED' ?
				<Button
					type="primary"
					danger
					title={i18next.t('KARA.DELETE_MEDIA_TOOLTIP')}
					icon={<ClearOutlined />}
					onClick={() => commandBackend('deleteMedias', { kids: [record.kid] }, true)}
				/> : null
			)
	}];
}

export default KaraList;
