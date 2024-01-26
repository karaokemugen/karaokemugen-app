import './Login.scss';

import i18next from 'i18next';
import { FormEvent, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { User } from '../../../../src/lib/types/user';
import logo from '../../assets/Logo-fond-transp.png';
import Switch from '../../frontend/components/generic/Switch';
import { login as loginAction, logout } from '../../store/actions/auth';
import GlobalContext from '../../store/context';
import { isElectron } from '../electron';
import { langSupport } from '../isoLanguages';
import { commandBackend } from '../socket';
import { callModal, displayMessage, lastLocation } from '../tools';
import { debounce } from 'lodash';

interface UserApi extends User {
	role: 'admin' | 'user';
}

function Login() {
	const context = useContext(GlobalContext);
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const [redBorders, setRedBorders] = useState('');
	const [errorBackground, setErrorBackground] = useState('');
	const [serv, setServ] = useState(
		context.globalState.settings.data.config?.Online.Users && context.globalState.settings.data.config?.Online.Host
			? context.globalState.settings.data.config.Online.Host
			: ''
	);
	const [activeView, setActiveView] = useState<'login' | 'signup' | 'welcome' | 'guest'>('welcome');
	const [onlineSwitch, setOnlineSwitch] = useState(true);
	const [forgotPassword, setForgotPassword] = useState(false);
	const [login, setLogin] = useState('');
	const [password, setPassword] = useState('');
	const [passwordConfirmation, setPasswordConfirmation] = useState<string>();
	const [securityCode, setSecurityCode] = useState<number>();
	const [isExistingOnlineAccountLocally, setExistingOnlineAccountLocally] = useState(false);

	const isAdminPath = lastLocation && lastLocation !== '/' && !lastLocation.includes('/public');

	useEffect(() => {
		if (context.globalState.settings.data.config.Frontend.RequireSecurityCodeForNewAccounts && login)
			debounceExistingOnlineAccountLocally(login);
	}, [login]);

	const debounceExistingOnlineAccountLocally = useCallback(
		debounce(loginToCheck => updateIsExistingOnlineAccountLocally(loginToCheck), 2000),
		[]
	);

	const updateIsExistingOnlineAccountLocally = async (loginToCheck: string) => {
		try {
			await commandBackend('getUser', { username: `${loginToCheck}@${serv}` }, false, 30000, true);
			setExistingOnlineAccountLocally(true);
		} catch (e) {
			setExistingOnlineAccountLocally(false);
		}
	};

	const loginCall = async (
		username: string | undefined,
		password?: string,
		securityCode?: number,
		guestName?: string
	) => {
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
			loginFinish(username, password, securityCode, guestName);
		}
	};

	const loginFinish = async (username: string, password: string, securityCode: number, guestName?: string) => {
		try {
			const role = await loginAction(username, password, context.globalDispatch, securityCode, guestName);
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
								navigate(lastLocation);
							} else {
								navigate('/');
							}
						},
						undefined,
						true
					);
				}
			} else {
				if (lastLocation) {
					navigate(lastLocation);
				} else {
					navigate('/');
				}
			}
		} catch (err) {
			// error already display
		}
	};

	const loginGuest = async () => {
		loginCall(undefined, undefined, undefined, login).catch(() => {});
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
		loginCall(username, password, securityCode);
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
				securityCode: securityCode,
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
		if (activeView === 'signup') {
			signup();
		} else if (activeView === 'login') {
			loginUser();
		} else {
			loginGuest();
		}
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

	const loginGuestContinue = () => {
		if (context.globalState.settings.data.config?.Frontend.AllowCustomTemporaryGuests) {
			setOnlineSwitch(false);
			setActiveView('guest');
		} else {
			loginGuest();
		}
	};

	useEffect(() => {
		const admpwd = searchParams.get('admpwd');
		if (admpwd && !context.globalState.auth.data.token) {
			loginCall('admin', admpwd);
		}
		if (context.globalState.auth.isAuthenticated) {
			if (lastLocation) {
				navigate(lastLocation);
			} else {
				navigate('/');
			}
		}
	}, []);

	return (
		<div className="loginContainer">
			<div className="loginHeader">
				<div className="loginImage">
					<img src={logo} alt="Logo KM" />
				</div>
				<p>
					<div className="loginWelcomeMessage">
						{context.globalState.settings.data.config?.Frontend.WelcomeMessage}
					</div>
					<div className="loginSlogan">
						{isAdminPath ? i18next.t('LOGIN_SLOGAN_ADMIN') : i18next.t('LOGIN_SLOGAN')}
					</div>
				</p>
			</div>
			<div className="loginBox">
				{activeView === 'welcome' ? (
					<>
						{!isAdminPath &&
						context.globalState.settings.data.config?.Frontend.AllowGuestLogin &&
						!context.globalState.settings.data.config.Frontend.RequireSecurityCodeForNewAccounts ? (
							<button className="btn largeButton guestButton" onClick={loginGuestContinue}>
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
						{context.globalState.settings.data.config?.Frontend.AllowUserCreation ? (
							<button
								type="button"
								className="btn largeButton signupButton"
								onClick={() => setActiveView('signup')}
							>
								{i18next.t('LOGIN.NEW_ACCOUNT')}
							</button>
						) : null}
					</>
				) : null}
				{activeView !== 'welcome' ? (
					<>
						<button type="button" className="btn largeButton" onClick={() => setActiveView('welcome')}>
							{i18next.t('LOGIN.GO_BACK')}
						</button>
						<form onSubmit={onSubmit}>
							{activeView !== 'guest' ? (
								<div className="spacedSwitch">
									<label className="loginLabel">{i18next.t('LOGIN.ONLINE_ACCOUNT')}</label>
									<Switch
										handleChange={() => setOnlineSwitch(!onlineSwitch)}
										isChecked={onlineSwitch}
									/>
								</div>
							) : null}
							<div className="loginForm">
								<label className="loginLabel">
									{i18next.t(activeView === 'guest' ? 'USERS.NICKNAME' : 'USERNAME')}
									{onlineSwitch ? ` @ ${i18next.t('INSTANCE_NAME_SHORT')}` : ''}
								</label>
								<div className="loginLine">
									<input
										type="text"
										className={`${errorBackground} ${onlineSwitch ? 'loginName' : ''}`}
										defaultValue={login}
										placeholder={i18next.t(activeView === 'guest' ? 'USERS.NICKNAME' : 'USERNAME')}
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
								{activeView !== 'guest' ? (
									<>
										<label className="loginLabel">
											{forgotPassword && !onlineSwitch
												? i18next.t('NEW_PASSWORD')
												: i18next.t('PASSWORD')}
										</label>
										<div className="loginLine">
											<input
												type="password"
												className={redBorders}
												autoComplete={
													activeView === 'signup' ? 'new-password' : 'current-password'
												}
												defaultValue={password}
												required
												placeholder={i18next.t('PASSWORD')}
												onChange={event => setPassword(event.target.value)}
											/>
										</div>
									</>
								) : null}
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
								{(isAdminPath &&
									!isElectron() &&
									((forgotPassword && activeView === 'login' && !onlineSwitch) ||
										activeView === 'signup')) ||
								(!isAdminPath &&
									(activeView === 'signup' ||
										(activeView === 'login' && onlineSwitch && !isExistingOnlineAccountLocally)) &&
									context.globalState.settings.data.config.Frontend
										.RequireSecurityCodeForNewAccounts) ? (
									<>
										<label className="loginLabel">
											{i18next.t(isAdminPath ? 'SECURITY_CODE' : 'NEW_ACCOUNT_CODE')}
										</label>
										<div className="loginLine">
											<input
												type="text"
												placeholder={i18next.t(
													isAdminPath ? 'SECURITY_CODE' : 'NEW_ACCOUNT_CODE_SHORT'
												)}
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
									{i18next.t(activeView === 'signup' ? 'SIGN_UP' : 'LOG_IN')}
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

export default Login;
