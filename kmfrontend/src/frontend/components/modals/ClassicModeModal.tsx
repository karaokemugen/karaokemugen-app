import i18next from 'i18next';
import { useContext } from 'react';

import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { WS_CMD } from '../../../utils/ws';

function ClassicModeModal() {
	const context = useContext(GlobalContext);

	const playSong = () => {
		commandBackend(WS_CMD.PLAY);
		closeModal(context.globalDispatch);
	};

	const modalDialogClass = window.innerWidth <= 1023 ? 'modal-dialog modal-sm' : 'modal-dialog';
	return (
		<div className="modal" id="modalBox">
			<div className={modalDialogClass}>
				<div className="modal-content">
					<div className="modal-header">
						<h4 className="modal-title">{i18next.t('MODAL.CLASSIC_MODE.TITLE')}</h4>
						<button className="closeModal" onClick={() => closeModal(context.globalDispatch)}>
							<i className="fas fa-times" />
						</button>
					</div>
					<div
						className="modal-body"
						style={{
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							alignItems: 'center',
							margin: '1em',
						}}
					>
						<div className="modal-message" style={{ textAlign: 'center', marginBottom: '.5em' }}>
							{i18next.t('MODAL.CLASSIC_MODE.TEXT')}
						</div>
						<button className="btn btn-default btn-primary btn-big" type="button" onClick={playSong}>
							<i className="fas fa-play" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default ClassicModeModal;
