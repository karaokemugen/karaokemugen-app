import { Layout } from 'antd';
import Modal from 'antd/lib/modal/Modal';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Repository } from '../../../../../src/lib/types/repo';
import { DifferentChecksumReport } from '../../../../../src/types/repo';
import { commandBackend } from '../../../utils/socket';
import RepositoryForm from './RepositoriesForm';

const newrepository: Repository = {
	Name: undefined,
	Online: false,
	Enabled: true,
	SendStats: false,
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
	const [save, setSave] = useState<(repository: Repository) => void>();
	const [report, setReport] = useState<DifferentChecksumReport[]>();
	const [selectedRepo, setSelectedRepo] = useState<string>();

	const saveNew = async repository => {
		try {
			await commandBackend('addRepo', repository, true);
			navigate('/system/repositories');
		} catch (e) {
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
		} catch (e) {
			// already display
		}
	};

	const loadrepository = async () => {
		if (name) {
			const res = await commandBackend('getRepo', { name });
			setRepository(res);
			setSave(saveUpdate);
		} else {
			setRepository({ ...newrepository });
			setSave(saveNew);
		}
	};

	const movingMedia = async (movingMediaPath: string) => {
		if (movingMediaPath && name) {
			try {
				await commandBackend('movingMediaRepo', { path: movingMediaPath, name }, true, 300000);
				navigate('/system/repositories');
			} catch (e) {
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

	useEffect(() => {
		loadrepository();
	}, []);

	return (
		<>
			<Layout.Header>
				<div className="title">
					{i18next.t(name ? 'HEADERS.REPOSITORIES_EDIT.TITLE' : 'HEADERS.REPOSITORIES_NEW.TITLE')}
				</div>
				<div className="description">
					{i18next.t(name ? 'HEADERS.REPOSITORIES_EDIT.DESCRIPTION' : 'HEADERS.REPOSITORIES_NEW.DESCRIPTION')}
				</div>
			</Layout.Header>
			<Layout.Content>
				{repository && (
					<RepositoryForm
						repository={repository}
						save={save}
						movingMedia={movingMedia}
						compareLyrics={compareLyrics}
					/>
				)}
				<Modal
					title={i18next.t('REPOSITORIES.WARNING')}
					visible={report !== undefined}
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
					<p style={{ fontWeight: 'bold' }}>{report?.map(kara => kara.kara1.subfile.slice(0, -4))}</p>
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
