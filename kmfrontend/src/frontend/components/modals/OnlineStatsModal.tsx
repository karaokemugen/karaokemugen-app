import i18next from 'i18next';
import { useContext, useState } from 'react';

import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import RadioButton from '../generic/RadioButton';
import { WS_CMD } from '../../../utils/ws';

function OnlineStatsModal() {
	const context = useContext(GlobalContext);
	const [errorTracking, setErrorTracking] = useState<boolean>();

	const onClick = () => {
		if (errorTracking !== undefined) {
			try {
				commandBackend(WS_CMD.UPDATE_SETTINGS, {
					setting: {
						Online: {
							ErrorTracking: errorTracking,
						},
					},
				});
				closeModal(context.globalDispatch);
			} catch (_) {
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
							<div className="text">
								<p>{i18next.t('ONLINE_STATS.ERROR')}</p>
							</div>
							<RadioButton
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
						<button type="button" className="btn btn-action btn-default ok" onClick={() => onClick()}>
							{i18next.t('CONFIRM')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default OnlineStatsModal;
