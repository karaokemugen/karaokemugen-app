import './Login.scss';

import i18next from 'i18next';
import React, { Component, FormEvent } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { User } from '../../../../src/lib/types/user';
import logo from '../../assets/Logo-fond-transp.png';
import Switch from '../../frontend/components/generic/Switch';
import { login, logout } from '../../store/actions/auth';
import { GlobalContextInterface } from '../../store/context';
import { isElectron } from '../electron';
import { langSupport } from '../isoLanguages';
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
	activeView?: 'login' | 'signup' | 'welcome';
	onlineSwitch: boolean;
	forgotPassword: boolean;
	login: string;
	password: string;
	passwordConfirmation?: string;
	securityCode?: number;
	isAdminPath: boolean;
}

interface UserApi extends User {
	role: 'admin' | 'user';
}

class Login extends Component<IProps, IState> {
	constructor(props) {
		super(props);
		this.state = {
			admpwd: window.location.search.indexOf('admpwd') !== -1 ? window.location.search.split('=')[1] : undefined,
			redBorders: '',
			errorBackground: '',
			serv:
				this.props.context.globalState.settings.data.config.Online.Users &&
				this.props.context.globalState.settings.data.config.Online.Host
					? this.props.context.globalState.settings.data.config.Online.Host
					: '',
			role: 'user',
			activeView: 'welcome',
			onlineSwitch: true,
			forgotPassword: false,
			password: '',
			login: '',
			isAdminPath: lastLocation && lastLocation !== '/' && !lastLocation.includes('/public'),
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

	login = async (username: string | undefined, password?: string, securityCode?: number) => {
		if (this.state.isAdminPath && isElectron()) {
			const { ipcRenderer: ipc } = window.require('electron');
			ipc.send('getSecurityCode');
			ipc.once('getSecurityCodeResponse', async (_event, securityCodeViaElectron) => {
				if (this.state.forgotPassword) {
					await this.callForgetPasswordApi(securityCodeViaElectron);
				}
				this.loginFinish(username, password, securityCodeViaElectron);
			});
		} else {
			if (this.state.forgotPassword) {
				await this.callForgetPasswordApi(securityCode);
			}
			this.loginFinish(username, password, securityCode);
		}
	};

	loginFinish = async (username: string, password: string, securityCode: number) => {
		try {
			const role = await login(username, password, this.props.context.globalDispatch, securityCode);
			if (this.state.isAdminPath && role !== 'admin') {
				if (!username) {
					displayMessage('warning', i18next.t('ERROR_CODES.ADMIN_PLEASE'));
					logout(this.props.context.globalDispatch);
				} else {
					callModal(
						this.props.context.globalDispatch,
						'prompt',
						i18next.t('MAKE_ACCOUNT_ADMIN'),
						i18next.t('MAKE_ACCOUNT_ADMIN_MESSAGE'),
						async (securityCodeString: string) => {
							await login(
								username,
								password,
								this.props.context.globalDispatch,
								parseInt(securityCodeString)
							);
							if (lastLocation) {
								this.props.history.replace(lastLocation);
							} else {
								this.props.history.replace('/');
							}
						},
						undefined,
						true
					);
				}
			} else {
				if (lastLocation) {
					this.props.history.replace(lastLocation);
				} else {
					this.props.history.replace('/');
				}
			}
		} catch (err) {
			// error already display
		}
	};

	loginGuest = async () => {
		this.login(undefined).catch(() => {});
	};

	loginUser = () => {
		if (this.state.login.includes('@')) {
			this.setState({ errorBackground: 'errorBackground' });
			displayMessage('warning', i18next.t('USERS.CHAR_NOT_ALLOWED', { char: '@' }));
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
			displayMessage('warning', i18next.t('USERS.CHAR_NOT_ALLOWED', { char: '@' }));
			return;
		} else {
			this.setState({ errorBackground: '' });
		}
		const username = this.state.login + (this.state.onlineSwitch ? '@' + this.state.serv : '');
		const password = this.state.password;
		if (password !== this.state.passwordConfirmation) {
			this.setState({ redBorders: 'redBorders' });
		} else {
			const data: UserApi = {
				login: username,
				password: password,
				role: this.state.isAdminPath ? 'admin' : 'user',
				language: langSupport,
			};
			if (this.state.isAdminPath && !isElectron()) {
				if (!this.state.securityCode) {
					displayMessage('error', i18next.t('SECURITY_CODE_MANDATORY'));
					return;
				}
			}
			try {
				await commandBackend('createUser', data);
				this.setState({ redBorders: '' });
				this.login(username, password, this.state.securityCode);
			} catch (e) {
				// already display
			}
		}
	};

	onSubmit = (e: FormEvent) => {
		e.preventDefault();
		this.state.activeView === 'login' ? this.loginUser() : this.signup();
	};

	callForgetPasswordApi = async (securityCode?: number) => {
		if (this.state.login) {
			await commandBackend('resetUserPassword', {
				username: `${this.state.login}${this.state.onlineSwitch ? `@${this.state.serv}` : ''}`,
				securityCode: securityCode,
				password: this.state.password,
			}).catch(() => {});
		}
	};

	forgetPasswordClick = () => {
		if (this.state.onlineSwitch) {
			this.callForgetPasswordApi();
		} else {
			this.setState({ forgotPassword: !this.state.forgotPassword });
		}
	};

	render() {
		return (
			<div className="loginContainer">
				<div className="loginHeader">
					<div className="loginImage">
						<img src={logo} alt="Logo KM" />
					</div>
					<p className="loginSlogan">
						{this.state.isAdminPath ? i18next.t('LOGIN_SLOGAN_ADMIN') : i18next.t('LOGIN_SLOGAN')}
					</p>
				</div>
				<div className="loginBox">
					{this.state.activeView === 'welcome' ? (
						<>
							{!this.state.isAdminPath ? (
								<button className="btn largeButton guestButton" onClick={this.loginGuest}>
									{i18next.t('LOGIN.GUEST_CONTINUE')}
								</button>
							) : null}
							<button
								type="button"
								className="btn largeButton loginButton"
								onClick={() => this.setState({ activeView: 'login' })}
							>
								{i18next.t('LOGIN.BUTTON_LOGIN')}
							</button>
							<button
								type="button"
								className="btn largeButton signupButton"
								onClick={() => this.setState({ activeView: 'signup' })}
							>
								{i18next.t('LOGIN.NEW_ACCOUNT')}
							</button>
						</>
					) : null}
					{this.state.activeView !== 'welcome' ? (
						<>
							<button
								type="button"
								className="btn largeButton"
								onClick={() => this.setState({ activeView: 'welcome' })}
							>
								{i18next.t('LOGIN.GO_BACK')}
							</button>
							<form onSubmit={this.onSubmit}>
								<div className="spacedSwitch">
									<label className="loginLabel">{i18next.t('LOGIN.ONLINE_ACCOUNT')}</label>
									<Switch
										handleChange={() => this.setState({ onlineSwitch: !this.state.onlineSwitch })}
										isChecked={this.state.onlineSwitch}
									/>
								</div>
								<div className="loginForm">
									<label className="loginLabel">
										{i18next.t('USERNAME')}
										{this.state.onlineSwitch ? ` @ ${i18next.t('INSTANCE_NAME_SHORT')}` : ''}
									</label>
									<div className="loginLine">
										<input
											type="text"
											className={`${this.state.errorBackground} ${
												this.state.onlineSwitch ? 'loginName' : ''
											}`}
											defaultValue={this.state.login}
											placeholder={i18next.t('USERNAME')}
											autoComplete="username"
											required
											autoFocus
											onChange={(event) => this.setState({ login: event.target.value })}
										/>
										{this.state.onlineSwitch ? (
											<React.Fragment>
												<div className="arobase">@</div>
												<input
													type="text"
													className="instanceName"
													defaultValue={this.state.serv}
													placeholder={i18next.t('INSTANCE_NAME_SHORT')}
													autoComplete="off"
													onChange={(event) => this.setState({ serv: event.target.value })}
												/>
											</React.Fragment>
										) : null}
									</div>
									<label className="loginLabel">
										{this.state.forgotPassword && !this.state.onlineSwitch
											? i18next.t('NEW_PASSWORD')
											: i18next.t('PASSWORD')}
									</label>
									<div className="loginLine">
										<input
											type="password"
											className={this.state.redBorders}
											autoComplete={
												this.state.activeView === 'signup' ? 'new-password' : 'current-password'
											}
											defaultValue={this.state.password}
											required
											placeholder={i18next.t('PASSWORD')}
											onChange={(event) => this.setState({ password: event.target.value })}
										/>
									</div>
									{this.state.activeView === 'signup' ? (
										<>
											<label className="loginLabel">{i18next.t('PASSWORDCONF')}</label>
											<div className="loginLine">
												<input
													type="password"
													className={this.state.redBorders}
													required
													defaultValue={this.state.passwordConfirmation}
													onChange={(event) =>
														this.setState({ passwordConfirmation: event.target.value })
													}
													placeholder={i18next.t('PASSWORDCONF')}
													autoComplete="new-password"
												/>
											</div>
										</>
									) : null}
									{this.state.isAdminPath &&
									!isElectron() &&
									((this.state.forgotPassword &&
										this.state.activeView === 'login' &&
										!this.state.onlineSwitch) ||
										this.state.activeView === 'signup') ? (
										<>
											<label className="loginLabel">{i18next.t('SECURITY_CODE')}</label>
											<div className="loginLine">
												<input
													type="text"
													placeholder={i18next.t('SECURITY_CODE')}
													defaultValue={this.state.securityCode}
													required
													autoFocus
													onChange={(event) =>
														this.setState({ securityCode: parseInt(event.target.value) })
													}
													autoComplete="off"
												/>
											</div>
										</>
									) : null}
									{this.state.activeView === 'login' &&
									(this.state.isAdminPath || this.state.onlineSwitch) ? (
										<button
											type="button"
											className="btn largeButton"
											onClick={this.forgetPasswordClick}
										>
											{i18next.t('FORGOT_PASSWORD')}
										</button>
									) : null}
									<button type="submit" className="btn largeButton submitButton">
										{i18next.t(this.state.activeView === 'login' ? 'LOG_IN' : 'SIGN_UP')}
									</button>
								</div>
							</form>
						</>
					) : null}

					<div className="versionKM">
						<div>Karaoke Mugen</div>
						<div>{`${i18next.t('VERSION')} ${
							this.props.context.globalState.settings.data.version.number
						} - ${this.props.context.globalState.settings.data.version.name}`}</div>
					</div>
				</div>
			</div>
		);
	}
}

export default withRouter(Login);
