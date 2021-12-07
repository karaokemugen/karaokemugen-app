import i18next from 'i18next';
import { useContext } from 'react';

import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';

function RestartDownloadsModal() {
	const context = useContext(GlobalContext);

	const closeModalWithContext = () => {
		sessionStorage.setItem('dlQueueRestart', 'true');
		closeModal(context.globalDispatch);
	};

	const deleteQueue = () => {
		commandBackend('deleteDownloads').catch(() => {});
		closeModalWithContext();
	};

	const startQueue = () => {
		commandBackend('startDownloadQueue').catch(() => {});
		closeModalWithContext();
	};

	return (
		<div className="modal modalPage">
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.TITLE')}</h4>
						<button className="closeModal" onClick={closeModalWithContext}>
							<i className="fas fa-times"></i>
						</button>
					</ul>
					<div className="modal-body flex-direction-btns">
						<div>{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.LABEL')}</div>
						<div>
							<button className="btn btn-default" type="button" onClick={closeModalWithContext}>
								<i className="fas fa-fw fa-clock fa-2x" />
								<div className="btn-large-container">
									<div className="title">{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.LATER')}</div>
								</div>
							</button>
						</div>
						<div>
							<button className="btn btn-default" type="button" onClick={deleteQueue}>
								<i className="fas fa-fw fa-eraser fa-2x" />
								<div className="btn-large-container">
									<div className="title">{i18next.t('MODAL.RESTART_DOWNLOADS_MODAL.DELETE')}</div>
								</div>
							</button>
						</div>
						<div>
							<button className="btn btn-default" type="button" onClick={startQueue}>
								<i className="fas fa-fw fa-download fa-2x" />
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
