import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Row, Col, Icon, Layout, Table, Input, Button} from 'antd';
import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import openSocket from 'socket.io-client';
import { getLocalKaras, deleteDownloadQueue, deleteKAraFromDownloadQueue, postToDownloadQueue, putToDownloadQueueStart, putToDownloadQueuePause } from '../../api/local';
import {ReduxMappedProps} from '../../react-app-env';
import {getCriterasByValue} from './_blc_criterias_types';

var blacklist_cache = {}
var api_get_local_karas_interval = null;
var api_read_kara_queue_interval = null;

interface KaraDownloadProps extends ReduxMappedProps {}

interface KaraDownloadState {
	karas_local: any[],
	karas_online: any[],
	blacklist_criterias: any[],
	karas_online_count: number,
	karas_queue: any[],
	active_download: any,
	kara: any,
	currentPage: number,
	currentPageSize: number,
	filter: string,
}

class KaraDownload extends Component<KaraDownloadProps, KaraDownloadState> {

	constructor(props) {
		super(props);
		this.state = {
			karas_local: [],
			karas_online: [],
			karas_online_count: 0,
			blacklist_criterias: [],
			karas_queue: [],
			active_download: null,
			kara: {},
			currentPage: parseInt(localStorage.getItem('karaDownloadPage')) || 1,
			currentPageSize: parseInt(localStorage.getItem('karaDownloadPageSize')) || 100,
			filter: localStorage.getItem('karaDownloadFilter') || '',
		};

	}

	componentDidMount() {
		const socket = openSocket('http://localhost:1337');
		socket.on('downloadBatchProgress', (data) => {

		});
		socket.on('downloadProgress', (data) => {
			let active_download = null;
			if(this.state.karas_online) {
				this.state.karas_online.forEach((kara,i) => {
					if(kara.name === data.id) {
						let remain = parseInt(data.total) - parseInt(data.value);
						if(remain>0) {
							active_download = {
								index: i,
								progress:Math.round(100 * parseInt(data.value) / parseInt(data.total)),
							};
						}
					}
				});
				if(JSON.stringify(this.state.active_download) !== JSON.stringify(active_download))
					this.setState({active_download:active_download});
			}
		});

		this.api_get_online_karas();
		this.api_get_blacklist_criterias();
		this.blacklist_check_emptyCache();
		this.startObserver();
	}
	componentWillUnmount() {
		this.stopObserver();
	}

	startObserver()
	{
		this.api_get_local_karas();
		this.api_read_kara_queue();
		api_get_local_karas_interval = setInterval(this.api_get_local_karas.bind(this),2000);
		api_read_kara_queue_interval = setInterval(this.api_read_kara_queue.bind(this),2000);
	}
	stopObserver()
	{
		clearInterval(api_get_local_karas_interval);
		clearInterval(api_read_kara_queue_interval);
	}

	changeFilter(event) {
		this.setState({filter: event.target.value}, () => {
			localStorage.setItem('karaDownloadFilter', this.state.filter);
		});
	}

	downloadKara(kara) {
		let downloadObject: any = {};
		downloadObject.kid = kara.kid;
		downloadObject.mediafile = kara.mediafile;
		downloadObject.subfile = kara.subfile;
		downloadObject.karafile = kara.karafile;
		downloadObject.seriefiles = kara.seriefiles;
		downloadObject.tagfiles = kara.tagfiles;
		downloadObject.size = kara.mediasize;
		downloadObject.name = kara.name;
		postToDownloadQueue('kara.moe', [downloadObject]);
		this.api_read_kara_queue();
	}

	downloadAll() {
		this.props.loading(true);
		this.stopObserver();
		putToDownloadQueuePause()
		
		var p = Math.max(0,this.state.currentPage - 1);
		var psz = this.state.currentPageSize;
		var pfrom = p*psz;

		axios.get(`/api/system/karas?filter=${this.state.filter}&from=${pfrom}&size=${psz}&instance=kara.moe`)
			.then(res => {
				let karas = res.data.content;
				karas.forEach((kara) => {
					if(this.blacklist_check(kara))
					{
						kara.name = kara.karafile.replace('.kara.json', '');
						this.downloadKara(kara);
					}
				});
				this.props.loading(false);
				this.startObserver();
				putToDownloadQueueStart();
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.status}: ${err.statusText}. ${err.data}`);
			});
	}

	async api_get_local_karas() {
		this.setState({karas_local: await getLocalKaras()});
	}

	async api_get_blacklist_criterias() {
		try {
			const res = await axios.get('/api/system/downloads/blacklist/criterias');
			if(res.data.length)
			{
				let criterias = res.data.map(function(criteria){
					var c = getCriterasByValue(criteria.type);
					if(c && c.fields && c.fields.length > 0)
					{
						criteria.filter = c;
						criteria.value = criteria.value.toLowerCase();
						return criteria;
					}
					return ;
				})
				this.setState({blacklist_criterias:criterias});
			}
		} catch (e) {
			console.log('Error KaraDownload.js in api_get_blacklist_criterias');
			throw e;
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
				if(criteria.filter.test=='contain')
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
								return ;
							})
						}
						return ;
					})
				}
				return ;
			})
		}

		return blacklist_cache[kara.kid];
	}

	api_get_online_karas() {
		this.props.loading(true);
		var p = Math.max(0,this.state.currentPage - 1);
		var psz = this.state.currentPageSize;
		var pfrom = p*psz;

		axios.get(`/api/system/karas?filter=${this.state.filter}&from=${pfrom}&size=${psz}&instance=kara.moe`)
			.then(res => {
				let karas = res.data.content;
				karas = karas.map((kara) => {
					kara.name = kara.karafile.replace('.kara.json', '');
					return kara;
				});
				this.props.loading(false);
				this.setState({
					karas_online: karas,
					karas_online_count: res.data.infos.count || 0,
				});
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.status}: ${err.statusText}. ${err.data}`);
			});
	}

	async api_read_kara_queue() {
		try {
			const res = await axios.get('/api/system/downloads');
			this.setState({karas_queue: res.data});
		} catch (e) {
			console.log('Error KaraDownload.js in api_read_kara_queue');
			throw e;
		}
	}

	handleTableChange = (pagination, filters, sorter) => {
		this.setState({
			currentPage: pagination.current,
			currentPageSize: pagination.pageSize,
		});
		localStorage.setItem('karaDownloadPage',pagination.current);
		localStorage.setItem('karaDownloadPageSize',pagination.pageSize);
		setTimeout(this.api_get_online_karas.bind(this),10);
	};

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Row type="flex" justify="space-between">
							<Col span={20}>
								<Input.Search
									placeholder='Search filter'
									value={this.state.filter}
									onChange={event => this.changeFilter(event)}
									enterButton="Search"
									onSearch={this.api_get_online_karas.bind(this)}
								/>
							</Col>
							<Col>
								<Button type="primary" key="queueDelete" onClick={deleteDownloadQueue}>Cleanup</Button>
								&nbsp;
								<Button type="primary" key="queueStart" onClick={putToDownloadQueueStart}>Start</Button>
								&nbsp;
								<Button type="primary" key="queuePause" onClick={putToDownloadQueuePause}>Pause</Button>
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
								position:'both',
								current: this.state.currentPage || 0,
								defaultPageSize: this.state.currentPageSize,
								pageSize: this.state.currentPageSize,
								pageSizeOptions: ['10','25','50','100','500'],
								showTotal: (total, range) => {
									const to = range[1];
									const from = range[0];
									return `Showing ${from}-${to} of ${total} songs`;
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
		return this.state.karas_local.find(item => item.kid === kara.kid);
	}
	is_queued_kara(kara) {
		return this.state.karas_queue.find(item => item.name === kara.name);
	}

	columns = [
	{
		title: 'Language(s)',
		dataIndex: 'langs',
		key: 'langs',
		render: langs => {
			const ret = langs ? langs.map(e => {
				return e.name;
			}) : [];
			return ret.join(', ').toUpperCase();
		}
	}, {
		title: 'Series/Singer',
		dataIndex: 'serie',
		key: 'serie',
		render: (serie, record) => {
			const singers = record.singers ? record.singers.map(e => {
				return e.name;
			}) : [];
			return serie || singers.join(', ');
		}
	}, {
		title: 'Type',
		dataIndex: 'songtypes',
		key: 'songtypes',
		render: (songtypes, record) => {
			const types = songtypes ? songtypes.map(e => {
				return e.name;
			}) : [];
			const songorder = record.songorder || '';
			return types.join(', ').replace('TYPE_','') + ' ' + songorder || '';
		}
	}, {
		title: 'Title',
		dataIndex: 'title',
		key: 'title',
		render: (title, record) => {
			if(this.is_local_kara(record.kid))
				return <strong>{title}</strong>;
			return <span>{title}</span>;

		}
	}, {
		title: <span><Button title="Download all retrieved karas at once" type="default" onClick={this.downloadAll.bind(this)}><Icon type='download'/></Button> Download</span>,
		key: 'download',
		render: (text, record) => {
			var button = null;
			var blacklisted = !this.blacklist_check(record);
			if(this.is_local_kara(record))
				button = <Button disabled type="default"><Icon type='check-circle' theme="twoTone" twoToneColor="#52c41a"/></Button>;
			else {
				let queue = this.is_queued_kara(record);
				if(queue) {
					if(queue.status==='DL_RUNNING')
						button = <span><Button disabled type="default"><Icon type="sync" spin /></Button> {this.state.active_download ? this.state.active_download.progress:null}%</span>;
					else if(queue.status==='DL_PLANNED')
						button = <Button onClick={deleteKAraFromDownloadQueue.bind(null,queue.pk_uuid)} type="default"><Icon type='clock-circle' theme="twoTone" twoToneColor="#dc4e41"/></Button>;
					else if(queue.status==='DL_DONE') // done but not in local -> try again dude
						button = <span><Button disabled type="default"><Icon type='check-circle' theme="twoTone" twoToneColor="#4989f3"/></Button></span>;
				} else {
					if(blacklisted)
						button = <Button type="danger" onClick={this.downloadKara.bind(this,record)} ><Icon type='download'/></Button>;
					else
						button = <Button type="default" onClick={this.downloadKara.bind(this,record)}><Icon type='download'/></Button>;
				}
			}
			return <span>{button} {Math.round(record.mediasize/(1024*1024))}Mb {blacklisted ? <small style={{color:'#f5232e'}}>In Blacklist</small>:null}</span>;
		}
	}];
}

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	infoMessage: (message) => dispatch(infoMessage(message)),
	errorMessage: (message) => dispatch(errorMessage(message)),
	warnMessage: (message) => dispatch(warnMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(KaraDownload);
