import i18next from 'i18next';
import { useContext, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';

import GlobalContext from '../../../store/context';
import { isElectron } from '../../../utils/electron';
import { commandBackend } from '../../../utils/socket';

function SetupPageRepo(props: RouteComponentProps) {
	const context = useContext(GlobalContext);

	const getPathForFileSystem = (value: string) => {
		const state = context.globalState.settings.data.state;
		const regexp = state.os === 'win32' ? '^[a-zA-Z]:' : '^/';
		if (value.match(regexp) === null) {
			return `${state.dataPath}${state.os === 'win32' ? '\\' : '/'}`;
		} else {
			return '';
		}
	};

	const repository = context?.globalState.settings.data.config?.System.Repositories[0].Path.Medias[0];
	const path = `${getPathForFileSystem(repository)}${context.globalState.settings.data.state.os === 'win32' ? repository.replace(/\//g, '\\') : repository}`;

	const [repositoryFolder, setRepositoryFolder] = useState(path);
	const [error, setError] = useState<string>();

	const onClickRepository = () => {
		const { ipcRenderer: ipc } = window.require('electron');
		const options = {
			defaultPath: repositoryFolder,
			title: i18next.t('SETUP_PAGE.CHOOSE_DIRECTORY'),
			buttonLabel: i18next.t('SETUP_PAGE.ADD_DIRECTORY'),
			properties: ['createDirectory', 'openDirectory'],
		};
		ipc.send('get-file-paths', options);
		ipc.once('get-file-paths-response', async (_event: any, filepaths: string[]) => {
			if (filepaths.length > 0) {
				setRepositoryFolder(filepaths[0]);
			}
		});
	};

	const movingMedia = async () => {
		if (
			repositoryFolder &&
			context?.globalState.settings.data.config?.System.Repositories.length > 0 &&
			context?.globalState.settings.data.config?.System.Repositories[0].Name
		) {
			const repository = context?.globalState.settings.data.config?.System.Repositories[0].Path.Medias[0];
			const path = `${getPathForFileSystem(repository)}${context.globalState.settings.data.state.os === 'win32' ?
				repository.replace(/\//g, '\\')
				: repository
			}`;
			if (repositoryFolder !== path) {
				try {
					await commandBackend(
						'movingMediaRepo',
						{
							path: repositoryFolder,
							name: context?.globalState.settings.data.config?.System.Repositories[0].Name,
						},
						undefined,
						300000
					);
				} catch (err: any) {
					const error = err?.message ? i18next.t(`ERROR_CODES.${err.message.code}`) : JSON.stringify(err);
					setError(error);
				}
			}
		}
	};

	return (
		<>
			<section className="step step-repo">
				<p>
					{i18next.t('SETUP_PAGE.CONNECTED_MESSAGE', {
						user: context?.globalState.settings.data.user.nickname,
					})}
				</p>
				<p>
					{i18next.t('SETUP_PAGE.DEFAULT_REPOSITORY_DESC_1')}
					<strong>
						{
							context?.globalState.settings.data.config?.System.Repositories[0]
								.Name
						}
					</strong>
					{i18next.t('SETUP_PAGE.DEFAULT_REPOSITORY_DESC_2')}
				</p>
				<div className="input-group">
					<div className="input-control">
						<label>{i18next.t('SETUP_PAGE.DEFAULT_REPOSITORY_QUESTION')}</label>
						<input
							className="input-field"
							value={repositoryFolder}
							onChange={(event) => setRepositoryFolder(event.target.value)}
						/>
						<div className="actions">
							{isElectron() ? (
								<button type="button" onClick={onClickRepository}>
									{i18next.t('SETUP_PAGE.MODIFY_DIRECTORY')}
								</button>
							) : null}
							<label className="error">{error}</label>
						</div>
					</div>
				</div>
				<p>{i18next.t('SETUP_PAGE.REPOSITORY_LATER')}</p>
			</section>
			<section className="step step-choice">
				<div className="actions">
					<label className="error">{error}</label>
					<button
						type="button"
						onClick={async () => {
							await movingMedia();
							props.history.push('/setup/stats');
						}}
					>
						{i18next.t('SETUP_PAGE.SAVE_PARAMETER')}
					</button>
				</div>
			</section>
		</>
	);
}

export default withRouter(SetupPageRepo);
