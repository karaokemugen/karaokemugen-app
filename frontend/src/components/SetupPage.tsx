import axios from 'axios';
import i18next from 'i18next';
import React, { Component } from 'react';

import { Repository } from '../../../src/lib/types/repo';
import guideSecurityGif from '../assets/guide-security-code.gif';
import logo from '../assets/Logo-final-fond-transparent.png';
import store from '../store';
import { displayMessage } from './tools';

require('../styles/welcome/WelcomePage.scss');
require('../styles/SetupPage.scss');

interface IProps {
	instance: string;
	repository: Repository;
	endSetup: () => void;
}

interface IState {
	accountType: 'local' | 'online' | null;
	onlineAction: 'create' | 'login' | null;
	login?: string;
	password?: string;
	passwordConfirmation?: string;
	instance: string;
	securityCode?: string;
	repositoryFolder: string;
	activeView: 'user' | 'repo' | 'random';
	activeHelp: 'security-code' | null;
	downloadRandomSongs: boolean;
	error?: string
}
class SetupPage extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		const repository = this.props.repository.Path.Karas[0].slice(0, -9);
		const path = `${this.getPathForFileSystem(repository)}${store.getState().os === 'win32' ? repository.replace(/\//g, '\\') : repository}`;
		this.state = {
			accountType: null,
			onlineAction: null,
			instance: this.props.instance,
			repositoryFolder: path,
			activeView: 'user',
			activeHelp: null,
			downloadRandomSongs: true,
		};
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
			await axios
				.post('/users', {
					login: username,
					password: this.state.password as string,
					role: 'admin',
					securityCode: this.state.securityCode,
				});
			this.setState({ error: undefined });
			this.login(username, this.state.password as string);
		} catch (err) {
			const error = i18next.t(`ERROR_CODES.${err.response.data.code}`);
			this.setState({ error: error });
		}
	};

	loginUser = () => {
		const username =
			this.state.login +
			(this.state.accountType === 'online' ? '@' + this.state.instance : '');
		this.login(username, this.state.password as string);
	};

	login = async (username: string, password: string) => {
		let result;
		try {
			result = await axios.post('/auth/login', {
				username: username,
				password: password,
				securityCode: this.state.securityCode,
			});
			const response = result.data;
			store.setLogInfos(response);
			this.setState({ activeView: 'repo', error: undefined });
		} catch (err) {
			const error = i18next.t(`ERROR_CODES.${err.response.data.code}`);
			this.setState({ error: error });
		}
	};

	getPathForFileSystem(value: string) {
		const regexp = store.getState().os === 'win32' ? '^[a-zA-Z]:' : '^/';
		if (value.match(regexp) === null) {
			return `${store.getState().dataPath}${store.getState().os === 'win32' ? '\\' : '/'}`;
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
			async (event: any, filepaths: Array<string>) => {
				if (filepaths.length > 0) {
					await this.setState({ repositoryFolder: filepaths[0] });
				}
			}
		);
	}

	consolidate = async () => {
		if (this.state.repositoryFolder) {
			const repository = this.props.repository.Path.Karas[0].slice(0, -9);
			const path = `${this.getPathForFileSystem(repository)}${store.getState().os === 'win32' ? repository.replace(/\//g, '\\') : repository}`;
			if (this.state.repositoryFolder !== path) {
				try {
					await axios.post(`/repos/${this.props.repository.Name}/consolidate`, { path: this.state.repositoryFolder });
					this.setState({ activeView: 'random', error: undefined });
				} catch (err) {
					const error = i18next.t(`ERROR_CODES.${err.response.data.code}`);
					this.setState({ error: error });
				}
			} else {
				this.setState({ activeView: 'random', error: undefined });
			}
		}
	}

	downloadRandomSongs = () => {
		if (this.state.downloadRandomSongs) {
			try {
				axios.post('/downloads/random');
				this.props.endSetup();
			} catch (err) {
				const error = i18next.t(`ERROR_CODES.${err.response.data.code}`);
				this.setState({ error: error });
			}
		} else {
			this.props.endSetup();
		}
	}

	render() {
		return (
			<div id="setupPage">
				{this.state.activeHelp === 'security-code' ? (
					<div className="help-modal" onClick={() => this.setState({ activeHelp: null })}>
						<div className="help-modal-backdrop">
							<div className="help-modal-wrapper">
								<button className="help-modal-close">&times;</button>
								<div className="help-modal-content">
									<img src={guideSecurityGif} />
								</div>
							</div>
						</div>
					</div>
				) : null}
				<div className="setupPage--wrapper">
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
										{i18next.t('WLCM_CONTACT')}
									</a>
								</li>
								<li>
									<a href="http://mugen.karaokes.moe/">
										<i className="fas fa-link" />
										{i18next.t('WLCM_SITE')}
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
													instance: this.props.instance,
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
																className="input-field"
																type="text"
																defaultValue={this.props.instance}
																onChange={(event) =>
																	this.setState({ instance: event.target.value })
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
												</div>
											) : this.state.onlineAction === 'login' ? (
												<div>
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
															<label>{i18next.t('INSTANCE_NAME_SHORT')}</label>
															<input
																className="input-field"
																type="text"
																defaultValue={this.props.instance}
																onChange={(event) =>
																	this.setState({ instance: event.target.value })
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
													</div>
												</div>
											) : null}
										</section>
									)
										: null
									)}
								{this.state.accountType === 'local' || this.state.accountType === 'online' && this.state.onlineAction !== null
									? (
										<section className="step step-3">
											<p className="intro">
												{i18next.t(
													store.getState().electron
														? 'SETUP_PAGE.SECURITY_CODE_DESC_ELECTRON'
														: 'SETUP_PAGE.SECURITY_CODE_DESC_CONSOLE'
												)}
												&nbsp;
												<em>{i18next.t('SETUP_PAGE.SECURITY_CODE_USE')}</em>
											</p>
											<div className="input-group">
												<div className="input-control">
													<label>
														{i18next.t('SECURITY_CODE')}
														&nbsp;
														<button type="button" onClick={() => this.setState({ activeHelp: 'security-code' })} className="fas fa-question-circle"></button>
													</label>
													<input
														className="input-field"
														type="text"
														required
														onChange={(event) =>
															this.setState({ securityCode: event.target.value })
														}
													/>
												</div>
											</div>
											<div className="actions">
												<label className="error">{this.state.error}</label>
												{this.state.accountType === 'online' &&
													this.state.onlineAction === 'login' ? (
														<button type="button" onClick={this.loginUser}>
															{i18next.t('LOG_IN')}
														</button>
													) : (
														<button type="button" onClick={this.signup}>
															{i18next.t('SIGN_UP')}
														</button>
													)}
											</div>
										</section>
									)
									: null
								}
							</form>
						) : this.state.activeView === 'repo' ? (
							<section className="step step-repo">
								<p>{i18next.t('SETUP_PAGE.CONNECTED_MESSAGE', {
									user: this.state.login,
								})}</p>
								<p>{i18next.t('SETUP_PAGE.DEFAULT_REPOSITORY_DESC_1')}
									<strong>{this.props.repository.Name}</strong>
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
										{store.getState().electron ?
											<button type="button" onClick={this.onClickRepository}>{i18next.t('SETUP_PAGE.MODIFY_DIRECTORY')}</button> : null
										}
									</div>
								</div>
								<p>{i18next.t('SETUP_PAGE.REPOSITORY_NEED_SPACE')}</p>
								<div className="actions">
									<label className="error">{this.state.error}</label>
									<button type="button" onClick={this.consolidate}>{i18next.t('SETUP_PAGE.SAVE_PARAMETER')}</button>
								</div>
							</section>
						) :
							(
								<section className="step step-random">
									<div>
										{i18next.t('SETUP_PAGE.DOWNLOAD_RANDOM_SONGS', {
											instance: this.props.repository.Name,
										})}
									</div>
									<div className="input-group">
										<button
											className={this.state.downloadRandomSongs ? 'on' : ''}
											type="button" onClick={() => this.setState({ downloadRandomSongs: true })}>{i18next.t('YES')}</button>
										<button
											className={!this.state.downloadRandomSongs ? 'off' : ''}
											type="button" onClick={() => this.setState({ downloadRandomSongs: false })}>{i18next.t('NO')}</button>
									</div>
									<div className="actions">
										<label className="error">{this.state.error}</label>
										<button type="button" onClick={this.downloadRandomSongs}>{i18next.t('SETUP_PAGE.DONE')}</button>
									</div>
								</section>
							)}
					</div>
				</div>
			</div>
		);
	}
}

export default SetupPage;
