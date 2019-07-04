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
        this.onKeyPress = this.onKeyPress.bind(this);
        this.signup = this.signup.bind(this);
        this.state = {
            redBorders: '',
            errorBackground: '',
            serv: this.props.config.Online.Host,
            role: 'user'
        }
        if (this.props.admpwd) {
            this.login('admin', this.props.admpwd);
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

        await axios.post(url, data).then(result => {
            var response = result.data;
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
            } else if (this.props.admpwd) {
                window.startIntro('admin');
                axios.defaults.headers.common['authorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenToken\s*\=\s*([^;]*).*$)|^.*$/, "$1");
                axios.defaults.headers.common['onlineAuthorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenTokenOnline\s*\=\s*([^;]*).*$)|^.*$/, "$1");
                axios.put('/api/admin/settings', JSON.stringify({ 'setting': { 'Karaoke': { 'Private': true } } }));
            }
        })
            .catch(err => {
                this.setState({ redBorders: 'redBorders', password: '' });
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

    signup() {
        if (this.state.login.includes('@')) {
            this.setState({ errorBackground: 'errorBackground' });
            window.displayMessage('warning', '', i18n.__('CHAR_NOT_ALLOWED', '@'));
            return;
        } else {
            this.setState({ errorBackground: '' });
        }
        var username = this.state.login + (this.state.serv ? '@' + this.state.serv : '');
        if (this.state.password !== this.state.passwordConfirmation) {
            this.setState({ redBorders: 'redBorders' });
        } else {
            var data = { login: username, password: this.state.password };

            if (this.props.scope === 'admin') {
                data.role = this.state.role;
            }
            var apiPublic = this.props.scope === 'welcome' ? 'public' : this.props.scope;
            axios.post('/api/' + apiPublic + '/users', data)
                .then(response => {
                    window.displayMessage('info', 'Info', i18n.__('CL_NEW_USER', username));

                    $('#loginModal').modal('hide');
                    this.setState({ redBorders: '' });

                    if (this.props.scope === 'public' || window.introManager && typeof window.introManager._currentStep !== 'undefined') this.login(username, password);
                })
                .catch(err => {
                    this.setState({ redBorders: 'redBorders' });
                });
        }
    }

    onKeyPress(e) {
        if (e.which == 13) {
            this.signup();
        }
    }

    render() {
        const t = this.props.t;
        var loginModalClassName = readCookie('publicTuto') ? "modal modalPage fade" : "modal modalPage fade firstRun";
        return (
            <div className={loginModalClassName} id="loginModal" tabIndex="20">
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
                                            <button className="btn btn-default tour" onClick={() => window.startIntro('public')}>
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
                                    <input type="text" id="login" name="modalLogin" placeholder={t("NICKNAME")}
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
                                    <input type="text" id="signupLogin" className={this.state.errorBackground} name="modalLogin" placeholder={t("NICKNAME")}
                                        defaultValue={this.state.login} required autoFocus onChange={(event) => this.setState({ login: event.target.value })} />
                                    <input type="text" id="signupServ" name="modalLoginServ" placeholder={t("INSTANCE_NAME_SHORT")}
                                        defaultValue={this.state.serv} onChange={(event) => this.setState({ serv: event.target.value })} />
                                    <input type="password" className={this.state.redBorders} id="signupPassword" name="modalPassword" placeholder={t("PASSWORD")}
                                        required onKeyPress={this.onKeyPress} defaultValue={this.state.password} required onChange={(event) => this.setState({ password: event.target.value })} />
                                    <input type="password" className={this.state.redBorders} id="signupPasswordConfirmation" name="modalPassword" placeholder={t("PASSWORDCONF")}
                                        required onKeyPress={this.onKeyPress} defaultValue={this.state.passwordConfirmation} required onChange={(event) => this.setState({ passwordConfirmation: event.target.value })} />
                                    {this.props.scope === 'admin' ?
                                        <React.Fragment>
                                            <br />
                                            <select className="form-control" id="signupRole" name="modalRole"
                                                defaultValue={this.state.role} onChange={(event) => this.setState({ role: event.target.value })} >
                                                <option value="user">{t("USER")}</option>
                                                <option value="admin">{t("ADMIN")}</option>
                                            </select>
                                        </React.Fragment> : null
                                    }
                                </div>
                                <div>
                                    <button id="signup" type="button" className="btn btn-default login" data-dismiss="xxxmodalxxx" onClick={this.signup}>
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
