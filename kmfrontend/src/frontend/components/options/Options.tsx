import i18next from 'i18next';
import { useEffect } from 'react';
import { Redirect, Route, RouteComponentProps, Switch, withRouter } from 'react-router';

import { commandBackend } from '../../../utils/socket';
import { expand } from '../../../utils/tools';
import InterfaceOptions from './InterfaceOptions';
import KaraokeOptions from './KaraokeOptions';
import PlayerOptions from './PlayerOptions';

function Options(props: RouteComponentProps) {
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

	const keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Escape') {
			props.history.push('/admin');
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
				<ul className="nav nav-tabs nav-justified" id="settingsNav">
					<li className={props.location.pathname.includes('/options/player') ? 'active' : ''}>
						<a onClick={() => props.history.push('/admin/options/player')}>
							{i18next.t('SETTINGS.PLAYER.LABEL')}
						</a>
					</li>
					<li className={props.location.pathname.includes('/options/karaoke') ? 'active' : ''}>
						<a onClick={() => props.history.push('/admin/options/karaoke')}>
							{i18next.t('SETTINGS.KARAOKE.LABEL')}
						</a>
					</li>
					<li className={props.location.pathname.includes('/options/interface') ? 'active' : ''}>
						<a onClick={() => props.history.push('/admin/options/interface')}>
							{i18next.t('SETTINGS.INTERFACE.LABEL')}
						</a>
					</li>
				</ul>
			</div>
			<div className="settings-panel">
				<div>
					<Switch>
						<Route path="/admin/options/player" render={() => <PlayerOptions onChange={saveSettings} />} />
						<Route
							path="/admin/options/karaoke"
							render={() => <KaraokeOptions onChange={saveSettings} />}
						/>
						<Route
							path="/admin/options/interface"
							render={() => <InterfaceOptions onChange={saveSettings} />}
						/>
						<Redirect to="/admin/options/player" />
					</Switch>

					<div className="settings-line systempanel-tooltip">
						{i18next.t('SETTINGS.SYSTEMPANEL_TIP.QUESTION')}
						<strong>
							{i18next.t('SETTINGS.SYSTEMPANEL_TIP.RESPONSE')}
							<a href="/system/options">{i18next.t('SETTINGS.SYSTEMPANEL_TIP.LINK')}</a>
							{i18next.t('SETTINGS.SYSTEMPANEL_TIP.AFTER_LINK')}
						</strong>
					</div>
				</div>
			</div>
		</>
	);
}

export default withRouter(Options);
