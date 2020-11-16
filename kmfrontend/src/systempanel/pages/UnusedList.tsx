import {Col, Layout, Radio, Row, Select,Table} from 'antd';
import i18next from 'i18next';
import React, {Component} from 'react';

import { commandBackend } from '../../utils/socket';
import { getTagTypeName } from '../../utils/tagTypes';

interface SessionListState {
	unused: Array<any>
	repositories: Array<string>,
	repository: string,
	type: string;
}

class SessionList extends Component<unknown, SessionListState> {

	state = {
		unused: [],
		repositories: [],
		repository: null,
		type: ''
	};

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		const res = await commandBackend('getRepos');
		this.setState({repository:res[0].Name, repositories: res.map(value => value.Name)});
	}

	getTags = async () => {
		const res = await commandBackend('getUnusedTags', {name: this.state.repository}, undefined, 60000);
		this.setState({unused: res.map(value => {
			return {name: value.name, types: value.types, file: value.tagfile};
		})});
	}

	getMedias = async () => {
		const res = await commandBackend('getUnusedMedias', {name: this.state.repository}, undefined, 60000);
		this.setState({unused: res.map(value => {
			return {file: value};
		})});
	}

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.UNUSED_FILES.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.UNUSED_FILES.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Row style={{margin: '0.5em'}}>
						{this.state.repositories && this.state.repository ?
							<Col style={{ paddingRight: '100px'}}>
								<label style={{ paddingRight: '15px'}}>{i18next.t('UNUSED_FILES.REPOSITORY')}</label>
								<Select  style={{ width: 150 }} defaultValue={this.state.repository}>
									{this.state.repositories.map(repo => {
										return <Select.Option key={repo} value={repo}>{repo}</Select.Option>;
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
					<Table
						dataSource={this.state.unused}
						columns={this.columns}
						rowKey='seid'
					/>
				</Layout.Content>
			</>
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
