import React, { Component } from "react";
import i18next from 'i18next';
import Fingerprint2 from 'fingerprintjs2'
import axios from "axios";
import { is_touch_device,startIntro,readCookie,displayMessage  } from '../tools';

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
            serv: (this.props.config && this.props.config.Online.Users) ? this.props.config.Online.Host : '',
            role: 'user',
            activeView: 1
        }
    }

    async componentDidMount() {
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
        } else if (this.props.scope === 'admin' && this.props.config && this.props.config.App.FirstRun 
            && axios.defaults.headers.common['authorization'] && username !== 'admin') {
            url = '/api/admin/users/login';
        }

        var result = await axios.post(url, data);
        var response = result.data;
        this.props.toggleLoginModal();
        if (this.props.scope === 'admin' && response.role !== 'admin') {
            displayMessage('warning', '', i18next.t('ADMIN_PLEASE'));
        }
        this.props.updateLogInfos(response);
        displayMessage('info', '', i18next.t('LOG_SUCCESS', {name: response.username}));

        if (is_touch_device() && !readCookie('mugenTouchscreenHelp') && this.props.scope === 'public') {
            this.props.toggleHelpModal();
        }
        if (this.props.admpwd && this.props.config.App.FirstRun) {
            startIntro('admin');
            axios.put('/api/admin/settings', JSON.stringify({ 'setting': { 'Karaoke': { 'Private': true } } }));
        }
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
            displayMessage('warning', '', i18next.t('CHAR_NOT_ALLOWED', {char:'@'}));
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
            axios.post('/api/' + this.props.scope + '/users', data)
                .then(response => {
                    displayMessage('info', 'Info', i18next.t('CL_NEW_USER', username));
                    this.setState({ redBorders: '' });

                    if (this.props.scope === 'public') this.login(username, password);
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
        var loginModalClassName = readCookie('publicTuto') ? "modal modalPage" : "modal modalPage firstRun";
        return (
            <div className={loginModalClassName} id="loginModal">
                <div className="modal-dialog modal-sm">
                    <div className="modal-content">
                        <ul className="nav nav-tabs nav-justified modal-header">
                            <li className={"modal-title " + (this.state.activeView === 1 ? "active" : "")}>
                                <a onClick={() => this.setState({activeView: 1})}>{i18next.t("LOGIN")}</a>
                            </li>
                            <li className={"modal-title " + (this.state.activeView === 2 ? "active" : "")}>
                                <a onClick={() => this.setState({activeView: 2})}>{i18next.t("NEW_ACCOUNT")}</a>
                            </li>
                            <button className="closeModal btn btn-action" onClick={this.props.toggleLoginModal}>
                                <i className="fas fa-times"></i>
                            </button>
                        </ul>
                        <div className="tab-content" id="nav-tabContent">
                            {this.state.activeView === 1 ?
                            <div id="nav-login" className="modal-body">
                                {this.props.scope !== 'admin' && this.props.config.Frontend.Mode === 2 ? 
                                    <React.Fragment>
                                        <div className="tour hidden">
                                            {i18next.t("FIRST_PUBLIC_RUN_WELCOME")}
                                        </div>
                                        <div className="modal-message tour">
                                            <button className="btn btn-default tour" onClick={() => startIntro('public')}>
                                                {i18next.t("FOLLOW_TOUR")}
                                            </button>
                                        </div>
                                        <div className="tour">
                                            {i18next.t("OR")}
                                        </div>
                                    </React.Fragment> : null
                                }
                                {this.props.scope !== 'admin' ?
                                    <React.Fragment>
                                        <div className="modal-message">
                                            <button className="btn btn-default guest" onClick={this.loginGuest}>
                                                {i18next.t("GUEST_CONTINUE")}
                                            </button>
                                        </div>
                                        <div className="loginRelated">
                                            {i18next.t("OR")}
                                        </div>
                                    </React.Fragment> : null
                                }
                                <div className="modal-message loginRelated">
                                    <input type="text" id="login" name="modalLogin" placeholder={i18next.t("NICKNAME")}
                                        defaultValue={this.state.login} required autoFocus onChange={(event) => this.setState({ login: event.target.value })} />
                                    <input type="text" id="loginServ" name="modalLoginServ" placeholder={i18next.t("INSTANCE_NAME_SHORT")}
                                        defaultValue={this.state.serv} onChange={(event) => this.setState({ serv: event.target.value })} />
                                    <input type="password" className={this.state.redBorders} id="password" name="modalPassword" placeholder={i18next.t("PASSWORD")}
                                        defaultValue={this.state.password} required onChange={(event) => this.setState({ password: event.target.value })} />
                                </div>
                                <div className="loginRelated"></div>
                                <div className="loginRelated">
                                    <button type="button" className="btn btn-default login" onClick={this.loginUser}>
                                        <i className="fas fa-check"></i>
                                    </button>
                                </div>
                            </div> :
                            <div id="nav-signup" className="modal-body">
                                <div>
                                    <input type="text" id="signupLogin" className={this.state.errorBackground} name="modalLogin" placeholder={i18next.t("NICKNAME")}
                                        defaultValue={this.state.login} required autoFocus onChange={(event) => this.setState({ login: event.target.value })} />
                                    <input type="text" id="signupServ" name="modalLoginServ" placeholder={i18next.t("INSTANCE_NAME_SHORT")}
                                        defaultValue={this.state.serv} onChange={(event) => this.setState({ serv: event.target.value })} />
                                    <input type="password" className={this.state.redBorders} id="signupPassword" name="modalPassword" placeholder={i18next.t("PASSWORD")}
                                        required onKeyPress={this.onKeyPress} defaultValue={this.state.password} required onChange={(event) => this.setState({ password: event.target.value })} />
                                    <input type="password" className={this.state.redBorders} id="signupPasswordConfirmation" name="modalPassword" placeholder={i18next.t("PASSWORDCONF")}
                                        required onKeyPress={this.onKeyPress} defaultValue={this.state.passwordConfirmation} required onChange={(event) => this.setState({ passwordConfirmation: event.target.value })} />
                                    {this.props.scope === 'admin' ?
                                        <React.Fragment>
                                            <br />
                                            <select className="form-control" id="signupRole" name="modalRole"
                                                defaultValue={this.state.role} onChange={(event) => this.setState({ role: event.target.value })} >
                                                <option value="user">{i18next.t("USER")}</option>
                                                <option value="admin">{i18next.t("ADMIN")}</option>
                                            </select>
                                        </React.Fragment> : null
                                    }
                                </div>
                                <div>
                                    <button id="signup" type="button" className="btn btn-default login" onClick={this.signup}>
                                        {i18next.t("SIGN_UP")}
                                    </button>
                                </div>
                            </div>
                            }
                        </div>

                    </div>
                </div>
            </div>
        )
    }
}

export default LoginModal;
