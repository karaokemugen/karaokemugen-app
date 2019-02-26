import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Icon, Layout, Table, Input} from 'antd';
import {Link} from 'react-router-dom';
import {loading, errorMessage, warnMessage} from '../../actions/navigation';

class KaraList extends Component {

	constructor(props) {
		super(props);
		this.state = {
			karas: [],
			kara: {},
			currentPage: localStorage.getItem('karaPage') || 1,
			filter: localStorage.getItem('karaFilter') || ''
		};

	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		this.props.loading(true);
		axios.get('/api/system/karas', { params: { filter: this.state.filter,  }})
			.then(res => {
				this.props.loading(false);
				this.setState({karas: res.data.content});
				console.log(this.state);
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

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Input.Search
							placeholder={ this.state.filter || 'Search filter' }
							onChange={event => this.changeFilter(event)}
							enterButton="Search"
							onSearch={this.refresh.bind(this)}
						/>
					</Layout.Header>
					<Layout.Content>
						<Table
							dataSource={this.state.karas}
							columns={this.columns}
							rowKey='kara_id'
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
		dataIndex: 'languages',
		key: 'languages',
		render: languages => {
			const ret = languages.map(e => {
				return e.name;
			});
			return ret.join(', ').toUpperCase();
		}
	}, {
		title: 'Series/Singer',
		dataIndex: 'serie',
		key: 'serie',
		render: (serie, record) => {
			const singers = record.singers.map(e => {
				return e.name;
			});
			return serie || singers.join(', ');
		}
	}, {
		title: 'Type',
		dataIndex: 'songtype',
		key: 'songtype',
		render: (songtypes, record) => {
			const types = songtypes.map(e => {
				return e.name;
			});
			const songorder = record.songorder || '';
			return types.join(', ').replace('TYPE_','') + ' ' + songorder || '';
		}
	}, {
		title: 'Title',
		dataIndex: 'title',
		key: 'title'
	}, {
		title: 'Action',
		key: 'action',
		render: (text, record) => (<span>
			<Link to={`/system/karas/${record.kid}`}><Icon type='edit'/></Link>
		</span>)
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

export default connect(mapStateToProps, mapDispatchToProps)(KaraList);
