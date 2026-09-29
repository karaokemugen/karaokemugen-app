import i18next from 'i18next';
import { useNavigate } from 'react-router-dom';
import { WS_CMD } from '../../../utils/ws.mjs';
import { commandBackend } from '../../../utils/socket';

function SetupPageFinish() {
	const navigate = useNavigate();

	const finishSetup = async () => {
		await commandBackend(WS_CMD.UPDATE_SETTINGS, {
			setting: {
				App: {
					FirstRun: false,
				},
			},
		}).catch(() => {});
		await commandBackend(WS_CMD.START_PLAYER).catch(() => {});
		sessionStorage.setItem('dlQueueRestart', 'true');
		navigate('/welcome');
	};

	return (
		<section className="step step-choice">
			<p>{i18next.t('SETUP_PAGE.ENDING')}</p>
			<div className="actions">
				<button type="button" onClick={finishSetup}>
					{i18next.t('ACTIONS.FINISH')}
				</button>
			</div>
		</section>
	);
}

export default SetupPageFinish;
