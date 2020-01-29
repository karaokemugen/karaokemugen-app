import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Layout, Table, Row, Col, Radio, Select} from 'antd';
import {loading, errorMessage, warnMessage, infoMessage} from '../actions/navigation';
import {ReduxMappedProps} from '../react-app-env';
import i18next from 'i18next';
import { getTagTypeName } from '../utils/tagTypes';

interface SessionListState {
	unused: Array<any>
	repositories: Array<string>,
	repository: string,
	type: string;
}

class SessionList extends Component<ReduxMappedProps, SessionListState> {

	constructor(props) {
		super(props);
		this.state = {
			unused: [],
			repositories: [],
			repository: null,
			type: ''
		};

	}

	componentDidMount() {
		this.props.loading(true);
		this.refresh();
	}

	async refresh() {
		await axios.get('/api/repos')
		.then(res => {
			this.props.loading(false);
			this.setState({repository:res.data[0].Name, repositories: res.data.map(value => value.Name)});
		})
		.catch(err => {
			this.props.loading(false);
			this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
		});
	}

	getTags() {
		this.props.loading(true)
		axios.get(`/api/repos/${this.state.repository}/unusedTags`)
		.then(res => {
			this.props.loading(false);
			this.setState({unused: res.data.map(value => { return {name: value.name, types: value.types, file: value.tagfile}})});
		})
		.catch(err => {
			this.props.loading(false);
			this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
		});
	}

	getSeries() {
		this.props.loading(true)
		axios.get(`/api/repos/${this.state.repository}/unusedSeries`)
		.then(res => {
			this.props.loading(false);
			this.setState({unused: res.data.map(value => { return {name: value.name, file: value.seriefile}})});
		})
		.catch(err => {
			this.props.loading(false);
			this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
		});
	}

	getMedias() {
		this.props.loading(true)
		axios.get(`/api/repos/${this.state.repository}/unusedMedias`)
		.then(res => {
			this.props.loading(false);
			this.setState({unused: res.data.map(value => { return {file: value}})});
		})
		.catch(err => {
			this.props.loading(false);
			this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
		});
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Row type="flex">
							{this.state.repositories && this.state.repository ?
								<Col style={{ paddingRight: '100px'}}>
									<label style={{ paddingRight: '15px'}}>{i18next.t('UNUSED_FILES.REPOSITORY')}</label>
									<Select  style={{ width: 120 }} defaultValue={this.state.repository}>
										{this.state.repositories.map(repo => {
											return <Select.Option key={repo} value={repo}>{repo}</Select.Option>
										})
										}
									</Select>
								</Col> : null
							}
							<Col style={{ paddingTop: '5px'}}>
								<label style={{ paddingRight: '15px'}}>{i18next.t('MENU.UNUSED_FILES')}</label>
								<Radio checked={this.state.type === 'tags'} 
									onChange={async () => {
										await this.setState({type: 'tags'});
										this.getTags();
								}}>{i18next.t('UNUSED_FILES.TAGS')}</Radio>
								<Radio checked={this.state.type === 'series'} 
									onChange={async () => {
										await this.setState({type: 'series'});
										this.getSeries();
									}}>{i18next.t('UNUSED_FILES.SERIES')}</Radio>
								<Radio checked={this.state.type === 'medias'} 
									onChange={async () => {
										await this.setState({type: 'medias'});
										this.getMedias();
								}}>{i18next.t('UNUSED_FILES.MEDIAS')}</Radio>
							</Col>
						</Row>
					</Layout.Header>
					<Layout.Content>
						<Table
							dataSource={this.state.unused}
							columns={this.columns}
							rowKey='seid'
						/>
					</Layout.Content>
				</Layout>
			</Layout.Content>
		);
	}

	columns = [{
		title: i18next.t('UNUSED_FILES.NAME'),
		dataIndex: 'name',
		key: 'name'
	}, {
		title: i18next.t('UNUSED_FILES.TYPE'),
		dataIndex: 'types',
		key: 'types',
		render: types => types.map(t => i18next.t(`TAG_TYPES.${getTagTypeName(t)}`)).join(', ')
	}, {
		title: i18next.t('UNUSED_FILES.FILE'),
		dataIndex: 'file',
		key: 'file'
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


export default connect(mapStateToProps, mapDispatchToProps)(SessionList);
