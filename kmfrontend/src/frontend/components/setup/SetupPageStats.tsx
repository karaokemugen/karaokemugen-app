import i18next from 'i18next';
import React, { useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';

import { commandBackend } from '../../../utils/socket';

function SetupPageStats(props: RouteComponentProps) {

	const [error, setError] = useState<string>();
	const [openDetails, setOpenDetails] = useState(false);
	const [stats, setStats] = useState<boolean>();
	const [errorTracking, setErrorTracking] = useState<boolean>();

	const updateStats = async () => {
		if (errorTracking !== undefined && stats !== undefined) {
			await commandBackend('updateSettings', {
				setting: {
					Online: {
						Stats: stats,
						ErrorTracking: errorTracking,
					},
				},
			});
			setError(undefined);
			props.history.push('/setup/loading');
		}
	};

	return (
		<section className="step step-choice">
			<p>{i18next.t('ONLINE_STATS.INTRO')}</p>
			<p>
				<a
					className="btn-link"
					type="button"
					onClick={() => setOpenDetails(!openDetails)}
				>
					{i18next.t('ONLINE_STATS.DETAILS.TITLE')}
				</a>
				{openDetails ? (
					<React.Fragment>
						<ul>
							<li>{i18next.t('ONLINE_STATS.DETAILS.1')}</li>
							<li>{i18next.t('ONLINE_STATS.DETAILS.2')}</li>
							<li>{i18next.t('ONLINE_STATS.DETAILS.3')}</li>
							<li>{i18next.t('ONLINE_STATS.DETAILS.4')}</li>
						</ul>
						<p>{i18next.t('ONLINE_STATS.DETAILS.OUTRO')}</p>
						<br />
					</React.Fragment>
				) : null}
			</p>
			<p>{i18next.t('ONLINE_STATS.QUESTION')}</p>
			<div className="input-group">
				<div className="actions">
					<button
						className={stats ? 'on' : ''}
						type="button"
						onClick={() => setStats(true)}
					>
						{i18next.t('YES')}
					</button>
					<button
						className={stats === false ? 'off' : ''}
						type="button"
						onClick={() => setStats(false)}
					>
						{i18next.t('NO')}
					</button>
				</div>
			</div>
			<p>{i18next.t('ONLINE_STATS.ERROR')}</p>
			<div className="input-group">
				<div className="actions">
					<button
						className={errorTracking ? 'on' : ''}
						type="button"
						onClick={() => setErrorTracking(true)}
					>
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
			<div className="actions">
				<label className="error">{error}</label>
				<button type="button" onClick={updateStats}>
					{i18next.t('ONLINE_STATS.CONFIRM')}
				</button>
			</div>
		</section>
	);
}

export default withRouter(SetupPageStats);
