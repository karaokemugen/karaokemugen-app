import React, {Component} from 'react';
import {Layout, Table, Row, Col, Radio, Select} from 'antd';
import i18next from 'i18next';
import { getTagTypeName } from '../utils/tagTypes';
import Axios from 'axios';

interface SessionListState {
	unused: Array<any>
	repositories: Array<string>,
	repository: string,
	type: string;
}

class SessionList extends Component<{}, SessionListState> {

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
		this.refresh();
	}

	refresh = async () => {
		let res = await Axios.get('/repos');
		this.setState({repository:res.data[0].Name, repositories: res.data.map(value => value.Name)});
	}

	getTags = async () => {
		let res = await Axios.get(`/repos/${this.state.repository}/unusedTags`);
		this.setState({unused: res.data.map(value => { return {name: value.name, types: value.types, file: value.tagfile}})});
	}

	getMedias = async () => {
		let res = await Axios.get(`/repos/${this.state.repository}/unusedMedias`);
		this.setState({unused: res.data.map(value => { return {file: value}})});
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Row>
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
		render: types => types && types.map(t => i18next.t(`TAG_TYPES.${getTagTypeName(t)}`)).join(', ')
	}, {
		title: i18next.t('UNUSED_FILES.FILE'),
		dataIndex: 'file',
		key: 'file'
	}];
}

export default SessionList;
