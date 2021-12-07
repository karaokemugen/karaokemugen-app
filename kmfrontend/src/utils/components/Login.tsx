import './Login.scss';

import i18next from 'i18next';
import { FormEvent, useContext, useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { User } from '../../../../src/lib/types/user';
import logo from '../../assets/Logo-fond-transp.png';
import Switch from '../../frontend/components/generic/Switch';
import { login as loginAction, logout } from '../../store/actions/auth';
import GlobalContext from '../../store/context';
import { isElectron } from '../electron';
import { langSupport } from '../isoLanguages';
import { commandBackend } from '../socket';
import { callModal, displayMessage, lastLocation } from '../tools';

interface UserApi extends User {
	role: 'admin' | 'user';
}

function Login(props: RouteComponentProps) {
	const context = useContext(GlobalContext);
	const [redBorders, setRedBorders] = useState('');
	const [errorBackground, setErrorBackground] = useState('');
	const [serv, setServ] = useState(
		context.globalState.settings.data.config.Online.Users && context.globalState.settings.data.config.Online.Host
			? context.globalState.settings.data.config.Online.Host
			: ''
	);
	const [activeView, setActiveView] = useState<'login' | 'signup' | 'welcome'>('welcome');
	const [onlineSwitch, setOnlineSwitch] = useState(true);
	const [forgotPassword, setForgotPassword] = useState(false);
	const [login, setLogin] = useState('');
	const [password, setPassword] = useState('');
	const [passwordConfirmation, setPasswordConfirmation] = useState<string>();
	const [securityCode, setSecurityCode] = useState<number>();

	const admpwd = window.location.search.indexOf('admpwd') !== -1 ? window.location.search.split('=')[1] : undefined;
	const isAdminPath = lastLocation && lastLocation !== '/' && !lastLocation.includes('/public');

	const loginCall = async (username: string | undefined, password?: string, securityCode?: number) => {
		if (isAdminPath && isElectron()) {
			const { ipcRenderer: ipc } = window.require('electron');
			ipc.send('getSecurityCode');
			ipc.once('getSecurityCodeResponse', async (_event, securityCodeViaElectron) => {
				if (forgotPassword) {
					await callForgetPasswordApi(securityCodeViaElectron);
				}
				loginFinish(username, password, securityCodeViaElectron);
			});
		} else {
			if (forgotPassword) {
				await callForgetPasswordApi(securityCode);
			}
			loginFinish(username, password, securityCode);
		}
	};

	const loginFinish = async (username: string, password: string, securityCode: number) => {
		try {
			const role = await loginAction(username, password, context.globalDispatch, securityCode);
			if (isAdminPath && role !== 'admin') {
				if (!username) {
					displayMessage('warning', i18next.t('ERROR_CODES.ADMIN_PLEASE'));
					logout(context.globalDispatch);
				} else {
					callModal(
						context.globalDispatch,
						'prompt',
						i18next.t('MAKE_ACCOUNT_ADMIN'),
						i18next.t('MAKE_ACCOUNT_ADMIN_MESSAGE'),
						async (securityCodeString: string) => {
							await loginAction(username, password, context.globalDispatch, parseInt(securityCodeString));
							if (lastLocation) {
								props.history.replace(lastLocation);
							} else {
								props.history.replace('/');
							}
						},
						undefined,
						true
					);
				}
			} else {
				if (lastLocation) {
					props.history.replace(lastLocation);
				} else {
					props.history.replace('/');
				}
			}
		} catch (err) {
			// error already display
		}
	};

	const loginGuest = async () => {
		loginCall(undefined).catch(() => {});
	};

	const loginUser = () => {
		if (login.includes('@')) {
			setErrorBackground('errorBackground');
			displayMessage('warning', i18next.t('USERS.CHAR_NOT_ALLOWED', { char: '@' }));
			return;
		} else {
			setErrorBackground('');
		}
		const username = login + (onlineSwitch ? '@' + serv : '');
		loginCall(username, password);
	};

	const signup = async () => {
		if (login.includes('@')) {
			setErrorBackground('errorBackground');
			displayMessage('warning', i18next.t('USERS.CHAR_NOT_ALLOWED', { char: '@' }));
			return;
		} else {
			setErrorBackground('');
		}
		const username = login + (onlineSwitch ? '@' + serv : '');
		if (password !== passwordConfirmation) {
			setRedBorders('redBorders');
		} else {
			const data: UserApi = {
				login: username,
				password: password,
				role: isAdminPath ? 'admin' : 'user',
				language: langSupport,
			};
			if (isAdminPath && !isElectron()) {
				if (!securityCode) {
					displayMessage('error', i18next.t('SECURITY_CODE_MANDATORY'));
					return;
				}
			}
			try {
				await commandBackend('createUser', data);
				setRedBorders('');
				loginCall(username, password, securityCode);
			} catch (e) {
				// already display
			}
		}
	};

	const onSubmit = (e: FormEvent) => {
		e.preventDefault();
		activeView === 'login' ? loginUser() : signup();
	};

	const callForgetPasswordApi = async (securityCode?: number) => {
		if (login) {
			await commandBackend('resetUserPassword', {
				username: `${login}${onlineSwitch ? `@${serv}` : ''}`,
				securityCode: securityCode,
				password: password,
			}).catch(() => {});
		}
	};

	const forgetPasswordClick = () => {
		if (onlineSwitch) {
			callForgetPasswordApi();
		} else {
			setForgotPassword(!forgotPassword);
		}
	};

	useEffect(() => {
		if (admpwd && !context.globalState.auth.data.token) {
			loginCall('admin', admpwd);
		}
		if (context.globalState.auth.isAuthenticated) {
			if (lastLocation) {
				props.history.replace(lastLocation);
			} else {
				props.history.replace('/');
			}
		}
	}, []);

	return (
		<div className="loginContainer">
			<div className="loginHeader">
				<div className="loginImage">
					<img src={logo} alt="Logo KM" />
				</div>
				<p className="loginSlogan">
					{isAdminPath ? i18next.t('LOGIN_SLOGAN_ADMIN') : i18next.t('LOGIN_SLOGAN')}
				</p>
			</div>
			<div className="loginBox">
				{activeView === 'welcome' ? (
					<>
						{!isAdminPath ? (
							<button className="btn largeButton guestButton" onClick={loginGuest}>
								{i18next.t('LOGIN.GUEST_CONTINUE')}
							</button>
						) : null}
						<button
							type="button"
							className="btn largeButton loginButton"
							onClick={() => setActiveView('login')}
						>
							{i18next.t('LOGIN.BUTTON_LOGIN')}
						</button>
						<button
							type="button"
							className="btn largeButton signupButton"
							onClick={() => setActiveView('signup')}
						>
							{i18next.t('LOGIN.NEW_ACCOUNT')}
						</button>
					</>
				) : null}
				{activeView !== 'welcome' ? (
					<>
						<button type="button" className="btn largeButton" onClick={() => setActiveView('welcome')}>
							{i18next.t('LOGIN.GO_BACK')}
						</button>
						<form onSubmit={onSubmit}>
							<div className="spacedSwitch">
								<label className="loginLabel">{i18next.t('LOGIN.ONLINE_ACCOUNT')}</label>
								<Switch handleChange={() => setOnlineSwitch(!onlineSwitch)} isChecked={onlineSwitch} />
							</div>
							<div className="loginForm">
								<label className="loginLabel">
									{i18next.t('USERNAME')}
									{onlineSwitch ? ` @ ${i18next.t('INSTANCE_NAME_SHORT')}` : ''}
								</label>
								<div className="loginLine">
									<input
										type="text"
										className={`${errorBackground} ${onlineSwitch ? 'loginName' : ''}`}
										defaultValue={login}
										placeholder={i18next.t('USERNAME')}
										autoComplete="username"
										required
										autoFocus
										onChange={event => setLogin(event.target.value)}
									/>
									{onlineSwitch ? (
										<>
											<div className="arobase">@</div>
											<input
												type="text"
												className="instanceName"
												defaultValue={serv}
												placeholder={i18next.t('INSTANCE_NAME_SHORT')}
												autoComplete="off"
												onChange={event => setServ(event.target.value)}
											/>
										</>
									) : null}
								</div>
								<label className="loginLabel">
									{forgotPassword && !onlineSwitch
										? i18next.t('NEW_PASSWORD')
										: i18next.t('PASSWORD')}
								</label>
								<div className="loginLine">
									<input
										type="password"
										className={redBorders}
										autoComplete={activeView === 'signup' ? 'new-password' : 'current-password'}
										defaultValue={password}
										required
										placeholder={i18next.t('PASSWORD')}
										onChange={event => setPassword(event.target.value)}
									/>
								</div>
								{activeView === 'signup' ? (
									<>
										<label className="loginLabel">{i18next.t('PASSWORDCONF')}</label>
										<div className="loginLine">
											<input
												type="password"
												className={redBorders}
												required
												defaultValue={passwordConfirmation}
												onChange={event => setPasswordConfirmation(event.target.value)}
												placeholder={i18next.t('PASSWORDCONF')}
												autoComplete="new-password"
											/>
										</div>
									</>
								) : null}
								{isAdminPath &&
								!isElectron() &&
								((forgotPassword && activeView === 'login' && !onlineSwitch) ||
									activeView === 'signup') ? (
									<>
										<label className="loginLabel">{i18next.t('SECURITY_CODE')}</label>
										<div className="loginLine">
											<input
												type="text"
												placeholder={i18next.t('SECURITY_CODE')}
												defaultValue={securityCode}
												required
												autoFocus
												onChange={event => setSecurityCode(parseInt(event.target.value))}
												autoComplete="off"
											/>
										</div>
									</>
								) : null}
								{activeView === 'login' && (isAdminPath || onlineSwitch) ? (
									<button type="button" className="btn largeButton" onClick={forgetPasswordClick}>
										{i18next.t('FORGOT_PASSWORD')}
									</button>
								) : null}
								<button type="submit" className="btn largeButton submitButton">
									{i18next.t(activeView === 'login' ? 'LOG_IN' : 'SIGN_UP')}
								</button>
							</div>
						</form>
					</>
				) : null}

				<div className="versionKM">
					<div>Karaoke Mugen</div>
					<div>{`${i18next.t('VERSION')} ${context.globalState.settings.data.version.number} - ${
						context.globalState.settings.data.version.name
					}`}</div>
				</div>
			</div>
		</div>
	);
}

export default withRouter(Login);
