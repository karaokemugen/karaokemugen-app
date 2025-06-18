import { Layout, Modal } from 'antd';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Repository } from '../../../../../src/lib/types/repo';
import { DifferentChecksumReport } from '../../../../../src/types/repo';
import { commandBackend } from '../../../utils/socket';
import Title from '../../components/Title';
import RepositoryForm from './RepositoriesForm';
import { WS_CMD } from '../../../utils/ws';

const newrepository: Repository = {
	Name: undefined,
	Online: undefined,
	Enabled: true,
	Secure: true,
	SendStats: false,
	Update: true,
	AutoMediaDownloads: 'updateOnly',
	MaintainerMode: false,
	BaseDir: null,
	Path: {
		Medias: [],
	},
};

function RepositoriesEdit() {
	const navigate = useNavigate();
	const { name } = useParams();

	const [repository, setRepository] = useState<Repository>();
	const [report, setReport] = useState<DifferentChecksumReport[]>();
	const [selectedRepo, setSelectedRepo] = useState<string>();

	const saveNew = async (repository: Repository, importRedirection: boolean) => {
		try {
			await commandBackend(WS_CMD.ADD_REPO, repository, true);
			if (importRedirection) {
				navigate(`/system/karas/import?repository=${repository.Name}`);
			} else {
				navigate('/system/repositories');
			}
		} catch (_) {
			// already display
		}
	};

	const saveUpdate = async (repository: Repository) => {
		try {
			await commandBackend(
				WS_CMD.EDIT_REPO,
				{
					name,
					newRepo: repository,
				},
				true
			);
			navigate('/system/repositories');
		} catch (_) {
			// already display
		}
	};

	const loadrepository = async () => {
		if (name) {
			const res = await commandBackend(WS_CMD.GET_REPO, { name });
			setRepository(res);
		} else {
			setRepository({ ...newrepository });
		}
	};

	const movingMedia = async (movingMediaPath: string) => {
		if (movingMediaPath && name) {
			try {
				await commandBackend(WS_CMD.MOVING_MEDIA_REPO, { path: movingMediaPath, name }, true, 300000);
				navigate('/system/repositories');
			} catch (_) {
				// already display
			}
		}
	};

	const compareLyrics = async (repo: string) => {
		if (repo) {
			const response = await commandBackend(WS_CMD.COMPARE_LYRICS_BETWEEN_REPOS, {
				repo1: name,
				repo2: repo,
			});
			setReport(response);
			setSelectedRepo(repo);
		}
	};

	const copyLyrics = async () => {
		if (report) {
			await commandBackend(WS_CMD.COPY_LYRICS_BETWEEN_REPOS, { report });
		}
	};

	const convertToUUID = async (repo: string) => {
		if (repo) {
			await commandBackend(WS_CMD.CONVERT_REPO_TO_UUID, {
				repoName: repo,
			});
		}
	};

	const syncTags = async (repo: string) => {
		if (repo) {
			await commandBackend(WS_CMD.SYNC_TAGS_BETWEEN_REPOS, {
				repoSourceName: name,
				repoDestName: repo,
			});
		}
	};

	useEffect(() => {
		loadrepository();
	}, []);

	return (
		<>
			<Title
				title={i18next.t(name ? 'HEADERS.REPOSITORIES_EDIT.TITLE' : 'HEADERS.REPOSITORIES_NEW.TITLE')}
				description={i18next.t(
					name ? 'HEADERS.REPOSITORIES_EDIT.DESCRIPTION' : 'HEADERS.REPOSITORIES_NEW.DESCRIPTION'
				)}
			/>
			<Layout.Content>
				{repository && (
					<RepositoryForm
						repository={repository}
						save={name ? saveUpdate : saveNew}
						movingMedia={movingMedia}
						compareLyrics={compareLyrics}
						convertToUUID={convertToUUID}
						syncTags={syncTags}
					/>
				)}
				<Modal
					title={i18next.t('REPOSITORIES.WARNING')}
					open={report !== undefined}
					onOk={() => {
						copyLyrics();
						setReport(undefined);
					}}
					onCancel={() => setReport(undefined)}
					okText={i18next.t('YES')}
					cancelText={i18next.t('NO')}
				>
					<p>
						{i18next.t('REPOSITORIES.LYRICS_ARE_DIFFERENT', {
							first: name,
							second: selectedRepo,
						})}
					</p>
					<p style={{ fontWeight: 'bold' }}>{report?.map(kara => kara.kara1.data.songname)}</p>
					<p>
						{i18next.t('REPOSITORIES.CONFIRM_SURE', {
							first: name,
							second: selectedRepo,
						})}
					</p>
				</Modal>
			</Layout.Content>
		</>
	);
}

export default RepositoriesEdit;
