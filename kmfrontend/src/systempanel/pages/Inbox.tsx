import { DeleteOutlined, DownloadOutlined, RollbackOutlined, UserOutlined } from '@ant-design/icons';
import { EditOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Layout, Modal, Table } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Inbox as LibInbox } from '../../../../src/lib/types/inbox';
import { User } from '../../../../src/lib/types/user';
import GlobalContext from '../../store/context';
import { commandBackend } from '../../utils/socket';
import Title from '../components/Title';
import dayjs from 'dayjs';
import { WS_CMD } from '../../utils/ws';

export default function Inbox() {
	const context = useContext(GlobalContext);

	const [inbox, setInbox] = useState([] as LibInbox[]);

	const repoList = context.globalState.settings.data.config?.System?.Repositories.filter(
		repo =>
			repo.Online &&
			repo.MaintainerMode &&
			repo.Enabled &&
			context.globalState.auth.data.onlineToken &&
			repo.Name === context.globalState.auth.data.username.split('@')[1]
	);

	const instance = repoList[0];

	const getInbox = async () => {
		if (repoList.length > 0) {
			try {
				const res = await commandBackend(WS_CMD.GET_INBOX, { repoName: instance.Name });
				setInbox(res);
			} catch (_) {
				// already display
			}
		}
	};

	const downloadKaraFromInbox = async (inid: string) => {
		try {
			await commandBackend(WS_CMD.DOWNLOAD_KARA_FROM_INBOX, { repoName: instance.Name, inid });
		} catch (_) {
			// already display
		}
		getInbox();
	};

	const unassignKaraFromInbox = async (inid: string) => {
		try {
			await commandBackend(WS_CMD.UNASSIGN_KARA_FROM_INBOX, { repoName: instance.Name, inid });
		} catch (_) {
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
					await commandBackend(WS_CMD.DELETE_KARA_FROM_INBOX, { repoName: instance.Name, inid });
				} catch (_) {
					// already display
				}
				getInbox();
				close();
			},
		});
	};

	const getContactInformations = async (text: string) => {
		const userDetails: User = await fetch(
			`http${instance.Secure && 's'}://${instance.Name}/api/users/${encodeURIComponent(text.replace(`@${instance.Name}`, ''))}?forcePublic=true`,
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
								href={`http${instance.Secure && 's'}://${instance.Name}/user/${userDetails.login}`}
								rel="noreferrer noopener"
							>
								{userDetails.login}
							</a>
						) : (
							<span>{userDetails.login}</span>
						)}
					</div>
					{userDetails?.language ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.LANGUAGE')}</label>
							<span>{userDetails.language}</span>
						</div>
					) : null}
					{userDetails?.email ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.MAIL')}</label>
							<span>{userDetails.email}</span>
						</div>
					) : null}
					{userDetails?.url ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.URL')}</label>
							<a href={userDetails.url} rel="noreferrer noopener">
								{userDetails.url}
							</a>
						</div>
					) : null}
					{userDetails?.social_networks?.discord ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.SOCIAL_NETWORKS.DISCORD')}</label>
							{userDetails.social_networks.discord}
						</div>
					) : null}
					{userDetails?.social_networks?.mastodon ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.SOCIAL_NETWORKS.MASTODON')}</label>
							<a
								href={`https://${userDetails.social_networks.mastodon.split('@')[1]}/@${
									userDetails.social_networks.mastodon.split('@')[0]
								}`}
								rel="noreferrer noopener"
							>
								{userDetails.social_networks.mastodon}
							</a>
						</div>
					) : null}
					{userDetails?.social_networks?.bluesky ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.SOCIAL_NETWORKS.BLUESKY')}</label>
							<a
								href={`https://bsky.app/profile/${userDetails.social_networks.bluesky}`}
								rel="noreferrer noopener"
							>
								{userDetails.social_networks.bluesky}
							</a>
						</div>
					) : null}
					{userDetails?.social_networks?.instagram ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.SOCIAL_NETWORKS.INSTAGRAM')}</label>
							<a
								href={`https://instagram.com/${userDetails.social_networks.instagram}`}
								rel="noreferrer noopener"
							>
								{userDetails.social_networks.instagram}
							</a>
						</div>
					) : null}
					{userDetails?.social_networks?.twitch ? (
						<div>
							<label>{i18next.t('INBOX.CONTACT_INFOS_MODAL.SOCIAL_NETWORKS.TWITCH')}</label>
							<a
								href={`https://twitch.tv/${userDetails.social_networks.twitch}`}
								rel="noreferrer noopener"
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
					const res = await commandBackend(WS_CMD.GET_INBOX, { repoName: instance.Name });
					setInbox(res);
				} catch (_) {
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
			render: text => dayjs(text).format('L LTS'),
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
			render: text => (text ? i18next.t('INBOX.TYPES.MODIFICATION') : i18next.t('INBOX.TYPES.CREATION')),
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
				text?.endsWith(`@${instance.Name}`) ? (
					<Button onClick={() => getContactInformations(text)} icon={<UserOutlined />}>
						{text?.replace(`@${instance.Name}`, '')}
					</Button>
				) : (
					text
				),
		},
		{
			title: i18next.t('INBOX.LINK_TO_ISSUE'),
			dataIndex: 'gitlab_issue',
			key: 'gitlab_issue',
			render: text =>
				text && (
					<a href={text}>
						{i18next.t('INBOX.ISSUE', { number: text?.split('/')[text?.split('/').length - 1] })}
					</a>
				),
		},
		{
			title: i18next.t('INBOX.REVIEW'),
			render: (_text, record: LibInbox) =>
				record.available_locally &&
				record.username_downloaded === context.globalState.auth.data.username.split('@')[0] ? (
					<div style={{ display: 'flex' }}>
						<Link to={`/system/karas/${record.edited_kid || record.kid}`} style={{ marginRight: '0.75em' }}>
							<Button type="primary" icon={<EditOutlined />} title={i18next.t('KARA.EDIT_KARA')} />
						</Link>
						<Button
							type="primary"
							icon={<PlayCircleOutlined />}
							onClick={() =>
								commandBackend(WS_CMD.PLAY_KARA, {
									kid: record.edited_kid || record.kid,
								}).catch(() => {})
							}
							title={i18next.t('KARA.PLAY_KARAOKE')}
						/>
					</div>
				) : (
					''
				),
		},

		{
			title: i18next.t('ACTION'),
			render: (_text, record: LibInbox) => (
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
						onClick={() => unassignKaraFromInbox(record.inid)}
						style={{ marginLeft: '1em' }}
						title={i18next.t('INBOX.UNASSIGN_FROM_SONG')}
						icon={<RollbackOutlined />}
					/>
					<Button
						type="primary"
						danger
						onClick={() => deleteKaraFromInbox(record.inid)}
						style={{ marginLeft: '1em' }}
						title={i18next.t('INBOX.DELETE_SONG')}
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
			<Title title={i18next.t('HEADERS.INBOX.TITLE')} description={i18next.t('HEADERS.INBOX.DESCRIPTION')} />
			<Layout.Content>
				<Table
					dataSource={inbox}
					columns={columns}
					rowKey="inid"
					scroll={{
						x: true,
					}}
					expandable={{
						showExpandColumn: false,
					}}
				/>
			</Layout.Content>
		</>
	);
}
