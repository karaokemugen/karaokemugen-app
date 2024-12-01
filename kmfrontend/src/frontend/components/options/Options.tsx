import i18next from 'i18next';
import { KeyboardEventHandler, useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';

import { commandBackend } from '../../../utils/socket';
import { expand } from '../../../utils/tools';
import InterfaceOptions from './InterfaceOptions';
import KaraokeOptions from './KaraokeOptions';
import PlayerOptions from './PlayerOptions';

export function sanitizeSettingsSearchValue(value: string) {
	return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}

function Options() {
	const location = useLocation();
	const navigate = useNavigate();

	/**
	 * Filter value for settings
	 * child components will show/hide their settings based on this value
	 */
	const [settingsFilterValue, setSettingsFilterValue] = useState('');

	const saveSettings = (e: any) => {
		let value =
			e.target.type === 'checkbox'
				? e.target.checked
				: Number(e.target.value) || e.target.value === '0'
					? Number(e.target.value)
					: e.target.value;
		if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}
		const data = expand(e.target.id, value);
		commandBackend('updateSettings', { setting: data }).catch(() => {});
	};

	const updateSettingFilter: KeyboardEventHandler<HTMLInputElement> = e => {
		// return if we don't have an input value property - this is just to make typescript and keep strong typing
		if ('value' in e.target === false) return;
		setSettingsFilterValue(sanitizeSettingsSearchValue(e.currentTarget.value));
	};

	const keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Escape') {
			navigate('/admin');
		}
	};

	useEffect(() => {
		document.addEventListener('keyup', keyObserverHandler);
		return () => {
			document.removeEventListener('keyup', keyObserverHandler);
		};
	}, []);

	return (
		<>
			<div className="settings-nav">
				<div className="settings-filter">
					<div>
						<div className="settings-line subCategoryGroupPanel">
							{i18next.t('SETTINGS.FILTER_SETTINGS')}
						</div>
						<div className="settings-line">
							<div style={{ flexGrow: 1 }}>
								<input style={{ width: '100%' }} id="FilterSettings" onKeyUp={updateSettingFilter} />
							</div>
							<label htmlFor="Player.Display.RandomQuotes">
								<span className="tooltip">{i18next.t('SETTINGS.FILTER_SETTINGS_TOOLTIP')}</span>
							</label>
						</div>
					</div>
				</div>
				{settingsFilterValue ? null : (
					<ul className="nav nav-tabs nav-justified" id="settingsNav">
						<li className={location.pathname.includes('/options/player') ? 'active' : ''}>
							<a onClick={() => navigate('/admin/options/player')}>
								{i18next.t('SETTINGS.PLAYER.LABEL')}
							</a>
						</li>
						<li className={location.pathname.includes('/options/karaoke') ? 'active' : ''}>
							<a onClick={() => navigate('/admin/options/karaoke')}>
								{i18next.t('SETTINGS.KARAOKE.LABEL')}
							</a>
						</li>
						<li className={location.pathname.includes('/options/interface') ? 'active' : ''}>
							<a onClick={() => navigate('/admin/options/interface')}>
								{i18next.t('SETTINGS.INTERFACE.LABEL')}
							</a>
						</li>
					</ul>
				)}
			</div>
			<div className="settings-panel">
				<div>
					{settingsFilterValue ? (
						<>
							<PlayerOptions onChange={saveSettings} filterValue={settingsFilterValue} />
							<KaraokeOptions onChange={saveSettings} filterValue={settingsFilterValue} />
							<InterfaceOptions onChange={saveSettings} filterValue={settingsFilterValue} />
						</>
					) : (
						<Routes>
							<Route
								path="/player"
								element={<PlayerOptions onChange={saveSettings} filterValue={settingsFilterValue} />}
							/>
							<Route
								path="/karaoke"
								element={<KaraokeOptions onChange={saveSettings} filterValue={settingsFilterValue} />}
							/>
							<Route
								path="/interface"
								element={<InterfaceOptions onChange={saveSettings} filterValue={settingsFilterValue} />}
							/>
							<Route path="*" element={<Navigate to="/admin/options/player" />} />
						</Routes>
					)}

					<div className="settings-line systempanel-tooltip">
						<Trans
							i18nKey="SETTINGS.SYSTEMPANEL_TIP"
							components={{
								2: <strong />,
								3: <a href="/system/options"></a>,
							}}
						/>
					</div>
				</div>
			</div>
		</>
	);
}

export default Options;
