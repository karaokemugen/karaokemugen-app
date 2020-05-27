import React, {Component} from 'react';
import { Button, Layout, Table, Input, Divider } from 'antd';
import {Link} from 'react-router-dom';
import {getTagInLocaleList, getSerieLanguage} from "../../utils/kara";
import i18next from 'i18next';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Axios from 'axios';
import { DBKara } from '../../../../src/lib/types/database/kara';
import { getAxiosInstance } from '../../axiosInterceptor';
import GlobalContext from '../../store/context';

interface KaraListState {
	karas: DBKara[]
	karas_removing: string[],
	currentPage: number,
	filter: string,
	i18nTag: any[],
	total_count: number
}

class KaraList extends Component<{}, KaraListState> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>
	
	constructor(props) {
		super(props);
		this.state = {
			karas: [],
			karas_removing: [],
			currentPage: +localStorage.getItem('karaPage') || 1,
			filter: localStorage.getItem('karaFilter') || '',
			i18nTag: [],
			total_count: 0
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		let res = await Axios.get('/karas', { params: { filter: this.state.filter, from: (this.state.currentPage-1)*100, size: 100}});
		this.setState({karas: res.data.content, i18nTag: res.data.i18n, total_count: res.data.infos.count});
	}

	async changePage(page) {
		await this.setState({currentPage: page});
		localStorage.setItem('karaPage',page);
		this.refresh();
	}

	changeFilter(event) {
		this.setState({filter: event.target.value});
		localStorage.setItem('karaFilter', this.state.filter);
	}

	 deleteKara = async (kara) => {
		let karas_removing = this.state.karas_removing;
		karas_removing.push(kara.kid);
		this.setState({
			karas_removing:karas_removing
		});
		await getAxiosInstance().delete(`/karas/${kara.kid}`);
		this.setState({
			karas_removing: this.state.karas_removing.filter(value => value !== kara.kid),
			karas: this.state.karas.filter(value => value.kid !== kara.kid)
		});
	}

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
							dataSource={this.state.karas}
							columns={this.columns}
							rowKey='kid'
							pagination={{
								position: ['topRight', 'bottomRight'],
								current: this.state.currentPage,
								defaultPageSize: 100,
								pageSize: 100,
								pageSizeOptions: ['10','25','50','100','500'],
								showTotal: (total, range) => {
									const to = range[1];
									const from = range[0];
									return i18next.t('KARA.SHOWING', {from:from,to:to,total:total});
								},
								total: this.state.total_count,
								showSizeChanger: true,
								showQuickJumper: true,
								onChange: page => this.changePage(page)
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
		render: langs => {
			return getTagInLocaleList(langs, this.state.i18nTag).join(', ')
		}
	}, {
		title: `${i18next.t('KARA.SERIES')} / ${i18next.t('KARA.SINGERS')}`,
		dataIndex: 'series',
		key: 'series',
		render: (series, record:DBKara) => {
			return series.map(serie => getSerieLanguage(this.context.globalState.settings.data, serie, record.langs[0].name, this.state.i18nTag)).join(', ') 
				|| getTagInLocaleList(record.singers, this.state.i18nTag).join(', ');
		}
	}, {
		title: i18next.t('KARA.SONGTYPES'),
		dataIndex: 'songtypes',
		key: 'songtypes',
		render: (songtypes, record) => {
			const songorder = record.songorder || '';
			return getTagInLocaleList(songtypes, this.state.i18nTag).join(', ') + ' ' + songorder || '';
		}
	}, {
		title: i18next.t('KARA.FAMILIES'),
		dataIndex: 'families',
		key: 'families',
		render: (families, record) => {
			return getTagInLocaleList(families, this.state.i18nTag).join(', ');
		}
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
			<Divider type="vertical"/>
			<Button type="primary" danger loading={this.state.karas_removing.indexOf(record.kid)>=0} 
				icon={<DeleteOutlined />} onClick={() => this.deleteKara(record)}></Button>
		</span>)
	}];
}

export default KaraList;
