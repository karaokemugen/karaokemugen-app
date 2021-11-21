import {
	CloudDownloadOutlined,
	CloudSyncOutlined,
	CloudUploadOutlined,
	ControlOutlined,
	DownOutlined,
	ExceptionOutlined,
	PullRequestOutlined,	ReloadOutlined,
	RightOutlined} from '@ant-design/icons';
import { Button, Checkbox, Divider, Layout, List,Modal, Table } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import i18next from 'i18next';
import { RenderExpandIconProps } from 'rc-table/lib/interface';
import { Dispatch, memo, useCallback, useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { Repository } from '../../../../src/lib/types/repo';
import { GitLogResult,GitStatusResult } from '../../../../src/types/git';
import { Commit, ModifiedMedia } from '../../../../src/types/repo';
import { commandBackend, getSocket } from '../../utils/socket';
import { displayMessage } from '../../utils/tools';

interface PendingPush {
	commits: {commits: Commit[], modifiedMedias: ModifiedMedia[]}
	repoName: string
}

interface Repo {
	repo: Repository
	label: string,
	conflicts: boolean,
	stashes: GitLogResult
}

async function getRepos(): Promise<Repo[]> {
	const repos: Repository[] = await commandBackend('getRepos');
	return Promise.all(
		repos.filter(repo => repo.Online && repo.MaintainerMode && repo.Enabled && repo.Git?.URL)
			.map(async repo => {
				const gitStatus: GitStatusResult = await commandBackend('checkRepo', { repoName: repo.Name });
				const stashes: GitLogResult = await commandBackend('listRepoStashes', { repoName: repo.Name });
				let label = i18next.t('REPOSITORIES.GIT_STATUSES.CLEAN');
				if (gitStatus.files.length > 0) {
					label = i18next.t('REPOSITORIES.GIT_STATUSES.MODIFIED');
				}
				if (gitStatus.conflicted.length > 0) {
					label = i18next.t('REPOSITORIES.GIT_STATUSES.CONFLICT');
				}
				return { repo, label, conflicts: gitStatus.conflicted.length > 0, stashes };
			})
	);
}

function StashList(props: {
	stashList: GitLogResult,
	repo: Repository,
	loading: boolean,
	setLoading: Dispatch<boolean>
	refreshRepo: () => void
}) {
	return (
		<>
			<p>
				<Trans
					i18nKey="REPOSITORIES.GIT_STASH"
					components={{1: <a href={props.repo.Git.URL} target="_blank" />}}
				/>
			</p>
			<List
				dataSource={[...props.stashList.all]}
				renderItem={(item, index) => (
					<List.Item
						actions={[<Button
							type="primary"
							icon={<PullRequestOutlined />}
							loading={props.loading}
							onClick={() => {
								props.setLoading(true);
								commandBackend('popStash', {repoName: props.repo.Name, stashId: index}, false, 120000)
									.then(props.refreshRepo);
							}}
						>
							{i18next.t('REPOSITORIES.GIT_UNSTASH')}
						</Button>,
						<Button
							type="primary"
							danger
							icon={<ExceptionOutlined />}
							loading={props.loading}
							onClick={() => {
								props.setLoading(true);
								commandBackend('dropStash', {repoName: props.repo.Name, stashId: index}, false, 120000)
									.then(props.refreshRepo);
							}}
						>
							{i18next.t('REPOSITORIES.GIT_DELETE')}
						</Button>]}
					>
						{item.message}
					</List.Item>
				)}
			/>
		</>
	);
}

const MemoStashList = memo(StashList);

function ExpandStashes(props: RenderExpandIconProps<Repo>) {
	return props.expandable ?
		<Button
			icon={props.expanded ? <DownOutlined />:<RightOutlined />}
			onClick={e => props.onExpand(props.record, e)}
			type="primary"
		>
			{i18next.t('REPOSITORIES.GIT_STASHLIST')}
		</Button>
		: null;
}

export default function Git() {
	const [repos, setRepos] = useState<Repo[]>([]);
	const [pendingPush, setPendingPush] = useState<PendingPush>();
	const [excludeList, setExcludeList] = useState<number[]>([]);
	const [gitStatus, setGitStatus] = useState<GitStatusResult & {repoName: string}>();
	const [loading, setLoading] = useState(false);
	const [showPushModal, setShowPushModal] = useState(false);
	const [showActionsModal, setShowActionsModal] = useState(false);

	const generateCommits = useCallback(async (repoName: string) => {
		setLoading(true);
		const commits = await commandBackend('getCommits', {repoName}).catch(() => null);
		if (!commits) {
			displayMessage('info', i18next.t('REPOSITORIES.GIT_NOTHING_TO_PUSH'));
			setLoading(false);
		} else {
			setPendingPush({repoName, commits});
			setShowPushModal(true);
		}
	}, []);

	const updateRepo = useCallback(async (repoName: string) => {
		setLoading(true);
		await commandBackend('updateRepo', {repoName}).catch(() => null);
		setLoading(false);
		// Refresh repos
		getRepos().then(setRepos);
	}, []);

	const pushCommits = useCallback(async () => {
		setLoading(true);
		await commandBackend('pushCommits', pendingPush);
		setShowPushModal(false);
	}, [pendingPush]);

	const toggleExclude = useCallback((e: CheckboxChangeEvent) => {
		const commit = pendingPush.commits.commits.findIndex(el => el.message === e.target.name);
		if (commit === -1) {
			throw new Error('An unknown commit was excluded');
		} else {
			const indexInExcludeList = excludeList.indexOf(commit);
			if (indexInExcludeList >= 0) {
				excludeList.splice(indexInExcludeList, 1);
				setExcludeList(excludeList);
			} else {
				setExcludeList([...excludeList, commit]);
			}
		}
	}, [pendingPush, excludeList]);

	const showDangerousActions = useCallback(async (repoName: string) => {
		const git: GitStatusResult = await commandBackend('checkRepo', { repoName });
		setGitStatus({...git, repoName});
		setShowActionsModal(true);
	}, []);

	const takeAction = useCallback(async (repoName: string, action: 'stash'|'reset') => {
		setLoading(true);
		let failed = false;
		try {
			// eslint-disable-next-line default-case
			switch (action) {
				case 'stash':
					await commandBackend('stashRepo', { repoName });
					break;
				case 'reset':
					await commandBackend('resetRepo', { repoName });
					break;
			}
		} catch (e) {
			failed = true;
		}
		if (!failed) {
			// All good!
			setShowActionsModal(false);
			displayMessage('success', i18next.t('MODAL.GIT_DANGEROUS.DONE'));
			// Refresh repos
			getRepos().then(setRepos);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		getRepos().then(setRepos);
	}, []);

	useEffect(() => {
		const listener = (repoName) => {
			if (repoName === pendingPush.repoName) {
				setLoading(false);
				setLoading(false);
				setPendingPush(null);
				setShowPushModal(false);
				// Refresh repos
				getRepos().then(setRepos);
			}
		};
		getSocket().on('pushComplete', listener);
		return () => {
			getSocket().off('pushComplete', listener);
		};
	}, [pendingPush]);

	const columns = [{
		title: i18next.t('REPOSITORIES.NAME'),
		dataIndex: ['repo', 'Name'],
		key: 'name'
	}, {
		title: i18next.t('REPOSITORIES.GIT_STATUS'),
		dataIndex: 'label',
		key: 'label'
	}, {
		title: i18next.t('REPOSITORIES.GIT_ACTIONS'),
		key: 'push',
		render: (_text, record) => {
			return (<>
				<Button type="primary" danger icon={<ControlOutlined />} loading={loading}
					onClick={() => {
						showDangerousActions(record.repo.Name);
					}}>
					{i18next.t('REPOSITORIES.GIT_DANGEROUS')}
				</Button>
				<Divider type="vertical" />
				<Button type="primary" icon={<CloudUploadOutlined />} loading={loading}
					onClick={() => generateCommits(record.repo.Name)} disabled={record.conflicts}>
					{i18next.t('REPOSITORIES.GIT_PUSH')}
				</Button>
				<Divider type="vertical" />
				<Button type="primary" icon={<CloudDownloadOutlined />} loading={loading}
					onClick={() => updateRepo(record.repo.Name)} disabled={record.conflicts}>
					{i18next.t('REPOSITORIES.GIT_PULL')}
				</Button>
			</>);
		}
	}];

	return (
		<>
			<Layout.Header>
				<div className="title">{i18next.t('HEADERS.GIT.TITLE')}</div>
				<div className="description">{i18next.t('HEADERS.GIT.DESCRIPTION')}</div>
			</Layout.Header>
			<Layout.Content>
				<Table
					dataSource={repos}
					columns={columns}
					expandable={{
						expandedRowRender: record => <MemoStashList
							stashList={record.stashes}
							repo={record.repo}
							refreshRepo={() => {
								getRepos().then(setRepos).then(() => setLoading(false));
							}}
							loading={loading}
							setLoading={setLoading}
						/>,
						rowExpandable: record => record.stashes.total > 0,
						expandIcon: ExpandStashes,
						defaultExpandAllRows: true
					}}
					rowKey={(rec) => rec.repo.Name}
				/>
			</Layout.Content>
			<Modal
				title={i18next.t('REPOSITORIES.GIT_CONFIRM_PUSH')}
				visible={showPushModal}
				onCancel={() => {
					setShowPushModal(false);
					setLoading(false);
					setPendingPush(null);
				}}
				onOk={pushCommits}
				okText={i18next.t('REPOSITORIES.GIT_PUSH')}
				confirmLoading={loading}
				cancelText={i18next.t('CANCEL')}
			>
				<ul>
					{pendingPush?.commits?.commits?.map(commit => (
						<li key={commit.message}>
							<Checkbox defaultChecked={true} name={commit.message} onChange={toggleExclude}>{commit.message}</Checkbox>
						</li>
					))}
				</ul>
			</Modal>
			<Modal
				title={i18next.t('MODAL.GIT_DANGEROUS.TITLE')}
				footer={null}
				cancelText={i18next.t('CANCEL')}
				onCancel={() => {
					if (loading) return;
					setShowActionsModal(false);
					setGitStatus(null);
				}}
				visible={showActionsModal}
			>
				<p>
					{i18next.t('MODAL.GIT_DANGEROUS.DESCRIPTION')}
				</p>
				{
					gitStatus?.files?.length > 0 ?
						<ul>
							{gitStatus?.files?.map((file, i) => (
								<li key={i.toString()}>
									{file.path}
								</li>
							))}
						</ul>
						: <ul>
							<li>
								{i18next.t('MODAL.GIT_DANGEROUS.EMPTY')}
							</li>
						</ul>
				}
				<p>
					<Button type="primary" icon={<CloudSyncOutlined />} block
						loading={loading}
						onClick={() => takeAction(gitStatus.repoName, 'stash')}
					>
						{i18next.t('MODAL.GIT_DANGEROUS.STASH.BTN')}
					</Button>
					<span>{i18next.t('MODAL.GIT_DANGEROUS.STASH.DESC')}</span>
				</p>
				<p>
					<Button type="primary" icon={<ExceptionOutlined />} block
						danger loading={loading}
						onClick={() => takeAction(gitStatus.repoName, 'reset')}
					>
						{i18next.t('MODAL.GIT_DANGEROUS.RESET.BTN')}
					</Button>
					<span>{i18next.t('MODAL.GIT_DANGEROUS.RESET.DESC')}</span>
				</p>
			</Modal>
		</>
	);
}
