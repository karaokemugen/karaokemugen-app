import React, {Component} from 'react';
import axios from 'axios';
import got from 'got';
import {connect} from 'react-redux';
import {Icon, Layout, Table, Input} from 'antd';
import {Link} from 'react-router-dom';
import {loading, errorMessage, warnMessage} from '../../actions/navigation';

import { getLocalKaras, postToDownloadQueue } from '../../api/local';

class KaraDownload extends Component {

	constructor(props) {
		super(props);
		this.state = {
			karas_local: [],
			karas_online: [],
			karas_online_count: 0,
			karas_queue: [],
			kara: {},
			currentPage: parseInt(localStorage.getItem('karaDownloadPage')) || 1,
			currentPageSize: parseInt(localStorage.getItem('karaDownloadPageSize')) || 100,
			filter: localStorage.getItem('karaDownloadFilter') || ''
		};

	}

	componentDidMount() {
		this.api_get_local_karas();
		this.api_get_online_karas();
		this.api_read_kara_queue();
		setInterval(this.api_get_local_karas.bind(this),2000);
		setInterval(this.api_read_kara_queue.bind(this),1000);
	}

	changeFilter(event) {
		this.setState({filter: event.target.value}, () => {
			localStorage.setItem('karaDownloadFilter', this.state.filter);
		});
	}

	downloadKara(kara) {
		let downloadObject = {}
		downloadObject.kid = kara.kid;
		downloadObject.mediafile = kara.mediafile;
		downloadObject.subfile = kara.subfile;
		downloadObject.karafile = kara.karafile;
		downloadObject.seriefiles = kara.seriefiles;
		downloadObject.size = kara.mediasize;
		downloadObject.name = kara.name;
		postToDownloadQueue('kara.moe', [downloadObject])
		this.api_read_kara_queue();
	}

	downloadAll() {
		this.props.loading(true);
		got(
			`https://kara.moe/api/karas?filter=${this.state.filter}`,
			{ json : true }
		).then(res => {
			let karas = res.body.content;
			karas.forEach((kara) => { 
				kara.name = kara.subfile.replace('.ass', '');
				this.downloadKara(kara)
			})
			this.props.loading(false);
		})
		.catch(err => {
			this.props.loading(false);
			this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
		});
	}

	async api_get_local_karas() {
		this.setState({karas_local: await getLocalKaras()});
	}

	api_get_online_karas() {
		this.props.loading(true);
		var p = Math.max(0,this.state.currentPage - 1);
		var psz = this.state.currentPageSize;
		var pfrom = p*psz;
		got(
			`https://kara.moe/api/karas?filter=${this.state.filter}&from=${pfrom}&size=${psz}`,
			{ json : true }
		).then(res => {
			let karas = res.body.content;
			karas = karas.map((kara) => { 
				kara.name = kara.subfile.replace('.ass', '')
				return kara;
			})
			this.props.loading(false);
			this.setState({
				karas_online: karas,
				karas_online_count: res.body.infos.count || 0,
			});
		})
		.catch(err => {
			this.props.loading(false);
			this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
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
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Input.Search
							placeholder='Search filter'
							value={this.state.filter}
							onChange={event => this.changeFilter(event)}
							enterButton="Search"
							onSearch={this.api_get_online_karas.bind(this)}
						/>
					</Layout.Header>
					<Layout.Content>
						<button type="button" onClick={this.downloadAll.bind(this)}><Icon type='download'/></button>
						<Table
							onChange={this.handleTableChange}
							dataSource={this.state.karas_online}
							columns={this.columns}
							rowKey='kid'
							pagination={{
								position:"both",
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
		return this.state.karas_local.find(item => item.kid == kara.kid);
	}
	is_queued_kara(kara) {
		return this.state.karas_queue.find(item => item.name == kara.name);
	}

	columns = [{
		title: 'Language(s)',
		dataIndex: 'languages',
		key: 'languages',
		render: languages => {
			const ret = languages ? languages.map(e => {
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
		dataIndex: 'songtype',
		key: 'songtype',
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
		title: 'Download',
		key: 'download',
		render: (text, record) => {
			if(this.is_local_kara(record))
				return <button disabled type="button"><Icon type='check-circle' theme="twoTone" twoToneColor="#52c41a"/></button>
			else {
				let queue = this.is_queued_kara(record);
				if(queue)
				{
					if(queue.status=='DL_RUNNING')
						return <button disabled type="button"><Icon type="sync" spin /></button>
					else if(queue.status=='DL_PLANNED')
						return <button disabled type="button"><Icon type='clock-circle' theme="twoTone" twoToneColor="#fecd43"/></button>
					else if(queue.status=='DL_DONE') // done but not in local -> try again dude
						return <button type="button"><Icon type='download'/></button>
				}
				else
					return <button type="button" onClick={this.downloadKara.bind(this,record)}><Icon type='download'/></button>
			}
		}
	}];
}

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	errorMessage: (message) => dispatch(errorMessage(message)),
	warnMessage: (message) => dispatch(warnMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(KaraDownload);
