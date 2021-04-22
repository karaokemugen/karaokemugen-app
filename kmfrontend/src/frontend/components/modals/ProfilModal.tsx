import './ProfilModal.scss';

import languages from '@cospired/i18n-iso-languages';
import i18next from 'i18next';
import prettyBytes from 'pretty-bytes';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { User } from '../../../../../src/lib/types/user';
import { DBPLC } from '../../../../../src/types/database/playlist';
import { logout, setAuthentifactionInformation } from '../../../store/actions/auth';
import { closeModal, showModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
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
	scope?: 'public' | 'admin';
	closeProfileModal?: () => void;
}

interface IState {
	passwordDifferent: string;
	nicknameMandatory: string;
	user?: UserProfile;
	userDetails?: User;
	imageSource?: any;
	cropAvatarModalOpen: boolean;
	dangerousActions: boolean;
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
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			user: null,
			passwordDifferent: 'form-control',
			nicknameMandatory: 'form-control',
			cropAvatarModalOpen: false,
			dangerousActions: false
		};
	}

	componentDidMount() {
		this.getUser();
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
	};

	changeLanguageFallback = (name: 'main_series_lang' | 'fallback_series_lang', value: string) => {
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
			try {
				const response = await commandBackend('editMyAccount', this.state.user);

				const data: IAuthentifactionInformation = this.context.globalState.auth.data;
				data.onlineToken = response.data.onlineToken;
				setAuthentifactionInformation(this.context.globalDispatch, data);
			} catch (e) {
				// already display
			}
		} else if (!this.state.user.nickname) {
			this.setState({ nicknameMandatory: 'form-control redBorders' });
		} else {
			this.setState({ passwordDifferent: 'form-control redBorders' });
		}
	}

	async getUser() {
		const user = await commandBackend('getMyAccount');
		delete user.password;
		this.setState({ user });
	}

	profileConvert = () => {
		showModal(this.context.globalDispatch, <OnlineProfileModal type="convert" loginServ={this.context?.globalState.settings.data.config?.Online.Host} />);
	};

	profileDelete = () => {
		showModal(this.context.globalDispatch, <OnlineProfileModal type="delete" loginServ={this.state.user.login?.split('@')[1]} />);
	};

	favImport = (event: any) => {
		if (!window.FileReader) return alert('FileReader API is not supported by your browser.');
		const input = event.target;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			const fr = new FileReader();
			fr.onload = () => {
				callModal(this.context.globalDispatch, 'confirm', i18next.t('CONFIRM_FAV_IMPORT'), '', async (confirm: boolean) => {
					if (confirm) {
						const data = { favorites: fr['result'] };
						const response = await commandBackend('importFavorites', data);
						if (response.unknownKaras && response.unknownKaras.length > 0) {
							const mediasize = response.unknownKaras.reduce((accumulator, currentValue) => accumulator + currentValue.mediasize, 0);
							callModal(this.context.globalDispatch, 'confirm', i18next.t('MODAL.UNKNOW_KARAS.TITLE'), (<React.Fragment>
								<p>
									{i18next.t('MODAL.UNKNOW_KARAS.DESCRIPTION')}
								</p>
								<div>
									{i18next.t('MODAL.UNKNOW_KARAS.DOWNLOAD_THEM')}
									<label>&nbsp;{i18next.t('MODAL.UNKNOW_KARAS.DOWNLOAD_THEM_SIZE', { mediasize: prettyBytes(mediasize) })}</label>
								</div>
								<br />
								{response.unknownKaras.map((kara: DBPLC) =>
									<label key={kara.kid}>{buildKaraTitle(this.context.globalState.settings.data, kara, true)}</label>)}
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

	favExport = async () => {
		const exportFile = await commandBackend('exportFavorites');
		const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportFile, null, 4));
		const dlAnchorElem = document.getElementById('downloadAnchorElem');
		if (dlAnchorElem) {
			dlAnchorElem.setAttribute('href', dataStr);
			dlAnchorElem.setAttribute('download', ['KaraMugen', 'fav', this.context.globalState.auth.data.username, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmfavorites');
			dlAnchorElem.click();
		}
	}

	importAvatar = (e) => {
		if (e.target.files?.length > 0) {
			this.setState({ cropAvatarModalOpen: true });
			ReactDOM.render(<CropAvatarModal src={e.target.files[0]} saveAvatar={this.saveAvatar} />, document.getElementById('import-avatar'));
		}
	};

	saveAvatar = async (avatar) => {
		if (avatar) {
			const user = this.state.user;
			user.avatar = avatar;
			this.setState({ user, cropAvatarModalOpen: false }, async () => {
				await this.updateUser();
				await this.getUser();
			});
		} else {
			this.setState({ cropAvatarModalOpen: false });
		}
	};

	deleteAccount = () => {
		callModal(this.context.globalDispatch, 'confirm', i18next.t('MODAL.PROFILE_MODAL.LOCAL_DELETE'), i18next.t('MODAL.PROFILE_MODAL.LOCAL_DELETE_WARN'), async () => {
			await commandBackend('deleteMyUser');
			logout(this.context.globalDispatch);
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
			closeModal(this.context.globalDispatch);
		}
	}

	render() {
		const logInfos = this.context?.globalState.auth.data;
		const listLangs = [];
		for (const [key, value] of Object.entries(languages.getNames(i18next.languages[0]))) {
			listLangs.push({ 'label': value, 'value': languages.alpha2ToAlpha3B(key) });
		}
		if (!this.context?.globalState.settings.data.config?.Online.Users && logInfos?.username.includes('@')) {
			setTimeout(function () {
				displayMessage('warning', <div><label>{i18next.t('LOG_OFFLINE.TITLE')}</label> <br /> {i18next.t('LOG_OFFLINE.MESSAGE')}</div>, 8000);
			}, 500);
		}
		const body = this.state.user ? (<div className="modal-content">
			<div className={`modal-header${this.props.scope === 'public' ? ' public-modal' : ''}`}>
				{this.props.scope === 'public' ? <button
					className="closeModal"
					type="button"
					onClick={() => this.closeModal()}>
					<i className="fas fa-arrow-left" />
				</button> : null}
				<h4 className="modal-title">{i18next.t('PROFILE')}</h4>
				{this.props.scope === 'admin' ? // aka. it's a modal, otherwise it's a page and close button is not needed
					<button className="closeModal"
						onClick={this.closeModal}>
						<i className="fas fa-fw fa-times" />
					</button> : null
				}
			</div>
			<div id="nav-profil" className="modal-body">
				<div className="profileContent">
					<div className="profileHeader">
						<ProfilePicture user={this.state.user} className="img-circle avatar" />
						<div>
							<p>{this.state.user.login}</p>
							{logInfos?.role !== 'guest' ?
								<label htmlFor="avatar" className="btn btn-default avatarButton">
									<input id="avatar" className="import-file" type="file" accept="image/*"
										style={{ display: 'none' }} onChange={this.importAvatar} />
									<i className="fas fa-fw fa-portrait" />
									{i18next.t('AVATAR_IMPORT')}
								</label> : null
							}
						</div>
					</div>
					{logInfos?.role !== 'guest' ?
						<div className="profileData">
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fas fa-fw fa-user" />
									<label htmlFor="nickname">{i18next.t('PROFILE_USERNAME')}</label>
								</div>
								<input className={this.state.nicknameMandatory} name="nickname" id="nickname" type="text"
									placeholder={i18next.t('PROFILE_USERNAME')} defaultValue={this.state.user.nickname}
									onKeyUp={this.onKeyPress} onChange={this.onKeyPress} autoComplete="off" />
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fas fa-fw fa-envelope" />
									<label htmlFor="nickname">{i18next.t('PROFILE_MAIL')}</label>
								</div>
								<input className="form-control" name="email" type="text"
									placeholder={i18next.t('PROFILE_MAIL')} defaultValue={this.state.user.email}
									onKeyUp={this.onKeyPress} onChange={this.onKeyPress} autoComplete="email" />
							</div>
							{logInfos?.onlineToken && !this.state.user.email ?
								<div className="profileLine">
									<div className="profileLabel warning">
										<i className="fas fa-fw fa-exclamation-circle" />
										<div>{i18next.t('MODAL.PROFILE_MODAL.MISSING_EMAIL')}</div>
									</div>
								</div> : null
							}
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fas fa-fw fa-link" />
									<label htmlFor="nickname">{i18next.t('PROFILE_URL')}</label>
								</div>
								<input className="form-control" name="url" type="text"
									placeholder={i18next.t('PROFILE_URL')} defaultValue={this.state.user.url}
									onKeyUp={this.onKeyPress} onChange={this.onKeyPress} autoComplete="url" />
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fas fa-fw fa-pen" />
									<label htmlFor="nickname">{i18next.t('PROFILE_BIO')}</label>
								</div>
								<input className="form-control" name="bio" type="text"
									placeholder={i18next.t('PROFILE_BIO')} defaultValue={this.state.user.bio}
									onKeyUp={this.onKeyPress} onChange={this.onKeyPress} autoComplete="off" />
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fas fa-fw fa-lock" />
									<label htmlFor="nickname">{i18next.t('PROFILE_PASSWORD')}</label>
								</div>
								<div className="dualInput">
									<input className={this.state.passwordDifferent} name="password" type="password"
										   placeholder={i18next.t('PROFILE_PASSWORD')} defaultValue={this.state.user.password}
										   onKeyUp={this.onKeyPress} onChange={this.onKeyPress} autoComplete="new-password" />
									<input className={this.state.passwordDifferent}
										   name="passwordConfirmation" type="password" placeholder={i18next.t('PROFILE_PASSWORDCONF')}
										   defaultValue={this.state.user.passwordConfirmation}
										   onKeyUp={this.onKeyPress} onChange={this.onKeyPress} autoComplete="new-password" />
								</div>
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fas fa-fw fa-star" />
									<label htmlFor="nickname">Favoris</label>
								</div>
								<label htmlFor="favImport" title={i18next.t('FAVORITES_IMPORT')} className="btn btn-action btn-default favImport">
									<i className="fas fa-fw fa-download" /> {i18next.t('FAVORITES_IMPORT')}
								</label>
								<input id="favImport" className="import-file" type="file" accept=".kmfavorites" style={{ display: 'none' }} onChange={this.favImport} />
								<button type="button" title={i18next.t('FAVORITES_EXPORT')} className="btn btn-action btn-default favExport" onClick={this.favExport}>
									<i className="fas fa-fw fa-upload" /> {i18next.t('FAVORITES_EXPORT')}
								</button>
							</div>
							<div className="profileLine row">
								<div className="profileLabel">
									<i className="fas fa-fw fa-globe" />
									<label htmlFor="nickname">Affichage des noms de séries</label>
								</div>
								<select name="series_lang_mode" onChange={this.onClickSelect}
									defaultValue={this.state.user.series_lang_mode.toString()}>
									<option value={'-1'}>{i18next.t('SERIE_NAME_MODE_NO_PREF')}</option>
									<option value={'0'}>{i18next.t('SERIE_NAME_MODE_ORIGINAL')}</option>
									<option value={'3'}>{i18next.t('SERIE_NAME_MODE_USER_PROFILE')}</option>
									<option value={'4'}>{i18next.t('SERIE_NAME_MODE_USER_FORCE')}</option>
								</select>
							</div>
							{this.state.user.series_lang_mode === 4 ?
								<React.Fragment>
									<div className="profileLine row">
										<label className="col-xs-6 control-label">{i18next.t('MAIN_SERIES_LANG')}</label>
										<div className="col-xs-6">
											<Autocomplete value={this.state.user.main_series_lang} options={listLangs} forceTop={true}
														  onChange={(value) => this.changeLanguageFallback('main_series_lang', value)} />
										</div>
									</div>
									<div className="profileLine row">
										<label className="col-xs-6 control-label">{i18next.t('FALLBACK_SERIES_LANG')}</label>
										<div className="col-xs-6">
											<Autocomplete value={this.state.user.fallback_series_lang} options={listLangs} forceTop={true}
														  onChange={(value) => this.changeLanguageFallback('fallback_series_lang', value)} />
										</div>
									</div>
								</React.Fragment> : null
							}
							<div className="profileButtonLine">
								<button type="button" className="btn btn-action btn-save"
									onClick={async () => {
										await this.updateUser();
										this.closeModal();
									}}>
									{i18next.t('SUBMIT')}
								</button>
								<button type="button" className="btn btn-danger profileDelete" onClick={() => this.setState({ dangerousActions: !this.state.dangerousActions })}>
									<i className="fas fa-fw fa-exclamation-triangle" />
									Actions dangereuses
									<i className={`fas fa-fw ${this.state.dangerousActions ? 'fa-chevron-left':'fa-chevron-right'}`} />
								</button>
								{this.state.dangerousActions ? <div>
									{this.context?.globalState.settings.data.config?.Online.Users && logInfos?.username !== 'admin' ?
										(logInfos?.onlineToken ?
											<button type="button" className="btn btn-danger profileDelete" onClick={this.profileDelete}>
												<i className="fas fa-fw fa-retweet" /> {i18next.t('MODAL.PROFILE_MODAL.ONLINE_DELETE')}
											</button>
											:
											<button type="button" className="btn btn-primary profileConvert" onClick={this.profileConvert}>
												<i className="fas fa-fw fa-retweet" /> {i18next.t('MODAL.PROFILE_MODAL.ONLINE_CONVERT')}
											</button>
										) : null
									}
									<button type="button" className={`btn profileDelete ${logInfos?.onlineToken ? 'btn-primary' : 'btn-danger'}`}
										onClick={this.deleteAccount}>
										<i className="fas fa-fw fa-trash-alt" /> {i18next.t('MODAL.PROFILE_MODAL.LOCAL_DELETE')}
									</button>
								</div> : null}
							</div>
						</div> : null
					}
				</div>
			</div>
		</div>) : null;
		return (
			(this.state.cropAvatarModalOpen && this.props.scope === 'admin') ? null :
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
