import axios from 'axios';
import i18next from 'i18next';
import React, { Component } from 'react';

import { Config } from '../../../../src/types/config';
import { expand } from '../tools';
import InterfaceOptions from './InterfaceOptions';
import KaraokeOptions from './KaraokeOptions';
import PlayerOptions from './PlayerOptions';

interface IProps {
	config: Config;
	close: () => void
}

interface IState {
	activeView: number;
}

class Options extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		this.state = {
			activeView: 1
		};
	}

	saveSettings(e: any) {
		let value = e.target.type === 'checkbox' ? e.target.checked :
			((Number(e.target.value) || e.target.value === '0') ? Number(e.target.value) : e.target.value);
		if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}
		const data = expand(e.target.id, value);
		axios.put('/settings', { setting: JSON.stringify(data) });
	}

	keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Escape') {
			this.props.close();
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
			<React.Fragment>
				<div className="col-lg-2 col-xs-0" />
				<div
					className="panel col-lg-8 col-xs-12 modalPage"
				>
					<form className="form-horizontal" id="settings">
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

						<div className="modal-body">
							{this.state.activeView === 1 ?
								<PlayerOptions onChange={this.saveSettings} config={this.props.config} /> : null
							}
							{this.state.activeView === 2 ?
								<KaraokeOptions onChange={this.saveSettings} config={this.props.config} /> : null
							}
							{this.state.activeView === 3 ?
								<InterfaceOptions onChange={this.saveSettings} config={this.props.config} /> : null
							}
						</div>
					</form>
				</div>
			</React.Fragment>
		);
	}
}

export default Options;