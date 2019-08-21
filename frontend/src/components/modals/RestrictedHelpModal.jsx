import React, { Component } from "react";
import i18next from 'i18next';

class RestrictedHelpModal extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div className="modal modalPage fade" id="restrictedHelpModal" hidden>
                <div className="modal-dialog modal-sm">
                    <div className="modal-content">
                        <ul className="nav nav-tabs nav-justified modal-header">
                            <li className="modal-title active"><a style={{ fontWeight: 'bold' }}> {i18next.t("WEBAPPMODE_LIMITED_NAME")} </a></li>
                        </ul>
                        <div className="tab-content" id="nav-tabContent-help">
                            <div id="nav-help" className="modal-body">
                                <div className="text">
                                    {i18next.t("CL_HELP_PUBLIC_MOBILE_RESTRICTED")}
                                </div>
                                <div className="text">
                                    {i18next.t("CL_HELP_PUBLIC_MOBILE_RESTRICTED_DESCRIPTION")}
                                </div>
                                <div className="modal-message">
                                    <button className="btn btn-default confirm">
                                        <i className="fas fa-check"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default RestrictedHelpModal;
