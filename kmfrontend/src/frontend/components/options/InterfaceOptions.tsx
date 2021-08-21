import i18next from 'i18next';
import difference from 'lodash.difference';
import React, { Component } from 'react';

import GlobalContext from '../../../store/context';
import { dotify } from '../../../utils/tools';
import Switch from '../generic/Switch';

interface IProps {
	onChange: (e: any) => void;
}

interface IState {
	config?: any;
}

class InterfaceOptions extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		this.setState({ config: dotify(this.context.globalState.settings.data.config) });
	}

	componentDidUpdate(_prevProps: Readonly<IProps>, prevState: Readonly<IState>) {
		// Find differences
		let different = false;
		const newConfig = dotify(this.context.globalState.settings.data.config);
		for (const i in prevState.config) {
			// Hack for null -> '' conversion by React
			if (prevState.config[i] === '') newConfig[i] = '';
			if (newConfig[i] !== prevState.config[i]) {
				if (Array.isArray(prevState.config[i])) {
					if (difference(prevState.config[i], newConfig[i]).length > 0) {
						different = true;
						break;
					}
				} else {
					different = true;
					break;
				}
			}
		}
		if (different) this.setState({ config: newConfig });
	}

	onChange = (e: any) => {
		const config = this.state.config;
		let value = e.target.type === 'checkbox' ? e.target.checked :
			(Number(e.target.value) ? Number(e.target.value) : e.target.value);
		if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}
		config[e.target.id] = value;
		this.setState({ config: config });
		if (e.target.type !== 'number' || (Number(e.target.value))) this.props.onChange(e);
	};

	render() {
		return (
			this.state.config ?
				<React.Fragment>
					<div className="settings-line">
						<label htmlFor="Frontend.Mode">
							<span className="title">{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_TOOLTIP')}</span>
						</label>
						<div>
							<select
								id="Frontend.Mode"
								onChange={this.onChange}
								value={this.state.config['Frontend.Mode']}
							>
								<option value={0}>{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_CLOSED')}</option>
								<option value={1}>{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_LIMITED')}</option>
								<option value={2}>{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_OPEN')}</option>
							</select>
						</div>
					</div>

					<div className="settings-line">
						<label htmlFor="Frontend.ShowAvatarsOnPlaylist">
							<span className="title">{i18next.t('SETTINGS.INTERFACE.SHOW_AVATARS_ON_PLAYLIST')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.INTERFACE.SHOW_AVATARS_ON_PLAYLIST_TOOLTIP')}</span>
						</label>
						<div>
							<Switch idInput="Frontend.ShowAvatarsOnPlaylist" handleChange={this.onChange}
								isChecked={this.state.config['Frontend.ShowAvatarsOnPlaylist']} />
						</div>
					</div>
				</React.Fragment> : null
		);
	}
}

export default InterfaceOptions;
