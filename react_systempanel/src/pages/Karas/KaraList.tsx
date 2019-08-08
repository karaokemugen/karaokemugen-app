import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Icon, Layout, Table, Input} from 'antd';
import {Link} from 'react-router-dom';
import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import { deleteKaraByLocalId } from '../../api/local';
import {ReduxMappedProps} from '../../react-app-env';
import {getTagInLocaleList} from "../../utils/kara";

interface KaraListProps extends ReduxMappedProps {
}

interface KaraListState {
	karas: any[],
	kara: any,
	karas_removing_lastcall: number,
	karas_removing: string[],
	currentPage: number,
	filter: string,
	i18nTag: any[]
}

class KaraList extends Component<KaraListProps, KaraListState> {

	constructor(props) {
		super(props);
		this.state = {
			karas: [],
			kara: {},
			karas_removing_lastcall: 0,
			karas_removing: [],
			currentPage: +localStorage.getItem('karaPage') || 1,
			filter: localStorage.getItem('karaFilter') || '',
			i18nTag: []
		};

	}

	componentDidMount() {
		this.props.loading(true);
		this.refresh();
		setInterval(this.deletionQueueCron.bind(this),1000);
	}

	refresh() {
		axios.get('/api/system/karas', { params: { filter: this.state.filter,  }})
			.then(res => {
				this.props.loading(false);
				this.setState({karas: res.data.content, i18nTag: res.data.i18n});
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	changePage(page) {
		this.setState({currentPage: page});
		localStorage.setItem('karaPage',page);
	}

	changeFilter(event) {
		this.setState({filter: event.target.value}, () => {
			localStorage.setItem('karaFilter', this.state.filter);
		});
	}

	deleteKara(kara) {
		this.deletionQueuePush(kara.kid);
		deleteKaraByLocalId(kara.kid);
	}

	deletionQueuePush(kid) {
		let karas_removing = this.state.karas_removing;
		karas_removing.push(kid);
		this.setState({
			karas_removing:karas_removing,
			karas_removing_lastcall:new Date().getTime()
		});
	}

	deletionQueueCron() {
		if(this.state.karas_removing_lastcall > 0 && this.state.karas_removing_lastcall < new Date().getTime() - 3000) {
			this.setState({
				karas_removing:[],
				karas_removing_lastcall:0
			});
			this.refresh();
		}
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
							onSearch={this.refresh.bind(this)}
						/>
					</Layout.Header>
					<Layout.Content>
						<Table
							dataSource={this.state.karas}
							columns={this.columns}
							rowKey='kid'
							pagination={{
								current: this.state.currentPage,
								defaultPageSize: 100,
								pageSize: 100,
								pageSizeOptions: ['10','25','50','100','500'],
								showTotal: (total, range) => {
									const to = range[1];
									const from = range[0];
									return `Showing ${from}-${to} of ${total} songs`;
								},
								total: this.state.karas.length,
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
		title: 'Language(s)',
		dataIndex: 'langs',
		key: 'langs',
		render: langs => {
			return getTagInLocaleList(this.state.i18nTag, langs).join(', ')
		}
	}, {
		title: 'Series/Singer',
		dataIndex: 'serie',
		key: 'serie',
		render: (serie, record) => {
			return serie || getTagInLocaleList(this.state.i18nTag, record.singers).join(', ');
		}
	}, {
		title: 'Type',
		dataIndex: 'songtypes',
		key: 'songtypes',
		render: (songtypes, record) => {
			const songorder = record.songorder || '';
			return getTagInLocaleList(this.state.i18nTag, songtypes) + ' ' + songorder || '';
		}
	}, {
		title: 'Title',
		dataIndex: 'title',
		key: 'title'
	}, {
		title: 'Action',
		key: 'action',
		render: (text, record) => (<span>
			<Link to={`/system/km/karas/${record.kid}`}><Icon type='edit'/></Link>
		</span>)
	}, {
		title: 'Delete',
		key: 'delete',
		render: (text, record) => {
			if(this.state.karas_removing.indexOf(record.kid)>=0)
				return (<button type="button"><Icon type="sync" spin /></button>);
			else
				return (<button type="button" onClick={this.deleteKara.bind(this,record)}><Icon type='close-circle' theme="twoTone" twoToneColor="#d8493e"/></button>);
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


export default connect(mapStateToProps, mapDispatchToProps)(KaraList);
