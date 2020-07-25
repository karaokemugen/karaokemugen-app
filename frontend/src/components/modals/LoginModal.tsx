import axios from 'axios';
import Fingerprint2 from 'fingerprintjs2';
import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import Switch from '../generic/Switch';
import { callModal,displayMessage, is_touch_device, startIntro } from '../tools';
import HelpModal from './HelpModal';
require('babel-polyfill');
import store from '../../store';

interface IProps {
	role?: string;
	activeView?: number;
	admpwd?: string;
	scope: string;
}

interface IState {
	role: string;
	redBorders: string;
	errorBackground: string;
	serv: string;
	activeView?: number;
	onlineSwitch: boolean;
	forgotPassword: boolean;
	login: string;
	password: string;
	passwordConfirmation?: string;
	securityCode?: string;
}

class LoginModal extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		const config = store.getConfig();
		this.state = {
			redBorders: '',
			errorBackground: '',
			serv: (config.Online.Users && config.Online.Host) ? config.Online.Host : '',
			role: this.props.role ? this.props.role : 'user',
			activeView: this.props.activeView ? this.props.activeView : 1,
			onlineSwitch: true,
			forgotPassword: false,
			password: '',
			login: ''
		};
	}

	login = async (username: string | undefined, password: string) => {
		let url = '/auth/login';
		let data: { username: string | undefined, password: string } | { fingerprint?: string } = { username: username, password: password };

		if (!username) {
			url = '/auth/login/guest';
			data = { fingerprint: password };
		} else if (this.state.forgotPassword) {
			await this.callForgetPasswordApi();
		}

		let result = await axios.post(url, data);
		let response = result.data;
		if (this.props.scope === 'admin' && response.role !== 'admin') {
			if (!username) {
				displayMessage('warning', i18next.t('ERROR_CODES.ADMIN_PLEASE'));
				store.logOut();
			} else {
				callModal('prompt', i18next.t('MAKE_ACCOUNT_ADMIN'), i18next.t('MAKE_ACCOUNT_ADMIN_MESSAGE'), async (securityCode: string) => {
					(data as { username: string | undefined, password: string, securityCode?: string }).securityCode = securityCode;
					result = await axios.post(url, data);
					response = result.data;
					const element = document.getElementById('modal');
					if (element) ReactDOM.unmountComponentAtNode(element);
					if (response) {
						store.setLogInfos(response);
						displayMessage('info', i18next.t('LOG_SUCCESS', { name: response.username }));
						store.getTuto() && store.getTuto().move(1);
					}
				}, undefined, true);
			}
		} else {
			const element = document.getElementById('modal');
			if (element) ReactDOM.unmountComponentAtNode(element);
			if (response) {
				store.setLogInfos(response);
				displayMessage('info', i18next.t('LOG_SUCCESS', { name: response.username }));
			}

			if (!localStorage.getItem('mugenTouchscreenHelp') && this.props.scope === 'public') {
				ReactDOM.render(<HelpModal />, document.getElementById('modal'));
			}
			store.getTuto() && store.getTuto().move(1);
		}
		await store.setUser();
	};

	loginGuest = () => {
		Fingerprint2.get({ excludes: { userAgent: true } }, (components: any) => {
			const values = components.map(function (component: any) {
				return component.value;
			});
			const murmur = Fingerprint2.x64hash128(values.join(''), 31);
			this.login('', murmur);
		});
	};

	loginUser = () => {
		if (this.state.login.includes('@')) {
			this.setState({ errorBackground: 'errorBackground' });
			displayMessage('warning', i18next.t('CHAR_NOT_ALLOWED', { char: '@' }));
			return;
		} else {
			this.setState({ errorBackground: '' });
		}
		const username = this.state.login + (this.state.onlineSwitch ? '@' + this.state.serv : '');
		this.login(username, this.state.password);
	};

	signup = async () => {
		if (this.state.login.includes('@')) {
			this.setState({ errorBackground: 'errorBackground' });
			displayMessage('warning', i18next.t('CHAR_NOT_ALLOWED', { char: '@' }));
			return;
		} else {
			this.setState({ errorBackground: '' });
		}
		const username = this.state.login + (this.state.onlineSwitch ? '@' + this.state.serv : '');
		const password = this.state.password;
		if (password !== this.state.passwordConfirmation) {
			this.setState({ redBorders: 'redBorders' });
		} else {
			const data: { login: string, password: string, securityCode?: string, role: string }
				= { login: username, password: password, role: this.props.scope === 'admin' ? 'admin' : 'user' };
			if (this.props.scope === 'admin') {
				if (!this.state.securityCode) {
					displayMessage('error', i18next.t('SECURITY_CODE_MANDATORY'));
					return;
				}
				data.securityCode = this.state.securityCode;
			}
			await axios.post('/users', data);
			this.setState({ redBorders: '' });
			this.login(username, password);
		}
	};

	onKeyPress = (e: any) => {
		if (e.which == 13) {
			this.state.activeView === 1 ? this.loginUser() : this.signup();
		}
	};

	callForgetPasswordApi = async () => {
		if (this.state.login) {
			await axios.post(`/users/${this.state.login}/resetpassword`, this.state.onlineSwitch ? {} : {
				securityCode: this.state.securityCode,
				password: this.state.password
			});
		}
	}

	forgetPasswordClick = () => {
		if (this.state.onlineSwitch) {
			this.callForgetPasswordApi();
		} else {
			this.setState({ forgotPassword: !this.state.forgotPassword });
		}
	}

	render() {
		return (
			<div className="modal modalPage" id="loginModal">
				<div className="modal-dialog modal-sm">
					<div className="modal-content">
						<ul className="nav nav-tabs nav-justified modal-header">
							<li className={(this.state.activeView === 1 ? 'active' : '')}>
								<a onClick={() => this.setState({ activeView: 1 })}>{i18next.t('LOGIN')}</a>
							</li>
							<li className={(this.state.activeView === 2 ? 'active' : '')}>
								<a onClick={() => this.setState({ activeView: 2 })}>{i18next.t('NEW_ACCOUNT')}</a>
							</li>
							<button className="closeModal btn btn-action"
								onClick={() => {
									const element = document.getElementById('modal');
									if (element) ReactDOM.unmountComponentAtNode(element);
								}}>
								<i className="fas fa-times"></i>
							</button>
						</ul>
						<div className="tab-content" id="nav-tabContent">
							{this.state.activeView === 1 ?
								<div id="nav-login" className="modal-body">
									{this.props.scope !== 'admin' ?
										<React.Fragment>
											<div style={{ height: '60px' }}>
												<button className="btn btn-default guest" onClick={this.loginGuest}>
													{i18next.t('GUEST_CONTINUE')}
												</button>
											</div>
											<div>
												{i18next.t('OR')}
											</div>
										</React.Fragment> : null
									}
									<div>
										<label className="accountLabel">{i18next.t('ONLINE_ACCOUNT')}</label>
										<Switch handleChange={() => this.setState({ onlineSwitch: !this.state.onlineSwitch })}
											isChecked={this.state.onlineSwitch} />
									</div>
									<div className="modal-message">
										<input className={this.state.onlineSwitch ? 'modalLogin' : ''} type="text" id="login" name="modalLogin" placeholder={i18next.t('USERNAME')}
											defaultValue={this.state.login} required autoFocus onChange={(event) => this.setState({ login: event.target.value })} />
										{this.state.onlineSwitch ? <input type="text" id="loginServ" name="modalLoginServ" placeholder={i18next.t('INSTANCE_NAME_SHORT')}
											defaultValue={this.state.serv} onChange={(event) => this.setState({ serv: event.target.value })} /> : null}
										<input type="password" onKeyPress={this.onKeyPress} className={this.state.redBorders} id="password" name="modalPassword"
											placeholder={this.state.forgotPassword && !this.state.onlineSwitch ? i18next.t('NEW_PASSWORD') : i18next.t('PASSWORD')}
											defaultValue={this.state.password} required onChange={(event) => this.setState({ password: event.target.value })} />
									</div>

									{this.props.scope === 'admin' || this.state.onlineSwitch ?
										<div>
											<label className="accountLabel">{i18next.t('FORGOT_PASSWORD')}</label>
											<button type="button" className="forgotPasswordButton" onClick={this.forgetPasswordClick}><i className="fas fa-lock"></i></button>
										</div> : null
									}
									{this.state.forgotPassword && this.props.scope != 'public' && !this.state.onlineSwitch ?
										<input type="text" placeholder={i18next.t('SECURITY_CODE')}
											defaultValue={this.state.securityCode} required autoFocus onChange={(event) => this.setState({ securityCode: event.target.value })} /> : null
									}
									<div>
										<button type="button" className="btn btn-default login" onClick={this.loginUser}>
											{i18next.t('LOG_IN')}
										</button>
									</div>
								</div> :
								<div id="nav-signup" className="modal-body">
									<div>
										<label className="accountLabel">{i18next.t('ONLINE_ACCOUNT')}</label>
										<Switch handleChange={() => this.setState({ onlineSwitch: !this.state.onlineSwitch })}
											isChecked={this.state.onlineSwitch} />
									</div>
									<div>
										<input className={`${this.state.errorBackground} ${this.state.onlineSwitch ? 'modalLogin' : ''}`} type="text" id="signupLogin" placeholder={i18next.t('USERNAME')}
											defaultValue={this.state.login} required autoFocus onChange={(event) => this.setState({ login: event.target.value })} />
										{this.state.onlineSwitch ? <input type="text" id="signupServ" name="modalLoginServ" placeholder={i18next.t('INSTANCE_NAME_SHORT')}
											defaultValue={this.state.serv} onChange={(event) => this.setState({ serv: event.target.value })} /> : null}
										<input type="password" className={this.state.redBorders} id="signupPassword" name="modalPassword" placeholder={i18next.t('PASSWORD')}
											required onKeyPress={this.onKeyPress} defaultValue={this.state.password} onChange={(event) => this.setState({ password: event.target.value })} />
										<input type="password" className={this.state.redBorders} id="signupPasswordConfirmation" name="modalPassword" placeholder={i18next.t('PASSWORDCONF')}
											required onKeyPress={this.onKeyPress} defaultValue={this.state.passwordConfirmation} onChange={(event) => this.setState({ passwordConfirmation: event.target.value })} />
										{this.props.scope != 'public' ?
											<div>
												<br />
												<input type="text" placeholder={i18next.t('SECURITY_CODE')}
													defaultValue={this.state.securityCode} required autoFocus onChange={(event) => this.setState({ securityCode: event.target.value })} />
											</div> : null
										}
									</div>
									<div>
										<button id="signup" type="button" className="btn btn-default login" onClick={this.signup}>
											{i18next.t('SIGN_UP')}
										</button>
									</div>
								</div>
							}
						</div>

					</div>
				</div>
			</div>
		);
	}
}

export default LoginModal;
