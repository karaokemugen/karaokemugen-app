import { QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Divider, Form, Input, Select, Tooltip } from 'antd';
import { useForm } from 'antd/es/form/Form';
import i18next from 'i18next';
import { useEffect, useState } from 'react';

import { Repository } from '../../../../../src/lib/types/repo';
import { TaskItem } from '../../../../../src/lib/types/taskItem';
import { commandBackend, getSocket } from '../../../utils/socket';
import FoldersElement from '../../components/FoldersElement';

interface RepositoriesFormProps {
	repository: Repository;
	save: (repository: Repository) => void;
	movingMedia: (movingMediaPath: string) => void;
	convertToUUID: (repo: string) => void;
	compareLyrics: (repo: string) => void;
	syncTags: (repo: string) => void;
}

function RepositoryForm(props: RepositoriesFormProps) {
	const [form] = useForm();
	let timeout: NodeJS.Timeout;

	const [movingMediaPath, setMovingMediaPath] = useState<string>();
	const [compareRepo, setCompareRepo] = useState<string>();

	const [repositoriesValue, setRepositoriesValue] = useState<string[]>();
	const [zipUpdateInProgress, setZipUpdateInProgress] = useState(false);
	const [maintainerMode, setMaintainerMode] = useState(props.repository?.MaintainerMode);
	const [onlineMode, setOnlineMode] = useState(props.repository?.Online);
	const [update, setUpdate] = useState(props.repository?.Update);
	const [sshKey, setSshKey] = useState<string>();
	const [isSshUrl, setIsSShUrl] = useState(props.repository?.Git?.URL.toLowerCase().startsWith('git@'));

	const getRepositories = async () => {
		const res = await commandBackend('getRepos');
		setRepositoriesValue(res.filter(repo => repo.Name !== props.repository.Name).map(repo => repo.Name));
	};

	const getSshkey = async () => {
		if (isSshUrl) {
			try {
				const res = await commandBackend('getSSHPubKey', { repoName: form.getFieldValue('Name') });
				setSshKey(res);
			} catch (_) {
				setSshKey(undefined);
			}
		}
	};

	async function createSshKey(): Promise<void> {
		await commandBackend('generateSSHKey', { repoName: form.getFieldValue('Name') });
		getSshkey();
	}

	async function removeSshKey(): Promise<void> {
		await commandBackend('removeSSHKey', { repoName: form.getFieldValue('Name') });
		getSshkey();
	}

	useEffect(() => {
		getSshkey();
	}, [form?.getFieldValue('GitURL')]);

	useEffect(() => {
		if (props.repository) {
			getRepositories();
		}
		getSocket().on('tasksUpdated', isZipUpdateInProgress);
		return () => {
			getSocket().off('tasksUpdated', isZipUpdateInProgress);
		};
	}, []);

	const isZipUpdateInProgress = (tasks: TaskItem[]) => {
		for (const task of tasks) {
			if (['EXTRACTING_ZIP', 'DOWNLOADING_ZIP'].includes(task.text)) {
				setZipUpdateInProgress(true);
				clearTimeout(timeout);
				timeout = setTimeout(() => {
					setZipUpdateInProgress(false);
				}, 5000);
			}
		}
	};

	const handleSubmit = values => {
		const repository: Repository = {
			Name: values.Name,
			Online: values.Online,
			Enabled: values.Enabled,
			Secure: values.Secure,
			SendStats: values.SendStats,
			BaseDir: values.BaseDir,
			Update: values.Update,
			AutoMediaDownloads: values.AutoMediaDownloads,
			MaintainerMode: values.MaintainerMode,
			Path: {
				Medias: values.PathMedias,
			},
			Git: values.GitURL
				? {
						URL: values.GitURL,
						Username: values.GitURL.toLowerCase().startsWith('git@') ? undefined : values.GitUsername,
						Password: values.GitURL.toLowerCase().startsWith('git@') ? undefined : values.GitPassword,
						Author: values.GitAuthor,
						Email: values.GitEmail,
					}
				: undefined,
			FTP: values.FTPHost
				? {
						Host: values.FTPHost,
						Port: values.FTPPort,
						Username: values.FTPUsername,
						Password: values.FTPPassword,
						BaseDir: values.FTPBaseDir,
					}
				: undefined,
		};
		props.save(repository);
	};

	const setDefaultFolders = (): void => {
		if (!props.repository.Name && form.getFieldValue('Name')) {
			const folders: { PathMedias?: string[]; BaseDir?: string } = {};
			if (form.getFieldValue('BaseDir') === null) folders.BaseDir = `repos/${form.getFieldValue('Name')}/json`;
			if (form.getFieldValue('PathMedias')?.length === 0)
				folders.PathMedias = [`repos/${form.getFieldValue('Name')}/medias`];
			form.setFieldsValue(folders);
		}
	};

	return (
		<Form
			form={form}
			onFinish={handleSubmit}
			className="repository-form"
			initialValues={{
				Name: props.repository?.Name,
				Online: props.repository?.Online,
				Update: props.repository?.Update,
				Enabled: props.repository?.Enabled,
				Secure: props.repository?.Secure,
				SendStats: props.repository?.SendStats,
				AutoMediaDownloads: props.repository?.AutoMediaDownloads,
				MaintainerMode: props.repository?.MaintainerMode,
				BaseDir: props.repository?.BaseDir,
				PathMedias: props.repository?.Path.Medias,
				GitURL: props.repository?.Git?.URL,
				GitUsername: props.repository?.Git?.Username,
				GitPassword: props.repository?.Git?.Password,
				GitAuthor: props.repository?.Git?.Author,
				GitEmail: props.repository?.Git?.Email,
				FTPHost: props.repository?.FTP?.Host,
				FTPPort: props.repository?.FTP?.Port,
				FTPUsername: props.repository?.FTP?.Username,
				FTPPassword: props.repository?.FTP?.Password,
				FTPBaseDir: props.repository?.FTP?.BaseDir,
			}}
			style={{ maxWidth: '900px' }}
		>
			<Form.Item
				hasFeedback
				label={
					<span>
						{i18next.t(form.getFieldValue('Online') ? 'REPOSITORIES.ONLINE_NAME' : 'REPOSITORIES.NAME')}
						&nbsp;
						<Tooltip title={i18next.t('REPOSITORIES.TOOLTIP_NAME')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 300px' }}
				rules={[
					{
						required: true,
						message: i18next.t('TAGS.NAME_REQUIRED'),
					},
				]}
				name="Name"
			>
				<Input placeholder={i18next.t('REPOSITORIES.NAME')} onBlur={setDefaultFolders} />
			</Form.Item>
			<Form.Item
				label={i18next.t('REPOSITORIES.ONLINE')}
				labelCol={{ flex: '0 1 300px' }}
				valuePropName="checked"
				name="Online"
			>
				<Checkbox onChange={e => setOnlineMode(e.target.checked)} />
			</Form.Item>
			<Form.Item
				label={i18next.t('REPOSITORIES.ENABLED')}
				labelCol={{ flex: '0 1 300px' }}
				valuePropName="checked"
				name="Enabled"
			>
				<Checkbox />
			</Form.Item>
			{onlineMode ? (
				<>
					<Form.Item
						label={
							<span>
								{i18next.t('REPOSITORIES.SECURE')}&nbsp;
								<Tooltip title={i18next.t('REPOSITORIES.SECURE_TOOLTIP')}>
									<QuestionCircleOutlined />
								</Tooltip>
							</span>
						}
						labelCol={{ flex: '0 1 300px' }}
						valuePropName="checked"
						name="Secure"
					>
						<Checkbox defaultChecked />
					</Form.Item>

					<Form.Item
						label={
							<span>
								{i18next.t('REPOSITORIES.SENDSTATS')}&nbsp;
								<Tooltip title={i18next.t('REPOSITORIES.SENDSTATS_TOOLTIP')}>
									<QuestionCircleOutlined />
								</Tooltip>
							</span>
						}
						labelCol={{ flex: '0 1 300px' }}
						valuePropName="checked"
						name="SendStats"
					>
						<Checkbox />
					</Form.Item>
					<Form.Item
						label={
							<span>
								{i18next.t('REPOSITORIES.UPDATE')}&nbsp;
								<Tooltip title={i18next.t('REPOSITORIES.UPDATE_TOOLTIP')}>
									<QuestionCircleOutlined />
								</Tooltip>
							</span>
						}
						labelCol={{ flex: '0 1 300px' }}
						valuePropName="checked"
						name="Update"
					>
						<Checkbox onChange={e => setUpdate(e.target.checked)} />
					</Form.Item>
					<Form.Item
						label={
							<span>
								{i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS')}&nbsp;
								<Tooltip title={i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS_TOOLTIP')}>
									<QuestionCircleOutlined />
								</Tooltip>
							</span>
						}
						labelCol={{ flex: '0 1 300px' }}
						name="AutoMediaDownloads"
					>
						<Select>
							<Select.Option value="none">
								{i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS_NONE')}
							</Select.Option>
							<Select.Option value="updateOnly">
								{i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS_UPDATE_ONLY')}
							</Select.Option>
							<Select.Option value="all">
								{i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS_ALL')}
							</Select.Option>
						</Select>
					</Form.Item>
					<Form.Item
						label={
							<span>
								{i18next.t('REPOSITORIES.MAINTAINER_MODE')}&nbsp;
								<Tooltip title={i18next.t('REPOSITORIES.MAINTAINER_MODE_TOOLTIP')}>
									<QuestionCircleOutlined />
								</Tooltip>
							</span>
						}
						labelCol={{ flex: '0 1 300px' }}
						valuePropName="checked"
						name="MaintainerMode"
					>
						<Checkbox onChange={e => setMaintainerMode(e.target.checked)} />
					</Form.Item>
				</>
			) : null}
			<Form.Item
				label={i18next.t('REPOSITORIES.BASE_DIR')}
				labelCol={{ flex: '0 1 300px' }}
				rules={[
					{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', {
							name: i18next.t('REPOSITORIES.BASE_DIR'),
						}),
					},
				]}
				name="BaseDir"
			>
				<FoldersElement openDirectory={true} onChange={value => form.setFieldsValue({ BaseDir: value })} />
			</Form.Item>
			<Form.Item
				label={i18next.t('REPOSITORIES.PATH_MEDIAS')}
				labelCol={{ flex: '0 1 300px' }}
				rules={[
					{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', {
							name: i18next.t('REPOSITORIES.PATH_MEDIAS'),
						}),
					},
				]}
				name="PathMedias"
			>
				<FoldersElement openDirectory={true} onChange={value => form.setFieldsValue({ PathMedias: value })} />
			</Form.Item>
			{maintainerMode && onlineMode ? (
				<>
					<Form.Item label={i18next.t('REPOSITORIES.GIT.URL')} labelCol={{ flex: '0 1 300px' }}>
						<Form.Item name="GitURL" rules={[{ required: update }]}>
							<Input
								placeholder={i18next.t('REPOSITORIES.GIT.URL')}
								onChange={event => setIsSShUrl(event.target.value?.toLowerCase().startsWith('git@'))}
							/>
						</Form.Item>
						{isSshUrl ? (
							sshKey ? (
								<>
									<Button
										type="primary"
										style={{ marginRight: '1em' }}
										onClick={() => window.navigator.clipboard.writeText(sshKey)}
									>
										{i18next.t('REPOSITORIES.GIT.COPY_SSH_KEY')}
									</Button>
									<Button type="primary" danger onClick={removeSshKey}>
										{i18next.t('REPOSITORIES.GIT.DELETE_SSH_KEY')}
									</Button>
								</>
							) : (
								<Button type="primary" onClick={createSshKey}>
									{i18next.t('REPOSITORIES.GIT.GENERATE_SSH_KEY')}
								</Button>
							)
						) : null}
					</Form.Item>
					{isSshUrl ? null : (
						<>
							<Form.Item
								label={i18next.t('REPOSITORIES.GIT.USERNAME')}
								labelCol={{ flex: '0 1 300px' }}
								name="GitUsername"
								rules={[{ required: update }]}
							>
								<Input placeholder={i18next.t('REPOSITORIES.GIT.USERNAME')} />
							</Form.Item>
							<Form.Item
								label={i18next.t('REPOSITORIES.GIT.PASSWORD')}
								labelCol={{ flex: '0 1 300px' }}
								name="GitPassword"
								rules={[{ required: update }]}
							>
								<Input type="password" placeholder={i18next.t('REPOSITORIES.GIT.PASSWORD')} />
							</Form.Item>
						</>
					)}
					<Form.Item
						label={
							<span>
								{i18next.t('REPOSITORIES.GIT.AUTHOR')}&nbsp;
								<Tooltip title={i18next.t('REPOSITORIES.GIT.AUTHOR_TOOLTIP')}>
									<QuestionCircleOutlined />
								</Tooltip>
							</span>
						}
						labelCol={{ flex: '0 1 300px' }}
						name="GitAuthor"
						rules={[{ required: update }]}
					>
						<Input placeholder={i18next.t('REPOSITORIES.GIT.AUTHOR')} />
					</Form.Item>
					<Form.Item
						label={
							<span>
								{i18next.t('REPOSITORIES.GIT.EMAIL')}&nbsp;
								<Tooltip title={i18next.t('REPOSITORIES.GIT.EMAIL_TOOLTIP')}>
									<QuestionCircleOutlined />
								</Tooltip>
							</span>
						}
						labelCol={{ flex: '0 1 300px' }}
						name="GitEmail"
						rules={[{ required: update }]}
					>
						<Input placeholder={i18next.t('REPOSITORIES.GIT.EMAIL')} />
					</Form.Item>
					<Form.Item
						label={i18next.t('REPOSITORIES.FTP.HOST')}
						labelCol={{ flex: '0 1 300px' }}
						name="FTPHost"
						rules={[{ required: update }]}
					>
						<Input placeholder={i18next.t('REPOSITORIES.FTP.HOST')} />
					</Form.Item>
					<Form.Item
						label={i18next.t('REPOSITORIES.FTP.PORT')}
						labelCol={{ flex: '0 1 300px' }}
						name="FTPPort"
						rules={[{ required: update }]}
					>
						<Input placeholder={i18next.t('REPOSITORIES.FTP.PORT')} />
					</Form.Item>
					<Form.Item
						label={i18next.t('REPOSITORIES.FTP.USERNAME')}
						labelCol={{ flex: '0 1 300px' }}
						name="FTPUsername"
						rules={[{ required: update }]}
					>
						<Input placeholder={i18next.t('REPOSITORIES.FTP.USERNAME')} />
					</Form.Item>
					<Form.Item
						label={i18next.t('REPOSITORIES.FTP.PASSWORD')}
						labelCol={{ flex: '0 1 300px' }}
						name="FTPPassword"
						rules={[{ required: update }]}
					>
						<Input type="password" placeholder={i18next.t('REPOSITORIES.FTP.PASSWORD')} />
					</Form.Item>
					<Form.Item
						label={i18next.t('REPOSITORIES.FTP.BASEDIR')}
						labelCol={{ flex: '0 1 300px' }}
						name="FTPBaseDir"
						rules={[{ required: update }]}
					>
						<Input placeholder={i18next.t('REPOSITORIES.FTP.BASEDIR')} />
					</Form.Item>
				</>
			) : null}
			<Form.Item style={{ textAlign: 'right' }}>
				<Button type="primary" htmlType="submit" disabled={zipUpdateInProgress}>
					{i18next.t('SUBMIT')}
				</Button>
			</Form.Item>
			{props.repository.Name ? (
				<>
					<Divider orientation="left">{i18next.t('REPOSITORIES.COMPARE_LYRICS')}</Divider>
					<Alert
						style={{ textAlign: 'left', marginBottom: '10px' }}
						message={i18next.t('REPOSITORIES.COMPARE_ABOUT_MESSAGE')}
						type="info"
					/>
					{repositoriesValue ? (
						<>
							<Form.Item
								label={i18next.t('REPOSITORIES.CHOOSE_REPOSITORY')}
								labelCol={{ flex: '0 1 300px' }}
							>
								<Select
									style={{ maxWidth: '50%', minWidth: '150px' }}
									placeholder={i18next.t('TAGS.REPOSITORY')}
									onChange={value => setCompareRepo(value.toString())}
								>
									{repositoriesValue.map(repo => {
										return (
											<Select.Option key={repo} value={repo}>
												{repo}
											</Select.Option>
										);
									})}
								</Select>
							</Form.Item>
							<Form.Item labelCol={{ flex: '0 1 300px' }} style={{ textAlign: 'right' }}>
								<div>
									<Button
										type="primary"
										disabled={zipUpdateInProgress}
										onClick={() => props.compareLyrics(compareRepo)}
									>
										{i18next.t('REPOSITORIES.COMPARE_BUTTON')}
									</Button>
								</div>
							</Form.Item>
						</>
					) : null}
					<Divider orientation="left">{i18next.t('REPOSITORIES.SYNCHRONIZE_TAGS')}</Divider>
					<Alert
						style={{ textAlign: 'left', marginBottom: '10px' }}
						message={i18next.t('REPOSITORIES.SYNCHRONIZE_ABOUT_MESSAGE')}
						type="info"
					/>
					{repositoriesValue ? (
						<>
							<Form.Item
								label={i18next.t('REPOSITORIES.CHOOSE_REPOSITORY')}
								labelCol={{ flex: '0 1 300px' }}
							>
								<Select
									style={{ maxWidth: '50%', minWidth: '150px' }}
									placeholder={i18next.t('TAGS.REPOSITORY')}
									onChange={value => setCompareRepo(value.toString())}
								>
									{repositoriesValue.map(repo => {
										return (
											<Select.Option key={repo} value={repo}>
												{repo}
											</Select.Option>
										);
									})}
								</Select>
							</Form.Item>
							<Form.Item labelCol={{ flex: '0 1 300px' }} style={{ textAlign: 'right' }}>
								<div>
									<Button
										type="primary"
										disabled={zipUpdateInProgress}
										onClick={() => props.syncTags(compareRepo)}
									>
										{i18next.t('REPOSITORIES.SYNCHRONIZE_BUTTON')}
									</Button>
								</div>
							</Form.Item>
						</>
					) : null}
					<Divider orientation="left">{i18next.t('REPOSITORIES.MOVING_MEDIA_PANEL')}</Divider>

					<Form.Item
						hasFeedback
						label={i18next.t('REPOSITORIES.MOVING_MEDIA')}
						labelCol={{ flex: '0 1 300px' }}
					>
						<FoldersElement openDirectory={true} onChange={value => setMovingMediaPath(value)} />
					</Form.Item>
					<Form.Item style={{ textAlign: 'right' }}>
						<Button
							type="primary"
							danger
							disabled={zipUpdateInProgress}
							onClick={() => props.movingMedia(movingMediaPath)}
						>
							{i18next.t('REPOSITORIES.MOVING_MEDIA_BUTTON')}
						</Button>
						<Alert
							style={{ textAlign: 'left', marginTop: '10px' }}
							message={i18next.t('WARNING')}
							description={i18next.t('REPOSITORIES.MOVING_MEDIA_ABOUT_MESSAGE')}
							type="warning"
						/>
					</Form.Item>
					<Divider orientation="left">{i18next.t('REPOSITORIES.CONVERT_TO_UUID_PANEL')}</Divider>

					<Form.Item style={{ textAlign: 'right' }}>
						<Button
							type="primary"
							danger
							disabled={zipUpdateInProgress}
							onClick={() => props.convertToUUID(props.repository.Name)}
						>
							{i18next.t('REPOSITORIES.CONVERT_TO_UUID_BUTTON')}
						</Button>
						<Alert
							style={{ textAlign: 'left', marginTop: '10px' }}
							message={i18next.t('WARNING')}
							description={i18next.t('REPOSITORIES.CONVERT_TO_UUID_ABOUT_MESSAGE')}
							type="warning"
						/>
					</Form.Item>
				</>
			) : null}
		</Form>
	);
}

export default RepositoryForm;
