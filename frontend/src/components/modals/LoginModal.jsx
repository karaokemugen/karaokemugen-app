import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import Fingerprint2 from 'fingerprintjs2'

class LoginModal extends Component {
    constructor(props) {
        super(props)
    loginGuest() {
        new Fingerprint2({ excludeUserAgent: true }).get(function (result) {
            login('', result);
        });
    }

    render() {
        const t = this.props.t;
        return (
            <div className="modal modalPage fade" id="loginModal" role="dialog" type="prompt" tabIndex="20">
                <div className="modal-dialog modal-sm">
                    <div className="modal-content">
                        <ul className="nav nav-tabs nav-justified modal-header">
                            <li className="modal-title active">
                                <a data-toggle="tab" href="#nav-login" role="tab" aria-controls="nav-login" aria-selected="true">{this.props.admin ? 'Login admin' : t("LOGIN")}</a>
                            </li>
                            <li className="modal-title"><a data-toggle="tab" href="#nav-signup" role="tab" aria-controls="nav-signup" aria-selected="false"> {t("NEW_ACCOUNT")}</a></li>
                            <button className="closeModal btn btn-action" data-dismiss="modal" aria-label="Close"></button>
                        </ul>
                        <div className="tab-content" id="nav-tabContent">
                            <div id="nav-login" role="tabpanel" aria-labelledby="nav-login-tab" className="modal-body tab-pane fade in active">
                                {!this.props.admin && this.props.mode === 2 ? null :
                                    <React.Fragment>
                                        <div className="tour hidden">
                                            {t("FIRST_PUBLIC_RUN_WELCOME")}
                                        </div>
                                        <div className="modal-message tour">
                                            <button className="btn btn-default tour">
                                                {t("FOLLOW_TOUR")}
                                            </button>
                                        </div>
                                        <div className="tour">
                                            {t("OR")}
                                        </div>
                                    </React.Fragment>
                                }
                                {!this.props.admin ? null :
                                    <React.Fragment>
                                        <div className="modal-message">
                                            <button className="btn btn-default guest">
                                                {t("GUEST_CONTINUE")}
                                            </button>
                                        </div>
                                        <div className="loginRelated">
                                            {t("OR")}
                                        </div>
                                    </React.Fragment>
                                }
                                <div className="modal-message loginRelated">
                                    <input type="text" className="" id="login" name="modalLogin" placeholder={t("NICKNAME")} required autoFocus />
                                    <input type="text" className="" id="loginServ" name="modalLoginServ" placeholder={t("INSTANCE_NAME_SHORT")} defaultValue={this.props.onlineHost} />
                                    <input type="password" className="form-control" id="password" name="modalPassword" placeholder={t("PASSWORD")} required />
                                </div>
                                <div className="loginRelated"></div>
                                <div className="loginRelated">
                                    <button type="button" className="btn btn-default login" data-dismiss="xxxmodalxxx">
                                        <i className="glyphicon glyphicon-ok"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="nav-signup" role="tabpanel" aria-labelledby="nav-signup-tab" className="modal-body tab-pane fade">
                                <div className="">
                                    <input type="text" className="" id="signupLogin" name="modalLogin" placeholder={t("NICKNAME")} required autoFocus />
                                    <input type="text" className="" id="signupServ" name="modalLoginServ" placeholder={t("INSTANCE_NAME_SHORT")} defaultValue={this.props.onlineHost} />
                                    <input type="password" className="form-control" id="signupPassword" name="modalPassword" placeholder={t("PASSWORD")} required />
                                    <input type="password" className="form-control" id="signupPasswordConfirmation" name="modalPassword" placeholder={t("PASSWORDCONF")} required />
                                    {this.props.admin ?
                                        <React.Fragment>
                                            <br />
                                            <select className="form-control" id="signupRole" name="modalRole" defaultValue="user">
                                                <option value="user">{t("USER")}</option>
                                                <option value="admin">{t("ADMIN")}</option>
                                            </select>
                                        </React.Fragment> : null
                                    }
                                </div>
                                <div>
                                    <button id="signup" type="button" className="btn btn-default login" data-dismiss="xxxmodalxxx">
                                        {t("SIGN_UP")}
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

export default withTranslation()(LoginModal);
