import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { callModal } from '../../../utils/tools';
import { RemoteStatusData } from '../../types/remote';
import { WS_CMD } from '../../../utils/ws';

function RemoteStatus() {
	const context = useContext(GlobalContext);
	const [remoteStatus, setRemoteStatus] = useState<RemoteStatusData>();
	let timeout: NodeJS.Timeout;

	const updateRemoteData = async () => {
		try {
			const data: RemoteStatusData = await commandBackend(WS_CMD.GET_REMOTE_DATA);
			setRemoteStatus(data);
		} catch (_) {
			// already display
		}
	};

	const reset = (e: any) => {
		e.preventDefault();
		callModal(
			context.globalDispatch,
			'confirm',
			i18next.t('REMOTE_RESET'),
			i18next.t('REMOTE_RESET_CONFIRM'),
			() => {
				commandBackend(WS_CMD.RESET_REMOTE_TOKEN);
			}
		);
	};

	useEffect(() => {
		updateRemoteData();
		timeout = setInterval(updateRemoteData, 500);
		return () => {
			clearInterval(timeout);
		};
	}, []);

	return (
		<div className="settingsGroupPanel">
			{remoteStatus?.active ? (
				'host' in remoteStatus.info ? (
					<>
						<div className="settings-line">
							<label>{i18next.t('REMOTE_STATUS.LABEL')}</label>
							<div>{i18next.t('REMOTE_STATUS.CONNECTED')}</div>
						</div>
						<div className="settings-line">
							<label>{i18next.t('REMOTE_URL')}</label>
							<div>{remoteStatus.info.host}</div>
						</div>
						<div className="settings-line">
							<label>
								<span className="title">{i18next.t('REMOTE_TOKEN')}</span>
								<br />
								<span className="tooltip">{i18next.t('REMOTE_TOKEN_TOOLTIP')}</span>
							</label>
							<div>
								<span className="blur-hover">{remoteStatus.token}</span>
								<button
									className="btn btn-danger"
									onClick={reset}
									title={i18next.t('REMOTE_RESET_TOOLTIP')}
								>
									{i18next.t('REMOTE_RESET')}
								</button>
							</div>
						</div>
					</>
				) : (
					<>
						<div className="settings-line">
							<label>{i18next.t('REMOTE_STATUS.LABEL')}</label>
							<div>
								{remoteStatus.info.reason === 'OUTDATED_CLIENT'
									? i18next.t('REMOTE_STATUS.OUTDATED_CLIENT')
									: null}
								{remoteStatus.info.reason === 'UNKNOWN_COMMAND'
									? i18next.t('REMOTE_STATUS.OUTDATED')
									: null}
								{!['OUTDATED_CLIENT', 'UNKNOWN_COMMAND'].includes(remoteStatus.info.reason) ? (
									<span>
										{i18next.t('REMOTE_STATUS.DISCONNECTED')} {remoteStatus.info.reason}
									</span>
								) : null}
							</div>
						</div>
					</>
				)
			) : (
				<div className="settings-line">
					<label>
						<span className="title">{i18next.t('REMOTE_STATUS.LABEL')}</span>
					</label>
					<div>{i18next.t('REMOTE_STATUS.DISCONNECTED')}</div>
				</div>
			)}
		</div>
	);
}

export default RemoteStatus;
