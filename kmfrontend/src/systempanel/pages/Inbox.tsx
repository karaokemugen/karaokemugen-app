import {
	CheckCircleTwoTone,
	CloseCircleTwoTone,
	DeleteOutlined,
	DownloadOutlined,
	DownOutlined,
	RollbackOutlined,
	UserOutlined,
	WarningTwoTone,
} from '@ant-design/icons';
import { EditOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Dropdown, Layout, Modal, Select, Space, Table, Tag } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { DBInbox, InboxActions, Inbox as LibInbox } from '../../../../src/lib/types/inbox';
import { User } from '../../../../src/lib/types/user';
import GlobalContext from '../../store/context';
import { commandBackend } from '../../utils/socket';
import Title from '../components/Title';
import dayjs from 'dayjs';
import { WS_CMD } from '../../utils/ws';
import { getLanguagesInLocaleFromCode } from '../../utils/isoLanguages';
import { MenuProps } from 'antd/lib';
import { ChangeStatusInboxModal } from '../components/ChangeStatusInboxModal';
import { ItemType } from 'antd/es/menu/interface';
import DOMPurify from 'dompurify';

type FilterInboxActions = InboxActions | 'in_review_by_me';

export default function Inbox() {
	const context = useContext(GlobalContext);

	const [inbox, setInbox] = useState<LibInbox[]>([]);
	const [filteredInbox, setFilteredInbox] = useState<LibInbox[]>([]);
	const [openStatusModal, setOpenStatusModal] = useState(false);
	const [inboxToUpdate, setInboxToupdate] = useState<DBInbox>();
	const [newStatus, setNewStatus] = useState<InboxActions>();
	const [selectedStatus, setSelectedStatus] = useState<FilterInboxActions[]>(['sent', 'in_review_by_me']);

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

	const deleteKaraFromInboxLocally = async (kid: string) => {
		try {
			await commandBackend(WS_CMD.DELETE_KARA_INBOX_LOCALLY, { kid });
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
							<span>
								{getLanguagesInLocaleFromCode(
									userDetails.language,
									context.globalState.settings.data.user.language
								)}
							</span>
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

	const handleMenuClick = async (e, record: DBInbox) => {
		setInboxToupdate(record);
		setNewStatus(e.key as InboxActions);
		setOpenStatusModal(true);
	};

	const seeReason = (reason: string) => {
		//URLs starting with http://, https://, or ftp://
		var replaceUrlPattern = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
		var reasonWithUrl = reason.replace(replaceUrlPattern, '<a href="$1">$1</a>');
		Modal.info({
			style: { whiteSpace: 'pre-wrap' },
			title: i18next.t('MODAL.CHANGE_STATUS_INBOX.REASON'),
			content: <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reasonWithUrl) }} />,
		});
	};

	const items: MenuProps['items'] = [
		{
			label: i18next.t('INBOX.CHANGE_STATUS.ACCEPT'),
			key: 'accepted',
			icon: <CheckCircleTwoTone twoToneColor="#52c41a" />,
		},
		{
			label: i18next.t('INBOX.CHANGE_STATUS.ASK_FOR_CHANGES'),
			key: 'changes_requested',
			icon: <WarningTwoTone twoToneColor="#ffa500" />,
		},
		{
			label: i18next.t('INBOX.CHANGE_STATUS.REJECT'),
			key: 'rejected',
			icon: <CloseCircleTwoTone twoToneColor="#cc1b7cff" />,
			danger: true,
		},
	];

	useEffect(() => {
		filterInbox(selectedStatus);
	}, [inbox]);

	useEffect(() => {
		getInbox();
	}, [instance, repoList.length]);

	const status_filter = ['sent', 'in_review', 'in_review_by_me', 'changes_requested', 'accepted', 'rejected'];

	const filterInbox = (valuesStatus: FilterInboxActions[]) => {
		setSelectedStatus(valuesStatus);
		let newFilteredInbox = [];
		if (valuesStatus.length === 0) newFilteredInbox = newFilteredInbox.concat(inbox);
		valuesStatus.forEach(status => {
			if (status === 'in_review_by_me') {
				newFilteredInbox = newFilteredInbox.concat(
					inbox.filter(
						inboxInReview =>
							inboxInReview.status === 'in_review' &&
							inboxInReview.username_downloaded === context.globalState.auth.data.username.split('@')[0]
					)
				);
			} else {
				newFilteredInbox = newFilteredInbox.concat(inbox.filter(inbox => inbox.status === status));
			}
		});
		setFilteredInbox(newFilteredInbox);
	};

	const getMenu = (record: LibInbox) => {
		const menu: ItemType[] = [];
		const deleteButton = {
			key: '1',
			label: i18next.t('INBOX.DELETE_SONG'),
			icon: <DeleteOutlined />,
			danger: true,
			onClick: () => deleteKaraFromInbox(record.inid),
		};

		const unassignButton = {
			key: '2',
			label: i18next.t('INBOX.UNASSIGN_FROM_SONG'),
			icon: <RollbackOutlined />,
			danger: true,
			onClick: () => unassignKaraFromInbox(record.inid),
		};
		if (record.username_downloaded === context.globalState.auth.data.username.split('@')[0]) {
			menu.push(unassignButton);
		}
		menu.push(deleteButton);
		return menu;
	};

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
			render: (text, record: LibInbox) => (
				<div>
					{text}
					<Tag style={{ marginLeft: '0.5em' }}>
						{record.flag_fix ? i18next.t('INBOX.TYPES.MODIFICATION') : i18next.t('INBOX.TYPES.CREATION')}
					</Tag>
				</div>
			),
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
			title: i18next.t('INBOX.STATUS.LABEL'),
			dataIndex: 'status',
			key: 'status',
			render: (text, record: LibInbox) =>
				text && (
					<>
						<span>{i18next.t(`INBOX.STATUS.${text.toUpperCase()}`)}</span>
						{record.reject_reason && (
							<Button
								className="mt-1"
								type="primary"
								htmlType="button"
								onClick={() => seeReason(record.reject_reason)}
							>
								{i18next.t('MODAL.CHANGE_STATUS_INBOX.REASON')}
							</Button>
						)}
					</>
				),
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
				record.username_downloaded === context.globalState.auth.data.username.split('@')[0] && (
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
				),
		},
		{
			title: i18next.t('ACTION'),
			render: (_text, record: LibInbox) => (
				<div style={{ display: 'flex', gap: '0.5em' }}>
					{record.available_locally && !record.flag_fix ? (
						<Button
							onClick={() => deleteKaraFromInboxLocally(record.kid)}
							style={{ marginLeft: '1em' }}
							title={i18next.t('INBOX.DELETE_SONG_LOCALLY')}
							icon={<DeleteOutlined />}
						/>
					) : (
						<Button
							type="primary"
							icon={<DownloadOutlined />}
							onClick={() => downloadKaraFromInbox(record.inid)}
							title={i18next.t('INBOX.DOWNLOAD')}
						/>
					)}
					<Dropdown menu={{ items: getMenu(record) }}>
						<Button icon={<DownOutlined />} />
					</Dropdown>
					<Dropdown
						menu={{
							items,
							onClick: e => handleMenuClick(e, record),
						}}
					>
						<Button>
							<Space>
								{i18next.t('INBOX.CHANGE_STATUS.LABEL')}
								<DownOutlined />
							</Space>
						</Button>
					</Dropdown>
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
				<div style={{ display: 'flex', marginBottom: '1em', alignItems: 'center' }}>
					<label style={{ marginLeft: '2em', paddingRight: '1em' }}>
						{i18next.t('INBOX.FILTER_BY_STATUS')} :
					</label>
					<Select mode="multiple" style={{ width: 300 }} onChange={filterInbox} defaultValue={selectedStatus}>
						{status_filter.map(status => {
							return (
								<Select.Option key={status} value={status}>
									{i18next.t(`INBOX.STATUS.${status.toLocaleUpperCase()}`)}
								</Select.Option>
							);
						})}
					</Select>
				</div>
				<Table
					dataSource={filteredInbox}
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
			<ChangeStatusInboxModal
				open={openStatusModal}
				inbox={inboxToUpdate}
				status={newStatus}
				repoName={instance.Name}
				close={() => {
					setOpenStatusModal(false);
					getInbox();
				}}
			/>
		</>
	);
}
