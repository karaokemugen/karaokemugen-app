import React, { Component } from 'react';
import i18next from 'i18next';
import { createCookie } from '../tools';
import { startIntro } from '../tools';
import ReactDOM from 'react-dom';
import store from '../../store';

require('./HelpModal.scss');
class HelpModal extends Component<{},{}> {
    mugenTouchscreenHelp = () => {
		createCookie('mugenTouchscreenHelp', true, -1);
		var element = document.getElementById('modal');
    	if (element) ReactDOM.unmountComponentAtNode(element);
    };

    tourAgain = async () => {
		var tutorial = document.getElementById('tuto');
		if (tutorial) ReactDOM.unmountComponentAtNode(tutorial);
    	var tuto = startIntro('public');
    	tuto.move(1);
		var element = document.getElementById('modal');
    	if (element) ReactDOM.unmountComponentAtNode(element);
    };

    render() {
    	return (
    		<div className="modal modalPage" id="helpModal">
    			<div className="modal-dialog modal-sm">
    				<div className="modal-content">
    					<ul className="nav nav-tabs nav-justified modal-header">
    						<li className="modal-title active"><a>{i18next.t('CL_HELP')}</a></li>
    						<button className="closeModal btn btn-action" onClick={this.mugenTouchscreenHelp}>
    							<i className="fas fa-times"></i>
    						</button>
    					</ul>
    					<div className="tab-content" id="nav-tabContent-help">
    						<div id="nav-help" className="modal-body">
								<div className="text mobileHelp"
									dangerouslySetInnerHTML={{ __html: i18next.t('CL_HELP_PUBLIC_MOBILE') }}>
								</div>

    							<div className="text"
    								dangerouslySetInnerHTML={{ __html: i18next.t('CL_HELP_DISCORD', { discord: '<a href="https://discord.gg/XFXCqzU">Discord</a>' }) }}>
    							</div>
    							<br />

    							<div className="modal-message">
    								<button className="btn btn-default tourAgain" onClick={this.tourAgain}>
    									{i18next.t('FOLLOW_TOUR')}
    								</button>
    							</div>
								<hr />
								<div className="versionMode">
									<div>
										<b>{i18next.t('MODE')}</b>
										<br />
										<b>{i18next.t('VERSION')}</b>
										<br />
									</div>
									<div>
										<span id="mode">
											{store.getConfig().Karaoke.Private ? 'Privé' : 'Public'}
										</span>
										<br />
										<span id="version">
											{store.getVersion().name + ' ' + store.getVersion().number}
										</span>
										<br />
									</div>
								</div>
    						</div>
    					</div>
    				</div>
    			</div>
    		</div>
    	);
    }
}

export default HelpModal;
