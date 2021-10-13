import i18next from 'i18next';
import { useContext, useState } from 'react';

import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import RadioButton from '../generic/RadioButton';

function OnlineStatsModal() {
	const context = useContext(GlobalContext);
	const [openDetails, setOpenDetails] = useState(false);
	const [stats, setStats] = useState<boolean>();
	const [errorTracking, setErrorTracking] = useState<boolean>();

	const onClick = () => {
		if (errorTracking !== undefined && stats !== undefined) {
			try {
				commandBackend('updateSettings', {
					setting: {
						Online: {
							Stats: stats,
							ErrorTracking: errorTracking,
						},
					},
				});
				closeModal(context.globalDispatch);
			} catch (e) {
				// already display
			}
		}
	};

	return (
		<div className="modal modalPage">
			<div className="modal-dialog">
				<div className="modal-content">
					<div className="modal-header">
						<h4 className="modal-title">{i18next.t('ONLINE_STATS.TITLE')}</h4>
					</div>
					<div className="modal-body">
						<div className="modal-message text">
							<p>{i18next.t('ONLINE_STATS.INTRO')}</p>
						</div>
						<div className="text">
							<a
								className="btn-link"
								type="button"
								onClick={() => setOpenDetails(!openDetails)}
							>
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
							<div className="text">
								<p>{i18next.t('ONLINE_STATS.QUESTION')}</p>
							</div>
							<RadioButton
								title={i18next.t('ONLINE_STATS.TITLE')}
								buttons={[
									{
										label: i18next.t('YES'),
										activeColor: '#57bb00',
										active: stats,
										onClick: () => setStats(true),
									},
									{
										label: i18next.t('NO'),
										activeColor: '#880500',
										active: stats === false,
										onClick: () => setStats(false),
									},
								]}
							/>
							<br />
							<div className="text">
								<p>{i18next.t('ONLINE_STATS.ERROR')}</p>
							</div>
							<RadioButton
								title={i18next.t('ONLINE_STATS.ERROR_TRACKING')}
								buttons={[
									{
										label: i18next.t('YES'),
										activeColor: '#57bb00',
										active: errorTracking,
										onClick: () => setErrorTracking(true),
									},
									{
										label: i18next.t('NO'),
										activeColor: '#880500',
										active: errorTracking === false,
										onClick: () => setErrorTracking(false),
									},
								]}
							/>
							<br />
							{i18next.t('ONLINE_STATS.CHANGE')}
						</div>
					</div>
					<div className="modal-footer">
						<button
							type="button"
							className="btn btn-action btn-default ok"
							onClick={() => onClick()}
						>
							{i18next.t('ONLINE_STATS.CONFIRM')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default OnlineStatsModal;
