import './ProfilModal.scss';

import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import { User } from '../../../../../src/lib/types/user';
import { logout, setAuthentifactionInformation } from '../../../store/actions/auth';
import { closeModal, showModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { IAuthentifactionInformation } from '../../../store/types/auth';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import {
	getLanguagesInLangFromCode,
	getListLanguagesInLocale,
	languagesSupport,
	listCountries,
} from '../../../utils/isoLanguages';
import { commandBackend } from '../../../utils/socket';
import { callModal, displayMessage } from '../../../utils/tools';
import Autocomplete from '../generic/Autocomplete';
import CropAvatarModal from './CropAvatarModal';
import OnlineProfileModal from './OnlineProfileModal';
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
	avatar?: any;
}

type typesAttrUser =
	| 'login'
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
	| 'main_series_lang'
	| 'fallback_series_lang'
	| 'securityCode'
	| 'passwordConfirmation'
	| 'location'
	| 'language';

class ProfilModal extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;

	constructor(props: IProps) {
		super(props);
		this.state = {
			user: null,
			passwordDifferent: '',
			nicknameMandatory: '',
			cropAvatarModalOpen: false,
			dangerousActions: false,
		};
	}

	componentDidMount() {
		this.getUser();
		if (this.props.scope !== 'public') document.addEventListener('keyup', this.keyObserverHandler);
	}

	onChange = (event: any) => {
		const user = this.state.user;
		user[event.target.name] = event.target.value;
		this.setState({ user: user });
	};

	onClickCheckbox = (event: any) => {
		const user = this.state.user;
		user.flag_sendstats = event.target.checked;
		this.setState({ user: user });
	};

	onClickSelect = (event: any) => {
		const user = this.state.user;
		(user[event.target.name as typesAttrUser] as number) = parseInt(event.target.value);
		this.setState({ user: user });
	};

	changeAutocomplete = (name: 'main_series_lang' | 'fallback_series_lang' | 'location', value: string) => {
		const user = this.state.user;
		user[name] = value;
		this.setState({ user: user });
	};

	changeLanguage = (event: any) => {
		this.onChange(event);
		i18next.changeLanguage(event.target.value);
	};

	updateUser = async () => {
		if (
			this.state.user.nickname &&
			((this.state.user.password && this.state.user.password === this.state.user.passwordConfirmation) ||
				!this.state.user.password)
		) {
			this.setState({ passwordDifferent: '', nicknameMandatory: '' });
			try {
				const response = await commandBackend('editMyAccount', this.state.user);

				const data: IAuthentifactionInformation = this.context.globalState.auth.data;
				data.onlineToken = response.data.onlineToken;
				setAuthentifactionInformation(this.context.globalDispatch, data);
			} catch (e) {
				// already display
			}
		} else if (!this.state.user.nickname) {
			this.setState({ nicknameMandatory: 'redBorders' });
		} else {
			this.setState({ passwordDifferent: 'redBorders' });
		}
	};

	async getUser() {
		const user = await commandBackend('getMyAccount');
		delete user.password;
		this.setState({ user });
	}

	profileConvert = () => {
		showModal(
			this.context.globalDispatch,
			<OnlineProfileModal
				type="convert"
				loginServ={this.context?.globalState.settings.data.config?.Online.Host}
			/>
		);
	};

	profileDelete = () => {
		showModal(
			this.context.globalDispatch,
			<OnlineProfileModal type="delete" loginServ={this.state.user.login?.split('@')[1]} />
		);
	};

	favImport = (event: any) => {
		if (!window.FileReader) return alert('FileReader API is not supported by your browser.');
		const input = event.target;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			const fr = new FileReader();
			fr.onload = () => {
				callModal(
					this.context.globalDispatch,
					'confirm',
					i18next.t('CONFIRM_FAV_IMPORT'),
					'',
					async (confirm: boolean) => {
						if (confirm) {
							const data = { favorites: JSON.parse(fr['result'] as string) };
							await commandBackend('importFavorites', data);
						}
					}
				);
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
			dlAnchorElem.setAttribute(
				'download',
				[
					'KaraMugen',
					'fav',
					this.context.globalState.auth.data.username,
					new Date().toLocaleDateString().replace('\\', '-'),
				].join('_') + '.kmfavorites'
			);
			dlAnchorElem.click();
		}
	};

	importAvatar = (e) => {
		if (e.target.files?.length > 0) {
			this.setState({ cropAvatarModalOpen: true });
			ReactDOM.render(
				<CropAvatarModal src={e.target.files[0]} saveAvatar={this.saveAvatar} />,
				document.getElementById('import-avatar')
			);
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
		callModal(
			this.context.globalDispatch,
			'confirm',
			i18next.t('MODAL.PROFILE_MODAL.LOCAL_DELETE'),
			i18next.t('MODAL.PROFILE_MODAL.LOCAL_DELETE_WARN'),
			async () => {
				await commandBackend('deleteMyAccount');
				logout(this.context.globalDispatch);
			}
		);
	};

	keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Escape') {
			this.closeModal();
		}
	};

	componentWillUnmount = () => {
		if (this.props.scope !== 'public') document.removeEventListener('keyup', this.keyObserverHandler);
	};

	closeModal = () => {
		if (this.props.scope === 'public') {
			this.props.closeProfileModal();
		} else {
			closeModal(this.context.globalDispatch);
		}
	};

	render() {
		const logInfos = this.context?.globalState.auth.data;

		if (!this.context?.globalState.settings.data.config?.Online.Users && logInfos?.username.includes('@')) {
			setTimeout(function () {
				displayMessage(
					'warning',
					<div>
						<label>{i18next.t('LOG_OFFLINE.TITLE')}</label> <br /> {i18next.t('LOG_OFFLINE.MESSAGE')}
					</div>,
					8000
				);
			}, 500);
		}
		const body = this.state.user ? (
			<div className="modal-content">
				<div className={`modal-header${this.props.scope === 'public' ? ' public-modal' : ''}`}>
					{this.props.scope === 'public' ? (
						<button className="closeModal" type="button" onClick={() => this.closeModal()}>
							<i className="fas fa-arrow-left" />
						</button>
					) : null}
					<h4 className="modal-title">{i18next.t('PROFILE')}</h4>
					{this.props.scope === 'admin' ? ( // aka. it's a modal, otherwise it's a page and close button is not needed
						<button className="closeModal" onClick={this.closeModal}>
							<i className="fas fa-fw fa-times" />
						</button>
					) : null}
				</div>
				<div id="nav-profil" className="modal-body">
					<div className="profileContent">
						<div className="profileHeader">
							<ProfilePicture user={this.state.user} className="img-circle avatar" />
							<div>
								<p>{this.state.user.login}</p>
								{logInfos?.role !== 'guest' ? (
									<label htmlFor="avatar" className="btn btn-default avatarButton">
										<input
											id="avatar"
											className="import-file"
											type="file"
											accept="image/*"
											style={{ display: 'none' }}
											onChange={this.importAvatar}
										/>
										<i className="fas fa-fw fa-portrait" />
										{i18next.t('AVATAR_IMPORT')}
									</label>
								) : null}
							</div>
						</div>
						{logInfos?.role !== 'guest' ? (
							<div className="profileData">
								<div className="profileLine">
									<div className="profileLabel">
										<i className="fas fa-fw fa-user" />
										<label htmlFor="nickname">{i18next.t('PROFILE_USERNAME')}</label>
									</div>
									<input
										className={this.state.nicknameMandatory}
										name="nickname"
										id="nickname"
										type="text"
										placeholder={i18next.t('PROFILE_USERNAME')}
										defaultValue={this.state.user.nickname}
										onKeyUp={this.onChange}
										onChange={this.onChange}
										autoComplete="off"
									/>
								</div>
								<div className="profileLine">
									<div className="profileLabel">
										<i className="fas fa-fw fa-envelope" />
										<label htmlFor="mail">{i18next.t('PROFILE_MAIL')}</label>
									</div>
									<input
										name="email"
										type="text"
										placeholder={i18next.t('PROFILE_MAIL')}
										defaultValue={this.state.user.email}
										onKeyUp={this.onChange}
										onChange={this.onChange}
										autoComplete="email"
									/>
								</div>
								{logInfos?.onlineToken && !this.state.user.email ? (
									<div className="profileLine">
										<div className="profileLabel warning">
											<i className="fas fa-fw fa-exclamation-circle" />
											<div>{i18next.t('MODAL.PROFILE_MODAL.MISSING_EMAIL')}</div>
										</div>
									</div>
								) : null}
								<div className="profileLine">
									<div className="profileLabel">
										<i className="fas fa-fw fa-link" />
										<label htmlFor="url">{i18next.t('PROFILE_URL')}</label>
									</div>
									<input
										name="url"
										type="text"
										placeholder={i18next.t('PROFILE_URL')}
										defaultValue={this.state.user.url}
										onKeyUp={this.onChange}
										onChange={this.onChange}
										autoComplete="url"
									/>
								</div>
								<div className="profileLine">
									<div className="profileLabel">
										<i className="fas fa-fw fa-pen" />
										<label htmlFor="bio">{i18next.t('PROFILE_BIO')}</label>
									</div>
									<input
										name="bio"
										type="text"
										placeholder={i18next.t('PROFILE_BIO')}
										defaultValue={this.state.user.bio}
										onKeyUp={this.onChange}
										onChange={this.onChange}
										autoComplete="off"
									/>
								</div>
								<div className="profileLine">
									<div className="profileLabel">
										<i className="fas fa-map-marked-alt" />
										<label>{i18next.t('MODAL.PROFILE_MODAL.LOCATION')}</label>
									</div>
									<Autocomplete
										value={this.state.user.location}
										options={listCountries()}
										forceTop={true}
										onChange={(value) => this.changeAutocomplete('location', value)}
									/>
								</div>
								<div className="profileLine">
									<div className="profileLabel">
										<input
											type="checkbox"
											defaultChecked={this.state.user.flag_sendstats}
											onChange={this.onClickCheckbox}
										/>
										<label>{i18next.t('MODAL.PROFILE_MODAL.FLAG_SENDSTATS')}</label>
									</div>
								</div>
								<div className="profileLine">
									<div className="profileLabel">
										<i className="fas fa-fw fa-lock" />
										<label htmlFor="password">{i18next.t('PROFILE_PASSWORD')}</label>
									</div>
									<div className="dualInput">
										<input
											className={this.state.passwordDifferent}
											name="password"
											type="password"
											placeholder={i18next.t('PROFILE_PASSWORD')}
											defaultValue={this.state.user.password}
											onKeyUp={this.onChange}
											onChange={this.onChange}
											autoComplete="new-password"
										/>
										<input
											className={this.state.passwordDifferent}
											name="passwordConfirmation"
											type="password"
											placeholder={i18next.t('PROFILE_PASSWORDCONF')}
											defaultValue={this.state.user.passwordConfirmation}
											onKeyUp={this.onChange}
											onChange={this.onChange}
											autoComplete="new-password"
										/>
									</div>
								</div>
								<div className="profileLine">
									<div className="profileLabel">
										<i className="fas fa-fw fa-star" />
										<label htmlFor="favorites">{i18next.t('PLAYLISTS.FAVORITES')}</label>
									</div>
									<label
										htmlFor="favImport"
										title={i18next.t('FAVORITES_IMPORT')}
										className="btn btn-action btn-default favImport"
									>
										<i className="fas fa-fw fa-download" /> {i18next.t('FAVORITES_IMPORT')}
									</label>
									<input
										id="favImport"
										className="import-file"
										type="file"
										accept=".kmfavorites"
										style={{ display: 'none' }}
										onChange={this.favImport}
									/>
									<button
										type="button"
										title={i18next.t('FAVORITES_EXPORT')}
										className="btn btn-action btn-default favExport"
										onClick={this.favExport}
									>
										<i className="fas fa-fw fa-upload" /> {i18next.t('FAVORITES_EXPORT')}
									</button>
								</div>
								<div className="profileLine row">
									<div className="profileLabel">
										<i className="fas fa-fw fa-language" />
										<label htmlFor="language">
											{i18next.t('MODAL.PROFILE_MODAL.INTERFACE_LANGUAGE')}
										</label>
									</div>
									<select
										name="language"
										onChange={this.changeLanguage}
										defaultValue={this.state.user.language}
									>
										{languagesSupport.map((lang) => {
											return (
												<option key={lang} value={lang}>
													{getLanguagesInLangFromCode(lang)}
												</option>
											);
										})}
									</select>
								</div>
								<div className="profileLine row">
									<div className="profileLabel">
										<i className="fas fa-fw fa-globe" />
										<label>{i18next.t('MODAL.PROFILE_MODAL.MAIN_SONG_NAME_LANG')}</label>
									</div>
									<div>
										<Autocomplete
											value={this.state.user.main_series_lang}
											options={getListLanguagesInLocale()}
											forceTop={true}
											onChange={(value) => this.changeAutocomplete('main_series_lang', value)}
										/>
									</div>
								</div>
								<div className="profileLine row">
									<div className="profileLabel">
										<i className="fas fa-fw fa-globe" />
										<label>{i18next.t('MODAL.PROFILE_MODAL.FALLBACK_SONG_NAME_LANG')}</label>
									</div>
									<div>
										<Autocomplete
											value={this.state.user.fallback_series_lang}
											options={getListLanguagesInLocale()}
											forceTop={true}
											onChange={(value) => this.changeAutocomplete('fallback_series_lang', value)}
										/>
									</div>
								</div>
								<div className="profileButtonLine">
									<button
										type="button"
										className="btn btn-action btn-save"
										onClick={async () => {
											await this.updateUser();
											this.closeModal();
										}}
									>
										{i18next.t('SUBMIT')}
									</button>
									<button
										type="button"
										className="btn btn-danger profileDelete"
										onClick={() =>
											this.setState({ dangerousActions: !this.state.dangerousActions })
										}
									>
										<i className="fas fa-fw fa-exclamation-triangle" />
										{i18next.t('MODAL.PROFILE_MODAL.DANGEROUS_ACTIONS')}
										<i
											className={`fas fa-fw ${
												this.state.dangerousActions ? 'fa-chevron-left' : 'fa-chevron-right'
											}`}
										/>
									</button>
									{this.state.dangerousActions ? (
										<div>
											{this.context?.globalState.settings.data.config?.Online.Users &&
											logInfos?.username !== 'admin' ? (
												logInfos?.onlineToken ? (
													<button
														type="button"
														className="btn btn-danger profileDelete"
														onClick={this.profileDelete}
													>
														<i className="fas fa-fw fa-retweet" />{' '}
														{i18next.t('MODAL.PROFILE_MODAL.ONLINE_DELETE')}
													</button>
												) : (
													<button
														type="button"
														className="btn btn-primary profileConvert"
														onClick={this.profileConvert}
													>
														<i className="fas fa-fw fa-retweet" />{' '}
														{i18next.t('MODAL.PROFILE_MODAL.ONLINE_CONVERT')}
													</button>
												)
											) : null}
											<button
												type="button"
												className={`btn profileDelete ${
													logInfos?.onlineToken ? 'btn-primary' : 'btn-danger'
												}`}
												onClick={this.deleteAccount}
											>
												<i className="fas fa-fw fa-trash-alt" />{' '}
												{i18next.t('MODAL.PROFILE_MODAL.LOCAL_DELETE')}
											</button>
										</div>
									) : null}
								</div>
							</div>
						) : null}
					</div>
				</div>
			</div>
		) : null;
		return this.state.cropAvatarModalOpen && this.props.scope === 'admin' ? null : this.props.scope === 'public' ? (
			<div id="profilModal">{body}</div>
		) : (
			<div className="modal modalPage" id="profilModal">
				<div className="modal-dialog">{body}</div>
			</div>
		);
	}
}

export default ProfilModal;
