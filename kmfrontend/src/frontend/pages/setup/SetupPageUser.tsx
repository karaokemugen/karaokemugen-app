import i18next from 'i18next';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router';

import { setAuthenticationInformation } from '../../../store/actions/auth';
import GlobalContext from '../../../store/context';
import { isElectron } from '../../../utils/electron';
import { langSupport } from '../../../utils/isoLanguages';
import { commandBackend } from '../../../utils/socket';
import { displayMessage } from '../../../utils/tools';
import { WS_CMD } from '../../../utils/ws.mjs';
import ServersList from './ServersList';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamation } from '@fortawesome/free-solid-svg-icons';

function SetupPageUser() {
	const context = useContext(GlobalContext);
	const navigate = useNavigate();

	const [accountType, setAccountType] = useState<'local' | 'online'>();
	const [onlineAction, setOnlineAction] = useState<'create' | 'login'>();
	const [login, setLogin] = useState<string>();
	const [password, setPassword] = useState<string>();
	const [passwordConfirmation, setPasswordConfirmation] = useState<string>();
	const [email, setEmail] = useState<string>();
	const [instance, setInstance] = useState<string>(
		context?.globalState.settings.data.config?.Online.RemoteUsers.DefaultHost
	);
	const [securityCode, setSecurityCode] = useState<number>();
	const [error, setError] = useState<string>();

	const signup = async () => {
		if (login && login.includes('@')) {
			const error = i18next.t('USERS.CHAR_NOT_ALLOWED', { char: '@' });
			displayMessage('warning', error);
			setError(error);
			return;
		}
		const username = login + (accountType === 'online' ? '@' + instance : '');
		if (password !== passwordConfirmation) {
			const error = i18next.t('PASSWORD_DIFFERENT');
			displayMessage('warning', error);
			setError(error);
			return;
		}

		try {
			await commandBackend(WS_CMD.CREATE_USER, {
				login: username,
				password: password,
				role: 'admin',
				language: langSupport,
				email: email ? email : undefined,
			});
			if (accountType === 'online') {
				commandBackend(WS_CMD.UPDATE_SETTINGS, {
					setting: {
						Online: {
							RemoteUsers: {
								DefaultHost: instance,
							},
						},
					},
				});
			}
			setError(undefined);
			loginCall();
		} catch (err: any) {
			const error = err?.message ? i18next.t(`ERROR_CODES.${err.message}`) : JSON.stringify(err);
			setError(error);
		}
	};

	const loginCall = async () => {
		if (!login) {
			const error = i18next.t('LOGIN_MANDATORY');
			displayMessage('warning', error);
			setError(error);
		} else if (!password) {
			const error = i18next.t('PASSWORD_MANDATORY');
			displayMessage('warning', error);
			setError(error);
		} else if (!securityCode && !isElectron()) {
			const error = i18next.t('SECURITY_CODE_MANDATORY');
			displayMessage('warning', error);
			setError(error);
		} else if (isElectron()) {
			const { ipcRenderer: ipc } = window.require('electron');
			ipc.send('getSecurityCode');
			ipc.once('getSecurityCodeResponse', async (_event, securityCode) => {
				loginFinish(securityCode);
			});
		} else {
			loginFinish(securityCode);
		}
	};

	const loginFinish = async (securityCode: number) => {
		try {
			const username = login + (accountType === 'online' ? '@' + instance : '');
			const infos = await commandBackend(WS_CMD.LOGIN, {
				username: username,
				password: password,
				securityCode: securityCode,
			});
			setAuthenticationInformation(context.globalDispatch, infos);
			setError(undefined);
			navigate('/setup/songs');
		} catch (err: any) {
			const error = err?.message?.code ? i18next.t(`ERROR_CODES.${err.message.code}`) : JSON.stringify(err);
			setError(error);
		}
	};

	return (
		<form
			onSubmit={e => {
				accountType === 'online' && onlineAction === 'login' ? loginCall() : signup();
				e.preventDefault();
			}}
		>
			<section className="step step-1">
				<div className="intro">
					<h2>{i18next.t('SETUP_PAGE.USER.WELCOME')}</h2>
					<p>{i18next.t('SETUP_PAGE.USER.CHOOSE_ACCOUNT')}</p>
				</div>
				<ul className="actions">
					<li>
						<button
							className={accountType === 'local' ? 'in' : ''}
							type="button"
							onClick={() => setAccountType('local')}
						>
							{i18next.t('SETUP_PAGE.USER.LOCAL_ACCOUNT')}
						</button>
					</li>
					<li>
						<button
							className={accountType === 'online' ? 'in' : ''}
							type="button"
							onClick={() => setAccountType('online')}
						>
							{i18next.t('SETUP_PAGE.USER.ONLINE_ACCOUNT')}
						</button>
					</li>
				</ul>
				<blockquote className="extra">
					<h3>{i18next.t('SETUP_PAGE.USER.ONLINE_ACCOUNT_DESC')}</h3>
					<ul>
						<li>{i18next.t('SETUP_PAGE.USER.ONLINE_ACCOUNT_FAVORITES')}</li>
						<li>{i18next.t('SETUP_PAGE.USER.ONLINE_ACCOUNT_PLAYLISTS')}</li>
						<li>{i18next.t('SETUP_PAGE.USER.ONLINE_ACCOUNT_OTHER_SESSIONS')}</li>
					</ul>
				</blockquote>
			</section>
			{accountType === 'local' ? (
				<section className="step step-2 step-local">
					<p>{i18next.t('SETUP_PAGE.USER.LOCAL_ACCOUNT_DESC')}</p>
					<div className="input-group">
						<div className="input-control">
							<label>{i18next.t('USERNAME')}</label>
							<input
								className="input-field"
								type="text"
								defaultValue={login}
								required
								onChange={event => setLogin(event.target.value)}
							/>
						</div>
						<div className="input-control">
							<label>{i18next.t('PASSWORD')}</label>
							<input
								className="input-field"
								type="password"
								required
								defaultValue={password}
								onChange={event => setPassword(event.target.value)}
							/>
						</div>
						<div className="input-control">
							<label>{i18next.t('PASSWORDCONF')}</label>
							<input
								className="input-field"
								type="password"
								required
								defaultValue={passwordConfirmation}
								onChange={event => setPasswordConfirmation(event.target.value)}
							/>
						</div>
					</div>
				</section>
			) : accountType === 'online' ? (
				<section className="step step-2 step-online">
					<p>{i18next.t('SETUP_PAGE.ONLINE_SERVER.SELECT')}</p>
					<p>{i18next.t('SETUP_PAGE.ONLINE_SERVER.DESCRIPTION')}</p>
					<p>
						<FontAwesomeIcon icon={faExclamation} />
						{i18next.t('SETUP_PAGE.ONLINE_SERVER.HINT')}
					</p>
					<p>{i18next.t('SETUP_PAGE.ONLINE_SERVER.LIST')}</p>
					<ServersList instance={instance} setInstance={setInstance} typeLabel="users" />
					<p>
						{i18next.t('SETUP_PAGE.USER.ONLINE_ACCOUNT_INSTANCE', {
							instance: instance,
						})}
					</p>
					<ul className="actions">
						<li>
							<button
								className={onlineAction === 'create' ? 'in' : ''}
								type="button"
								onClick={() => setOnlineAction('create')}
							>
								{i18next.t('SETUP_PAGE.USER.CREATE_ONLINE_ACCOUNT')}
							</button>
						</li>
						<li>
							<button
								className={onlineAction === 'login' ? 'in' : ''}
								type="button"
								onClick={() => setOnlineAction('login')}
							>
								{i18next.t('SETUP_PAGE.USER.LOGIN_ONLINE_ACCOUNT')}
							</button>
						</li>
					</ul>
					{onlineAction ? (
						<div className="input-group">
							<div className="input-control">
								<label>{i18next.t('USERNAME')}</label>
								<input
									key="login"
									className="input-field"
									type="text"
									defaultValue={login}
									required
									onChange={event => setLogin(event.target.value)}
								/>
							</div>
							<div className="input-control">
								<label>{i18next.t('INSTANCE_NAME_SHORT')}</label>
								<div className="input-field disabled">@{instance}</div>
							</div>
							<div className="input-control">
								<label>{i18next.t('PASSWORD')}</label>
								<input
									key="password"
									className="input-field"
									type="password"
									required
									defaultValue={password}
									onChange={event => setPassword(event.target.value)}
								/>
							</div>
							{onlineAction === 'create' ? (
								<>
									<div className="input-control">
										<label>{i18next.t('PASSWORDCONF')}</label>
										<input
											key="passwordConfirmation"
											className="input-field"
											type="password"
											required
											defaultValue={passwordConfirmation}
											onChange={event => setPasswordConfirmation(event.target.value)}
										/>
									</div>
									<div className="input-control">
										<label>{i18next.t('USERS.EMAIL')}</label>
										<input
											className="input-field"
											type="email"
											required
											defaultValue={email}
											onChange={event => setEmail(event.target.value)}
										/>
									</div>
								</>
							) : null}
						</div>
					) : null}
				</section>
			) : null}
			{accountType === 'local' || (accountType === 'online' && onlineAction) ? (
				<section className="step step-3">
					{!isElectron() ? (
						<div className="input-group">
							<p className="intro">
								{i18next.t('SETUP_PAGE.USER.SECURITY_CODE_DESC_CONSOLE')}
								<br />
								<em>{i18next.t('SETUP_PAGE.USER.SECURITY_CODE_USE')}</em>
							</p>
							<div className="input-control">
								<label>{i18next.t('SECURITY_CODE')}</label>
								<input
									className="input-field"
									type="text"
									required
									onChange={event => setSecurityCode(parseInt(event.target.value))}
								/>
							</div>
						</div>
					) : null}
					<div className="actions">
						<label className="error">{error}</label>
						{(accountType === 'local' || onlineAction) && (
							<button type="submit">
								{accountType === 'online' && onlineAction === 'login'
									? i18next.t('ACTIONS.LOG_IN')
									: i18next.t('ACTIONS.SIGN_UP')}
							</button>
						)}
					</div>
				</section>
			) : null}
		</form>
	);
}

export default SetupPageUser;
