import i18next from 'i18next';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router';

import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { WS_CMD } from '../../../utils/ws';

function SetupPageStats() {
	const context = useContext(GlobalContext);
	const navigate = useNavigate();

	const [error, setError] = useState<string>();
	const [errorTracking, setErrorTracking] = useState<boolean>();
	const [userStats, setUserStats] = useState<boolean>();

	const updateStats = async () => {
		if (errorTracking !== undefined && userStats !== undefined) {
			try {
				await commandBackend(WS_CMD.UPDATE_SETTINGS, {
					setting: {
						Online: {
							ErrorTracking: errorTracking,
						},
					},
				});
				const user = context?.globalState.settings.data.user;
				user.flag_sendstats = userStats;
				await commandBackend(WS_CMD.EDIT_MY_ACCOUNT, user);
				setError(undefined);
				await commandBackend('updateSettings', {
					setting: {
						App: {
							FirstRun: false,
						},
					},
				}).catch(() => {});
				await commandBackend('startPlayer').catch(() => {});
				sessionStorage.setItem('dlQueueRestart', 'true');
				navigate('/system/repositories/create?setup=true');
			} catch (err: any) {
				const error = err?.message ? i18next.t(`ERROR_CODES.${err.message}`) : JSON.stringify(err);
				setError(error);
			}
		}
	};

	return (
		<section className="step step-choice">
			<p>
				{i18next.t('SETUP_PAGE.CONNECTED_MESSAGE', {
					user: context?.globalState.settings.data.user.nickname,
				})}
			</p>
			<p>{i18next.t('ONLINE_STATS.ERROR')}</p>
			<div className="input-group">
				<div className="actions">
					<button className={errorTracking ? 'on' : ''} type="button" onClick={() => setErrorTracking(true)}>
						{i18next.t('YES')}
					</button>
					<button
						className={errorTracking === false ? 'off' : ''}
						type="button"
						onClick={() => setErrorTracking(false)}
					>
						{i18next.t('NO')}
					</button>
				</div>
			</div>
			<p>{i18next.t('ONLINE_STATS.CHANGE')}</p>
			<br />
			<h3>{i18next.t('MODAL.STATS_MODAL.TITLE')}</h3>
			<p>{i18next.t('MODAL.STATS_MODAL.DESC')}</p>
			<p>{i18next.t('MODAL.STATS_MODAL.REFUSE_DESC')}</p>
			<div className="input-group">
				<div className="actions">
					<button className={userStats ? 'on' : ''} type="button" onClick={() => setUserStats(true)}>
						{i18next.t('YES')}
					</button>
					<button
						className={userStats === false ? 'off' : ''}
						type="button"
						onClick={() => setUserStats(false)}
					>
						{i18next.t('NO')}
					</button>
				</div>
			</div>
			<p>{i18next.t('MODAL.STATS_MODAL.CHANGE')}</p>
			<div className="actions">
				<label className="error">{error}</label>
				<button type="button" onClick={updateStats}>
					{i18next.t('CONFIRM')}
				</button>
			</div>
		</section>
	);
}

export default SetupPageStats;
