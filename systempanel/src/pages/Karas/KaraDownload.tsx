import React, {Component} from 'react';
import { Row, Col, Layout, Table, Input, Button, Cascader, Radio } from 'antd';
import {getCriterasByValue} from './_blc_criterias_types';
import i18next from 'i18next';
import { tagTypes } from '../../utils/tagTypes';
import { KaraDownloadRequest } from '../../../../src/types/download';
import { getTagInLocaleList } from '../../utils/kara';
import { DownloadOutlined, CheckCircleTwoTone, ClockCircleTwoTone, SyncOutlined, InfoCircleTwoTone } from '@ant-design/icons';
import Axios from 'axios';

var blacklist_cache = {}
var api_get_local_karas_interval = null;
var api_read_kara_queue_interval = null;

interface KaraDownloadState {
	karas_local: any[],
	karas_online: any[],
	i18nTag: any,
	blacklist_criterias: any[],
	karas_online_count: number,
	karas_queue: any[],
	active_download: any,
	kara: any,
	currentPage: number,
	currentPageSize: number,
	filter: string,
	tagFilter: string,
	tags: any[],
	compare: string,
	totalMediaSize: string
}

class KaraDownload extends Component<{}, KaraDownloadState> {

	constructor(props) {
		super(props);
		this.state = {
			karas_local: [],
			karas_online: [],
			i18nTag: {},
			karas_online_count: 0,
			blacklist_criterias: [],
			karas_queue: [],
			active_download: null,
			kara: {},
			currentPage: parseInt(localStorage.getItem('karaDownloadPage')) || 1,
			currentPageSize: parseInt(localStorage.getItem('karaDownloadPageSize')) || 100,
			filter: localStorage.getItem('karaDownloadFilter') || '',
			tagFilter: '',
			tags: [],
			compare: '',
			totalMediaSize: ''
		};
	}

	componentDidMount() {
		this.api_get_online_karas();
		this.api_get_blacklist_criterias();
		this.blacklist_check_emptyCache();
		this.startObserver();
		this.getTags();
	}

	fileConvertSize(aSize: any) {
		aSize = Math.abs(parseInt(aSize, 10));
		var def = [[1, 'octets'], [1024, 'ko'], [1024*1024, 'Mo'], [1024*1024*1024, 'Go'], [1024*1024*1024*1024, 'To']];
		for(var i=0; i<def.length; i++){
			if(aSize<def[i][0]) return (aSize/(def[i-1][0] as number)).toFixed(2)+' '+def[i-1][1];
		}
	}

	async getTags() {
		let res = await Axios.get(`/tags/remote`);
		this.setState({tags: res.data.content});
	}

	componentWillUnmount() {
		this.stopObserver();
	}

	startObserver() {
		this.api_get_local_karas();
		this.api_read_kara_queue();
		api_get_local_karas_interval = setInterval(this.api_get_local_karas, 5000);
		api_read_kara_queue_interval = setInterval(this.api_read_kara_queue, 5000);
	}
	stopObserver() {
		clearInterval(api_get_local_karas_interval);
		clearInterval(api_read_kara_queue_interval);
	}

	changeFilter = (event) => {
		this.setState({filter: event.target.value, currentPage: 0}, () => {
			localStorage.setItem('karaDownloadFilter', this.state.filter);
		});
	}

	downloadKara = (kara) => {
		let downloadObject:KaraDownloadRequest = {
			kid: kara.kid,
			mediafile: kara.mediafile,
			size: kara.mediasize,
			name: kara.name,
			repository: kara.repository
		};
		this.postToDownloadQueue([downloadObject]);
		this.api_read_kara_queue();
	}

	downloadAll = async () => {
		this.stopObserver();
		this.putToDownloadQueuePause()

		var p = Math.max(0,this.state.currentPage - 1);
		var psz = this.state.currentPageSize;
		var pfrom = p*psz;
		var response = await Axios.get(`/karas/remote?filter=${this.state.filter}&q=${this.state.tagFilter}&from=${pfrom}&size=${psz}${this.state.compare}`)
		let karas = response.data.content;
		let karasToDownload:KaraDownloadRequest[] = [];
		karas.forEach((kara) => {
			if(this.blacklist_check(kara))
			{
				karasToDownload.push({
					kid: kara.kid,
					mediafile: kara.mediafile,
					size: kara.mediasize,
					name: kara.karafile.replace('.kara.json', ''),
					repository: kara.repository
				});
			}
		});
		await this.postToDownloadQueue(karasToDownload);
		this.startObserver();
		this.putToDownloadQueueStart();
	}

	api_get_local_karas = async () => {
		const res = await Axios.get('/karas');
		this.setState({karas_local: res.data.content});
	}

	async api_get_blacklist_criterias() {
		const res = await Axios.get('/downloads/blacklist/criterias');
		if(res.data.length) {
			let criterias = res.data.map(function(criteria){
				var c = getCriterasByValue(criteria.type);
				if(c && c.fields && c.fields.length > 0)
				{
					criteria.filter = c;
					criteria.value = criteria.value.toLowerCase();
					return criteria;
				}
				return null;
			})
			this.setState({blacklist_criterias:criterias});
		}
	}

	blacklist_check_emptyCache() {
		blacklist_cache = {};
	}
	blacklist_check(kara) {
		// avoid lots of kara check operation on re-render
		if(blacklist_cache[kara.kid]!==undefined)
			return blacklist_cache[kara.kid];

		blacklist_cache[kara.kid] = true;
		if(this.state.blacklist_criterias.length)
		{
			this.state.blacklist_criterias.map(criteria => {
				if(criteria.filter.test==='contain')
				{
					criteria.filter.fields.map(field => {
						if(typeof(kara[field])==='string')
						{
							if(kara[field].toLowerCase().match(criteria.value))
							{
								blacklist_cache[kara.kid] = false;
							}
						}
						else if(kara[field] && kara[field].length > 0)
						{
							kara[field].map(t => {
								if(t)
								{
									if(typeof t==='string')
									{
										if(t.toLowerCase().match(criteria.value))
										{
											blacklist_cache[kara.kid] = false;
										}
									}
									else if(t.name)
									{
										if(t.name.toLowerCase().match(criteria.value))
										{
											blacklist_cache[kara.kid] = false;
										}
									}
								}
								return null;
							})
						}
						return null;
					})
				}
				return null;
			})
		}

		return blacklist_cache[kara.kid];
	}

	api_get_online_karas = async () => {
		var p = Math.max(0,this.state.currentPage - 1);
		var psz = this.state.currentPageSize;
		var pfrom = p*psz;
		let res = await Axios.get(`/karas/remote?filter=${this.state.filter}&q=${this.state.tagFilter}&from=${pfrom}&size=${psz}${this.state.compare}`);
		let karas = res.data.content;
		karas = karas.map((kara) => {
			kara.name = kara.karafile.replace('.kara.json', '');
			return kara;
		});
		this.setState({
			karas_online: karas,
			karas_online_count: res.data.infos.count || 0,
			i18nTag: res.data.i18n,
			totalMediaSize: this.fileConvertSize(res.data.infos.totalMediaSize)
		});
	}

	api_read_kara_queue = async () => {
		const res = await Axios.get('/downloads');
		this.setState({karas_queue: res.data});
	}

	handleTableChange = (pagination, filters, sorter) => {
		this.setState({
			currentPage: pagination.current,
			currentPageSize: pagination.pageSize,
		});
		localStorage.setItem('karaDownloadPage',pagination.current);
		localStorage.setItem('karaDownloadPageSize',pagination.pageSize);
		setTimeout(this.api_get_online_karas,10);
	};

	handleFilterTagSelection = (value) => {
		let t = '';
		if(value && value[1])
			t = 't:'+value[1]+'~'+value[0]

		this.setState({tagFilter:t, currentPage: 0}, () => {
			localStorage.setItem('karaDownloadtagFilter', this.state.tagFilter);
			setTimeout(this.api_get_online_karas,10);
		});
	}

	FilterTagCascaderOption = () => {
		let options = Object.keys(tagTypes).map(type => {
			const typeID = tagTypes[type];

			let option = {
				value:typeID,
				label:i18next.t(`TAG_TYPES.${type}`),
				children: []
			}
			this.state.tags.forEach(tag => {
				if(tag.types.length && tag.types.indexOf(typeID)>=0)
					option.children.push({
						value:tag.tid,
						label:tag.name,
					})
			})
			return option;
		})
		return options;
	}

	FilterTagCascaderFilter = function(inputValue, path) {
	  return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
	}

	// START karas download queue
	putToDownloadQueueStart() {
		Axios.put('/downloads/start');
	}

	// PAUSE karas download queue
	putToDownloadQueuePause() {
		Axios.put('/downloads/pause');
	}

	// POST (add) items to download queue
	postToDownloadQueue(downloads:KaraDownloadRequest[]) {
		Axios.post('/downloads', {
			downloads
		});
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px' }}>
				<Layout>
					<Layout.Header>
						<Row justify="space-between">
							<Col span={14}>
								<Input.Search
									placeholder={i18next.t('SEARCH_FILTER')}
									value={this.state.filter}
									onChange={event => this.changeFilter(event)}
									enterButton={i18next.t('SEARCH')}
									onSearch={this.api_get_online_karas}
								/>
							</Col>
							<Col span={5}>
								<Cascader style={{ width: '90%' }} options={this.FilterTagCascaderOption()}
									showSearch={{filter:this.FilterTagCascaderFilter,matchInputWidth:false}}
									onChange={this.handleFilterTagSelection} placeholder={i18next.t('KARA.TAG_FILTER')} />
							</Col>
						</Row>
						<Row style={{ margin: '10px'}}>
							<Col span={11}>
								<label>{i18next.t('KARA.TOTAL_MEDIA_SIZE')} {this.state.totalMediaSize}</label>
							</Col>
						</Row>
						<Row>
							<Col span={11}>
								<Button style={{width: '230px'}} type="primary" key="synchronize"
									onClick={() => Axios.post('/downloads/sync')}>{i18next.t('KARA.SYNCHRONIZE')}</Button>
								&nbsp;
								{i18next.t('KARA.SYNCHRONIZE_DESC')}
							</Col>
							<Col span={8}>
								<label>{i18next.t('KARA.FILTER_SONGS')}</label>
							</Col>
							<Col span={5}>
								<label>{i18next.t('KARA.QUEUE_LABEL')}</label>
							</Col>
						</Row>
						<Row style={{ paddingTop: '5px'}}>
							<Col span={11}>
								<Button style={{width: '230px'}} type="primary" key="queueDownloadAll"
									onClick={() => Axios.post('/downloads/all')}>{i18next.t('KARA.DOWNLOAD_ALL')}</Button>
								&nbsp;
								{i18next.t('KARA.DOWNLOAD_ALL_DESC')}
							</Col>
							<Col span={9}>
								<Radio checked={this.state.compare === ''}
										onChange={async () => {
											await this.setState({compare: '', currentPage: 0});
											this.api_get_online_karas();
									}}>{i18next.t('KARA.FILTER_ALL')}</Radio>
							</Col>
							<Col span={4}>
								<Button style={{width: '100px'}} type="primary" key="queueStart"
									onClick={this.putToDownloadQueueStart}>{i18next.t('KARA.START_DOWNLOAD_QUEUE')}</Button>
							</Col>
						</Row>
						<Row style={{ paddingTop: '5px'}}>
							<Col span={11}>
								<Button style={{width: '230px'}} type="primary" key="queueUpdateAll"
									onClick={() => Axios.post('/downloads/update')}>{i18next.t('KARA.UPDATE_ALL')}</Button>
								&nbsp;
								{i18next.t('KARA.UPDATE_ALL_DESC')}
							</Col>
							<Col span={9}>
								<Radio checked={this.state.compare === '&compare=updated'}
										onChange={async () => {
											await this.setState({compare: '&compare=updated', currentPage: 0});
											this.api_get_online_karas();
										}}>{i18next.t('KARA.FILTER_UPDATED')}</Radio>
							</Col>
							<Col span={4}>
								<Button style={{width: '100px'}} type="primary" key="queuePause"
									onClick={this.putToDownloadQueuePause}>{i18next.t('KARA.PAUSE_DOWNLOAD_QUEUE')}</Button>
							</Col>
						</Row>
						<Row style={{ paddingTop: '5px'}}>
							<Col span={11}>
								<Button style={{width: '230px'}} type="primary" key="queueCleanAll"
									onClick={() => Axios.post('/downloads/clean')}>{i18next.t('KARA.CLEAN_ALL')}</Button>
								&nbsp;
								{i18next.t('KARA.CLEAN_ALL_DESC')}
							</Col>
							<Col span={9}>
								<Radio checked={this.state.compare === '&compare=missing'}
										onChange={async () => {
											await this.setState({compare: '&compare=missing', currentPage: 0});
											this.api_get_online_karas();
									}}>{i18next.t('KARA.FILTER_NOT_DOWNLOADED')}</Radio>
							</Col>
							<Col span={4}>
								<Button style={{width: '100px'}} type="primary" key="queueDelete"
									onClick={()=> Axios.delete('/downloads')}>{i18next.t('KARA.WIPE_DOWNLOAD_QUEUE')}</Button>
							</Col>
						</Row>
					</Layout.Header>
					<Layout.Content>

						<Table
							onChange={this.handleTableChange}
							dataSource={this.state.karas_online}
							columns={this.columns}
							rowKey='kid'
							pagination={{
								current: this.state.currentPage || 0,
								defaultPageSize: this.state.currentPageSize,
								pageSize: this.state.currentPageSize,
								pageSizeOptions: ['10','25','50','100','500'],
								showTotal: (total, range) => {
									const to = range[1];
									const from = range[0];
									return i18next.t('KARA.SHOWING', {from:from,to:to,total:total});
								},
								total: this.state.karas_online_count,
								showSizeChanger: true,
								showQuickJumper: true,
							}}
						/>
					</Layout.Content>
				</Layout>
			</Layout.Content>
		);
	}

	is_local_kara(kara) {
		return this.state.karas_local && this.state.karas_local.find(item => item.kid === kara.kid);
	}
	is_queued_kara(kara) {
		return this.state.karas_queue.find(item => item.name === kara.name);
	}

	columns = [
	{
		title: i18next.t('KARA.LANGUAGES'),
		dataIndex: 'langs',
		key: 'langs',
		render: langs => {
			return getTagInLocaleList(this.state.i18nTag , langs).join(', ');
		}
	}, {
		title: `${i18next.t('KARA.SERIES')} / ${i18next.t('KARA.SINGERS')}`,
		dataIndex: 'serie',
		key: 'serie',
		render: (serie, record) => {
			return serie || getTagInLocaleList(this.state.i18nTag, record.singers).join(', ');
		}
	}, {
		title: i18next.t('KARA.SONGTYPES'),
		dataIndex: 'songtypes',
		key: 'songtypes',
		render: (songtypes, record) => {
			const songorder = record.songorder || '';
			return getTagInLocaleList(this.state.i18nTag, songtypes).join(', ') + ' ' + songorder || '';
		}
	}, {
		title: i18next.t('KARA.FAMILIES'),
		dataIndex: 'families',
		key: 'families',
		render: (families, record) => {
			return getTagInLocaleList(this.state.i18nTag, families).join(', ');
		}
	}, {
		title: i18next.t('KARA.TITLE'),
		dataIndex: 'title',
		key: 'title',
		render: (title, record) => {
			if(this.is_local_kara(record.kid))
				return <strong>{title}</strong>;
			return <span>{title}</span>;

		}
	}, {
		title: i18next.t('KARA.REPOSITORY'),
		dataIndex: 'repository',
		key: 'repository',
	}, {
		title: i18next.t('KARA.DETAILS'),
		key: 'details',
		render: (text, record) => {
			return <Button type="default" href={`https://${record.repository}/base/kara/${record.kid}`}><InfoCircleTwoTone /></Button>;
		}
	}, {
		title: <span><Button title={i18next.t('KARA.DOWNLOAD_ALL_TOOLTIP')} type="default"
			onClick={this.downloadAll}><DownloadOutlined /></Button>{i18next.t('KARA.DOWNLOAD')}
			</span>,
		key: 'download',
		render: (text, record) => {
			var button = null;
			var blacklisted = !this.blacklist_check(record);
			if(this.is_local_kara(record))
				button = <Button disabled type="default"><CheckCircleTwoTone twoToneColor="#52c41a"/></Button>;
			else {
				let queue = this.is_queued_kara(record);
				if(queue) {
					if(queue.status==='DL_RUNNING')
						button = <span><Button disabled type="default"><SyncOutlined spin /></Button></span>;
					else if(queue.status==='DL_PLANNED')
						button = <Button onClick={() => Axios.delete(`/downloads/${queue.pk_uuid}`)} type="default">
							<ClockCircleTwoTone twoToneColor="#dc4e41"/>
						</Button>;
					else if(queue.status==='DL_DONE') // done but not in local -> try again dude
						button = <span><Button disabled type="default"><CheckCircleTwoTone twoToneColor="#4989f3"/></Button></span>;
				} else {
					if(blacklisted)
						button = <Button type="primary" danger onClick={() => this.downloadKara(record)} ><DownloadOutlined /></Button>;
					else
						button = <Button type="default" onClick={() => this.downloadKara(record)}><DownloadOutlined /></Button>;
				}
			}
			return <span>{button} {Math.round(record.mediasize/(1024*1024))}Mb {blacklisted ? <small style={{color:'#f5232e'}}>{i18next.t('KARA.IN_BLACKLIST')}</small>:null}</span>;
		}
	}];
}

export default KaraDownload;
