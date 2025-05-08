import i18next from 'i18next';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router';

import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';

function SetupPageStats() {
	const context = useContext(GlobalContext);
	const navigate = useNavigate();

	const [error, setError] = useState<string>();
	const [openDetails, setOpenDetails] = useState(false);
	const [stats, setStats] = useState<boolean>();
	const [errorTracking, setErrorTracking] = useState<boolean>();
	const [userStats, setUserStats] = useState<boolean>();

	const updateStats = async () => {
		if (errorTracking !== undefined && stats !== undefined && userStats !== undefined) {
			try {
				await commandBackend('updateSettings', {
					setting: {
						Online: {
							Stats: stats,
							ErrorTracking: errorTracking,
						},
					},
				});
				const user = context?.globalState.settings.data.user;
				user.flag_sendstats = userStats;
				await commandBackend('editMyAccount', user);
				setError(undefined);
				navigate('/setup/loading');
			} catch (err: any) {
				const error = err?.message ? i18next.t(`ERROR_CODES.${err.message}`) : JSON.stringify(err);
				setError(error);
			}
		}
	};

	return (
		<section className="step step-choice">
			<p>{i18next.t('ONLINE_STATS.INTRO')}</p>
			<p>
				<a className="btn-link" type="button" onClick={() => setOpenDetails(!openDetails)}>
					{i18next.t('ONLINE_STATS.DETAILS.TITLE')}
				</a>
				{openDetails ? (
					<>
						<ul>
							<li>{i18next.t('ONLINE_STATS.DETAILS.1')}</li>
							<li>{i18next.t('ONLINE_STATS.DETAILS.2')}</li>
							<li>{i18next.t('ONLINE_STATS.DETAILS.3')}</li>
							<li>{i18next.t('ONLINE_STATS.DETAILS.4')}</li>
						</ul>
						<p>{i18next.t('ONLINE_STATS.DETAILS.OUTRO')}</p>
						<br />
					</>
				) : null}
			</p>
			<p>{i18next.t('ONLINE_STATS.QUESTION')}</p>
			<div className="input-group">
				<div className="actions">
					<button className={stats ? 'on' : ''} type="button" onClick={() => setStats(true)}>
						{i18next.t('YES')}
					</button>
					<button className={stats === false ? 'off' : ''} type="button" onClick={() => setStats(false)}>
						{i18next.t('NO')}
					</button>
				</div>
			</div>
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
					{i18next.t('ONLINE_STATS.CONFIRM')}
				</button>
			</div>
		</section>
	);
}

export default SetupPageStats;
