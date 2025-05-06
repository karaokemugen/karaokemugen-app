import './ProfilModal.scss';

import i18next from 'i18next';
import { useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import { User } from '../../../../../src/lib/types/user';
import { logout, setAuthenticationInformation } from '../../../store/actions/auth';
import { closeModal, showModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { IAuthentifactionInformation } from '../../../store/types/auth';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import { useLocalSearch } from '../../../utils/hooks';
import {
	getLanguagesInLangFromCode,
	getListLanguagesInLocale,
	supportedLanguages,
	listCountries,
} from '../../../utils/isoLanguages';
import { getTagInLanguage, sortAndHideTags } from '../../../utils/kara';
import { getFavoritesExportFileName } from '../../../utils/playlist';
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

type AnimeListProvider = 'myanimelist' | 'anilist' | 'kitsu';

function ProfilModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [passwordDifferent, setPasswordDifferent] = useState('');
	const [nicknameMandatory, setNicknameMandatory] = useState('');
	const [user, setUser] = useState<UserProfile>();
	const [cropAvatarModalOpen, setCropAvatarModalOpen] = useState(false);
	const [dangerousActions, setDangerousActions] = useState(false);
	const [exampleForLinguisticsPreference, setExampleForLinguisticsPreference] = useState('');
	const [animeListToFetch, setAnimeListToFetch] = useState<AnimeListProvider | ''>('');

	const onChange = (event: any) => {
		if (event.target.name.includes('.')) {
			const split = event.target.name.split('.');
			user[split[0]][split[1]] = event.target.value;
		} else {
			user[event.target.name] = event.target.value;
		}
		setAnimeListToFetch(user.anime_list_to_fetch ? user.anime_list_to_fetch : '');
		setUser(user);
	};

	const onClickCheckbox = (event: any) => {
		user[event.target.name] = event.target.checked;
		setUser(user);
	};

	const changeAutocomplete = (name: 'main_series_lang' | 'fallback_series_lang' | 'location', value: string) => {
		user[name] = value;
		setUser(user);
	};

	const updateUser = async () => {
		if (user.nickname && ((user.password && user.password === user.passwordConfirmation) || !user.password)) {
			setNicknameMandatory('');
			setPasswordDifferent('');

			const data: IAuthentifactionInformation = context.globalState.auth.data;

			try {
				const response = await commandBackend('editMyAccount', user);
				data.onlineToken = response.data.onlineToken;
			} catch (_) {
				// already display
			} finally {
				setAuthenticationInformation(context.globalDispatch, data);
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
			setAnimeListToFetch(user.anime_list_to_fetch ? user.anime_list_to_fetch : '');
			setUser(user);
		} catch (_) {
			logout(context.globalDispatch);
		}
	};

	const profileConvert = () => {
		showModal(
			context.globalDispatch,
			<OnlineProfileModal type="convert" loginServ={context?.globalState.settings.data.config?.Online.Host} />
		);
	};

	const profileDelete = () => {
		showModal(context.globalDispatch, <OnlineProfileModal type="delete" loginServ={user.login?.split('@')[1]} />);
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
		try {
			const exportFile = await commandBackend('exportFavorites');
			const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportFile, null, 4));
			const dlAnchorElem = document.getElementById('downloadAnchorElem');
			if (dlAnchorElem) {
				dlAnchorElem.setAttribute('href', dataStr);
				dlAnchorElem.setAttribute(
					'download',
					getFavoritesExportFileName(context.globalState.auth.data.username)
				);
				dlAnchorElem.click();
			}
		} catch (_) {
			// already display
		}
	};

	const importAvatar = e => {
		if (e.target.files?.length > 0) {
			setCropAvatarModalOpen(true);
			const container = document.getElementById('import-avatar');
			const root = createRoot(container);
			root.render(<CropAvatarModal src={e.target.files[0]} saveAvatar={saveAvatar} />);
		}
	};

	const saveAvatar = async avatar => {
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

	const refreshAnimeList = async () => {
		await commandBackend('refreshAnimeList');
		closeModalWithContext();
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

	const changeAnimeList = (event: any) => {
		if (event.target.name.includes('.')) {
			const split = event.target.name.split('.');
			user[split[0]][split[1]] = event.target.value;
		} else {
			user[event.target.name] = event.target.value;
		}
		if (!user.social_networks.anilist && !user.social_networks.myanimelist && !user.social_networks.kitsu) {
			user.anime_list_to_fetch = undefined;
		} else if (user.social_networks.anilist && !user.social_networks.myanimelist && !user.social_networks.kitsu) {
			user.anime_list_to_fetch = 'anilist';
		} else if (!user.social_networks.anilist && user.social_networks.myanimelist && !user.social_networks.kitsu) {
			user.anime_list_to_fetch = 'myanimelist';
		} else if (!user.social_networks.anilist && !user.social_networks.myanimelist && user.social_networks.kitsu) {
			user.anime_list_to_fetch = 'kitsu';
		}
		setAnimeListToFetch(user.anime_list_to_fetch ? user.anime_list_to_fetch : '');
		setUser(user);
	};

	useEffect(() => {
		const buildKaraTitleFuture = (data: DBKara) => {
			const isMulti = data?.langs?.find(e => e.name.indexOf('mul') > -1);
			if (data?.langs && isMulti) {
				data.langs = [isMulti];
			}
			let serieText = '';
			if (data?.series?.length > 0) {
				serieText =
					data.series
						.slice(0, 3)
						.map(e => getTagInLanguage(e, user.main_series_lang, user.fallback_series_lang).i18n)
						.join(', ') + (data.series.length > 3 ? '...' : '');
			} else if (data?.singergroups?.length > 0) {
				serieText =
					data.singergroups
						.slice(0, 3)
						.map(e => e.name)
						.join(', ') + (data.singergroups.length > 3 ? '...' : '');
			} else if (data?.singers) {
				serieText =
					data.singers
						.slice(0, 3)
						.map(e => e.name)
						.join(', ') + (data.singers.length > 3 ? '...' : '');
			}
			const langsText = data?.langs
				?.map(e => e.name)
				.join(', ')
				.toUpperCase();
			const songtypeText = sortAndHideTags(data?.songtypes)
				.map(e => (e.short ? +e.short : e.name))
				.join(' ');
			const songorderText = data?.songorder > 0 ? ' ' + data.songorder : '';
			const versions = sortAndHideTags(data?.versions).map(
				t => `[${getTagInLanguage(t, user.main_series_lang, user.fallback_series_lang).i18n}]`
			);
			const version = versions?.length > 0 ? ` ${versions.join(' ')}` : '';
			const arrayElements = [
				langsText,
				serieText,
				songtypeText || songorderText ? `${songtypeText} ${songorderText}` : null,
				data.titles[user.main_series_lang]
					? data.titles[user.main_series_lang]
					: data.titles[user.fallback_series_lang]
						? data.titles[user.fallback_series_lang]
						: data.titles[data.titles_default_language],
			].filter(value => value != '');
			return `${arrayElements.join(' - ')} ${version}`;
		};
		const getExampleForLinguisticsPreference = async () => {
			try {
				const data = await commandBackend('getKara', { kid: 'ed57440b-0410-4fd4-8fc0-b87eee2df9a0' });
				setExampleForLinguisticsPreference(buildKaraTitleFuture(data));
			} catch (_) {
				// ignore error
			}
		};
		getExampleForLinguisticsPreference();
	}, [user?.main_series_lang, user?.fallback_series_lang]);

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

	const countries = useMemo(
		() => listCountries(context.globalState.settings.data.user.language),
		[context.globalState.settings.data.user.language]
	);
	const [countryQuery, setCountryQuery] = useState('');
	const queriedCountries = useLocalSearch(countries, countryQuery);

	const languages = useMemo(
		() => getListLanguagesInLocale(context.globalState.settings.data.user.language),
		[context.globalState.settings.data.user.language]
	);
	const [mainLanguageQuery, setMainLanguageQuery] = useState('');
	const [fallbackLanguageQuery, setFallbackLanguageQuery] = useState('');
	const queriedMainLanguages = useLocalSearch(languages, mainLanguageQuery);
	const queriedFallbackLanguages = useLocalSearch(languages, fallbackLanguageQuery);

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
						<i className="fas fa-fw fa-arrow-left" />
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
				<form
					onSubmit={async e => {
						e.preventDefault();
						await updateUser();
						closeModalWithContext();
					}}
					className="profileContent"
				>
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
									type="url"
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
									<i className="fas fa-fw fa-map-marked-alt" />
									<label>{i18next.t('MODAL.PROFILE_MODAL.LOCATION')}</label>
								</div>
								<Autocomplete
									value={user.location}
									options={queriedCountries}
									onType={setCountryQuery}
									onChange={value => changeAutocomplete('location', value)}
									styleInclude
								/>
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fab fa-fw fa-discord" />
									<label>{i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.DISCORD')}</label>
								</div>
								<input
									name="social_networks.discord"
									type="text"
									placeholder={i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.DISCORD_PLACEHOLDER')}
									defaultValue={user.social_networks.discord}
									onKeyUp={onChange}
									onChange={onChange}
									autoComplete="off"
								/>
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fab fa-fw fa-mastodon" />
									<label>{i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.MASTODON')}</label>
								</div>
								<input
									name="social_networks.mastodon"
									type="text"
									placeholder={i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.MASTODON_PLACEHOLDER')}
									defaultValue={user.social_networks.mastodon}
									onKeyUp={onChange}
									onChange={onChange}
									autoComplete="off"
								/>
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fab fa-fw fa-bluesky" />
									<label>{i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.BLUESKY')}</label>
								</div>
								<input
									name="social_networks.bluesky"
									type="text"
									placeholder={i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.BLUESKY_PLACEHOLDER')}
									defaultValue={user.social_networks.bluesky}
									onKeyUp={onChange}
									onChange={onChange}
									autoComplete="off"
								/>
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fab fa-fw fa-instagram" />
									<label>{i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.INSTAGRAM')}</label>
								</div>
								<input
									name="social_networks.instagram"
									type="text"
									placeholder={i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.INSTAGRAM_PLACEHOLDER')}
									defaultValue={user.social_networks.instagram}
									onKeyUp={onChange}
									onChange={onChange}
									autoComplete="off"
								/>
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fab fa-fw fa-twitch" />
									<label>{i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.TWITCH')}</label>
								</div>
								<input
									name="social_networks.twitch"
									type="text"
									placeholder={i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.TWITCH_PLACEHOLDER')}
									defaultValue={user.social_networks.twitch}
									onKeyUp={onChange}
									onChange={onChange}
									autoComplete="off"
								/>
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<i className="fab fa-fw fa-gitlab" />
									<label>{i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.GITLAB')}</label>
								</div>
								<input
									name="social_networks.gitlab"
									type="text"
									placeholder={i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.GITLAB_PLACEHOLDER')}
									defaultValue={user.social_networks.gitlab}
									onKeyUp={onChange}
									onChange={onChange}
									autoComplete="off"
								/>
							</div>
							{logInfos?.onlineToken ? (
								<>
									<div className="profileLine">
										<div className="profileLabel">
											<label>
												{i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.MYANIMELIST')}
											</label>
										</div>
										<input
											name="social_networks.myanimelist"
											type="text"
											placeholder={i18next.t(
												'MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.MYANIMELIST_PLACEHOLDER'
											)}
											defaultValue={user.social_networks.myanimelist}
											onKeyUp={changeAnimeList}
											onChange={changeAnimeList}
											autoComplete="off"
										/>
									</div>
									<div className="profileLine">
										<div className="profileLabel">
											<label>{i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.ANILIST')}</label>
										</div>
										<input
											name="social_networks.anilist"
											type="text"
											placeholder={i18next.t(
												'MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.ANILIST_PLACEHOLDER'
											)}
											defaultValue={user.social_networks.anilist}
											onKeyUp={changeAnimeList}
											onChange={changeAnimeList}
											autoComplete="off"
										/>
									</div>
									<div className="profileLine">
										<div className="profileLabel">
											<label>{i18next.t('MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.KITSU')}</label>
										</div>
										<input
											name="social_networks.kitsu"
											type="text"
											placeholder={i18next.t(
												'MODAL.PROFILE_MODAL.SOCIAL_NETWORKS.KITSU_PLACEHOLDER'
											)}
											defaultValue={user.social_networks.kitsu}
											onKeyUp={changeAnimeList}
											onChange={changeAnimeList}
											autoComplete="off"
										/>
									</div>
									<div className="profileLine row">
										<div className="profileLabel">
											<label htmlFor="anime_list_to_fetch">
												{i18next.t('MODAL.PROFILE_MODAL.ANIME_LIST_TO_FETCH')}
											</label>
										</div>
										<select name="anime_list_to_fetch" onChange={onChange} value={animeListToFetch}>
											<option value="">
												{i18next.t('MODAL.PROFILE_MODAL.CHOOSE_ANIME_LIST')}
											</option>
											<option value="myanimelist">MyAnimeList</option>
											<option value="anilist">AniList</option>
											<option value="kitsu">Kitsu</option>
										</select>
									</div>
								</>
							) : null}
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
								<select name="language" onChange={onChange} defaultValue={user.language}>
									{supportedLanguages.map(lang => {
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
										options={queriedMainLanguages}
										onType={setMainLanguageQuery}
										onChange={value => changeAutocomplete('main_series_lang', value)}
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
										options={queriedFallbackLanguages}
										onType={setFallbackLanguageQuery}
										onChange={value => changeAutocomplete('fallback_series_lang', value)}
									/>
								</div>
							</div>
							{exampleForLinguisticsPreference ? (
								<div className="profileLine row">
									<div className="profileLabel">
										<label>{i18next.t('MODAL.PROFILE_MODAL.SONG_NAME_DISPLAY_EXAMPLE')}</label>
									</div>
									<div>
										<label>{exampleForLinguisticsPreference}</label>
									</div>
								</div>
							) : null}
							<div className="profileLine">
								<div className="profileLabel">
									<input
										type="checkbox"
										defaultChecked={user.flag_sendstats}
										onChange={onClickCheckbox}
										name="flag_sendstats"
										id="flag_sendstats"
									/>
									<label htmlFor="flag_sendstats">
										{i18next.t('MODAL.PROFILE_MODAL.FLAG_SENDSTATS')}
									</label>
								</div>
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<input
										type="checkbox"
										defaultChecked={user.flag_parentsonly}
										onChange={onClickCheckbox}
										name="flag_parentsonly"
										id="flag_parentsonly"
									/>
									<label htmlFor="flag_parentsonly">
										{i18next.t('MODAL.PROFILE_MODAL.FLAG_PARENTSONLY')}
									</label>
								</div>
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<input
										type="checkbox"
										defaultChecked={user.flag_public}
										onChange={onClickCheckbox}
										name="flag_public"
										id="flag_public"
									/>
									<label htmlFor="flag_public">{i18next.t('MODAL.PROFILE_MODAL.FLAG_PUBLIC')}</label>
								</div>
							</div>
							<div className="profileLine">
								<div className="profileLabel">
									<input
										type="checkbox"
										defaultChecked={user.flag_displayfavorites}
										onChange={onClickCheckbox}
										name="flag_displayfavorites"
										id="flag_displayfavorites"
									/>
									<label htmlFor="flag_displayfavorites">
										{i18next.t('MODAL.PROFILE_MODAL.FLAG_DISPLAYFAVORITES')}
									</label>
								</div>
							</div>
							<div className="profileButtonLine">
								<button type="submit" className="btn btn-action btn-save">
									{i18next.t('SUBMIT')}
								</button>
								{logInfos?.onlineToken ? (
									<button
										type="button"
										className="btn btn-action btn-default"
										onClick={refreshAnimeList}
									>
										<i className="fa-solid fa-arrows-rotate" />{' '}
										{i18next.t('MODAL.PROFILE_MODAL.REFRESH_ANIME_LIST')}
									</button>
								) : null}
								<button
									type="button"
									className="btn btn-danger profileDelete"
									onClick={() => setDangerousActions(!dangerousActions)}
								>
									<i className="fas fa-fw fa-exclamation-triangle" />
									{i18next.t('MODAL.PROFILE_MODAL.DANGEROUS_ACTIONS')}
									<i
										className={`fas fa-fw ${
											dangerousActions ? 'fa-chevron-left' : 'fa-chevron-right'
										}`}
									/>
								</button>
								{dangerousActions ? (
									<div>
										{context?.globalState.settings.data.config?.Online.Users &&
										logInfos?.username !== 'admin' ? (
											logInfos?.onlineToken ? (
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
											className={`btn profileDelete ${
												logInfos?.onlineToken ? 'btn-primary' : 'btn-danger'
											}`}
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
				</form>
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
