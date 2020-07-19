import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Divider, Input, Layout, Table } from 'antd';
import Axios from 'axios';
import i18next from 'i18next';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import { DBKara } from '../../../../src/lib/types/database/kara';
import { getAxiosInstance } from '../../axiosInterceptor';
import GlobalContext from '../../store/context';
import { getSerieLanguage, getTagInLocaleList } from '../../utils/kara';

interface KaraListState {
	karas: DBKara[];
	karasRemoving: string[];
	currentPage: number;
	currentPageSize: number;
	filter: string;
	i18nTag: any[];
	totalCount: number;
}

class KaraList extends Component<unknown, KaraListState> {
	static contextType = GlobalContext
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
			totalCount: 0
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		const res = await Axios.get('/karas', { params: { filter: this.state.filter, from: (this.state.currentPage - 1) * 100, size: 100 } });
		this.setState({ karas: res.data.content, i18nTag: res.data.i18n, totalCount: res.data.infos.count });
	}

	changeFilter(event) {
		this.setState({ filter: event.target.value, currentPage: 1 });
		localStorage.setItem('karaPage', '1');
		localStorage.setItem('karaFilter', event.target.value);
	}

	deleteKara = async (kara) => {
		const karasRemoving = this.state.karasRemoving;
		karasRemoving.push(kara.kid);
		this.setState({
			karasRemoving: karasRemoving
		});
		await getAxiosInstance().delete(`/karas/${kara.kid}`);
		this.setState({
			karasRemoving: this.state.karasRemoving.filter(value => value !== kara.kid),
			karas: this.state.karas.filter(value => value.kid !== kara.kid)
		});
	}

	handleTableChange = (pagination, filters, sorter) => {
		this.setState({
			currentPage: pagination.current,
			currentPageSize: pagination.pageSize,
		});
		localStorage.setItem('karaPage', pagination.current);
		localStorage.setItem('karaPageSize', pagination.pageSize);
		setTimeout(this.refresh, 10);
	};

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Input.Search
							placeholder={i18next.t('SEARCH_FILTER')}
							value={this.state.filter}
							onChange={event => this.changeFilter(event)}
							enterButton={i18next.t('SEARCH')}
							onSearch={this.refresh}
						/>
					</Layout.Header>
					<Layout.Content>
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
				</Layout>
			</Layout.Content>
		);
	}

	columns = [{
		title: i18next.t('KARA.LANGUAGES'),
		dataIndex: 'langs',
		key: 'langs',
		render: langs => getTagInLocaleList(langs, this.state.i18nTag).join(', ')
	}, {
		title: `${i18next.t('KARA.SERIES')} / ${i18next.t('KARA.SINGERS')}`,
		dataIndex: 'series',
		key: 'series',
		render: (series, record: DBKara) => (series && series.length > 0) ?
			series.map(serie => getSerieLanguage(this.context.globalState.settings.data, serie, record.langs[0].name, this.state.i18nTag)).join(', ')
			: getTagInLocaleList(record.singers, this.state.i18nTag).join(', ')
	}, {
		title: i18next.t('KARA.SONGTYPES'),
		dataIndex: 'songtypes',
		key: 'songtypes',
		render: (songtypes, record) => getTagInLocaleList(songtypes).sort().join(', ') + ' ' + (record.songorder || '')
	}, {
		title: i18next.t('KARA.FAMILIES'),
		dataIndex: 'families',
		key: 'families',
		render: (families, record) => getTagInLocaleList(families, this.state.i18nTag).join(', ')
	}, {
		title: i18next.t('KARA.TITLE'),
		dataIndex: 'title',
		key: 'title'
	}, {
		title: i18next.t('KARA.REPOSITORY'),
		dataIndex: 'repository',
		key: 'repository'
	}, {
		title: i18next.t('ACTION'),
		key: 'action',
		render: (text, record) => (<span>
			<Link to={`/system/km/karas/${record.kid}`}><EditOutlined /></Link>
			<Divider type="vertical" />
			<Button type="primary" danger loading={this.state.karasRemoving.indexOf(record.kid) >= 0}
				icon={<DeleteOutlined />} onClick={() => this.deleteKara(record)}></Button>
		</span>)
	}];
}

export default KaraList;
