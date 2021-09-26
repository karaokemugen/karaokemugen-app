import '../styles/start/Start.scss';
import '../styles/start/SetupPage.scss';

import i18next from 'i18next';
import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { TaskItem } from '../../../../src/lib/types/taskItem';
import logo from '../../assets/Logo-final-fond-transparent.png';
import logoBig from '../../assets/Logo-fond-transp.png';
import nanamiHeHe from '../../assets/nanami-hehe2.png';
import nanamiSearching from '../../assets/nanami-searching.gif';
import { setAuthentifactionInformation } from '../../store/actions/auth';
import GlobalContext from '../../store/context';
import { isElectron } from '../../utils/electron';
import { commandBackend, getSocket } from '../../utils/socket';
import { displayMessage } from '../../utils/tools';

interface IProps {
	route: RouteComponentProps;
}

interface IState {
	accountType: 'local' | 'online' | null;
	onlineAction: 'create' | 'login' | null;
	login?: string;
	password?: string;
	passwordConfirmation?: string;
	instance?: string;
	securityCode?: number;
	repositoryFolder?: string;
	activeView: 'user' | 'repo' | 'stats' | 'loading';
	error?: string;
	openDetails: boolean;
	stats?: boolean;
	errorTracking?: boolean
	gitUpdateInProgress: boolean
	tasks: Array<TaskItem>;
}
class SetupPage extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>
	timeout: NodeJS.Timeout

	constructor(props: IProps) {
		super(props);
		this.state = {
			accountType: null,
			onlineAction: null,
			activeView: 'user',
			openDetails: false,
			gitUpdateInProgress: false,
			tasks: []
		};
	}

	componentDidMount() {
		const repository = this.context?.globalState.settings.data.config?.System.Repositories[0].Path.Medias[0];
		const path = `${this.getPathForFileSystem(repository)}${this.context.globalState.settings.data.state.os === 'win32' ? repository.replace(/\//g, '\\') : repository}`;

		this.setState({
			instance: this.context?.globalState.settings.data.config?.Online.Host,
			repositoryFolder: path,
			activeView: this.context?.globalState.settings.data.user.login !== 'admin' ? 'repo' : 'user'
		});
		getSocket().on('tasksUpdated', this.isGitUpdateInProgress);
	}

	componentWillUnmount() {
		getSocket().off('tasksUpdated', this.isGitUpdateInProgress);
	}

	isGitUpdateInProgress = (tasks: Array<TaskItem>) => {
		for (const i in tasks) {
			if (tasks[i].text === 'UPDATING_GIT_REPO') {
				this.setState({ tasks });
				this.setState({ gitUpdateInProgress: true });
				clearTimeout(this.timeout);
				this.timeout = setTimeout(async () => {
					if (this.state.activeView === 'loading') {
						this.endSetup();
					}
				}, 5000);
			}
		}
	}

	endSetup = async () => {
		await commandBackend('updateSettings', {
			setting: {
				App: {
					FirstRun: false
				}
			}
		}).catch(() => { });
		await commandBackend('startPlayer').catch(() => { });
		sessionStorage.setItem('dlQueueRestart', 'true');
		this.props.route.history.push('/welcome');
	}

	signup = async () => {
		if (this.state.login && this.state.login.includes('@')) {
			const error = i18next.t('CHAR_NOT_ALLOWED', { char: '@' });
			displayMessage('warning', error);
			this.setState({ error: error });
			return;
		}
		const username =
			this.state.login +
			(this.state.accountType === 'online' ? '@' + this.state.instance : '');
		if (this.state.password !== this.state.passwordConfirmation) {
			const error = i18next.t('PASSWORD_DIFFERENT');
			displayMessage('warning', error);
			this.setState({ error: error });
			return;
		}

		try {
			await commandBackend('createUser', {
				login: username,
				password: this.state.password,
				role: 'admin'
			});
			this.setState({ error: undefined });
			this.login();
		} catch (err) {
			const error = err?.response ? i18next.t(`ERROR_CODES.${err.response.code}`) : JSON.stringify(err);
			this.setState({ error: error });
		}
	};

	login = async () => {
		if (!this.state.login) {
			const error = i18next.t('LOGIN_MANDATORY');
			displayMessage('warning', error);
			this.setState({ error: error });
		} else if (!this.state.password) {
			const error = i18next.t('PASSWORD_MANDATORY');
			displayMessage('warning', error);
			this.setState({ error: error });
		} else if (!this.state.securityCode && !isElectron()) {
			const error = i18next.t('SECURITY_CODE_MANDATORY');
			displayMessage('warning', error);
			this.setState({ error: error });
		} else if (isElectron()) {
			const { ipcRenderer: ipc } = window.require('electron');
			ipc.send('getSecurityCode');
			ipc.once('getSecurityCodeResponse', async (_event, securityCode) => {
				this.loginFinish(securityCode);
			});
		} else {
			this.loginFinish(this.state.securityCode);
		}
	};

	loginFinish = async (securityCode: number) => {
		try {
			const username =
				this.state.login +
				(this.state.accountType === 'online' ? '@' + this.state.instance : '');
			const infos = await commandBackend('login', {
				username: username,
				password: this.state.password,
				securityCode: securityCode
			});
			setAuthentifactionInformation(this.context.globalDispatch, infos);
			this.setState({ activeView: 'repo', error: undefined });
		} catch (err) {
			const error = err?.message?.code ? i18next.t(`ERROR_CODES.${err.message.code}`) : JSON.stringify(err);
			this.setState({ error: error });
		}
	}

	getPathForFileSystem(value: string) {
		const state = this.context.globalState.settings.data.state;
		const regexp = state.os === 'win32' ? '^[a-zA-Z]:' : '^/';
		if (value.match(regexp) === null) {
			return `${state.dataPath}${state.os === 'win32' ? '\\' : '/'}`;
		} else {
			return '';
		}
	}

	onClickRepository = () => {
		const { ipcRenderer: ipc } = window.require('electron');
		const options = {
			defaultPath: this.state.repositoryFolder,
			title: i18next.t('SETUP_PAGE.CHOOSE_DIRECTORY'),
			buttonLabel: i18next.t('SETUP_PAGE.ADD_DIRECTORY'),
			properties: ['createDirectory', 'openDirectory'],
		};
		ipc.send('get-file-paths', options);
		ipc.once(
			'get-file-paths-response',
			async (_event: any, filepaths: Array<string>) => {
				if (filepaths.length > 0) {
					this.setState({ repositoryFolder: filepaths[0] });
				}
			}
		);
	}

	movingMedia = async () => {
		if (this.state.repositoryFolder
			&& this.context?.globalState.settings.data.config?.System.Repositories.length > 0
			&& this.context?.globalState.settings.data.config?.System.Repositories[0].Name) {
			const repository = this.context?.globalState.settings.data.config?.System.Repositories[0].Path.Medias[0];
			const path = `${this.getPathForFileSystem(repository)}${this.context.globalState.settings.data.state.os === 'win32' ? repository.replace(/\//g, '\\') : repository}`;
			if (this.state.repositoryFolder !== path) {
				try {
					await commandBackend('movingMediaRepo', {
						path: this.state.repositoryFolder,
						name: this.context?.globalState.settings.data.config?.System.Repositories[0].Name
					}, undefined, 300000);
				} catch (err) {
					const error = err?.response ? i18next.t(`ERROR_CODES.${err.response.code}`) : JSON.stringify(err);
					this.setState({ error: error });
				}
			}
		}
	}

	updateStats = async () => {
		if (this.state.errorTracking !== undefined && this.state.stats !== undefined) {
			await commandBackend('updateSettings', {
				setting: {
					Online: {
						Stats: this.state.stats,
						ErrorTracking: this.state.errorTracking
					}
				}
			}).catch(() => {});
			if (this.state.gitUpdateInProgress) {
				this.setState({ activeView: 'loading', error: undefined });
			} else {
				this.endSetup();
			}
		}
	};

	render() {
		const t = [];
		let tCount = 0;
		for (const i in this.state.tasks) {
			t.push(this.state.tasks[i]);
		}
		return (
			<div className="start-page">
				<div className="wrapper setup">
					<div className="logo">
						<img src={logo} alt="Logo Karaoke Mugen" />
					</div>
					<div className="title">{i18next.t('SETUP_PAGE.TITLE')}</div>
					<div className="aside">
						<nav>
							<ul>
								<li>
									<a href="http://mugen.karaokes.moe/contact.html">
										<i className="fas fa-pencil-alt" />
										{i18next.t('WELCOME_PAGE.CONTACT')}
									</a>
								</li>
								<li>
									<a href="http://mugen.karaokes.moe/">
										<i className="fas fa-link" />
										{i18next.t('WELCOME_PAGE.SITE')}
									</a>
								</li>
							</ul>
						</nav>
					</div>
					<div className="main">
						{this.state.activeView === 'user' ? (
							<form>
								<section className="step step-1">
									<div className="intro">
										<h2>{i18next.t('SETUP_PAGE.WELCOME')}</h2>
										<p>{i18next.t('SETUP_PAGE.NEED_ACCOUNT')}</p>
										<p className="account-question">
											{i18next.t('SETUP_PAGE.ACCOUNT_QUESTION')}
										</p>
									</div>
									<ul className="actions">
										<li>
											<button
												className={this.state.accountType === 'local' ? 'in' : ''}
												type="button"
												onClick={() => this.setState({ accountType: 'local' })}
											>
												{i18next.t('SETUP_PAGE.LOCAL_ACCOUNT')}
											</button>
										</li>
										<li>
											<button
												className={this.state.accountType === 'online' ? 'in' : ''}
												type="button"
												onClick={() => this.setState({ accountType: 'online' })}
											>
												{i18next.t('SETUP_PAGE.ONLINE_ACCOUNT')}
											</button>
										</li>
									</ul>
									{this.state.accountType !== 'local'
										? (<blockquote className="extra">
											<h3>{i18next.t('SETUP_PAGE.ONLINE_ACCOUNT_DESC')}</h3>
											<ul>
												<li>{i18next.t('SETUP_PAGE.ONLINE_ACCOUNT_SAVE_INFOS')}</li>
												<li>
													{i18next.t('SETUP_PAGE.ONLINE_ACCOUNT_LOST_PASSWORD')}
												</li>
											</ul>
										</blockquote>)
										: null
									}
								</section>
								{this.state.accountType === 'local' ? (
									<section className="step step-2 step-local">
										<p>{i18next.t('SETUP_PAGE.LOCAL_ACCOUNT_DESC')}</p>
										<div className="input-group">
											<div className="input-control">
												<label>{i18next.t('USERNAME')}</label>
												<input
													className="input-field"
													type="text"
													defaultValue={this.state.login}
													required
													onChange={(event) =>
														this.setState({ login: event.target.value })
													}
												/>
											</div>
											<div className="input-control">
												<label>{i18next.t('PASSWORD')}</label>
												<input
													className="input-field"
													type="password"
													required
													defaultValue={this.state.password}
													onChange={(event) =>
														this.setState({ password: event.target.value })
													}
												/>
											</div>
											<div className="input-control">
												<label>{i18next.t('PASSWORDCONF')}</label>
												<input
													className="input-field"
													type="password"
													required
													defaultValue={this.state.passwordConfirmation}
													onChange={(event) =>
														this.setState({
															passwordConfirmation: event.target.value,
														})
													}
												/>
											</div>
										</div>
									</section>
								) :
									(this.state.accountType === 'online' ? (
										<section className="step step-2 step-online">
											<p>
												{i18next.t('SETUP_PAGE.ONLINE_ACCOUNT_INSTANCE', {
													instance: this.state.instance,
												})}
											</p>
											<p>
												{i18next.t('SETUP_PAGE.ONLINE_ACCOUNT_INSTANCE_DESC', {
													instance: this.context?.globalState.settings.data.config?.Online.Host,
												})}
											</p>
											<ul className="actions">
												<li>
													<button
														className={this.state.onlineAction === 'create' ? 'in' : ''}
														type="button"
														onClick={() =>
															this.setState({ onlineAction: 'create' })
														}
													>
														{i18next.t('SETUP_PAGE.CREATE_ONLINE_ACCOUNT')}
													</button>
												</li>
												<li>
													<button
														className={this.state.onlineAction === 'login' ? 'in' : ''}
														type="button"
														onClick={() => this.setState({ onlineAction: 'login' })}
													>
														{i18next.t('SETUP_PAGE.LOGIN_ONLINE_ACCOUNT')}
													</button>
												</li>
											</ul>
											{this.state.onlineAction === 'create' ? (
												<div>
													<div className="input-group">
														<p className="text-danger">{i18next.t('SETUP_PAGE.CREATE_ONLINE_ACCOUNT_DESC')}</p>
														<div className="input-control">
															<label>{i18next.t('USERNAME')}</label>
															<input
																key="login"
																className="input-field"
																type="text"
																defaultValue={this.state.login}
																required
																onChange={(event) =>
																	this.setState({ login: event.target.value })
																}
															/>
														</div>
														<div className="input-control">
															<label>{i18next.t('INSTANCE_NAME_SHORT')}</label>
															<input
																key="instance"
																className="input-field"
																type="text"
																defaultValue={this.context?.globalState.settings.data.config?.Online.Host}
																onChange={(event) =>
																	this.setState({ instance: event.target.value })
																}
															/>
														</div>
														<div className="input-control">
															<label>{i18next.t('PASSWORD')}</label>
															<input
																key="password"
																className="input-field"
																type="password"
																required
																defaultValue={this.state.password}
																onChange={(event) =>
																	this.setState({ password: event.target.value })
																}
															/>
														</div>
														<div className="input-control">
															<label>{i18next.t('PASSWORDCONF')}</label>
															<input
																key="passwordConfirmation"
																className="input-field"
																type="password"
																required
																defaultValue={this.state.passwordConfirmation}
																onChange={(event) =>
																	this.setState({
																		passwordConfirmation: event.target.value,
																	})
																}
															/>
														</div>
													</div>
												</div>
											) : this.state.onlineAction === 'login' ? (
												<div>
													<div className="input-group">
														<div className="input-control">
															<label>{i18next.t('USERNAME')}</label>
															<input
																key="login"
																className="input-field"
																type="text"
																defaultValue={this.state.login}
																required
																onChange={(event) =>
																	this.setState({ login: event.target.value })
																}
															/>
														</div>
														<div className="input-control">
															<label>{i18next.t('INSTANCE_NAME_SHORT')}</label>
															<input
																key="instance"
																className="input-field"
																type="text"
																defaultValue={this.context?.globalState.settings.data.config?.Online.Host}
																onChange={(event) =>
																	this.setState({ instance: event.target.value })
																}
															/>
														</div>
														<div className="input-control">
															<label>{i18next.t('PASSWORD')}</label>
															<input
																key="password"
																className="input-field"
																type="password"
																required
																defaultValue={this.state.password}
																onChange={(event) =>
																	this.setState({ password: event.target.value })
																}
																onKeyUp={(e) => {
																	if (e.code === 'Enter') {
																		this.login();
																	}
																}}
															/>
														</div>
													</div>
												</div>
											) : null}
										</section>
									)
										: null
									)}
								{this.state.accountType === 'local' || (this.state.accountType === 'online' && this.state.onlineAction !== null)
									? (
										<section className="step step-3">
											{!isElectron()
												? (
													<div className="input-group">
														<p className="intro">
															{i18next.t('SETUP_PAGE.SECURITY_CODE_DESC_CONSOLE')}
															<br />
															<em>{i18next.t('SETUP_PAGE.SECURITY_CODE_USE')}</em>
														</p>
														<div className="input-control">
															<label>
																{i18next.t('SECURITY_CODE')}
															</label>
															<input
																className="input-field"
																type="text"
																required
																onChange={(event) =>
																	this.setState({ securityCode: parseInt(event.target.value) })
																}
															/>
														</div>
													</div>

												) : null}
											<div className="actions">
												<label className="error">{this.state.error}</label>
												{this.state.accountType === 'online' &&
													this.state.onlineAction === 'login' ?
													(
														<button type="button" onClick={this.login}>
															{i18next.t('LOG_IN')}
														</button>
													) : (
														<button type="button" onClick={this.signup}>
															{i18next.t('SIGN_UP')}
														</button>
													)
												}
											</div>
										</section>
									)
									: null
								}
							</form>
						) : null
						}
						{this.state.activeView === 'repo' ? (
							<>
								<section className="step step-repo">
									<p>{i18next.t('SETUP_PAGE.CONNECTED_MESSAGE', {
										user: this.state.login || this.context?.globalState.settings.data.user.nickname,
									})}</p>
									<p>{i18next.t('SETUP_PAGE.DEFAULT_REPOSITORY_DESC_1')}
										<strong>{this.context?.globalState.settings.data.config?.System.Repositories[0].Name}</strong>
										{i18next.t('SETUP_PAGE.DEFAULT_REPOSITORY_DESC_2')}
									</p>
									<div className="input-group">
										<div className="input-control">
											<label>{i18next.t('SETUP_PAGE.DEFAULT_REPOSITORY_QUESTION')}</label>
											<input
												className="input-field"
												value={this.state.repositoryFolder}

												onChange={(event) =>
													this.setState({ repositoryFolder: event.target.value })
												}
											/>
											<div className="actions">
												{isElectron() ?
													<button type="button" onClick={this.onClickRepository}>{i18next.t('SETUP_PAGE.MODIFY_DIRECTORY')}</button> : null
												}
												<label className="error">{this.state.error}</label>
											</div>
										</div>
									</div>
									<p>{i18next.t('SETUP_PAGE.REPOSITORY_LATER')}</p>
								</section>
								<section className="step step-choice">
									<div className="actions">
										<label className="error">{this.state.error}</label>
										<button type="button" onClick={async () => {
											await this.movingMedia();
											this.setState({ activeView: 'stats' });
										}}>{i18next.t('SETUP_PAGE.SAVE_PARAMETER')}</button>
									</div>
								</section>
							</>
						) : null
						}
						{this.state.activeView === 'stats' ? (
							<section className="step step-choice">
								<p>{i18next.t('ONLINE_STATS.INTRO')}</p>
								<p>
									<a className="btn-link" type="button" onClick={() => this.setState({ openDetails: !this.state.openDetails })}>
										{i18next.t('ONLINE_STATS.DETAILS.TITLE')}
									</a>
									{this.state.openDetails ?
										<React.Fragment>
											<ul>
												<li>{i18next.t('ONLINE_STATS.DETAILS.1')}</li>
												<li>{i18next.t('ONLINE_STATS.DETAILS.2')}</li>
												<li>{i18next.t('ONLINE_STATS.DETAILS.3')}</li>
												<li>{i18next.t('ONLINE_STATS.DETAILS.4')}</li>
											</ul>
											<p>{i18next.t('ONLINE_STATS.DETAILS.OUTRO')}</p>
											<br />
										</React.Fragment> : null
									}
								</p>
								<p>{i18next.t('ONLINE_STATS.QUESTION')}</p>
								<div className="input-group">
									<div className="actions">
										<button
											className={this.state.stats ? 'on' : ''}
											type="button" onClick={() => this.setState({ stats: true })}>{i18next.t('YES')}</button>
										<button
											className={this.state.stats === false ? 'off' : ''}
											type="button" onClick={() => this.setState({ stats: false })}>{i18next.t('NO')}</button>
									</div>
								</div>
								<p>{i18next.t('ONLINE_STATS.ERROR')}</p>
								<div className="input-group">
									<div className="actions">
										<button
											className={this.state.errorTracking ? 'on' : ''}
											type="button" onClick={() => this.setState({ errorTracking: true })}>{i18next.t('YES')}</button>
										<button
											className={this.state.errorTracking === false ? 'off' : ''}
											type="button" onClick={() => this.setState({ errorTracking: false })}>{i18next.t('NO')}</button>
									</div>
								</div>
								<p>{i18next.t('ONLINE_STATS.CHANGE')}</p>
								<div className="actions">
									<label className="error">{this.state.error}</label>
									<button type="button" onClick={this.updateStats}>{i18next.t('ONLINE_STATS.CONFIRM')}</button>
								</div>
							</section>
						) : null
						}
						{this.state.activeView === 'loading' ? (
							<section className="step step-choice loading">
								<div className="ip--top">
									<img className="ip--logo" src={logoBig} alt="Karaoke Mugen" />
								</div>
								{
									t.map((item: TaskItem) => {
										if (tCount >= 1) // no more than 3 tasks displayed
											return null;
										tCount++;

										return (
											<>
												<div className="ip--message">{i18next.t(`TASKS.${item.text}`) !== `TASKS.${item.text}` ? i18next.t(`TASKS.${item.text}`, { data: item.data }) : item.text}</div>
												{item.percentage < 100 ?
													<>
														<div className="ip--progress-bar-container">
															<div className="ip--progress-bar" style={{ width: `${item.percentage}%` }}></div>
															<div className="ip--progress-text">{i18next.t(`TASKS.${item.subtext}`) !== `TASKS.${item.subtext}` ? i18next.t(`TASKS.${item.subtext}`) : item.subtext}</div>
														</div>
													</> : null
												}
												<div className="ip--nanami">
													{item.percentage < 100 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ?
														<img src={nanamiSearching} alt="Nanamin" /> :
														<img src={nanamiHeHe} alt="Nanamin" />
													}
												</div>
											</>);
									})
								}
							</section>
						) : null
						}
					</div>
				</div>
			</div>
		);
	}
}

export default SetupPage;
