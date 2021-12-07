import { DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { Button, Layout, Modal, Table } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import GlobalContext from '../../store/context';
import { commandBackend } from '../../utils/socket';

export default function Inbox() {
	const context = useContext(GlobalContext);

	const repoList = context.globalState.settings.data.config?.System?.Repositories.filter(
		(repo) =>
			repo.Online &&
			repo.MaintainerMode &&
			repo.Enabled &&
			context.globalState.auth.data.onlineToken &&
			repo.Name === context.globalState.auth.data.username.split('@')[1]
	);

	const [inbox, setInbox] = useState([]);

	const getInbox = async () => {
		if (repoList.length > 0) {
			const res = await commandBackend('getInbox', { repoName: repoList[0].Name });
			setInbox(res);
		}
	};

	const downloadKaraFromInbox = async (inid: string) => {
		await commandBackend('downloadKaraFromInbox', { repoName: repoList[0].Name, inid });
		getInbox();
	};

	const deleteKaraFromInbox = (inid: string) => {
		Modal.confirm({
			title: i18next.t('INBOX.DELETE'),
			okText: i18next.t('YES'),
			cancelText: i18next.t('NO'),
			onOk: async (close) => {
				close();
				await commandBackend('deleteKaraFromInbox', { repoName: repoList[0].Name, inid });
				getInbox();
			},
		});
	};

	useEffect(() => {
		getInbox();
	}, []);

	const columns = [
		{
			title: i18next.t('INBOX.TIMESTAMP'),
			dataIndex: 'created_at',
			key: 'created_at',
			render: (text) => new Date(text).toLocaleString(),
		},
		{
			title: i18next.t('INBOX.NAME'),
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: i18next.t('INBOX.TYPE'),
			dataIndex: 'fix',
			key: 'fix',
			render: (text) => (text ? 'Modification' : 'Création'),
		},
		{
			title: i18next.t('INBOX.USER'),
			dataIndex: 'username_downloaded',
			key: 'username_downloaded',
		},
		{
			title: i18next.t('INBOX.LINK_TO_ISSUE'),
			dataIndex: 'gitlab_issue',
			key: 'gitlab_issue',
			render: (text) => (
				<a href={text}>{i18next.t('INBOX.ISSUE', { number: text.split('/')[text.split('/').length - 1] })}</a>
			),
		},
		{
			title: i18next.t('ACTION'),
			render: (_text, record) => (
				<div style={{ display: 'flex' }}>
					<Button
						type="primary"
						icon={<DownloadOutlined />}
						onClick={() => downloadKaraFromInbox(record.inid)}
						title={i18next.t('INBOX.DOWNLOAD')}
					/>
					<Button
						type="primary"
						danger
						onClick={() => deleteKaraFromInbox(record.inid)}
						style={{ marginLeft: '1em' }}
						icon={<DeleteOutlined />}
					/>
				</div>
			),
		},
	];
	return (
		<>
			<Layout.Header>
				<div className="title">{i18next.t('HEADERS.INBOX.TITLE')}</div>
				<div className="description">{i18next.t('HEADERS.INBOX.DESCRIPTION')}</div>
			</Layout.Header>
			<Layout.Content>
				<Table dataSource={inbox} columns={columns} rowKey="inid" />
			</Layout.Content>
		</>
	);
}
