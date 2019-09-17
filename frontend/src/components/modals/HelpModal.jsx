import React, { Component } from "react";
import i18next from 'i18next';
import { createCookie } from '../tools';
import { is_touch_device,startIntro } from '../tools';
import ReactDOM from 'react-dom';

class HelpModal extends Component {
    constructor(props) {
        super(props);
        this.mugenTouchscreenHelp = this.mugenTouchscreenHelp.bind(this);
        this.tourAgain = this.tourAgain.bind(this);
    }

    mugenTouchscreenHelp() {
        createCookie('mugenTouchscreenHelp', true, -1);
        ReactDOM.unmountComponentAtNode(document.getElementById('modal'));
    }

    tourAgain() {
		startIntro('public', 'afterLogin');
		ReactDOM.unmountComponentAtNode(document.getElementById('modal'));
	}

    render() {
        return (
            <div className="modal modalPage" id="helpModal">
                <div className="modal-dialog modal-sm">
                    <div className="modal-content">
                        <ul className="nav nav-tabs nav-justified modal-header">
                            <li className="modal-title active"><a>{i18next.t("CL_HELP")}</a></li>
                            <button className="closeModal btn btn-action" onClick={this.mugenTouchscreenHelp}>
                                <i className="fas fa-times"></i>
                            </button>
                        </ul>
                        <div className="tab-content" id="nav-tabContent-help">
                            <div id="nav-help" className="modal-body">
                                {is_touch_device() ?
                                    <div className="text mobileHelp"
                                        dangerouslySetInnerHTML={{ __html: i18next.t("CL_HELP_PUBLIC_MOBILE") }}>
                                    </div> : null
                                }

                                <div className="text"
                                    dangerouslySetInnerHTML={{ __html: i18next.t("CL_HELP_DISCORD", { discord: '<a href="https://discord.gg/XFXCqzU">Discord</a>' }) }}>
                                </div>
                                <br />

                                    <div className="modal-message tour">
                                        <button className="btn btn-default tourAgain" onClick={this.tourAgain}>
                                            {i18next.t("FOLLOW_TOUR")}
                                        </button>
                                    </div>
                                <hr />
                                <div className="col-lg-3 col-xs-3">
                                    <b>{i18next.t("MODE")}</b>
                                    <br />
                                    <b>{i18next.t("VERSION")}</b>
                                    <br />
                                </div>
                                <div className="col-lg-9 col-xs-9">
                                    <span id="mode">
                                        {this.props.mode ? 'Privé' : 'Public'}
                                    </span>
                                    <br />
                                    <span id="version">
                                        {this.props.version.name + ' ' + this.props.version.number}
                                    </span>
                                    <br />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default HelpModal;
