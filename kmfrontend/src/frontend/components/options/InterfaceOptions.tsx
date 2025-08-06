import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import GlobalContext from '../../../store/context';
import { dotify } from '../../../utils/tools';
import Switch from '../generic/Switch';
import { sanitizeSettingsSearchValue } from './Options';
import { showModal } from '../../../store/actions/modal';
import KaraLineDisplayModal from '../modals/karalinedisplay/KaraLineDisplayModal';
import KaraLineSortModal from '../modals/karalinesort/KaraLineSortModal';

interface IProps {
	onChange: (e: any) => void;
	filterValue: string;
}

function InterfaceOptions(props: IProps) {
	const context = useContext(GlobalContext);
	const [config, setConfig] = useState(dotify(context.globalState.settings.data.config));
	const { filterValue } = props;

	const onChange = (e: any) => {
		let value =
			e.target.type === 'checkbox'
				? e.target.checked
				: Number(e.target.value)
					? Number(e.target.value)
					: e.target.value;
		if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}
		config[e.target.id] = value;
		if (e.target.type !== 'number' || Number(e.target.value)) props.onChange(e);
	};

	useEffect(() => {
		setConfig(dotify(context.globalState.settings.data.config));
	}, [context.globalState.settings.data.config]);

	const toggleKaraLineSortModal = () => {
		showModal(context.globalDispatch, <KaraLineSortModal />);
	};

	const toggleKaraLineDisplayModal = () => {
		showModal(context.globalDispatch, <KaraLineDisplayModal />);
	};

	return (
		<>
			{filterValue === undefined ||
				(sanitizeSettingsSearchValue(i18next.t('SETTINGS.INTERFACE.WEBAPPMODE')).includes(filterValue) && (
					<div className="settings-line">
						<label htmlFor="Frontend.Mode">
							<span className="title">{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_TOOLTIP')}</span>
						</label>
						<div>
							<select id="Frontend.Mode" onChange={onChange} value={config['Frontend.Mode']}>
								<option value={0}>{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_CLOSED')}</option>
								<option value={1}>{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_LIMITED')}</option>
								<option value={2}>{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_OPEN')}</option>
							</select>
						</div>
					</div>
				))}

			{filterValue === undefined ||
				(sanitizeSettingsSearchValue(i18next.t('SETTINGS.INTERFACE.ALLOW_GUEST_LOGIN')).includes(
					filterValue
				) && (
					<div className="settings-line">
						<label htmlFor="Frontend.AllowGuestLogin">
							<span className="title">{i18next.t('SETTINGS.INTERFACE.ALLOW_GUEST_LOGIN')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.INTERFACE.ALLOW_GUEST_LOGIN_TOOLTIP')}</span>
						</label>
						<div>
							<Switch
								idInput="Frontend.AllowGuestLogin"
								handleChange={onChange}
								isChecked={config['Frontend.AllowGuestLogin']}
							/>
						</div>
					</div>
				))}

			{filterValue === undefined ||
				(sanitizeSettingsSearchValue(i18next.t('SETTINGS.INTERFACE.ALLOW_USER_CREATION')).includes(
					filterValue
				) && (
					<div className="settings-line">
						<label htmlFor="Frontend.AllowUserCreation">
							<span className="title">{i18next.t('SETTINGS.INTERFACE.ALLOW_USER_CREATION')}</span>
							<br />
							<span className="tooltip">
								{i18next.t('SETTINGS.INTERFACE.ALLOW_USER_CREATION_TOOLTIP')}
							</span>
						</label>
						<div>
							<Switch
								idInput="Frontend.AllowUserCreation"
								handleChange={onChange}
								isChecked={config['Frontend.AllowUserCreation']}
							/>
						</div>
					</div>
				))}

			{filterValue === undefined ||
				(sanitizeSettingsSearchValue(i18next.t('SETTINGS.INTERFACE.REQUIRE_USER_CREATION_CODE')).includes(
					filterValue
				) && (
					<div className="settings-line">
						<label htmlFor="Frontend.RequireSecurityCodeForNewAccounts">
							<span className="title">{i18next.t('SETTINGS.INTERFACE.REQUIRE_USER_CREATION_CODE')}</span>
							<br />
							<span className="tooltip">
								{i18next.t('SETTINGS.INTERFACE.REQUIRE_USER_CREATION_CODE')}
							</span>
						</label>
						<div>
							<Switch
								idInput="Frontend.RequireSecurityCodeForNewAccounts"
								handleChange={onChange}
								isChecked={config['Frontend.RequireSecurityCodeForNewAccounts']}
							/>
						</div>
					</div>
				))}

			{filterValue === undefined ||
				(sanitizeSettingsSearchValue(i18next.t('SETTINGS.INTERFACE.ALLOW_CUSTOM_TEMPORARY_GUESTS')).includes(
					filterValue
				) && (
					<div className="settings-line">
						<label htmlFor="Frontend.AllowCustomTemporaryGuests">
							<span className="title">
								{i18next.t('SETTINGS.INTERFACE.ALLOW_CUSTOM_TEMPORARY_GUESTS')}
							</span>
							<br />
							<span className="tooltip">
								{i18next.t('SETTINGS.INTERFACE.ALLOW_CUSTOM_TEMPORARY_GUESTS_TOOLTIP')}
							</span>
						</label>
						<div>
							<Switch
								idInput="Frontend.AllowCustomTemporaryGuests"
								handleChange={onChange}
								isChecked={config['Frontend.AllowCustomTemporaryGuests']}
							/>
						</div>
					</div>
				))}

			{filterValue === undefined ||
				(sanitizeSettingsSearchValue(i18next.t('SETTINGS.INTERFACE.SHOW_AVATARS_ON_PLAYLIST')).includes(
					filterValue
				) && (
					<div className="settings-line">
						<label htmlFor="Frontend.ShowAvatarsOnPlaylist">
							<span className="title">{i18next.t('SETTINGS.INTERFACE.SHOW_AVATARS_ON_PLAYLIST')}</span>
							<br />
							<span className="tooltip">
								{i18next.t('SETTINGS.INTERFACE.SHOW_AVATARS_ON_PLAYLIST_TOOLTIP')}
							</span>
						</label>
						<div>
							<Switch
								idInput="Frontend.ShowAvatarsOnPlaylist"
								handleChange={onChange}
								isChecked={config['Frontend.ShowAvatarsOnPlaylist']}
							/>
						</div>
					</div>
				))}

			{filterValue === undefined ||
				(sanitizeSettingsSearchValue(i18next.t('SETTINGS.INTERFACE.PUBLIC_PLAYER_CONTROLS')).includes(
					filterValue
				) && (
					<div className="settings-line">
						<label htmlFor="Frontend.PublicPlayerControls">
							<span className="title">{i18next.t('SETTINGS.INTERFACE.PUBLIC_PLAYER_CONTROLS')}</span>
							<br />
							<span className="tooltip">
								{i18next.t('SETTINGS.INTERFACE.PUBLIC_PLAYER_CONTROLS_TOOLTIP')}
							</span>
						</label>
						<div>
							<Switch
								idInput="Frontend.PublicPlayerControls"
								handleChange={onChange}
								isChecked={config['Frontend.PublicPlayerControls']}
							/>
						</div>
					</div>
				))}

			{filterValue === undefined ||
				(sanitizeSettingsSearchValue(i18next.t('SETTINGS.INTERFACE.DISPLAY_WELCOME_MESSAGE')).includes(
					filterValue
				) && (
					<div className="settings-line">
						<label htmlFor="Frontend.WelcomeMessage">
							<span className="title">{i18next.t('SETTINGS.INTERFACE.DISPLAY_WELCOME_MESSAGE')}</span>
							<br />
							<span className="tooltip">
								{i18next.t('SETTINGS.INTERFACE.DISPLAY_WELCOME_MESSAGE_TOOLTIP')}
							</span>
						</label>
						<div>
							<input
								id="Frontend.WelcomeMessage"
								onBlur={onChange}
								defaultValue={config['Frontend.WelcomeMessage']}
							/>
						</div>
					</div>
				))}
			{filterValue === undefined ||
				(sanitizeSettingsSearchValue(i18next.t('SETTINGS.INTERFACE.KARA_LINE_SORT')).includes(filterValue) && (
					<div className="settings-line">
						<label htmlFor="Frontend.Library.KaraLineSort">
							<span className="title">{i18next.t('SETTINGS.INTERFACE.KARA_LINE_SORT')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.INTERFACE.KARA_LINE_SORT_TOOLTIP')}</span>
						</label>
						<div>
							<button type="button" className="btn btn-default" onClick={toggleKaraLineSortModal}>
								{i18next.t('SETTINGS.INTERFACE.SET')}
							</button>
						</div>
					</div>
				))}
			{filterValue === undefined ||
				(sanitizeSettingsSearchValue(i18next.t('SETTINGS.INTERFACE.KARA_LINE_DISPLAY')).includes(
					filterValue
				) && (
					<div className="settings-line">
						<label htmlFor="Frontend.Library.KaraLineDisplay">
							<span className="title">{i18next.t('SETTINGS.INTERFACE.KARA_LINE_DISPLAY')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.INTERFACE.KARA_LINE_DISPLAY_TOOLTIP')}</span>
						</label>
						<div>
							<button type="button" className="btn btn-default" onClick={toggleKaraLineDisplayModal}>
								{i18next.t('SETTINGS.INTERFACE.SET')}
							</button>
						</div>
					</div>
				))}
		</>
	);
}

export default InterfaceOptions;
