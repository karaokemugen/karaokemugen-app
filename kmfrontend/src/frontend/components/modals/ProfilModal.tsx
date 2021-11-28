import './ProfilModal.scss';

import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
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

interface UserProfile extends User {
	passwordConfirmation?: string;
	avatar?: any;
}

function ProfilModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [passwordDifferent, setPasswordDifferent] = useState('');
	const [nicknameMandatory, setNicknameMandatory] = useState('');
	const [user, setUser] = useState<UserProfile>();
	const [cropAvatarModalOpen, setCropAvatarModalOpen] = useState(false);
	const [dangerousActions, setDangerousActions] = useState(false);

	const onChange = (event: any) => {
		user[event.target.name] = event.target.value;
		setUser(user);
	};

	const onClickCheckbox = (event: any) => {
		user.flag_sendstats = event.target.checked;
		setUser(user);
	};

	const changeAutocomplete = (name: 'main_series_lang' | 'fallback_series_lang' | 'location', value: string) => {
		user[name] = value;
		setUser(user);
	};

	const changeLanguage = (event: any) => {
		onChange(event);
		i18next.changeLanguage(event.target.value);
	};

	const updateUser = async () => {
		if (
			user.nickname &&
			((user.password && user.password === user.passwordConfirmation) ||
				!user.password)
		) {
			setNicknameMandatory('');
			setPasswordDifferent('');
			try {
				const response = await commandBackend('editMyAccount', user);

				const data: IAuthentifactionInformation = context.globalState.auth.data;
				data.onlineToken = response.data.onlineToken;
				setAuthentifactionInformation(context.globalDispatch, data);
			} catch (e) {
				// already display
			}
		} else if (!user.nickname) {
			setNicknameMandatory('redBorders');
		} else {
			setPasswordDifferent('redBorders');
		}
	};

	const getUser = async () => {
		try {
			const user = await commandBackend('getMyAccount');
			delete user.password;
			setUser(user);
		} catch (e) {
			logout(context.globalDispatch);
		}
	};

	const profileConvert = () => {
		showModal(
			context.globalDispatch,
			<OnlineProfileModal
				type="convert"
				loginServ={context?.globalState.settings.data.config?.Online.Host}
			/>
		);
	};

	const profileDelete = () => {
		showModal(
			context.globalDispatch,
			<OnlineProfileModal type="delete" loginServ={user.login?.split('@')[1]} />
		);
	};

	const favImport = (event: any) => {
		if (!window.FileReader) return alert('FileReader API is not supported by your browser.');
		const input = event.target;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			const fr = new FileReader();
			fr.onload = () => {
				callModal(
					context.globalDispatch,
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

	const favExport = async () => {
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
					context.globalState.auth.data.username,
					new Date().toLocaleDateString().replace('\\', '-'),
				].join('_') + '.kmfavorites'
			);
			dlAnchorElem.click();
		}
	};

	const importAvatar = (e) => {
		if (e.target.files?.length > 0) {
			setCropAvatarModalOpen(true);
			ReactDOM.render(
				<CropAvatarModal src={e.target.files[0]} saveAvatar={saveAvatar} />,
				document.getElementById('import-avatar')
			);
		}
	};

	const saveAvatar = async (avatar) => {
		if (avatar) {
			user.avatar = avatar;
			setUser(user);
		}
		setCropAvatarModalOpen(false);
	};

	const deleteAccount = () => {
		callModal(
			context.globalDispatch,
			'confirm',
			i18next.t('MODAL.PROFILE_MODAL.LOCAL_DELETE'),
			i18next.t('MODAL.PROFILE_MODAL.LOCAL_DELETE_WARN'),
			async () => {
				await commandBackend('deleteMyAccount');
				logout(context.globalDispatch);
			}
		);
	};

	const keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Escape') {
			closeModalWithContext();
		}
	};

	const closeModalWithContext = () => {
		if (props.scope === 'public') {
			props.closeProfileModal();
		} else {
			closeModal(context.globalDispatch);
		}
	};

	const updateAvatar = async () => {
		await updateUser();
		await getUser();
	};

	useEffect(() => {
		if (user) updateAvatar();
	}, [user?.avatar]);


	useEffect(() => {
		getUser();
		if (props.scope !== 'public') document.addEventListener('keyup', keyObserverHandler);
		return () => {
			if (props.scope !== 'public') document.removeEventListener('keyup', keyObserverHandler);
		};
	}, []);

	const logInfos = context?.globalState.auth.data;

	if (!context?.globalState.settings.data.config?.Online.Users && logInfos?.username.includes('@')) {
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
	const body = user ? (
		<div className="modal-content">
			<div className={`modal-header${props.scope === 'public' ? ' public-modal' : ''}`}>
				{props.scope === 'public' ? (
					<button className="closeModal" type="button" onClick={() => closeModalWithContext()}>
						<i className="fas fa-arrow-left" />
					</button>
				) : null}
				<h4 className="modal-title">{i18next.t('PROFILE')}</h4>
				{props.scope === 'admin' ? ( // aka. it's a modal, otherwise it's a page and close button is not needed
					<button className="closeModal" onClick={closeModalWithContext}>
						<i className="fas fa-fw fa-times" />
					</button>
				) : null}
			</div>
			<div id="nav-profil" className="modal-body">
				<div className="profileContent">
					<div className="profileHeader">
						<ProfilePicture user={user} className="img-circle avatar" />
						<div>
							<p>{user.login}</p>
							{logInfos?.role !== 'guest' ? (
								<label htmlFor="avatar" className="btn btn-default avatarButton">
									<input
										id="avatar"
										className="import-file"
										type="file"
										accept="image/*"
										style={{ display: 'none' }}
										onChange={importAvatar}
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
									className={nicknameMandatory}
									name="nickname"
									id="nickname"
									type="text"
									placeholder={i18next.t('PROFILE_USERNAME')}
									defaultValue={user.nickname}
									onKeyUp={onChange}
									onChange={onChange}
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
									defaultValue={user.email}
									onKeyUp={onChange}
									onChange={onChange}
									autoComplete="email"
								/>
							</div>
							{logInfos?.onlineToken && !user.email ? (
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
									defaultValue={user.url}
									onKeyUp={onChange}
									onChange={onChange}
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
									defaultValue={user.bio}
									onKeyUp={onChange}
									onChange={onChange}
									autoComplete="off"
								/>
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fas fa-map-marked-alt" />
									<label>{i18next.t('MODAL.PROFILE_MODAL.LOCATION')}</label>
								</div>
								<Autocomplete
									value={user.location}
									options={listCountries()}
									forceTop={true}
									onChange={(value) => changeAutocomplete('location', value)}
								/>
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<input
										type="checkbox"
										defaultChecked={user.flag_sendstats}
										onChange={onClickCheckbox}
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
										className={passwordDifferent}
										name="password"
										type="password"
										placeholder={i18next.t('PROFILE_PASSWORD')}
										defaultValue={user.password}
										onKeyUp={onChange}
										onChange={onChange}
										autoComplete="new-password"
									/>
									<input
										className={passwordDifferent}
										name="passwordConfirmation"
										type="password"
										placeholder={i18next.t('PROFILE_PASSWORDCONF')}
										defaultValue={user.passwordConfirmation}
										onKeyUp={onChange}
										onChange={onChange}
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
									onChange={favImport}
								/>
								<button
									type="button"
									title={i18next.t('FAVORITES_EXPORT')}
									className="btn btn-action btn-default favExport"
									onClick={favExport}
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
									onChange={changeLanguage}
									defaultValue={user.language}
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
										value={user.main_series_lang}
										options={getListLanguagesInLocale()}
										forceTop={true}
										onChange={(value) => changeAutocomplete('main_series_lang', value)}
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
										value={user.fallback_series_lang}
										options={getListLanguagesInLocale()}
										forceTop={true}
										onChange={(value) => changeAutocomplete('fallback_series_lang', value)}
									/>
								</div>
							</div>
							<div className="profileButtonLine">
								<button
									type="button"
									className="btn btn-action btn-save"
									onClick={async () => {
										await updateUser();
										closeModalWithContext();
									}}
								>
									{i18next.t('SUBMIT')}
								</button>
								<button
									type="button"
									className="btn btn-danger profileDelete"
									onClick={() => setDangerousActions(!dangerousActions)}
								>
									<i className="fas fa-fw fa-exclamation-triangle" />
									{i18next.t('MODAL.PROFILE_MODAL.DANGEROUS_ACTIONS')}
									<i
										className={`fas fa-fw ${dangerousActions ? 'fa-chevron-left' : 'fa-chevron-right'}`}
									/>
								</button>
								{dangerousActions ? (
									<div>
										{context?.globalState.settings.data.config?.Online.Users &&
											logInfos?.username !== 'admin' ?
											(
												logInfos?.onlineToken ?
													(
														<button
															type="button"
															className="btn btn-danger profileDelete"
															onClick={profileDelete}
														>
															<i className="fas fa-fw fa-retweet" />{' '}
															{i18next.t('MODAL.PROFILE_MODAL.ONLINE_DELETE')}
														</button>
													) : (
														<button
															type="button"
															className="btn btn-primary profileConvert"
															onClick={profileConvert}
														>
															<i className="fas fa-fw fa-retweet" />{' '}
															{i18next.t('MODAL.PROFILE_MODAL.ONLINE_CONVERT')}
														</button>
													)
											) : null}
										<button
											type="button"
											className={`btn profileDelete ${logInfos?.onlineToken ? 'btn-primary' : 'btn-danger'}`}
											onClick={deleteAccount}
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
	return cropAvatarModalOpen && props.scope === 'admin' ? null : props.scope === 'public' ? (
		<div id="profilModal">{body}</div>
	) : (
		<div className="modal modalPage" id="profilModal">
			<div className="modal-dialog">{body}</div>
		</div>
	);
}

export default ProfilModal;
