import { ClearOutlined, DeleteOutlined } from '@ant-design/icons';
import { Alert, Button, Layout, Table } from 'antd';
import i18next from 'i18next';
import prettyBytes from 'pretty-bytes';
import React, { Component } from 'react';

import { commandBackend } from '../../utils/socket';

interface StorageState {
	repositories: { name: string, freeSpace: number }[]
}

class Storage extends Component<unknown, StorageState> {

	state = {
		repositories: []
	};

	componentDidMount() {
		this.getRepos();
	}

	getRepos = async () => {
		const res = await commandBackend('getRepos');
		const repositories: { name: string, freeSpace: number }[] = await Promise.all(
			res.filter(repo => repo.Online).map(async repo => {
				const freeSpace = await commandBackend('getRepoFreeSpace', { repoName: repo.Name });
				return { name: repo.Name, freeSpace: prettyBytes(freeSpace) };
			})
		);
		this.setState({ repositories });
	}

	deleteOldRepoMedias = async (name: string) => {
		await commandBackend('deleteOldRepoMedias', { name });
	}

	deleteAllRepoMedias = async (name: string) => {
		await commandBackend('deleteAllRepoMedias', { name });
	}

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.STORAGE.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.STORAGE.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Table
						dataSource={this.state.repositories}
						columns={this.columns}
						rowKey='name'
					/>
					<Alert
						type="info"
						message={i18next.t('REPOSITORIES.STORAGE_INFO')}
						description={<ul>
							<li>{i18next.t('REPOSITORIES.STORAGE_INFO_DELETE')}</li>
							<li>{i18next.t('REPOSITORIES.STORAGE_INFO_MOVE')}</li>
						</ul>}	
					/>
				</Layout.Content>
			</>
		);
	}

	columns = [{
		title: i18next.t('REPOSITORIES.NAME'),
		dataIndex: 'name',
		key: 'name'
	}, {
		title: i18next.t('REPOSITORIES.FREE_SPACE'),
		dataIndex: 'freeSpace',
		key: 'freeSpace'
	}, {
		key: 'deleteOldRepoMedias',
		align: 'center' as const,
		render: (text_, record) => (
			<Button type="primary" danger icon={<ClearOutlined />}
				onClick={() => this.deleteOldRepoMedias(record.name)}>{i18next.t('REPOSITORIES.DELETE_OLD_MEDIAS')}</Button>
		)
	}, {
		key: 'deleteAllRepoMedias',
		align: 'center' as const,
		render: (text_, record) => (
			<Button type="primary"  danger icon={<DeleteOutlined />}
				onClick={() => this.deleteAllRepoMedias(record.name)}>{i18next.t('REPOSITORIES.DELETE_ALL_MEDIAS')}</Button>
		)
	}];
}

export default Storage;
