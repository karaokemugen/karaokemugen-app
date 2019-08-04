import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import { createCookie } from '../tools';
import { is_touch_device,startIntro } from '../tools';

class HelpModal extends Component {
    constructor(props) {
        super(props);
        this.mugenTouchscreenHelp = this.mugenTouchscreenHelp.bind(this);
        this.tourAgain = this.tourAgain.bind(this);
    }

    mugenTouchscreenHelp() {
        createCookie('mugenTouchscreenHelp', true, -1);
        this.props.toggleHelpModal();
    }

    tourAgain() {
		startIntro('public', 'afterLogin');
		this.props.toggleHelpModal();
	}

    render() {
        const t = this.props.t;
        return (
            <div className="modal modalPage" id="helpModal">
                <div className="modal-dialog modal-sm">
                    <div className="modal-content">
                        <ul className="nav nav-tabs nav-justified modal-header">
                            <li className="modal-title active"><a>{t("CL_HELP")}</a></li>
                            <button className="closeModal btn btn-action" onClick={this.mugenTouchscreenHelp}></button>
                        </ul>
                        <div className="tab-content" id="nav-tabContent-help">
                            <div id="nav-help" className="modal-body">
                                {is_touch_device ?
                                    <div id="mobileHelp" className="text"
                                        dangerouslySetInnerHTML={{ __html: t("CL_HELP_PUBLIC_MOBILE") }}>
                                    </div> : null
                                }

                                <div className="text"
                                    dangerouslySetInnerHTML={{ __html: t("CL_HELP_DISCORD", { discord: '<a href="https://discord.gg/XFXCqzU">Discord</a>' }) }}>
                                </div>
                                <br />

                                <div className="modal-message tour">
                                    <button className="btn btn-default tourAgain" onClick={this.tourAgain}>
                                        {t("FOLLOW_TOUR")}
                                    </button>
                                </div>
                                <hr />
                                <div className="col-lg-3 col-xs-3">
                                    <b>{t("MODE")}</b>
                                    <br />
                                    <b>{t("VERSION")}</b>
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
            </div >
        )
    }
}

export default withTranslation()(HelpModal);
