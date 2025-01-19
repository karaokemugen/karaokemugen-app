import { ClearOutlined, DeleteOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { Alert, Button, Layout, Table } from 'antd';
import i18next from 'i18next';
import prettyBytes from 'pretty-bytes';

import { commandBackend } from '../../utils/socket';
import Title from '../components/Title';
import { useEffect, useState } from 'react';

function Storage() {
	const [repositories, setRepositories] = useState<{ name: string; freeSpace: number }[]>([]);

	useEffect(() => {
		getRepos();
	}, []);

	const getRepos = async () => {
		const res = await commandBackend('getRepos');
		const repos: { name: string; freeSpace: number }[] = await Promise.all(
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
		setRepositories(repos);
	};

	const openMediaFolder = async (name: string) => {
		try {
			await commandBackend('openMediaFolder', { name }, true, 300000);
		} catch (_) {
			// already display
		}
	};

	const deleteOldRepoMedias = async (name: string) => {
		try {
			await commandBackend('deleteOldRepoMedias', { name }, true, 300000);
		} catch (_) {
			// already display
		}
	};

	const deleteAllRepoMedias = async (name: string) => {
		try {
			await commandBackend('deleteAllRepoMedias', { name }, true, 300000);
		} catch (_) {
			// already display
		}
	};

	const columns = [
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
				<Button type="primary" icon={<FolderOpenOutlined />} onClick={() => openMediaFolder(record.name)}>
					{i18next.t('REPOSITORIES.OPEN_MEDIA_FOLDER')}
				</Button>
			),
		},
		{
			key: 'deleteOldRepoMedias',
			align: 'center' as const,
			render: (_, record) => (
				<Button type="primary" danger icon={<ClearOutlined />} onClick={() => deleteOldRepoMedias(record.name)}>
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
					onClick={() => deleteAllRepoMedias(record.name)}
				>
					{i18next.t('REPOSITORIES.DELETE_ALL_MEDIAS')}
				</Button>
			),
		},
	];

	return (
		<>
			<Title title={i18next.t('HEADERS.STORAGE.TITLE')} description={i18next.t('HEADERS.STORAGE.DESCRIPTION')} />
			<Layout.Content>
				<Table dataSource={repositories} columns={columns} rowKey="name" />
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

export default Storage;
