import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { commandBackend } from '../../../utils/socket';

class ClassicModeModal extends Component {

	playSong() {
		commandBackend('play');
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	}

	render() {
		const modalDialogClass = window.innerWidth <= 1023 ? 'modal-dialog modal-sm' : 'modal-dialog';
		return (
			<div className="modal" id="modalBox">
				<div className={modalDialogClass}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">{i18next.t('CLASSIC_MODE_TITLE_MODAL')}</h4>
							<button className="closeModal"
								onClick={() => {
									const element = document.getElementById('modal');
									if (element) ReactDOM.unmountComponentAtNode(element);
								}}>
								<i className="fas fa-times" />
							</button>
						</div>
						<div className="modal-body"
							style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', margin: '1em' }}>
							<div className="modal-message" style={{ textAlign: 'center', marginBottom: '.5em' }}>{i18next.t('CLASSIC_MODE_TEXT_MODAL')}</div>
							<button className="btn btn-default btn-primary btn-big" type="button" onClick={this.playSong}>
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
