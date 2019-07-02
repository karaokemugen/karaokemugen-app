import React, { Component } from "react";
import { withTranslation } from 'react-i18next';

class HelpModal extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        const t = this.props.t;
        return (
            <div className="modal-dialog modal-sm">
                <div className="modal-content">
                    <ul className="nav nav-tabs nav-justified modal-header">
                        <li className="modal-title active"><a>{t("CL_HELP")}</a></li>
                        <button className="closeModal btn btn-action" data-dismiss="modal" aria-label="Close"></button>
                    </ul>
                    <div className="tab-content" id="nav-tabContent-help">
                        <div id="nav-help" className="modal-body tab-pane fade in active">
                            <div id="mobileHelp" className="text">
                                {t("CL_HELP_PUBLIC_MOBILE")}
                            </div>
                            <div className="text"
                                dangerouslySetInnerHTML={{ __html: t("CL_HELP_DISCORD", { discord: '<a href="https://discord.gg/XFXCqzU">Discord</a>' }) }}>
                            </div>
                            <br />

                            <div className="modal-message tour">
                                <button className="btn btn-default tourAgain">
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
                                <span id="mode"></span>
                                <br />
                                <span id="version"></span>
                                <br />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default withTranslation()(HelpModal);
