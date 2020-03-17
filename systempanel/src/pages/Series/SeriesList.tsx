import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Input, Divider, Modal, Tooltip, Tag, Icon, Button, Layout, Table} from 'antd';
import {Link} from 'react-router-dom';
import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import {ReduxMappedProps} from '../../react-app-env';
import i18next from 'i18next';

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
		axios.get('/api/series',  { params: { filter: this.filter }})
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
		axios.delete(`/api/series/${seriesId}`)
			.then(() => {
				this.props.warnMessage(i18next.t('SERIES.SERIE_DELETED'));
				this.setState({deleteModal: false, serie: {}});
				this.refresh();
			})
			.catch(err => {
				this.props.errorMessage(`${i18next.t('ERROR')} ${err.response.status} : ${err.response.statusText}. ${err.response.data}`);
				this.setState({deleteModal: false, serie: {}});
			});
	};


	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Input.Search
							placeholder={i18next.t('SEARCH_FILTER')}
							onChange={event => this.filter = event.target.value}
							enterButton={i18next.t('SEARCH')}
							onSearch={this.refresh.bind(this)}
						/>
					</Layout.Header>
					<Layout.Content><Table
						dataSource={this.state.series}
						columns={this.columns}
						rowKey='sid'
					/>
					<Modal
						title={i18next.t('SERIES.SERIE_DELETED_CONFIRM')}
						visible={this.state.deleteModal}
						onOk={() => this.delete(this.state.serie.sid)}
						onCancel={() => this.setState({deleteModal: false, serie: {}})}
						okText={i18next.t('YES')}
						cancelText={i18next.t('NO')}
					>
						<p>{i18next.t('SERIES.DELETED_SERIE_CONFIRM')} <b>{this.state.serie.name}</b></p>
						<p>{i18next.t('SERIES.DELETE_SERIE_MESSAGE')}</p>
						<p>{i18next.t('CONFIRM_SURE')}</p>
					</Modal>
					</Layout.Content>
				</Layout>
			</Layout.Content>
		);
	}

	columns = [{
		title: i18next.t('TAGS.NAME'),
		dataIndex: 'name',
	}, {
		title: i18next.t('TAGS.ALIASES'),
		dataIndex: 'aliases',
		render: aliases => {
			let tags = [];
			if (aliases) {
				aliases.forEach((alias) => {
					const isLongTag = alias.length > 20;
					const tagElem = (
						<Tag key={alias} style={{margin: '2px'}}>
							{isLongTag ? `${alias.slice(0, 20)}...` : alias}
						</Tag>
					);
					tags.push(isLongTag ? (<Tooltip title={alias} key={alias}>{tagElem}</Tooltip>) : tagElem);
				});
			}
			return tags;
		}
	}, {
		title: i18next.t('TAGS.I18N'),
		dataIndex: 'i18n',
		render: i18n_names => {
			let names = [];
			i18n_names.forEach((i18n) => {
				const isLongTag = i18n.name.length > 40;
				const i18n_name = `[${i18n.lang.toUpperCase()}] ${i18n.name}`;
				const tagElem = (
					<Tag key={i18n_name} style={{margin: '2px'}}>
						{isLongTag ? `${i18n_name.slice(0, 20)}...` : i18n_name}
					</Tag>
				);
				names.push(isLongTag ? (<Tooltip title={i18n.name} key={i18n.lang}>{tagElem}</Tooltip>) : tagElem);
			});
			return names;
		}
	}, {
		width: '100px',
		title: i18next.t('ACTION'),
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
