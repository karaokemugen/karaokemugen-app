import { ClearOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { Alert, Button, Layout, Table } from 'antd';
import i18next from 'i18next';
import prettyBytes from 'pretty-bytes';
import { Component } from 'react';

import { commandBackend } from '../../utils/socket';
import Title from '../components/Title';

interface StorageState {
	repositories: { name: string; freeSpace: number }[];
}

class Storage extends Component<unknown, StorageState> {
	state = {
		repositories: [],
	};

	componentDidMount() {
		this.getRepos();
	}

	getRepos = async () => {
		const res = await commandBackend('getRepos');
		const repositories: { name: string; freeSpace: number }[] = await Promise.all(
			res
				.filter(repo => repo.Online)
				.map(async repo => {
					const freeSpace: number | null = await commandBackend(
						'getRepoFreeSpace',
						{ repoName: repo.Name },
						false,
						300000
					);
					return { name: repo.Name, freeSpace: freeSpace == null ? 'N/A' : prettyBytes(freeSpace) };
				})
		);
		this.setState({ repositories });
	};

	openMediaFolder = async (name: string) => {
		try {
			await commandBackend('openMediaFolder', { name }, true, 300000);
		} catch (_) {
			// already display
		}
	};

	deleteOldRepoMedias = async (name: string) => {
		try {
			await commandBackend('deleteOldRepoMedias', { name }, true, 300000);
		} catch (_) {
			// already display
		}
	};

	deleteAllRepoMedias = async (name: string) => {
		try {
			await commandBackend('deleteAllRepoMedias', { name }, true, 300000);
		} catch (_) {
			// already display
		}
	};

	render() {
		return (
			<>
				<Title
					title={i18next.t('HEADERS.STORAGE.TITLE')}
					description={i18next.t('HEADERS.STORAGE.DESCRIPTION')}
				/>
				<Layout.Content>
					<Table dataSource={this.state.repositories} columns={this.columns} rowKey="name" />
					<Alert
						type="info"
						message={i18next.t('REPOSITORIES.STORAGE_INFO')}
						description={
							<ul>
								<li>{i18next.t('REPOSITORIES.STORAGE_INFO_DELETE')}</li>
								<li>{i18next.t('REPOSITORIES.STORAGE_INFO_MOVE')}</li>
							</ul>
						}
					/>
				</Layout.Content>
			</>
		);
	}

	columns = [
		{
			title: i18next.t('REPOSITORIES.NAME'),
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: i18next.t('REPOSITORIES.FREE_SPACE'),
			dataIndex: 'freeSpace',
			key: 'freeSpace',
		},
		{
			key: 'openFolder',
			align: 'center' as const,
			render: (_, record) => (
				<Button type="primary" icon={<FolderOpenOutlined />} onClick={() => this.openMediaFolder(record.name)}>
					{i18next.t('REPOSITORIES.OPEN_MEDIA_FOLDER')}
				</Button>
			),
		},
		{
			key: 'deleteOldRepoMedias',
			align: 'center' as const,
			render: (_, record) => (
				<Button
					type="primary"
					danger
					icon={<ClearOutlined />}
					onClick={() => this.deleteOldRepoMedias(record.name)}
				>
					{i18next.t('REPOSITORIES.DELETE_OLD_MEDIAS')}
				</Button>
			),
		},
		{
			key: 'deleteAllRepoMedias',
			align: 'center' as const,
			render: (_, record) => (
				<Button
					type="primary"
					danger
					icon={<DeleteOutlined />}
					onClick={() => this.deleteAllRepoMedias(record.name)}
				>
					{i18next.t('REPOSITORIES.DELETE_ALL_MEDIAS')}
				</Button>
			),
		},
	];
}

export default Storage;
