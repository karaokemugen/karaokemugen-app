import i18next from 'i18next';
import { useContext, useState } from 'react';
import ServersList from './ServersList';
import { useNavigate } from 'react-router-dom';
import { commandBackend } from '../../../utils/socket';
import { WS_CMD } from '../../../utils/ws.mjs';
import GlobalContext from '../../../store/context';
import { Trans } from 'react-i18next';

function SetupPageRemoteAccess() {
	const context = useContext(GlobalContext);
	const [instance, setInstance] = useState<string>(
		context?.globalState.settings.data.config?.Online.RemoteAccess.Domain
	);
	const navigate = useNavigate();

	const editRemoteAccess = () => {
		commandBackend(WS_CMD.UPDATE_SETTINGS, {
			setting: {
				Online: {
					RemoteAccess: {
						Enabled: !!instance,
						Domain: instance,
						Secure: true,
					},
				},
			},
		});
		navigate('/setup/stats');
	};

	return (
		<form
			onSubmit={e => {
				editRemoteAccess();
				e.preventDefault();
			}}
		>
			<section className="step step-1">
				<div className="intro">
					<h2>{i18next.t('SETUP_PAGE.REMOTE_ACCESS.TITLE')}</h2>
					<p>{i18next.t('SETUP_PAGE.REMOTE_ACCESS.DESCRIPTION')}</p>
					<p>{i18next.t('SETUP_PAGE.REMOTE_ACCESS.DESCRIPTION_GUESTS')}</p>
				</div>
				<section className="step step-2 step-online">
					<p>{i18next.t('SETUP_PAGE.ONLINE_SERVER.LIST')}</p>
					<ServersList instance={instance} setInstance={setInstance} remote={true} typeLabel="remote" />
					{instance ? (
						<p>
							<Trans
								i18nKey="SETUP_PAGE.REMOTE_ACCESS.EXAMPLE"
								components={{
									1: <span style={{ fontWeight: 'bold' }} />,
								}}
								values={{
									instance: instance,
								}}
							/>
						</p>
					) : null}
				</section>
			</section>
			<section className="step step-choice">
				<div className="actions">
					<button type="submit">{i18next.t('ACTIONS.SAVE_AND_CONTINUE')}</button>
				</div>
			</section>
		</form>
	);
}

export default SetupPageRemoteAccess;
