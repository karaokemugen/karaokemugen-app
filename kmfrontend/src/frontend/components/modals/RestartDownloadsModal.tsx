import { faClock, faDownload, faEraser, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';
import { useContext } from 'react';

import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { WS_CMD } from '../../../utils/ws.mjs';

function RestartDownloadsModal() {
	const context = useContext(GlobalContext);

	const closeModalWithContext = () => {
		sessionStorage.setItem('dlQueueRestart', 'true');
		closeModal(context.globalDispatch);
	};

	const deleteQueue = () => {
		commandBackend(WS_CMD.DELETE_DOWNLOADS).catch(() => {});
		closeModalWithContext();
	};

	const startQueue = () => {
		commandBackend(WS_CMD.START_DOWNLOAD_QUEUE).catch(() => {});
		closeModalWithContext();
	};

	return (
		<div className="modal modalPage">
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.TITLE')}</h4>
						<button className="closeModal" onClick={closeModalWithContext}>
							<FontAwesomeIcon icon={faTimes} />
						</button>
					</ul>
					<div className="modal-body flex-direction-btns">
						<div>{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.LABEL')}</div>
						<div>
							<button className="btn btn-default" type="button" onClick={closeModalWithContext}>
								<FontAwesomeIcon icon={faClock} className="fa-2x" />
								<div className="btn-large-container">
									<div className="title">{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.LATER')}</div>
								</div>
							</button>
						</div>
						<div>
							<button className="btn btn-default" type="button" onClick={deleteQueue}>
								<FontAwesomeIcon icon={faEraser} className="fa-2x" />
								<div className="btn-large-container">
									<div className="title">{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.DELETE')}</div>
								</div>
							</button>
						</div>
						<div>
							<button className="btn btn-default" type="button" onClick={startQueue}>
								<FontAwesomeIcon icon={faDownload} className="fa-2x" />
								<div className="btn-large-container">
									<div className="title">{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.CONTINUE')}</div>
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default RestartDownloadsModal;
