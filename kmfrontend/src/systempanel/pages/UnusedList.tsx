import { DeleteOutlined } from '@ant-design/icons';
import { Button, Col, Layout, Radio, Row, Select, Table } from 'antd';
import i18next from 'i18next';
import React, { Component } from 'react';

import { commandBackend } from '../../utils/socket';
import { getTagTypeName, tagTypes } from '../../utils/tagTypes';

interface SessionListState {
	unused: any[]
	repositories: string[],
	repository: string,
	type?: 'tags' | 'medias';
	tagType?: number;
}

class SessionList extends Component<unknown, SessionListState> {

	state = {
		unused: [],
		repositories: [],
		repository: null,
		type: undefined,
		tagType: undefined
	};

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		const res = await commandBackend('getRepos');
		this.setState({ repository: res[0].Name, repositories: res.map(value => value.Name) });
	}

	getTags = async () => {
		const res = await commandBackend('getUnusedTags', { name: this.state.repository }, undefined, 60000);
		this.setState({
			unused: res ? res.map(value => {
				return { name: value.name, types: value.types, file: value.tagfile, tid: value.tid };
			}) : []
		});
	}

	getMedias = async () => {
		const res = await commandBackend('getUnusedMedias', { name: this.state.repository }, undefined, 600000);
		this.setState({
			unused: res ? res.map(value => {
				return { file: value };
			}) : []
		});
	}

	changeType = async (value) => {
		this.setState({ tagType: value });
	}

	deleteMedia = async (file: string) => {
		try {
			await commandBackend('deleteMediaFile', { file: file, repo: this.state.repository });
			this.setState({ unused: this.state.unused.filter(item => item.file !== file) });
		} catch (err) {
			// already display
		}
	};

	deleteTag = async (tid) => {
		try {
			await commandBackend('deleteTag', { tids: [tid] });
			this.setState({ unused: this.state.unused.filter(item => item.tid !== tid) });
		} catch (err) {
			// already display
		}
	};

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.UNUSED_FILES.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.UNUSED_FILES.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Row style={{ marginBottom: '0.5em', marginLeft: '0.5em' }}>
						{this.state.repositories && this.state.repository ?
							<Col style={{ paddingRight: '5em' }}>
								<label style={{ paddingRight: '15px' }}>{i18next.t('UNUSED_FILES.REPOSITORY')}</label>
								<Select style={{ width: 150 }} defaultValue={this.state.repository}>
									{this.state.repositories.map(repo => {
										return <Select.Option key={repo} value={repo}>{repo}</Select.Option>;
									})
									}
								</Select>
							</Col> : null
						}
						<Col style={{ paddingTop: '5px' }}>
							<label style={{ paddingRight: '1em' }}>{i18next.t('MENU.UNUSED_FILES')}</label>
							<Radio
								checked={this.state.type === 'tags'}
								onChange={async () => this.setState({ type: 'tags' }, this.getTags)}
							>
								{i18next.t('UNUSED_FILES.TAGS')}
							</Radio>
							<Radio
								checked={this.state.type === 'medias'}
								onChange={async () => this.setState({ type: 'medias' }, this.getMedias)}
							>
								{i18next.t('UNUSED_FILES.MEDIAS')}
							</Radio>
						</Col>
						{this.state.type === 'tags' ?
							<Col>
								<label style={{ marginLeft: '2em', paddingRight: '1em' }}>{i18next.t('TAGS.TYPES')} :</label>
								<Select allowClear={true} style={{ width: 300 }} onChange={this.changeType} defaultValue={this.state.tagType}>
									{Object.entries(tagTypes).map(([key, value]) => {
										return <Select.Option key={value.type} value={value.type}>{i18next.t(`TAG_TYPES.${key}`)}</Select.Option>;
									})
									}
								</Select>
							</Col> : null
						}
					</Row>
					<Table
						dataSource={this.state.unused.filter(e => !this.state.tagType || e.types.includes(this.state.tagType))}
						columns={this.columns}
						rowKey='file'
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
	},
	{
		title: i18next.t('ACTION'),
		render: (text_, record) =>
			<Button type="primary" danger icon={<DeleteOutlined />} onClick={
				() => this.state.type === 'medias' ? this.deleteMedia(record.file) : this.deleteTag(record.tid)
			} />
	}];
}

export default SessionList;
