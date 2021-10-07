import i18next from 'i18next';
import React, { Component } from 'react';

import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';

class ClassicModeModal extends Component {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;

	playSong = () => {
		commandBackend('play');
		closeModal(this.context.globalDispatch);
	};

	render() {
		const modalDialogClass = window.innerWidth <= 1023 ? 'modal-dialog modal-sm' : 'modal-dialog';
		return (
			<div className="modal" id="modalBox">
				<div className={modalDialogClass}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">{i18next.t('MODAL.CLASSIC_MODE.TITLE')}</h4>
							<button
								className="closeModal"
								onClick={() => {
									closeModal(this.context.globalDispatch);
								}}
							>
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
							<button
								className="btn btn-default btn-primary btn-big"
								type="button"
								onClick={this.playSong}
							>
								<i className="fas fa-play" />
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default ClassicModeModal;
