import { Layout, Modal } from 'antd';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Repository } from '../../../../../src/lib/types/repo';
import { DifferentChecksumReport } from '../../../../../src/types/repo';
import { commandBackend } from '../../../utils/socket';
import Title from '../../components/Title';
import RepositoryForm from './RepositoriesForm';

const newrepository: Repository = {
	Name: undefined,
	Online: false,
	Enabled: true,
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

	const saveNew = async repository => {
		try {
			await commandBackend('addRepo', repository, true);
			navigate('/system/repositories');
		} catch (_) {
			// already display
		}
	};

	const saveUpdate = async repository => {
		try {
			await commandBackend(
				'editRepo',
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
			const res = await commandBackend('getRepo', { name });
			setRepository(res);
		} else {
			setRepository({ ...newrepository });
		}
	};

	const movingMedia = async (movingMediaPath: string) => {
		if (movingMediaPath && name) {
			try {
				await commandBackend('movingMediaRepo', { path: movingMediaPath, name }, true, 300000);
				navigate('/system/repositories');
			} catch (_) {
				// already display
			}
		}
	};

	const compareLyrics = async (repo: string) => {
		if (repo) {
			const response = await commandBackend('compareLyricsBetweenRepos', {
				repo1: name,
				repo2: repo,
			});
			setReport(response);
			setSelectedRepo(repo);
		}
	};

	const copyLyrics = async () => {
		if (report) {
			await commandBackend('copyLyricsBetweenRepos', { report });
		}
	};

	const syncTags = async (repo: string) => {
		if (repo) {
			await commandBackend('syncTagsBetweenRepos', {
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
