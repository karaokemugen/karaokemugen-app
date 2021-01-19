import './ProfilModal.scss';

import languages from '@cospired/i18n-iso-languages';
import i18next from 'i18next';
import prettyBytes from 'pretty-bytes';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { User } from '../../../../../src/lib/types/user';
import { DBPLC } from '../../../../../src/types/database/playlist';
import { logout, setAuthentifactionInformation } from '../../../store/actions/auth';
import { GlobalContextInterface } from '../../../store/context';
import { IAuthentifactionInformation } from '../../../store/types/auth';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { callModal, displayMessage } from '../../../utils/tools';
import Autocomplete from '../generic/Autocomplete';
import CropAvatarModal from './CropAvatarModal';
import OnlineProfileModal from './OnlineProfileModal';
languages.registerLocale(require('@cospired/i18n-iso-languages/langs/en.json'));
languages.registerLocale(require('@cospired/i18n-iso-languages/langs/fr.json'));

interface IProps {
	context: GlobalContextInterface;
	scope?: 'public' | 'admin';
	closeProfileModal?: () => void;
}

interface IState {
	passwordDifferent: string;
	nicknameMandatory: string;
	activeView: 'profile'|'language'|'userlist';
	user: UserProfile;
	users: Array<User>;
	userDetails?: User;
	imageSource?: any;
	cropAvatarModalOpen: boolean;
}

interface UserProfile extends User {
	passwordConfirmation?: string;
	avatar?: any
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
	| 'passwordConfirmation';

class ProfilModal extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		this.state = {
			users: [],
			user: {},
			passwordDifferent: 'form-control',
			nicknameMandatory: 'form-control',
			activeView: 'profile',
			cropAvatarModalOpen: false
		};
	}

	componentDidMount() {
		this.getUser();
		if (this.props.context?.globalState.settings.data.config?.Frontend?.Mode !== 0) this.getUserList();
		if (this.props.scope !== 'public') document.addEventListener('keyup', this.keyObserverHandler);
	}

	onKeyPress = (event: any) => {
		const user = this.state.user;
		user[event.target.name] = event.target.value;
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
		if (this.state.user.nickname && ((this.state.user.password
			&& this.state.user.password === this.state.user.passwordConfirmation)
			|| !this.state.user.password)) {
			this.setState({ passwordDifferent: 'form-control', nicknameMandatory: 'form-control' });
			const response = await commandBackend('editMyAccount', this.state.user);

			const data: IAuthentifactionInformation = this.props.context.globalState.auth.data;
			data.onlineToken = response.data.onlineToken;
			setAuthentifactionInformation(this.props.context.globalDispatch, data);
		} else if (!this.state.user.nickname) {
			this.setState({ nicknameMandatory: 'form-control redBorders' });
		} else {
			this.setState({ passwordDifferent: 'form-control redBorders' });
		}
	}

	async getUser() {
		const user = await commandBackend('getMyAccount');
		user.password = undefined;
		this.setState({ user: user });
	}

	async getUserList() {
		const response = await commandBackend('getUsers');
		this.setState({ users: response.filter((a: User) => a.flag_online) });
	}

	profileConvert = () => {
		ReactDOM.render(<OnlineProfileModal context={this.props.context} type="convert" loginServ={this.props.context?.globalState.settings.data.config?.Online.Host} />, document.getElementById('modal'));
	};

	profileDelete = () => {
		ReactDOM.render(<OnlineProfileModal context={this.props.context} type="delete" loginServ={this.state.user.login?.split('@')[1]} />, document.getElementById('modal'));
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
						const response = await commandBackend('importFavorites', { buffer: data });
						if (response.unknownKaras && response.unknownKaras.length > 0) {
							const mediasize = response.unknownKaras.reduce((accumulator, currentValue) => accumulator + currentValue.mediasize, 0);
							callModal('confirm', i18next.t('MODAL.UNKNOW_KARAS.TITLE'), (<React.Fragment>
								<p>
									{i18next.t('MODAL.UNKNOW_KARAS.DESCRIPTION')}
								</p>
								<div>
									{i18next.t('MODAL.UNKNOW_KARAS.DOWNLOAD_THEM')}
									<label>&nbsp;{i18next.t('MODAL.UNKNOW_KARAS.DOWNLOAD_THEM_SIZE', { mediasize: prettyBytes(mediasize) })}</label>
								</div>
								<br />
								{response.unknownKaras.map((kara: DBPLC) =>
									<label key={kara.kid}>{buildKaraTitle(this.props.context.globalState.settings.data, kara, true)}</label>)}
							</React.Fragment>), () => commandBackend('addDownloads', {
								downloads: response.unknownKaras.map((kara: DBPLC) => {
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
		const exportFile = await commandBackend('exportFavorites');
		const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportFile, null, 4));
		const dlAnchorElem = document.getElementById('downloadAnchorElem');
		if (dlAnchorElem) {
			dlAnchorElem.setAttribute('href', dataStr);
			dlAnchorElem.setAttribute('download', ['KaraMugen', 'fav', this.props.context.globalState.auth.data.username, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmfavorites');
			dlAnchorElem.click();
		}
	}

	getUserDetails = async (user: User) => {
		if (this.state.userDetails?.login === user.login) {
			this.setState({ userDetails: undefined });
		} else {
			const response = await commandBackend('getUser', { username: user.login });
			this.setState({ userDetails: response });
		}
	};

	importAvatar = (e) => {
		if (e.target.files?.length > 0) {
			this.setState({cropAvatarModalOpen: true});
		  	ReactDOM.render(<CropAvatarModal src={e.target.files[0]} saveAvatar={this.saveAvatar} />, document.getElementById('import-avatar'));
		}
	  };

	saveAvatar = async (avatar) => {
		if (avatar) {
			const user = this.state.user;
			user.avatar = avatar;
			await this.setState({ user, cropAvatarModalOpen: false });
			await this.updateUser();
			await this.getUser();
		} else {
			await this.setState({ cropAvatarModalOpen: false });
		}
	};

	deleteAccount = () => {
		callModal('confirm', i18next.t('MODAL.PROFILE_MODAL.LOCAL_DELETE'), i18next.t('MODAL.PROFILE_MODAL.LOCAL_DELETE_WARN'), async () => {
			await commandBackend('deleteMyUser');
			logout(this.props.context.globalDispatch);
		});
	}

	keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Escape') {
			this.closeModal();
		}
	}

	componentWillUnmount = () => {
		if (this.props.scope !== 'public') document.removeEventListener('keyup', this.keyObserverHandler);
	}

	closeModal = () => {
		if (this.props.scope === 'public') {
			this.props.closeProfileModal();
		} else {
			const element = document.getElementById('modal');
			if (element) ReactDOM.unmountComponentAtNode(element);
		}
	}

	render() {
		const logInfos = this.props.context?.globalState.auth.data;
		const listLangs = [];
		for (const [key, value] of Object.entries(languages.getNames(i18next.languages[0]))) {
			listLangs.push({ 'label': value, 'value': languages.alpha2ToAlpha3B(key) });
		}
		if (!this.props.context?.globalState.settings.data.config?.Online.Users && logInfos?.username.includes('@')) {
			setTimeout(function () {
				displayMessage('warning', <div><label>{i18next.t('LOG_OFFLINE.TITLE')}</label> <br /> {i18next.t('LOG_OFFLINE.MESSAGE')}</div>, 8000);
			}, 500);
		}
		const body = (<div className="modal-content">
			<div className="modal-header">
				<ul className="nav nav-tabs nav-justified ">
					<li className={(this.state.activeView === 'profile' ? 'active' : '')}>
						<a onClick={() => this.setState({ activeView: 'profile' })}> {i18next.t('PROFILE')}</a>
					</li>
					{logInfos?.role !== 'guest' ?
						<li className={(this.state.activeView === 'language' ? 'active' : '')}>
							<a onClick={() => this.setState({ activeView: 'language' })}> {i18next.t('LANGUAGE')}</a>
						</li> : null
					}
					<li className={(this.state.activeView === 'userlist' ? 'active' : '')}>
						<a onClick={() => this.setState({ activeView: 'userlist' })}> {i18next.t('USERLIST')}</a>
					</li>
				</ul>
				<button className="closeModal btn btn-action"
					onClick={this.closeModal}>
					<i className="fas fa-fw fa-times"></i>
				</button>
			</div>
			{this.state.activeView === 'profile' ?
				<div id="nav-profil" className="modal-body" >
					<div className="profileContent">
						<div className="profileHeader">
							<ProfilePicture user={this.state.user} className="img-circle avatar" />
							<div>
								<p>{this.state.user.login}</p>
								{logInfos?.role !== 'guest' ?
									<label htmlFor="avatar" className="btn btn-default avatarButton">
										<input id="avatar" className="import-file" type="file" accept="image/*"
											style={{ display: 'none' }} onChange={this.importAvatar} />
										{i18next.t('AVATAR_IMPORT')}
									</label> : null
								}
							</div>
						</div>
						{logInfos?.role !== 'guest' ?
							<div className="profileData">
								<div className="profileLine">
									<i className="fas fa-fw fa-user"></i>
									<input className={this.state.nicknameMandatory} name="nickname" type="text"
										placeholder={i18next.t('PROFILE_USERNAME')} defaultValue={this.state.user.nickname}
										onKeyUp={this.onKeyPress} onChange={this.onKeyPress} autoComplete="off" />
								</div>
								<div className="profileLine">
									<i className="fas fa-fw fa-envelope"></i>
									<input className="form-control" name="email" type="text"
										placeholder={i18next.t('PROFILE_MAIL')} defaultValue={this.state.user.email}
										onKeyUp={this.onKeyPress} onChange={this.onKeyPress} autoComplete="email" />
								</div>
								<div className="profileLine">
									<i className="fas fa-fw fa-link"></i>
									<input className="form-control" name="url" type="text"
										placeholder={i18next.t('PROFILE_URL')} defaultValue={this.state.user.url}
										onKeyUp={this.onKeyPress} onChange={this.onKeyPress} autoComplete="url" />
								</div>
								<div className="profileLine">
									<i className="fas fa-fw fa-leaf"></i>
									<input className="form-control" name="bio" type="text"
										placeholder={i18next.t('PROFILE_BIO')} defaultValue={this.state.user.bio}
										onKeyUp={this.onKeyPress} onChange={this.onKeyPress} autoComplete="off" />
								</div>
								<div className="profileLine">
									<i className="fas fa-fw fa-lock"></i>
									<input className={this.state.passwordDifferent} name="password" type="password"
										placeholder={i18next.t('PROFILE_PASSWORD')} defaultValue={this.state.user.password}
										onKeyUp={this.onKeyPress} onChange={this.onKeyPress} autoComplete="new-password" />
									<input className={this.state.passwordDifferent}
										name="passwordConfirmation" type="password" placeholder={i18next.t('PROFILE_PASSWORDCONF')}
										defaultValue={this.state.user.passwordConfirmation}
										onKeyUp={this.onKeyPress} onChange={this.onKeyPress} autoComplete="new-password" />
								</div>
								<div className="profileLine">
									<i className="fas fa-fw fa-star"></i>
									<label htmlFor="favImport" title={i18next.t('FAVORITES_IMPORT')} className="btn btn-action btn-default favImport">
										<i className="fas fa-fw fa-download"></i> {i18next.t('FAVORITES_IMPORT')}
									</label>
									<input id="favImport" className="import-file" type="file" accept=".kmfavorites" style={{ display: 'none' }} onChange={this.favImport} />
									<button type="button" title={i18next.t('FAVORITES_EXPORT')} className="btn btn-action btn-default favExport" onClick={this.favExport}>
										<i className="fas fa-fw fa-upload"></i> {i18next.t('FAVORITES_EXPORT')}
									</button>
								</div>
								{this.props.context?.globalState.settings.data.config?.Online.Users && logInfos?.username !== 'admin' ?
									<div className="profileLine">
										{logInfos?.onlineToken ?
											<button type="button" className="btn btn-danger profileDelete" onClick={this.profileDelete}>
												<i className="fas fa-fw fa-retweet"></i> {i18next.t('MODAL.PROFILE_MODAL.ONLINE_DELETE')}
											</button>
											:
											<button type="button" className="btn btn-primary profileConvert" onClick={this.profileConvert}>
												<i className="fas fa-fw fa-retweet"></i> {i18next.t('MODAL.PROFILE_MODAL.ONLINE_CONVERT')}
											</button>
										}
									</div> : null
								}
								<div className="profileLine" >
									<button type="button" className={`btn profileDelete ${logInfos?.onlineToken ? 'btn-primary' : 'btn-danger'}`}
										onClick={this.deleteAccount}>
										<i className="fas fa-fw fa-trash-alt"></i> {i18next.t('MODAL.PROFILE_MODAL.LOCAL_DELETE')}
									</button>
								</div>
								<div className="profileLine profileButtonLine" >
									<button type="button" className="btn btn-action"
										onClick={() => {
											this.updateUser();
											this.closeModal();
										}}>
										{i18next.t('SUBMIT')}
									</button>
									<span dangerouslySetInnerHTML={{ '__html': i18next.t('CL_HELP_DISCORD', { discord: '<a href="https://discord.gg/XFXCqzU">Discord</a>' }) }} />
								</div>
							</div> : null
						}
					</div>
				</div> : null}
			{this.state.activeView === 'language' ?
				<div id="nav-lang" className="modal-body">
					<div className="profileContent">
						<div className="profileData">
							<div className="profileLine row">
								<label className="col-xs-6 control-label">{i18next.t('SERIE_NAME_MODE')}</label>
								<div className="col-xs-6">
									<select name="series_lang_mode" defaultValue={this.state.user.series_lang_mode}
										onChange={this.onClickSelect}>
										<option value={-1}>{i18next.t('SERIE_NAME_MODE_NO_PREF')}</option>
										<option value={0}>{i18next.t('SERIE_NAME_MODE_ORIGINAL')}</option>
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
			{this.state.activeView === 'userlist' ?
				<div id="nav-userlist" className="modal-body">
					<div className="userlist list-group">
						{this.state.users.map(user => {
							return <li key={user.login} className={user.flag_online ? 'list-group-item online' : 'list-group-item'}
								id={user.login}>
								<div className="userLine" onClick={() => this.getUserDetails(user)}>
									<span className="nickname">{user.nickname}</span>
									<ProfilePicture user={user} className="img-circle avatar" />
								</div>
								{this.state.userDetails?.login === user.login ?
									<div className="userDetails">
										<div><i className="fas fa-fw fa-link"></i>{this.state.userDetails?.url ? this.state.userDetails.url : ''}</div>
										<div><i className="fas fa-fw fa-leaf"></i>{this.state.userDetails?.bio ? this.state.userDetails.bio : ''}</div>
									</div> : null
								}
							</li>;
						})}
					</div>
				</div> : null
			}
		</div>);
		return (
			this.state.cropAvatarModalOpen ? null :
				this.props.scope === 'public' ?
					<div id="profilModal">
						{body}
					</div>
					: <div className="modal modalPage" id="profilModal">
						<div className="modal-dialog">
							{body}
						</div>
					</div>
		);
	}
}

export default ProfilModal;
