import i18next from 'i18next';
import { useContext, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import GlobalContext from '../../../store/context';
import { isElectron } from '../../../utils/electron';
import { commandBackend } from '../../../utils/socket';
import { WS_CMD } from '../../../utils/ws.mjs';

function SetupPageMedias() {
	const context = useContext(GlobalContext);
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const getPathForFileSystem = (value: string) => {
		const state = context.globalState.settings.data.state;
		const regexp = state.os === 'win32' ? '^[a-zA-Z]:' : '^/';
		if (value.match(regexp) === null) {
			return `${state.dataPath}${state.os === 'win32' ? '\\' : '/'}`;
		} else {
			return '';
		}
	};

	const actualRepositoryFolder = context?.globalState.settings.data.config?.System.Repositories.filter(
		value => value.Name === searchParams.get('repository')
	)[0].Path.Medias[0];
	const path = `${getPathForFileSystem(actualRepositoryFolder)}${
		context.globalState.settings.data.state.os === 'win32'
			? actualRepositoryFolder.replace(/\//g, '\\')
			: actualRepositoryFolder
	}`;

	const [repositoryFolder, setRepositoryFolder] = useState(path);
	const [error, setError] = useState<string>();

	const onClickRepository = () => {
		const { ipcRenderer: ipc } = window.require('electron');
		const options = {
			defaultPath: repositoryFolder,
			title: i18next.t('CONFIG.CHOOSE_DIRECTORY'),
			buttonLabel: i18next.t('CONFIG.ADD_DIRECTORY'),
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
		if (repositoryFolder) {
			const actualRepositoryFolder = context?.globalState.settings.data.config?.System.Repositories.filter(
				value => value.Name === searchParams.get('repository')
			)[0].Path.Medias[0];
			const path = `${getPathForFileSystem(actualRepositoryFolder)}${
				context.globalState.settings.data.state.os === 'win32'
					? actualRepositoryFolder.replace(/\//g, '\\')
					: actualRepositoryFolder
			}`;
			if (repositoryFolder !== path) {
				try {
					await commandBackend(
						WS_CMD.MOVING_MEDIA_REPO,
						{
							path: repositoryFolder,
							name: searchParams.get('repository'),
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
		commandBackend(WS_CMD.UPDATE_ALL_REPOS);
		navigate('/setup/collections');
	};

	return (
		<form
			onSubmit={e => {
				movingMedia();
				e.preventDefault();
			}}
		>
			<section className="step step-repo">
				<div className="intro">
					<h2>{i18next.t('SETUP_PAGE.MEDIA_STORAGE.TITLE')}</h2>
					<p>{i18next.t('SETUP_PAGE.MEDIA_STORAGE.DESCRIPTION')}</p>
				</div>
				<div className="input-group">
					<div className="input-control">
						<input
							className="input-field"
							value={repositoryFolder}
							onChange={event => setRepositoryFolder(event.target.value)}
						/>
						<div className="actions">
							{isElectron() ? (
								<button type="button" onClick={onClickRepository}>
									{i18next.t('CONFIG.CHOOSE_DIRECTORY')}
								</button>
							) : null}
							<label className="error">{error}</label>
						</div>
					</div>
				</div>
				<p>{i18next.t('SETUP_PAGE.MEDIA_STORAGE.CHANGE_LATER')}</p>
			</section>
			<section className="step step-choice">
				<div className="actions">
					<label className="error">{error}</label>
					<button type="submit">{i18next.t('ACTIONS.SAVE_AND_CONTINUE')}</button>
				</div>
			</section>
		</form>
	);
}

export default SetupPageMedias;
