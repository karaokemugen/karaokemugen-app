import { DeleteOutlined, DownloadOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Layout, Modal, Table } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import { User } from '../../../../src/lib/types/user';
import GlobalContext from '../../store/context';
import { commandBackend } from '../../utils/socket';

export default function Inbox() {
	const context = useContext(GlobalContext);

	const [inbox, setInbox] = useState([]);

	const repoList = context.globalState.settings.data.config?.System?.Repositories.filter(
		repo =>
			repo.Online &&
			repo.MaintainerMode &&
			repo.Enabled &&
			context.globalState.auth.data.onlineToken &&
			repo.Name === context.globalState.auth.data.username.split('@')[1]
	);

	const instance = repoList[0]?.Name;

	const getInbox = async () => {
		if (repoList.length > 0) {
			try {
				const res = await commandBackend('getInbox', { repoName: instance });
				setInbox(res);
			} catch (e) {
				// already display
			}
		}
	};

	const downloadKaraFromInbox = async (inid: string) => {
		try {
			await commandBackend('downloadKaraFromInbox', { repoName: instance, inid });
		} catch (e) {
			// already display
		}
		getInbox();
	};

	const deleteKaraFromInbox = (inid: string) => {
		Modal.confirm({
			title: i18next.t('INBOX.DELETE'),
			okText: i18next.t('YES'),
			cancelText: i18next.t('NO'),
			onOk: async close => {
				try {
					await commandBackend('deleteKaraFromInbox', { repoName: instance, inid });
				} catch (e) {
					// already display
				}
				getInbox();
				close();
			},
		});
	};

	const getContactInformations = async (text: string) => {
		const userDetails: User = await fetch(
			`https://${instance}/api/users/${encodeURIComponent(text.replace(`@${instance}`, ''))}?forcePublic=true`,
			{
				headers: {
					authorization: localStorage.getItem('kmOnlineToken'),
				},
			}
		).then(res => res.json());
		Modal.info({
			title: i18next.t('INBOX.CONTACT_INFOS'),
			content: (
				<div>
					<div>
						<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.USERNAME')}</label>
						{userDetails.flag_public ? (
							<a
								href={`https://${instance}/user/${userDetails.login}`}
								rel="noreferrer noopener"
								target="_blank"
							>
								{userDetails.login}
							</a>
						) : (
							<span>{userDetails.login}</span>
						)}
					</div>
					{userDetails?.email ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.MAIL')}</label>
							<span>{userDetails.email}</span>
						</div>
					) : null}
					{userDetails?.url ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.URL')}</label>
							<a href={userDetails.url} rel="noreferrer noopener" target="_blank">
								{userDetails.url}
							</a>
						</div>
					) : null}
					{userDetails?.social_networks.discord ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.SOCIAL_NETWORKS.DISCORD')}</label>
							{userDetails.social_networks.discord}
						</div>
					) : null}
					{userDetails?.social_networks.twitter ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.SOCIAL_NETWORKS.TWITTER')}</label>
							<a
								href={`https://twitter.com/${userDetails.social_networks.twitter}`}
								rel="noreferrer noopener"
								target="_blank"
							>
								{userDetails.social_networks.twitter}
							</a>
						</div>
					) : null}
					{userDetails?.social_networks.instagram ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.SOCIAL_NETWORKS.INSTAGRAM')}</label>
							<a
								href={`https://instagram.com/${userDetails.social_networks.instagram}`}
								rel="noreferrer noopener"
								target="_blank"
							>
								{userDetails.social_networks.instagram}
							</a>
						</div>
					) : null}
					{userDetails?.social_networks.twitch ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.SOCIAL_NETWORKS.TWITCH')}</label>
							<a
								href={`https://twitch.tv/${userDetails.social_networks.twitch}`}
								rel="noreferrer noopener"
								target="_blank"
							>
								{userDetails.social_networks.twitch}
							</a>
						</div>
					) : null}
				</div>
			),
		});
	};

	useEffect(() => {
		const getInbox = async () => {
			if (repoList.length > 0) {
				try {
					const res = await commandBackend('getInbox', { repoName: instance });
					setInbox(res);
				} catch (e) {
					// already display
				}
			}
		};
		getInbox();
	}, [instance, repoList.length]);

	const columns = [
		{
			title: i18next.t('INBOX.TIMESTAMP'),
			dataIndex: 'created_at',
			key: 'created_at',
			sorter: (a, b) => new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf(),
			sortDirections: ['ascend' as const, 'descend' as const, 'ascend' as const],
			defaultSortOrder: 'ascend' as const,
			render: text => new Date(text).toLocaleString(),
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
			render: text => (text ? 'Modification' : 'Création'),
		},
		{
			title: i18next.t('INBOX.USER'),
			dataIndex: 'username_downloaded',
			key: 'username_downloaded',
		},
		{
			title: i18next.t('INBOX.CONTACT_INFOS'),
			dataIndex: 'contact',
			key: 'contact',
			render: (text: string) =>
				text?.endsWith(`@${instance}`) ? (
					<Button onClick={() => getContactInformations(text)} icon={<UserOutlined />} />
				) : (
					text
				),
		},
		{
			title: i18next.t('INBOX.LINK_TO_ISSUE'),
			dataIndex: 'gitlab_issue',
			key: 'gitlab_issue',
			render: text => (
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
	let message;
	if (repoList.length === 0) {
		if (context.globalState.auth.data.onlineAvailable !== false) {
			message = i18next.t('INBOX.ONLINE_USER_REQUIRED');
		} else {
			message = i18next.t('INBOX.NO_REPOSITORY_ENABLED');
		}
	}
	return repoList.length === 0 ? (
		<Alert style={{ textAlign: 'left', margin: '20px' }} message={message} type="error" />
	) : (
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
