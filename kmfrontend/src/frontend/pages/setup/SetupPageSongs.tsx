import i18next from 'i18next';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router';
import ServersList from './ServersList';
import { WS_CMD } from '../../../utils/ws.mjs';
import { commandBackend } from '../../../utils/socket';
import type { Repository } from '../../../../../src/lib/types/repo';
import GlobalContext from '../../../store/context';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { setSettings } from '../../../store/actions/settings';

function SetupPageSongs() {
	const context = useContext(GlobalContext);
	const navigate = useNavigate();
	const [repositoryType, setRepositoryType] = useState<'local' | 'online'>();
	const [instance, setInstance] = useState<string>();
	const [error, setError] = useState<string>();
	const [collapse, setCollapse] = useState(false);
	const [stats, setStats] = useState(false);

	const createRepository = async () => {
		try {
			if (repositoryType === 'local' || instance) {
				if (
					repositoryType === 'online' &&
					!context.globalState.settings.data.config.System.Repositories.map(r => r.Name).includes(instance)
				) {
					const repository: Repository = {
						Name: instance,
						Online: true,
						Enabled: true,
						Secure: true,
						Update: true,
						AutoMediaDownloads: 'updateOnly',
						SendStats: stats,
						BaseDir: `repos/${instance}/json`,
						MaintainerMode: false,
						Path: {
							Medias: [`repos/${instance}/medias`],
						},
					};
					await commandBackend(WS_CMD.ADD_REPO, repository, true);
					await setSettings(context.globalDispatch);
				}
				setError(undefined);
				const localRepository = context?.globalState.settings.data.config?.System.Repositories.filter(
					value => !value.System && !value.Online
				);
				navigate(
					`/setup/medias?repository=${repositoryType === 'online' ? instance : localRepository[0].Name}`
				);
			}
		} catch (err: any) {
			const error = err?.message ? i18next.t(`ERROR_CODES.${err.message}`) : JSON.stringify(err);
			setError(error);
		}
	};

	return (
		<form
			onSubmit={e => {
				createRepository();
				e.preventDefault();
			}}
		>
			<section className="step step-1">
				<div className="intro">
					<h2>{i18next.t('SETUP_PAGE.REPOSITORY.SELECT')}</h2>
					<p>{i18next.t('SETUP_PAGE.REPOSITORY.DESCRIPTION')}</p>
				</div>
				<ul className="actions">
					<li>
						<button
							className={repositoryType === 'local' ? 'in' : ''}
							type="button"
							onClick={() => setRepositoryType('local')}
						>
							{i18next.t('SETUP_PAGE.REPOSITORY.OWN_SONGS')}
						</button>
					</li>
					<li>
						<button
							className={repositoryType === 'online' ? 'in' : ''}
							type="button"
							onClick={() => setRepositoryType('online')}
						>
							{i18next.t('SETUP_PAGE.REPOSITORY.ONLINE_REPOSITORY')}
						</button>
					</li>
				</ul>
				{repositoryType === 'online' ? (
					<section className="step step-2 step-online">
						<p>{i18next.t('SETUP_PAGE.REPOSITORY.LIST')}</p>
						<ServersList instance={instance} setInstance={setInstance} typeLabel="repository" />

						<div className="bloc-collapse">
							<p style={{ marginBottom: '0.5em' }}>{i18next.t('ONLINE_STATS.INTRO')}</p>
							<button
								type="button"
								className={collapse ? 'collapsible active' : 'collapsible'}
								onClick={() => setCollapse(!collapse)}
							>
								{i18next.t('ONLINE_STATS.DETAILS.TITLE')}
								<FontAwesomeIcon icon={collapse ? faMinus : faPlus} />
							</button>
							<div className={collapse ? 'content active' : 'content'}>
								<ul>
									<li>{i18next.t('ONLINE_STATS.DETAILS.1')}</li>
									<li>{i18next.t('ONLINE_STATS.DETAILS.2')}</li>
									<li>{i18next.t('ONLINE_STATS.DETAILS.3')}</li>
									<li>{i18next.t('ONLINE_STATS.DETAILS.4')}</li>
								</ul>
							</div>
							<p style={{ marginTop: '0.5em' }}>{i18next.t('ONLINE_STATS.DETAILS.OUTRO')}</p>
							<div className="stats-input">
								<input
									type="checkbox"
									id="stats-input"
									checked={stats}
									onChange={() => setStats(!stats)}
								></input>
								<label htmlFor={`stats-input`}>{i18next.t('REPOSITORIES.SENDSTATS')}</label>
							</div>
						</div>
					</section>
				) : null}
			</section>
			<section className="step step-choice">
				<div className="actions">
					<label className="error">{error}</label>
					{repositoryType === 'local' || instance ? (
						<button type="submit">{i18next.t('ACTIONS.SAVE_AND_CONTINUE')}</button>
					) : null}
				</div>
			</section>
		</form>
	);
}

export default SetupPageSongs;
