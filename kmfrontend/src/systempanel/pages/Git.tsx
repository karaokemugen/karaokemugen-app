import 'diff2html/bundles/css/diff2html.min.css';

import {
	CloudDownloadOutlined,
	CloudSyncOutlined,
	CloudUploadOutlined,
	ControlOutlined,
	DiffOutlined,
	DownOutlined,
	EditOutlined,
	ExceptionOutlined,
	MinusOutlined,
	PlusOutlined,
	PullRequestOutlined,
	RightOutlined,
	UnorderedListOutlined,
} from '@ant-design/icons';
import { Alert, Button, Checkbox, Divider, Input, Layout, List, Modal, Table } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { html, parse } from 'diff2html';
import { ColorSchemeType } from 'diff2html/lib/types';
import i18next from 'i18next';
import { RenderExpandIconProps } from 'rc-table/lib/interface';
import { Dispatch, memo, MouseEvent, useCallback, useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { Repository } from '../../../../src/lib/types/repo';
import { GitLogResult, GitStatusResult } from '../../../../src/types/git';
import { Commit, ModifiedMedia } from '../../../../src/types/repo';
import { commandBackend, getSocket } from '../../utils/socket';
import { displayMessage } from '../../utils/tools';
import Title from '../components/Title';

type CommitWithComment = Commit & { comment: string; filesModified: boolean };

interface PendingPush {
	commits: { commits: CommitWithComment[]; modifiedMedias: ModifiedMedia[]; squash?: string };
	repoName: string;
}

interface Repo {
	repo: Repository;
	label: string;
	conflicts: boolean;
	stashes: GitLogResult;
}

async function getRepos(): Promise<Repo[]> {
	const repos: Repository[] = await commandBackend('getRepos');
	return Promise.all(
		repos
			.filter(repo => repo.Online && repo.MaintainerMode && repo.Enabled && repo.Git?.URL)
			.map(async repo => {
				const gitStatus: GitStatusResult = await commandBackend('checkRepo', { repoName: repo.Name });
				const stashes: GitLogResult = await commandBackend('listRepoStashes', { repoName: repo.Name });
				let label = i18next.t('REPOSITORIES.GIT_STATUSES.CLEAN');
				if (gitStatus.behind > 0) {
					label = i18next.t('REPOSITORIES.GIT_STATUSES.BEHIND');
				}
				if (gitStatus.files.length > 0 || gitStatus.ahead > 0) {
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
	stashList: GitLogResult;
	repo: Repository;
	loading: boolean;
	setLoading: Dispatch<boolean>;
	refreshRepo: () => void;
}) {
	const popStash = index => {
		try {
			props.setLoading(true);
			commandBackend('popStash', { repoName: props.repo.Name, stashId: index }, false, 120000).then(
				props.refreshRepo
			);
		} catch (_) {
			// already display
		}
	};

	const dropStash = index => {
		try {
			props.setLoading(true);
			commandBackend('dropStash', { repoName: props.repo.Name, stashId: index }, false, 120000).then(
				props.refreshRepo
			);
		} catch (_) {
			// already display
		}
	};

	return (
		<>
			<p>
				<Trans
					i18nKey="REPOSITORIES.GIT_STASH"
					components={{ 1: <a href={props.repo.Git.URL} rel="noreferrer noopener" /> }}
				/>
			</p>
			<List
				dataSource={[...props.stashList.all]}
				renderItem={(item, index) => (
					<List.Item
						actions={[
							<Button
								key={`pop-${index}`}
								type="primary"
								icon={<PullRequestOutlined />}
								loading={props.loading}
								onClick={() => popStash(index)}
							>
								{i18next.t('REPOSITORIES.GIT_UNSTASH')}
							</Button>,
							<Button
								key={`drop-${index}`}
								type="primary"
								danger
								icon={<ExceptionOutlined />}
								loading={props.loading}
								onClick={() => dropStash(index)}
							>
								{i18next.t('REPOSITORIES.GIT_DELETE')}
							</Button>,
						]}
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
	return props.expandable ? (
		<Button
			icon={props.expanded ? <DownOutlined /> : <RightOutlined />}
			onClick={e => props.onExpand(props.record, e)}
			type="primary"
		>
			{i18next.t('REPOSITORIES.GIT_STASHLIST')}
		</Button>
	) : null;
}

export default function Git() {
	const [repos, setRepos] = useState<Repo[]>([]);
	const [pendingPush, setPendingPush] = useState<PendingPush>();
	const [excludeList, setExcludeList] = useState<number[]>([]);
	const [gitStatus, setGitStatus] = useState<GitStatusResult & { repoName: string }>();
	const [loading, setLoading] = useState(false);
	const [showPushModal, setShowPushModal] = useState(false);
	const [showActionsModal, setShowActionsModal] = useState(false);
	const [squash, setSquash] = useState(false);
	const [squashMessage, setSquashMessage] = useState('');

	const generateCommits = useCallback(async (repoName: string) => {
		setLoading(true);
		const commits = await commandBackend('getCommits', { repoName }, false, 600000).catch(() => null);
		if (!commits) {
			const dummyPush = { commits: [], modifiedMedias: [] };
			setPendingPush({ repoName, commits: dummyPush });
			await commandBackend('pushCommits', { repoName, commits: dummyPush });
			displayMessage('info', i18next.t('REPOSITORIES.GIT_NOTHING_TO_PUSH'));
		} else {
			setPendingPush({ repoName, commits });
			setShowPushModal(true);
		}
	}, []);

	const updateRepo = useCallback(async (repoName: string) => {
		setLoading(true);
		await commandBackend('updateRepo', { repoName }, false, 300000).catch(() => null);
		setLoading(false);
		// Refresh repos
		getRepos().then(setRepos);
	}, []);

	const pushCommits = useCallback(async () => {
		setLoading(true);
		// Remove ignored commits
		const excludedMessages = pendingPush.commits.commits
			.filter((_el, i) => excludeList.includes(i))
			.map(c => c.message);
		pendingPush.commits.commits = pendingPush.commits.commits
			.filter((_el, i) => !excludeList.includes(i))
			// Concatenate auto-generated messages
			.map(c => {
				return {
					...c,
					message: `${c.message} ${c.comment || ''}`.trim(),
					comment: undefined,
				};
			});
		// Remove ignored medias by listing excluded commits messages
		pendingPush.commits.modifiedMedias = pendingPush.commits.modifiedMedias.filter(
			m => !excludedMessages.includes(m.commit)
		);
		if (squash) pendingPush.commits.squash = squashMessage;
		if (!squash || squashMessage !== '') {
			await commandBackend('pushCommits', pendingPush);
			setShowPushModal(false);
		} else {
			setLoading(false);
		}
	}, [pendingPush, excludeList, squash, squashMessage]);

	const deselectAllCommits = () => setExcludeList([...Array(pendingPush.commits.commits.length).keys()]);

	const toggleExclude = useCallback(
		(e: CheckboxChangeEvent) => {
			const commit = pendingPush.commits.commits.findIndex(el => el.message === e.target.name);
			if (commit === -1) {
				throw new Error('An unknown commit was excluded');
			} else {
				const indexInExcludeList = excludeList.indexOf(commit);
				if (indexInExcludeList >= 0) {
					const newExcludeList = [...excludeList];
					newExcludeList.splice(indexInExcludeList, 1);
					setExcludeList(newExcludeList);
				} else {
					setExcludeList([...excludeList, commit]);
				}
			}
		},
		[pendingPush, excludeList]
	);

	const showDangerousActions = useCallback(async (repoName: string) => {
		const git: GitStatusResult = await commandBackend('checkRepo', { repoName });
		setGitStatus({ ...git, repoName });
		setShowActionsModal(true);
	}, []);

	const takeAction = useCallback(async (repoName: string, action: 'stash' | 'reset') => {
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
		} catch (_) {
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

	const diffFile = async (e: MouseEvent, file: string) => {
		e.stopPropagation();
		e.preventDefault();
		const diff = await commandBackend('getFileDiff', {
			file,
			repoName: pendingPush.repoName,
		});
		const diffJson = parse(diff);
		Modal.info({
			icon: undefined,
			width: '80%',
			content: (
				<div
					dangerouslySetInnerHTML={{
						__html: html(diffJson, {
							drawFileList: false,
							outputFormat: 'side-by-side',
							colorScheme: ColorSchemeType.DARK,
						}),
					}}
				/>
			),
		});
	};

	const operatorNotificationError = (data: { code: string; data: string }) => {
		if (data.code === 'ERROR_CODES.REPO_GIT_PUSH_ERROR') setLoading(false);
	};

	useEffect(() => {
		getRepos().then(setRepos);
	}, []);

	useEffect(() => {
		const listener = repoName => {
			if (repoName === pendingPush?.repoName) {
				setLoading(false);
				setPendingPush(null);
				setShowPushModal(false);
				setExcludeList([]);
				// Refresh repos
				getRepos().then(setRepos);
			}
		};
		getSocket().on('operatorNotificationError', operatorNotificationError);
		getSocket().on('pushComplete', listener);
		return () => {
			getSocket().off('operatorNotificationError', operatorNotificationError);
			getSocket().off('pushComplete', listener);
		};
	}, [pendingPush]);

	const columns = [
		{
			title: i18next.t('REPOSITORIES.NAME'),
			dataIndex: ['repo', 'Name'],
			key: 'name',
		},
		{
			title: i18next.t('REPOSITORIES.GIT_STATUS'),
			dataIndex: 'label',
			key: 'label',
		},
		{
			title: i18next.t('REPOSITORIES.GIT_ACTIONS'),
			key: 'push',
			render: (_text, record) => {
				return (
					<>
						<Button
							type="primary"
							danger
							icon={<ControlOutlined />}
							loading={loading}
							onClick={() => {
								showDangerousActions(record.repo.Name);
							}}
						>
							{i18next.t('REPOSITORIES.GIT_DANGEROUS')}
						</Button>
						<Divider type="vertical" />
						<Button
							type="primary"
							icon={<CloudUploadOutlined />}
							loading={loading}
							onClick={() => generateCommits(record.repo.Name)}
							disabled={record.conflicts}
						>
							{i18next.t('REPOSITORIES.GIT_PUSH')}
						</Button>
						<Divider type="vertical" />
						<Button
							type="primary"
							icon={<CloudDownloadOutlined />}
							loading={loading}
							onClick={() => updateRepo(record.repo.Name)}
							disabled={record.conflicts}
						>
							{i18next.t('REPOSITORIES.GIT_PULL')}
						</Button>
					</>
				);
			},
		},
	];

	return (
		<>
			<Title title={i18next.t('HEADERS.GIT.TITLE')} description={i18next.t('HEADERS.GIT.DESCRIPTION')} />
			<Layout.Content>
				<Table
					dataSource={repos}
					columns={columns}
					expandable={{
						expandedRowRender: record => (
							<MemoStashList
								stashList={record.stashes}
								repo={record.repo}
								refreshRepo={() => {
									getRepos()
										.then(setRepos)
										.then(() => setLoading(false));
								}}
								loading={loading}
								setLoading={setLoading}
							/>
						),
						rowExpandable: record => record.stashes.total > 0,
						expandIcon: ExpandStashes,
						defaultExpandAllRows: true,
					}}
					rowKey={rec => rec.repo.Name}
					scroll={{
						x: true,
					}}
				/>
			</Layout.Content>
			<Modal
				title={i18next.t('REPOSITORIES.GIT_CONFIRM_PUSH')}
				width={'50em'}
				open={showPushModal}
				onCancel={() => {
					setExcludeList([]);
					setShowPushModal(false);
					setLoading(false);
					setPendingPush(null);
				}}
				onOk={pushCommits}
				okText={i18next.t('REPOSITORIES.GIT_PUSH')}
				cancelText={i18next.t('CANCEL')}
			>
				{pendingPush?.commits?.commits?.length > 20 ? (
					<Alert
						style={{ marginBottom: '1em' }}
						description={i18next.t('REPOSITORIES.GIT_TOO_MANY_CHANGES', {
							changes: pendingPush.commits.commits.length,
						})}
						type="warning"
					/>
				) : null}
				<Button
					type="primary"
					style={{ marginLeft: '1.7em', marginBottom: '1em' }}
					onClick={deselectAllCommits}
					disabled={squash}
				>
					{i18next.t('REPOSITORIES.DESELECT_ALL_COMMITS')}
				</Button>
				<Checkbox
					style={{ marginLeft: '1.7em', marginBottom: '1em', userSelect: 'none' }}
					onChange={() => setSquash(!squash)}
				>
					{i18next.t('REPOSITORIES.GIT_SQUASH_COMMITS')}
				</Checkbox>
				{squash ? (
					<Input
						required
						placeholder={i18next.t('REPOSITORIES.GIT_SQUASH_MESSAGE')}
						onChange={e => setSquashMessage(e.target.value)}
						autoFocus
					/>
				) : (
					<ul>
						{pendingPush?.commits?.commits?.map((commit, i) => (
							<li key={commit.message}>
								<Checkbox
									checked={!excludeList.includes(i)}
									name={commit.message}
									onChange={toggleExclude}
								>
									{typeof commit.comment === 'string' ? (
										<Input
											placeholder={i18next.t('REPOSITORIES.GIT_CUSTOM_MESSAGE')}
											disabled={excludeList.includes(i)}
											onChange={e => {
												setPendingPush(pPush => {
													const commits = [...pPush.commits.commits];
													commits[i] = {
														...commits[i],
														comment: e.target.value,
													};
													return { ...pPush, commits: { ...pPush.commits, commits } };
												});
											}}
											onClick={e => {
												e.stopPropagation();
												e.preventDefault();
											}}
											autoFocus
										/>
									) : (
										<Button
											title={i18next.t('REPOSITORIES.GIT_EDIT_MESSAGE')}
											icon={<EditOutlined />}
											style={{ marginRight: '0.5em' }}
											disabled={excludeList.includes(i)}
											onClick={e => {
												e.stopPropagation();
												e.preventDefault();
												setPendingPush(pPush => {
													const commits = [...pPush.commits.commits];
													commits[i] = {
														...commits[i],
														comment: '',
													};
													return { ...pPush, commits: { ...pPush.commits, commits } };
												});
											}}
										/>
									)}
									<span>{commit.message}</span>
									<Button
										title={i18next.t('REPOSITORIES.GIT_SEE_MODIFIED_FILES')}
										icon={<UnorderedListOutlined />}
										style={{ marginLeft: '0.5em' }}
										onClick={e => {
											e.stopPropagation();
											e.preventDefault();
											setPendingPush(pPush => {
												const commits = [...pPush.commits.commits];
												commits[i] = {
													...commits[i],
													filesModified: !commit.filesModified,
												};
												return { ...pPush, commits: { ...pPush.commits, commits } };
											});
										}}
									/>
									{commit.filesModified ? (
										<List size="small">
											{commit.addedFiles.map(file => (
												<List.Item
													key={file}
													style={{ display: 'flex', justifyContent: 'space-between' }}
													onClick={e => diffFile(e, file)}
												>
													<span>
														<PlusOutlined style={{ marginRight: '0.2em' }} />
														{file}
													</span>
													<Button
														title={i18next.t('REPOSITORIES.GIT_SEE_DIFF_IN_FILE')}
														icon={<DiffOutlined />}
														style={{ marginLeft: '0.5em' }}
													/>
												</List.Item>
											))}
											{commit.removedFiles.map(file => (
												<List.Item
													key={file}
													style={{ display: 'flex', justifyContent: 'space-between' }}
													onClick={e => diffFile(e, file)}
												>
													<span>
														<MinusOutlined style={{ marginRight: '0.2em' }} />
														{file}
													</span>
													<Button
														title={i18next.t('REPOSITORIES.GIT_SEE_DIFF_IN_FILE')}
														icon={<DiffOutlined />}
													/>
												</List.Item>
											))}
										</List>
									) : null}
								</Checkbox>
							</li>
						))}
					</ul>
				)}
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
				open={showActionsModal}
			>
				<p>{i18next.t('MODAL.GIT_DANGEROUS.DESCRIPTION')}</p>
				{gitStatus?.files?.length > 0 ? (
					<ul>{gitStatus?.files?.map((file, i) => <li key={i.toString()}>{file.path}</li>)}</ul>
				) : (
					<ul>
						<li>{i18next.t('MODAL.GIT_DANGEROUS.EMPTY')}</li>
					</ul>
				)}
				<p>
					<Button
						type="primary"
						icon={<CloudSyncOutlined />}
						block
						loading={loading}
						onClick={() => takeAction(gitStatus.repoName, 'stash')}
					>
						{i18next.t('MODAL.GIT_DANGEROUS.STASH.BTN')}
					</Button>
					<span>{i18next.t('MODAL.GIT_DANGEROUS.STASH.DESC')}</span>
				</p>
				<p>
					<Button
						type="primary"
						icon={<ExceptionOutlined />}
						block
						danger
						loading={loading}
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
