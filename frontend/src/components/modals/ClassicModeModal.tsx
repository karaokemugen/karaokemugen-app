import React, { Component } from 'react';
import i18next from 'i18next';
import axios from 'axios';
import ReactDOM from 'react-dom';

class ClassicModeModal extends Component {

	playSong() {
		axios.post('/api/player/play');
		var element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	}

	render() {
		var modalDialogClass = window.innerWidth <= 1023 ? 'modal-dialog modal-sm' : 'modal-dialog modal-md';
		return (
			<div className="modal" id="modalBox">
				<div className={modalDialogClass}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">{i18next.t('CLASSIC_MODE_TITLE_MODAL')}</h4>
							<button className="closeModal btn btn-action" 
								onClick={() => {
										var element = document.getElementById('modal');
										if (element) ReactDOM.unmountComponentAtNode(element);
									}}>
								<i className="fas fa-times"></i>
							</button>
						</div>
						<div className="modal-body"
							style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
							<div className="modal-message">{i18next.t('CLASSIC_MODE_TEXT_MODAL')}</div>
							<button className="btn btn-default" type="button" onClick={this.playSong}
								style={{
									width: '75px',
									height: '75px',
									fontSize: '6rem',
									display: 'flex',
									marginTop: '10px'
								}}>
								<i className="fas fa-play"></i>
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default ClassicModeModal;
