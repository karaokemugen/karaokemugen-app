import './Login.scss';

import FingerprintJS from '@fingerprintjs/fingerprintjs';
import i18next from 'i18next';
import React, { Component, FormEvent } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import logo from '../../assets/Logo-fond-transp.png';
import Switch from '../../frontend/components/generic/Switch';
import { login, logout } from '../../store/actions/auth';
import { GlobalContextInterface } from '../../store/context';
import { commandBackend } from '../socket';
import { callModal, displayMessage, lastLocation } from '../tools';

interface IProps extends RouteComponentProps {
	context: GlobalContextInterface;
}

interface IState {
	admpwd: string | undefined;
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
	securityCode?: number;
	isAdminPath: boolean
}

class Login extends Component<IProps, IState> {

	constructor(props) {
		super(props);
		this.state = {
			admpwd: window.location.search.indexOf('admpwd') !== -1 ? window.location.search.split('=')[1] : undefined,
			redBorders: '',
			errorBackground: '',
			serv: (this.props.context.globalState.settings.data.config.Online.Users
				&& this.props.context.globalState.settings.data.config.Online.Host) ?
				this.props.context.globalState.settings.data.config.Online.Host : '',
			role: 'user',
			activeView: 1,
			onlineSwitch: true,
			forgotPassword: false,
			password: '',
			login: '',
			isAdminPath: lastLocation && lastLocation !== '/'
		};
	}


	async componentDidMount() {
		if (this.state.admpwd && !this.props.context.globalState.auth.data.token) {
			this.login('admin', this.state.admpwd);
		}
		if (this.props.context.globalState.auth.isAuthenticated) {
			if (lastLocation) {
				this.props.history.replace(lastLocation);
			} else {
				this.props.history.replace('/');
			}
		}
	}


	login = async (username: string | undefined, password: string, securityCode?: number) => {
		if (this.state.forgotPassword) {
			await this.callForgetPasswordApi();
		}

		const role = await login(username, password, this.props.context.globalDispatch, securityCode);
		if (this.state.isAdminPath && role !== 'admin') {
			if (!username) {
				displayMessage('warning', i18next.t('ERROR_CODES.ADMIN_PLEASE'));
				logout(this.props.context.globalDispatch);
			} else {
				callModal('prompt', i18next.t('MAKE_ACCOUNT_ADMIN'), i18next.t('MAKE_ACCOUNT_ADMIN_MESSAGE'), async (securityCodeString: string) => {
					await login(username, password, this.props.context.globalDispatch, parseInt(securityCodeString));
					if (lastLocation) {
						this.props.history.replace(lastLocation);
					} else {
						this.props.history.replace('/');
					}
				}, undefined, true);
			}
		} else {
			if (lastLocation) {
				this.props.history.replace(lastLocation);
			} else {
				this.props.history.replace('/');
			}
		}
	};

	loginGuest = async () => {
		const fp = await FingerprintJS.load();
		const result = await fp.get();
		this.login('', result.visitorId);
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
			const data: { login: string, password: string, securityCode?: number, role: string }
				= { login: username, password: password, role: this.state.isAdminPath ? 'admin' : 'user' };
			if (this.state.isAdminPath) {
				if (!this.state.securityCode) {
					displayMessage('error', i18next.t('SECURITY_CODE_MANDATORY'));
					return;
				}
			}
			await commandBackend('createUser', data);
			this.setState({ redBorders: '' });
			this.login(username, password, this.state.securityCode);
		}
	};

	onSubmit = (e: FormEvent) => {
		e.preventDefault();
		this.state.activeView === 1 ? this.loginUser() : this.signup();
	};

	callForgetPasswordApi = async () => {
		if (this.state.login) {
			await commandBackend('resetUserPassword', {
				username: `${this.state.login}${this.state.onlineSwitch ? `@${this.state.serv}` : ''}`,
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
			<React.Fragment>
				<div className="loginImageContainer">
					<img src={logo} className="loginImage" alt='logo' />
				</div>

				<div className="loginBox">
					<p className="loginSlogan">{i18next.t('LOGIN_SLOGAN')}</p>
					{this.state.activeView === 1 ?
						<>
							{!this.state.isAdminPath ?
								<button className="btn largeButton guestButton" onClick={this.loginGuest}>
									{i18next.t('GUEST_CONTINUE')}
								</button>:null
							}
							<form onSubmit={this.onSubmit}>
								<div className="loginForm">
									<div className="spacedSwitch">
										<label className="loginLabel">{i18next.t('ONLINE_ACCOUNT')}</label>
										<Switch handleChange={() => this.setState({ onlineSwitch: !this.state.onlineSwitch })}
											isChecked={this.state.onlineSwitch} />
									</div>
									<label className="loginLabel">{i18next.t('USERNAME')}{this.state.onlineSwitch ?
										` @ ${i18next.t('INSTANCE_NAME_SHORT')}` : ''}</label>
									<div className="loginLine">
										<input type="text" className={`${this.state.errorBackground} ${this.state.onlineSwitch ? 'loginName' : ''}`} defaultValue={this.state.login} placeholder={i18next.t('USERNAME')}
											required autoFocus onChange={(event) => this.setState({ login: event.target.value })} />
										{this.state.onlineSwitch ? <React.Fragment>
											<div className="arobase">@</div>
											<input type="text" className="instanceName" defaultValue={this.state.serv} placeholder={i18next.t('INSTANCE_NAME_SHORT')}
												onChange={(event) => this.setState({ serv: event.target.value })} />
										</React.Fragment> : null}
									</div>
									<label className="loginLabel">{this.state.forgotPassword && !this.state.onlineSwitch ?
										i18next.t('NEW_PASSWORD') : i18next.t('PASSWORD')}
									</label>
									<div className="loginLine">
										<input type="password" className={this.state.redBorders}
											defaultValue={this.state.password} required placeholder={i18next.t('PASSWORD')}
											onChange={(event) => this.setState({ password: event.target.value })} />
									</div>
									{this.state.forgotPassword && this.state.isAdminPath && !this.state.onlineSwitch ?
										<input type="text" placeholder={i18next.t('SECURITY_CODE')}
											defaultValue={this.state.securityCode} required autoFocus onChange={(event) => this.setState({ securityCode: parseInt(event.target.value) })} /> : null
									}
									{this.state.isAdminPath || this.state.onlineSwitch ?
										<button type="button" className="btn largeButton" onClick={this.forgetPasswordClick}>
											{i18next.t('FORGOT_PASSWORD')}
										</button> : null
									}
									<button type="submit" className="btn largeButton submitButton">
										{i18next.t('LOG_IN')}
									</button>
								</div>
							</form>
						</>:
						<form onSubmit={this.onSubmit}>
							<div>
								<div className="spacedSwitch">
									<label className="loginLabel">{i18next.t('ONLINE_ACCOUNT')}</label>
									<Switch handleChange={() => this.setState({ onlineSwitch: !this.state.onlineSwitch })}
										isChecked={this.state.onlineSwitch} />
								</div>
								<div className="loginForm">
									<label className="loginLabel">{i18next.t('USERNAME')}{this.state.onlineSwitch ?
										`@${i18next.t('INSTANCE_NAME_SHORT')}` : ''}</label>
									<div className="loginLine">
										<input className={`${this.state.errorBackground} ${this.state.onlineSwitch ? 'loginName' : ''}`}
											   type="text" defaultValue={this.state.login} required autoFocus placeholder={i18next.t('USERNAME')}
											   onChange={(event) => this.setState({ login: event.target.value })} />
										{this.state.onlineSwitch ? <React.Fragment>
											<div className="arobase">@</div>
											<input type="text" className="instanceName" defaultValue={this.state.serv}
												   onChange={(event) => this.setState({ serv: event.target.value })} />
										</React.Fragment> : null}
									</div>
									<label className="loginLabel">{i18next.t('PASSWORD')}</label>
									<div>
										<input type="password" className={this.state.redBorders} required defaultValue={this.state.password}
											   onChange={(event) => this.setState({ password: event.target.value })}
											   placeholder={i18next.t('PASSWORD')} />
									</div>
									<label className="loginLabel">{i18next.t('PASSWORDCONF')}</label>
									<div>
										<input type="password" className={this.state.redBorders} required defaultValue={this.state.passwordConfirmation}
										   	onChange={(event) => this.setState({ passwordConfirmation: event.target.value })}
											placeholder={i18next.t('PASSWORDCONF')} />
									</div>
									{this.state.isAdminPath ?
										<React.Fragment>
											<label className="loginLabel">{i18next.t('SECURITY_CODE')}</label>
											<div>
												<input type="text" placeholder={i18next.t('SECURITY_CODE')}
													   defaultValue={this.state.securityCode} required onChange={(event) => this.setState({ securityCode: parseInt(event.target.value) })} />
											</div>
										</React.Fragment> : null
									}
									<div>
										<button type="submit" className="btn largeButton submitButton">
											{i18next.t('SIGN_UP')}
										</button>
									</div>
								</div>
							</div>
						</form>
					}
					<button type="button" className="btn largeButton switchButton" onClick={() => this.setState({activeView: this.state.activeView === 1 ? 2:1})}>
						{i18next.t(this.state.activeView === 1 ? 'NEW_ACCOUNT':'LOGIN')}
					</button>
				</div>
				<div className="versionKM">
					<div>Karaoke Mugen</div>
					<div>{`${i18next.t('VERSION')} ${this.props.context.globalState.settings.data.version.number} - ${this.props.context.globalState.settings.data.version.name}`}</div>
				</div>
			</React.Fragment>
		);
	}
}

export default withRouter(Login);
