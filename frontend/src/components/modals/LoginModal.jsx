import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import Fingerprint2 from 'fingerprintjs2'
import axios from "axios";
import { createCookie, eraseCookie, is_touch_device } from '../toolsReact';

class LoginModal extends Component {
    constructor(props) {
        super(props)
        this.login = this.login.bind(this);
        this.loginGuest = this.loginGuest.bind(this);
        this.loginUser = this.loginUser.bind(this);
        this.state = {
            redBorders: '',
            serv: this.props.config.Online.Host
        }
    }

    async login(username, password) {
        var url = '/api/auth/login';
        var data = { username: username, password: password };

        if (!username) {
            url = '/api/auth/login/guest';
            data = { fingerprint: password };
        } else if (this.props.scope === 'admin' && this.props.config.App.FirstRun && username !== 'admin') {
            url = '/api/admin/users/login';
        }

        await axios.post(url, data).then(response => {
            console.log(response)
            if (this.props.scope === 'admin' && response.role !== 'admin') {
                window.displayMessage('warning', '', i18n.__('ADMIN_PLEASE'));
            }
            $('#loginModal').modal('hide');
            this.setState({ redBorders: '' });

            createCookie('mugenToken', response.token, -1);
            if (response.onlineToken) {
                createCookie('mugenTokenOnline', response.onlineToken, -1);
            } else if (!username.includes('@')) {
                eraseCookie('mugenTokenOnline');
            }

            window.logInfos = response;
            window.displayMessage('info', '', i18n.__('LOG_SUCCESS', window.logInfos.username));
            window.initApp();

            if (window.introManager && typeof window.introManager._currentStep !== 'undefined') {
                window.introManager.nextStep();
            } else if (is_touch_device && !readCookie('mugenTouchscreenHelp')) {
                window.callHelpModal();
            }

            if (this.props.scope === 'welcome') {
                window.logInfos = parseJwt(response.token);
                $('#wlcm_login > span').text(window.logInfos.username);
                $('#wlcm_disconnect').show();
            }
        })
            .catch(err => {
                $('#password').val('').focus();
                this.setState({ redBorders: 'redBorders' });
            });
    };

    loginGuest() {
        Fingerprint2.get({ excludes: { userAgent: true } }, (components) => {
            var values = components.map(function (component) { return component.value })
            var murmur = Fingerprint2.x64hash128(values.join(''), 31)
            this.login('', murmur);
        });
    }

    loginUser() {
        var username = this.state.login + (this.state.serv ? '@' + this.state.serv : '');
        this.login(username, this.state.password);
    }

    render() {
        const t = this.props.t;
        var loginModalClassName = readCookie('publicTuto') ? "modal modalPage fade" : "modal modalPage fade firstRun";
        return (
            <div className={loginModalClassName} id="loginModal"  tabIndex="20">
                <div className="modal-dialog modal-sm">
                    <div className="modal-content">
                        <ul className="nav nav-tabs nav-justified modal-header">
                            <li className="modal-title active">
                                <a data-toggle="tab" href="#nav-login" role="tab" aria-controls="nav-login" aria-selected="true">{this.props.scope === 'admin' ? 'Login admin' : t("LOGIN")}</a>
                            </li>
                            <li className="modal-title"><a data-toggle="tab" href="#nav-signup" role="tab" aria-controls="nav-signup" aria-selected="false"> {t("NEW_ACCOUNT")}</a></li>
                            <button className="closeModal btn btn-action" data-dismiss="modal" aria-label="Close"></button>
                        </ul>
                        <div className="tab-content" id="nav-tabContent">
                            <div id="nav-login" role="tabpanel" aria-labelledby="nav-login-tab" className="modal-body tab-pane fade in active">
                                {!this.props.scope === 'admin' && this.props.config.Frontend.Mode === 2 ? null :
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
                                {!this.props.scope === 'admin' ? null :
                                    <React.Fragment>
                                        <div className="modal-message">
                                            <button className="btn btn-default guest" onClick={this.loginGuest}>
                                                {t("GUEST_CONTINUE")}
                                            </button>
                                        </div>
                                        <div className="loginRelated">
                                            {t("OR")}
                                        </div>
                                    </React.Fragment>
                                }
                                <div className="modal-message loginRelated">
                                    <input type="text" className={this.state.redBorders} id="login" name="modalLogin" placeholder={t("NICKNAME")}
                                        defaultValue={this.state.login} required autoFocus onChange={(event) => this.setState({ login: event.target.value })} />
                                    <input type="text" id="loginServ" name="modalLoginServ" placeholder={t("INSTANCE_NAME_SHORT")}
                                        defaultValue={this.state.serv} onChange={(event) => this.setState({ serv: event.target.value })} />
                                    <input type="password" className={this.state.redBorders} id="password" name="modalPassword" placeholder={t("PASSWORD")}
                                        defaultValue={this.state.password} required onChange={(event) => this.setState({ password: event.target.value })} />
                                </div>
                                <div className="loginRelated"></div>
                                <div className="loginRelated">
                                    <button type="button" className="btn btn-default login" data-dismiss="xxxmodalxxx" onClick={this.loginUser}>
                                        <i className="glyphicon glyphicon-ok"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="nav-signup" role="tabpanel" aria-labelledby="nav-signup-tab" className="modal-body tab-pane fade">
                                <div>
                                    <input type="text" id="signupLogin" name="modalLogin" placeholder={t("NICKNAME")} required autoFocus />
                                    <input type="text" id="signupServ" name="modalLoginServ" placeholder={t("INSTANCE_NAME_SHORT")} defaultValue={this.state.serv} />
                                    <input type="password" id="signupPassword" name="modalPassword" placeholder={t("PASSWORD")} required />
                                    <input type="password" id="signupPasswordConfirmation" name="modalPassword" placeholder={t("PASSWORDCONF")} required />
                                    {this.props.scope === 'admin' ?
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
