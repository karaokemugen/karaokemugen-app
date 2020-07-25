import languages from '@cospired/i18n-iso-languages';
import axios from 'axios';
import i18next from 'i18next';
import prettyBytes from 'pretty-bytes';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import blankAvatar from '../../../../assets/blank.png';
import { Token, User } from '../../../../src/lib/types/user';
import { Config } from '../../../../src/types/config';
import { DBPLC } from '../../../../src/types/database/playlist';
import store from '../../store';
import Autocomplete from '../generic/Autocomplete';
import { buildKaraTitle, callModal, displayMessage } from '../tools';
import OnlineProfileModal from './OnlineProfileModal';
languages.registerLocale(require('@cospired/i18n-iso-languages/langs/en.json'));
languages.registerLocale(require('@cospired/i18n-iso-languages/langs/fr.json'));
require('babel-polyfill');
require('./ProfilModal.scss');

interface IProps {
	config: Config;
}

interface IState {
	passwordDifferent: string;
	nicknameMandatory: string;
	activeView: number;
	user: UserProfile;
	users: Array<User>;
	userDetails?: User;
}

interface UserProfile extends User {
	passwordConfirmation?: string;
}

type typesAttrUser =
	'login'
	| 'old_login'
	| 'type'
	| 'avatar_file'
	| 'bio'
	| 'url'
	| 'email'
	| 'nickname'
	| 'password'
	| 'last_login_at'
	| 'flag_online'
	| 'onlineToken'
	| 'series_lang_mode'
	| 'main_series_lang'
	| 'fallback_series_lang'
	| 'securityCode'
'passwordConfirmation';

const pathAvatar = '/avatars/';

class ProfilModal extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		this.state = {
			users: [],
			user: {},
			passwordDifferent: 'form-control',
			nicknameMandatory: 'form-control',
			activeView: 1
		};
	}

	componentDidMount() {
		this.getUser();
		this.getUserList();
		document.addEventListener('keyup', this.keyObserverHandler);
	}

	onKeyPress = (event: any) => {
		const user = this.state.user;
		user[event.target.name as typesAttrUser] = event.target.value;
		this.setState({ user: user });
		if (event.keyCode === 13) {
			this.updateUser();
		}
	};

	onClickSelect = (event: any) => {
		const user = this.state.user;
		(user[event.target.name as typesAttrUser] as number) = parseInt(event.target.value);
		this.setState({ user: user });
		this.updateUser();
	};

	changeLanguageFallback(name: 'main_series_lang' | 'fallback_series_lang', value: string) {
		const user = this.state.user;
		user[name] = value;
		this.setState({ user: user });
		this.updateUser();
	}

	updateUser = async () => {
		if (this.state.user.nickname && (this.state.user.password
			&& this.state.user.password === this.state.user.passwordConfirmation
			|| !this.state.user.password)) {
			this.setState({ passwordDifferent: 'form-control', nicknameMandatory: 'form-control' });
			const response = await axios.put('/myaccount/', this.state.user);
			store.setLogInfos(response.data);
			store.setUser();
		} else if (!this.state.user.nickname) {
			this.setState({ nicknameMandatory: 'form-control redBorders' });
		} else {
			this.setState({ passwordDifferent: 'form-control redBorders' });
		}
	}

	async getUser() {
		const response = await axios.get('/myaccount/');
		const user = response.data;
		user.password = undefined;
		this.setState({ user: user });
	}

	async getUserList() {
		const response = await axios.get('/users/');
		this.setState({ users: response.data.filter((a: User) => a.flag_online) });
	}

	profileConvert = () => {
		ReactDOM.render(<OnlineProfileModal type="convert" loginServ={this.props.config.Online.Host} />, document.getElementById('modal'));
	};

	profileDelete = () => {
		ReactDOM.render(<OnlineProfileModal type="delete" />, document.getElementById('modal'));
	};

	favImport = (event: any) => {
		if (!window.FileReader) return alert('FileReader API is not supported by your browser.');
		const input = event.target;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			const fr = new FileReader();
			fr.onload = () => {
				callModal('confirm', i18next.t('CONFIRM_FAV_IMPORT'), '', async (confirm: boolean) => {
					if (confirm) {
						const data = { favorites: fr['result'] };
						const response: { data: { data: { unknownKaras: Array<DBPLC> } } } = await axios.post('/favorites/import', data);
						if (response.data.data?.unknownKaras && response.data.data.unknownKaras.length > 0) {
							const mediasize = response.data.data.unknownKaras.reduce((accumulator, currentValue) => accumulator + currentValue.mediasize, 0);
							callModal('confirm', i18next.t('MODAL.UNKNOW_KARAS.TITLE'), (<React.Fragment>
								<p>
									{i18next.t('MODAL.UNKNOW_KARAS.DESCRIPTION')}
								</p>
								<div>
									{i18next.t('MODAL.UNKNOW_KARAS.DOWNLOAD_THEM')}
									<label>&nbsp;{i18next.t('MODAL.UNKNOW_KARAS.DOWNLOAD_THEM_SIZE', { mediasize: prettyBytes(mediasize) })}</label>
								</div>
								<br />
								{response.data.data.unknownKaras.map((kara: DBPLC) =>
									<label key={kara.kid}>{buildKaraTitle(kara, true)}</label>)}
							</React.Fragment>), () => axios.post('/downloads', {
								downloads: response.data.data.unknownKaras.map((kara: DBPLC) => {
									return {
										kid: kara.kid,
										mediafile: kara.mediafile,
										size: kara.mediasize,
										name: kara.karafile.replace('.kara.json', ''),
										repository: kara.repository
									};
								})
							}));
						}
					}
				});
			};
			fr.readAsText(file);
		}
	};

	async favExport() {
		const exportFile = await axios.get('/favorites/export');
		const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportFile, null, 4));
		const dlAnchorElem = document.getElementById('downloadAnchorElem');
		if (dlAnchorElem) {
			dlAnchorElem.setAttribute('href', dataStr);
			dlAnchorElem.setAttribute('download', ['KaraMugen', 'fav', (store.getLogInfos() as Token).username, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmfavorites');
			dlAnchorElem.click();
		}
	}

	getUserDetails = async (event: any) => {
		const response = await axios.get('/users/' + event.currentTarget.id);
		const responseUserDetails = response.data;
		this.setState({ userDetails: { email: responseUserDetails.email, url: responseUserDetails.url, bio: responseUserDetails.bio, } });
	};

	importAvatar = async (event: any) => {
		const dataFile = new FormData();
		for (let i = 0; i < event.target.files.length; i++) {
			dataFile.append('avatarfile', event.target.files[i]);
		}
		dataFile.append('nickname', (store.getLogInfos() as Token).username);

		await axios.put('/myaccount', dataFile);
		this.getUser();
	};

	deleteAccount = () => {
		callModal('confirm', i18next.t('DELETE_ACCOUNT'), '', async () => {
			await axios.delete('/myaccount');
			store.logOut();
		});
	}

	keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Escape') {
			const element = document.getElementById('modal');
			if (element) ReactDOM.unmountComponentAtNode(element);
		}
	}

	componentWillUnmount() {
		document.removeEventListener('keyup', this.keyObserverHandler);
	}

	render() {
		const logInfos = store.getLogInfos();
		const listLangs = [];
		for (const [key, value] of Object.entries(languages.getNames(i18next.languages[0]))) {
			listLangs.push({ 'label': value, 'value': languages.alpha2ToAlpha3B(key) });
		}
		if (!this.props.config.Online.Users && logInfos && logInfos.username.includes('@')) {
			setTimeout(function () {
				displayMessage('warning', <div><label>{i18next.t('LOG_OFFLINE.TITLE')}</label> <br /> {i18next.t('LOG_OFFLINE.MESSAGE')}</div>, 8000);
			}, 500);
		}
		return (
			<div className="modal modalPage" id="profilModal">
				<div className="modal-dialog modal-md">
					<div className="modal-content">
						<div className="modal-header">
							<ul className="nav nav-tabs nav-justified ">
								<li className={(this.state.activeView === 1 ? 'active' : '')}>
									<a onClick={() => this.setState({ activeView: 1 })}> {i18next.t('PROFILE')}</a>
								</li>
								{logInfos && logInfos.role !== 'guest' ?
									<li className={(this.state.activeView === 2 ? 'active' : '')}>
										<a onClick={() => this.setState({ activeView: 2 })}> {i18next.t('LANGUAGE')}</a>
									</li> : null
								}
								<li className={(this.state.activeView === 3 ? 'active' : '')}>
									<a onClick={() => this.setState({ activeView: 3 })}> {i18next.t('USERLIST')}</a>
								</li>
							</ul>
							<button className="closeModal btn btn-action"
								onClick={() => {
									const element = document.getElementById('modal');
									if (element) ReactDOM.unmountComponentAtNode(element);
								}}>
								<i className="fas fa-times"></i>
							</button>
						</div>
						<div className="tab-content" id="nav-tabContent">
							{this.state.activeView === 1 ?
								<div id="nav-profil" className="modal-body" >
									<div className="profileContent">
										<div>
											<img className="img-circle avatar"
												src={this.state.user.avatar_file ? pathAvatar + this.state.user.avatar_file : blankAvatar as string}
												alt="User Pic" />
											{logInfos && logInfos.role !== 'guest' ?
												<label htmlFor="avatar" className="btn btn-default avatarButton">
													<input id="avatar" className="import-file" type="file" accept="image/*"
														style={{ display: 'none' }} onChange={this.importAvatar} />
													{i18next.t('AVATAR_IMPORT')}
												</label> : null
											}
											<p>{this.state.user.login}</p>
										</div>
										{logInfos && logInfos.role !== 'guest' ?
											<div className="profileData">
												<div className="profileLine">
													<i className="fas fa-user"></i>
													<input className={this.state.nicknameMandatory} name="nickname" type="text"
														placeholder={i18next.t('PROFILE_USERNAME')} defaultValue={this.state.user.nickname}
														onKeyUp={this.onKeyPress} onChange={this.onKeyPress} />
												</div>
												<div className="profileLine">
													<i className="fas fa-envelope"></i>
													<input className="form-control" name="email" type="text"
														placeholder={i18next.t('PROFILE_MAIL')} defaultValue={this.state.user.email}
														onKeyUp={this.onKeyPress} onChange={this.onKeyPress} />
												</div>
												<div className="profileLine">
													<i className="fas fa-link"></i>
													<input className="form-control" name="url" type="text"
														placeholder={i18next.t('PROFILE_URL')} defaultValue={this.state.user.url}
														onKeyUp={this.onKeyPress} onChange={this.onKeyPress} />
												</div>
												<div className="profileLine">
													<i className="fas fa-file-alt"></i>
													<input className="form-control" name="bio" type="text"
														placeholder={i18next.t('PROFILE_BIO')} defaultValue={this.state.user.bio}
														onKeyUp={this.onKeyPress} onChange={this.onKeyPress} />
												</div>
												<div className="profileLine">
													<i className="fas fa-lock"></i>
													<input className={this.state.passwordDifferent} name="password" type="password"
														placeholder={i18next.t('PROFILE_PASSWORD')} defaultValue={this.state.user.password}
														onKeyUp={this.onKeyPress} onChange={this.onKeyPress} />
													<input className={this.state.passwordDifferent}
														name="passwordConfirmation" type="password" placeholder={i18next.t('PROFILE_PASSWORDCONF')}
														defaultValue={this.state.user.passwordConfirmation}
														onKeyUp={this.onKeyPress} onChange={this.onKeyPress} style={{ marginLeft: 3 + 'px' }} />
												</div>
												<div className="profileLine">
													<i className="fas fa-star"></i>
													<label htmlFor="favImport" title={i18next.t('FAVORITES_IMPORT')} className="btn btn-action btn-default favImport">
														<i className="fas fa-download"></i> {i18next.t('IMPORT')}
													</label>
													<input id="favImport" className="import-file" type="file" accept=".kmfavorites" style={{ display: 'none' }} onChange={this.favImport} />
													<button type="button" title={i18next.t('FAVORITES_EXPORT')} className="btn btn-action btn-default favExport" onClick={this.favExport}>
														<i className="fas fa-upload"></i> {i18next.t('EXPORT')}
													</button>
												</div>
												{this.props.config.Online.Users && logInfos.username !== 'admin' ?
													<div className="profileLine">
														{logInfos?.onlineToken ?
															<button type="button" title={i18next.t('PROFILE_ONLINE_DELETE')}
																className="btn btn-danger profileDelete" onClick={this.profileDelete}>
																<i className="fas fa-retweet"></i> {i18next.t('PROFILE_ONLINE_DELETE')}
															</button>
															:
															<button type="button" title={i18next.t('PROFILE_CONVERT')}
																className="btn btn-primary profileConvert" onClick={this.profileConvert}>
																<i className="fas fa-retweet"></i> {i18next.t('PROFILE_CONVERT')}
															</button>
														}
													</div> : null
												}
												<div className="profileLine" >
													<button type="button" title={i18next.t('PROFILE_CONVERT')}
														className={`btn profileDelete ${logInfos?.onlineToken ? 'btn-primary' : 'btn-danger'}`}
														onClick={this.deleteAccount}>
														<i className="fas fa-trash-alt"></i> {i18next.t('PROFILE_DELETE')}
													</button>
												</div>
												<div className="profileLine profileButtonLine" >
													<button type="button" className="btn btn-action"
														onClick={() => {
															this.updateUser();
															const element = document.getElementById('modal');
															if (element) ReactDOM.unmountComponentAtNode(element);
														}}>
														{i18next.t('SUBMIT')}
													</button>
												</div>
											</div> : null
										}
									</div>
								</div> : null}
							{this.state.activeView === 2 ?
								<div id="nav-lang" className="modal-body">
									<div className="profileContent">
										<div className="profileData">
											<div className="profileLine row">
												<label className="col-xs-6 control-label">{i18next.t('SERIE_NAME_MODE')}</label>
												<div className="col-xs-6">
													<select className="form-control" name="series_lang_mode" defaultValue={this.state.user.series_lang_mode}
														onChange={this.onClickSelect}>
														<option value={-1}>{i18next.t('SERIE_NAME_MODE_NO_PREF')}</option>
														<option value={0}>{i18next.t('SERIE_NAME_MODE_ORIGINAL')}</option>
														<option value={1}>{i18next.t('SERIE_NAME_MODE_SONG')}</option>
														<option value={2}>{i18next.t('SERIE_NAME_MODE_ADMIN')}</option>
														<option value={3}>{i18next.t('SERIE_NAME_MODE_USER')}</option>
														<option value={4}>{i18next.t('SERIE_NAME_MODE_USER_FORCE')}</option>
													</select>
												</div>
											</div>
											{this.state.user.series_lang_mode === 4 ?
												<React.Fragment>
													<div className="profileLine row">
														<label className="col-xs-6 control-label">{i18next.t('MAIN_SERIES_LANG')}</label>
														<div className="col-xs-6">
															<Autocomplete value={this.state.user.main_series_lang} options={listLangs}
																onChange={(value) => this.changeLanguageFallback('main_series_lang', value)} />
														</div>
													</div>
													<div className="profileLine row">
														<label className="col-xs-6 control-label">{i18next.t('FALLBACK_SERIES_LANG')}</label>
														<div className="col-xs-6">
															<Autocomplete value={this.state.user.fallback_series_lang} options={listLangs}
																onChange={(value) => this.changeLanguageFallback('fallback_series_lang', value)} />
														</div>
													</div>
												</React.Fragment> : null
											}
										</div>
									</div>
								</div> : null
							}
							{this.state.activeView === 3 ?
								<div id="nav-userlist" className="modal-body">
									<div className="userlist list-group">
										{this.state.users.map(user => {
											return <li key={user.login} className={user.flag_online ? 'list-group-item online' : 'list-group-item'} id={user.login} onClick={this.getUserDetails}>
												<div className="userLine">
													<span className="nickname">{user.nickname}</span>
													<img className="avatar" src={pathAvatar + user.avatar_file} />
												</div>
												{this.state.userDetails ?
													<div className="userDetails">
														<div><i className="fas fa-link"></i>{this.state.userDetails.url ? this.state.userDetails.url : ''}</div>
														<div><i className="fas fa-leaf"></i>{this.state.userDetails.bio ? this.state.userDetails.bio : ''}</div>
													</div> : null
												}
											</li>;
										})}
									</div>
								</div> : null
							}
						</div>

					</div>
				</div>
			</div>
		);
	}
}

export default ProfilModal;
