import i18next from 'i18next';
import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';

import { commandBackend } from '../../../utils/socket';
import { expand } from '../../../utils/tools';
import InterfaceOptions from './InterfaceOptions';
import KaraokeOptions from './KaraokeOptions';
import PlayerOptions from './PlayerOptions';

interface IState {
	activeView: number;
}

class Options extends Component<RouteComponentProps, IState> {

	state = {
		activeView: 1
	};

	saveSettings(e: any) {
		let value = e.target.type === 'checkbox' ? e.target.checked :
			((Number(e.target.value) || e.target.value === '0') ? Number(e.target.value) : e.target.value);
		if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}
		const data = expand(e.target.id, value);
		commandBackend('updateSettings', { setting: data }).catch(() => { });
	}

	keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Escape') {
			this.props.history.push('/admin');
		}
	}

	componentDidMount() {
		document.addEventListener('keyup', this.keyObserverHandler);
	}

	componentWillUnmount() {
		document.removeEventListener('keyup', this.keyObserverHandler);
	}

	render() {
		return (
			<>
				<div className="settings-nav">
					<ul className="nav nav-tabs nav-justified" id="settingsNav">
						<li className={(this.state.activeView === 1 ? 'active' : '')}>
							<a onClick={() => this.setState({ activeView: 1 })}>{i18next.t('SETTINGS.PLAYER.LABEL')}</a>
						</li>
						<li className={(this.state.activeView === 2 ? 'active' : '')}>
							<a onClick={() => this.setState({ activeView: 2 })}>{i18next.t('SETTINGS.KARAOKE.LABEL')}</a>
						</li>
						<li className={(this.state.activeView === 3 ? 'active' : '')}>
							<a onClick={() => this.setState({ activeView: 3 })}>{i18next.t('SETTINGS.INTERFACE.LABEL')}</a>
						</li>
					</ul>
				</div>
				<div className="settings-panel">
					<div>
						{this.state.activeView === 1 ?
							<PlayerOptions onChange={this.saveSettings} /> : null
						}
						{this.state.activeView === 2 ?
							<KaraokeOptions onChange={this.saveSettings} /> : null
						}
						{this.state.activeView === 3 ?
							<InterfaceOptions onChange={this.saveSettings} /> : null
						}

						<div className="settings-line systempanel-tooltip">
							{i18next.t('SETTINGS.SYSTEMPANEL_TIP.QUESTION')}
							<strong>
								{i18next.t('SETTINGS.SYSTEMPANEL_TIP.RESPONSE')}
								<a href="/system/options">
									{i18next.t('SETTINGS.SYSTEMPANEL_TIP.LINK')}
								</a>
								{i18next.t('SETTINGS.SYSTEMPANEL_TIP.AFTER_LINK')}
							</strong>
						</div>
					</div>
				</div>
			</>
		);
	}
}

export default withRouter(Options);
