import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Input, Divider, Modal, Tooltip, Tag, Icon, Button, Layout, Table} from 'antd';
import {Link} from 'react-router-dom';
import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import {ReduxMappedProps} from '../../react-app-env';

interface SeriesListProps extends ReduxMappedProps {}

interface SeriesListState {
	series: any[],
	serie: any,
	deleteModal: boolean,
}

class SeriesList extends Component<SeriesListProps, SeriesListState> {

	filter: string;

	constructor(props) {
		super(props);
		this.filter = '';
		this.state = {
			series: [],
			serie: {},
			deleteModal: false
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		this.props.loading(true);
		axios.get('/api/system/series',  { params: { filter: this.filter }})
			.then(res => {
				this.props.loading(false);
				this.setState({series: res.data.content});
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	delete = (seriesId) => {
		axios.delete(`/api/system/series/${seriesId}`)
			.then(() => {
				this.props.warnMessage('Series deleted.');
				this.setState({deleteModal: false, serie: {}});
				this.refresh();
			})
			.catch(err => {
				this.props.errorMessage(`Error ${err.response.status} : ${err.response.statusText}. ${err.response.data}`);
				this.setState({deleteModal: false, serie: {}});
			});
	};


	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Input.Search
							placeholder="Search filter"
							onChange={event => this.filter = event.target.value}
							enterButton="Search"
							onSearch={this.refresh.bind(this)}
						/>
					</Layout.Header>
					<Layout.Content><Table
						dataSource={this.state.series}
						columns={this.columns}
						rowKey='serie_id'
					/>
					<Button type='primary' onClick={this.refresh.bind(this)}>Refresh</Button>
					<Modal
						title='Confirm series deletion'
						visible={this.state.deleteModal}
						onOk={() => this.delete(this.state.serie.sid)}
						onCancel={() => this.setState({deleteModal: false, serie: {}})}
						okText='yes'
						cancelText='no'
					>
						<p>Delete series <b>{this.state.serie.name}</b></p>
						<p>This will remove its series.json file as well as in any .kara in your database!</p>
						<p>Are you sure?</p>
					</Modal>
					</Layout.Content>
				</Layout>
			</Layout.Content>
		);
	}

	columns = [{
		title: 'Original Name',
		dataIndex: 'name',
		key: 'name',
		render: name => name
	}, {
		title: 'Aliases',
		dataIndex: 'aliases',
		key: 'aliases',
		render: aliases => {
			let tags = [];
			if (aliases) {
				aliases.forEach((alias) => {
					const isLongTag = alias.length > 20;
					const tagElem = (
						<Tag>
							{isLongTag ? `${alias.slice(0, 20)}...` : alias}
						</Tag>
					);
					tags.push(isLongTag ? (<Tooltip title={alias} key={alias}>{tagElem}</Tooltip>) : tagElem);
					return true;
				});
			}
			return tags;
		}
	}, {
		title: 'International Names',
		dataIndex: 'i18n',
		key: 'i18n',
		render: i18n_names => {
			let names = [];
			i18n_names.forEach((i18n) => {
				const isLongTag = i18n.name.length > 40;
				const i18n_name = `[${i18n.lang.toUpperCase()}] ${i18n.name}`;
				const tagElem = (
					<Tag>
						{isLongTag ? `${i18n_name.slice(0, 20)}...` : i18n_name}
					</Tag>
				);
				names.push(isLongTag ? (<Tooltip title={i18n.name} key={i18n.lang}>{tagElem}</Tooltip>) : tagElem);
				return true;
			});
			return names;
		}
	}, {
		title: 'Action',
		key: 'action',
		render: (text, record) => (<span>
			<Link to={`/system/km/series/${record.sid}`}><Icon type='edit'/></Link>
			<Divider type="vertical"/>
			<Button type='danger' icon='delete' onClick={
				() => this.setState({deleteModal: true, serie: record})
			}/>
		</span>)
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

export default connect(mapStateToProps, mapDispatchToProps)(SeriesList);
