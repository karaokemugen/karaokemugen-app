import i18next from 'i18next';
import difference from 'lodash.difference';
import React, { Component } from 'react';

import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { dotify } from '../../../utils/tools';
import Switch from '../generic/Switch';

interface IProps {
	onChange: (e: any) => void;
}

interface IState {
	config?: any;
	displays?: any;
}
class PlayerOptions extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		this.setState({ config: dotify(this.context.globalState.settings.data.config) });
		this.getDisplays();
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

	getDisplays = async () => {
		const res = await commandBackend('getDisplays');
		this.setState({ displays: res });
	};

	putPlayerCommando = (e: any) => {
		const config = this.state.config;
		let value = e.target.type === 'checkbox' ? e.target.checked :
			((Number(e.target.value) && !e.target.value.includes('.')) ? Number(e.target.value) : e.target.value);
		if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}
		config[e.target.id] = value;
		this.setState({ config: config });
		commandBackend('sendPlayerCommand', {
			command: e.target.getAttribute('data-namecommand'),
			options: value
		});
		this.props.onChange(e);
	};

	onChange = (e: any) => {
		const config = this.state.config;
		let value = e.target.type === 'checkbox' ? e.target.checked :
			((Number(e.target.value) && !e.target.value.includes('.')) ? Number(e.target.value) : e.target.value);
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
		if (this.state.config && this.state.config['Karaoke.Display.ConnectionInfo.Host'] === null)
			this.state.config['Karaoke.Display.ConnectionInfo.Host'] = '';
		const listdisplays =
			this.state.displays && this.state.displays.length > 0
				? this.state.displays.map((display: any, index: number) => (
					<option key={index} value={index} >
						&nbsp;
						{index + 1} - ({display.resolutionX}x{display.resolutionY}) {display.model}
					</option>
				))
				: null;
		return (
			this.state.config ?
				<React.Fragment>
					<div className="settings-line subCategoryGroupPanel">
						{i18next.t('SETTINGS.PLAYER.WINDOW_SETTINGS')}
					</div>
					<div className="settings-line">
						<label className="col-xs-4 control-label" title={i18next.t('ALWAYS_ON_TOP_TOOLTIP')}>
							{i18next.t('ALWAYS_ON_TOP')}
           	 				&nbsp;
  							<i className="far fa-question-circle" />
						</label>
						<div className="col-xs-6">
							<Switch idInput="Player.StayOnTop" handleChange={this.putPlayerCommando}
								isChecked={this.state.config['Player.StayOnTop']} nameCommand="toggleAlwaysOnTop" />
						</div>
					</div>
					<div className="settings-line">
						<label className="col-xs-4 control-label" title={i18next.t('FULLSCREEN_TOOLTIP')}>
							{i18next.t('FULLSCREEN')}
							&nbsp;
							<i className="far fa-question-circle" />
						</label>
						<div className="col-xs-6">
							<Switch idInput="Player.FullScreen" handleChange={this.putPlayerCommando}
								isChecked={this.state.config['Player.FullScreen']} nameCommand="toggleFullscreen" />
						</div>
					</div>
					{!this.state.config['Player.FullScreen'] ?
						<div id="pipSettings" className="settingsGroupPanel">
							<div className="settings-line">
								<label className="col-xs-4 control-label" title={i18next.t('VIDEO_SIZE_TOOLTIP')}>
									{`${i18next.t('VIDEO_SIZE')} (${this.state.config['Player.PIP.Size']}%)`}
									&nbsp;
									<i className="far fa-question-circle" />
								</label>
								<div className="col-xs-6">
									<input
										type="range"
										id="Player.PIP.Size"
										onChange={this.onChange}
										value={this.state.config['Player.PIP.Size']}
									/>
								</div>
							</div>

							<div className="settings-line">
								<label className="col-xs-4 control-label" title={i18next.t('VIDEO_POSITION_X_TOOLTIP')}>
									{i18next.t('VIDEO_POSITION_X')}
									&nbsp;
									<i className="far fa-question-circle" />
								</label>
								<div className="col-xs-6">
									<select
										id="Player.PIP.PositionX"
										onChange={this.onChange}
										value={this.state.config['Player.PIP.PositionX']}
									>
										<option value="Left"> {i18next.t('LEFT')} </option>
										<option value="Center">{i18next.t('CENTER')}</option>
										<option value="Right"> {i18next.t('RIGHT')} </option>
									</select>
								</div>
							</div>

							<div className="settings-line">
								<label className="col-xs-4 control-label" title={i18next.t('VIDEO_POSITION_Y_TOOLTIP')}>
									{i18next.t('VIDEO_POSITION_Y')}
									&nbsp;
									<i className="far fa-question-circle" />
								</label>
								<div className="col-xs-6">
									<select
										id="Player.PIP.PositionY"
										onChange={this.onChange}
										value={this.state.config['Player.PIP.PositionY']}
									>
										<option value="Bottom"> {i18next.t('BOTTOM')} </option>
										<option value="Center">{i18next.t('CENTER')}</option>
										<option value="Top"> {i18next.t('TOP')} </option>
									</select>
								</div>
							</div>
						</div> : null}
					<div className="settings-line">
						<label className="col-xs-4 control-label" title={i18next.t('WINDOWBORDERS_TOOLTIP')}>
							{i18next.t('WINDOWBORDERS')}
            				&nbsp;
  							<i className="far fa-question-circle" />
						</label>
						<div className="col-xs-6">
							<Switch idInput="Player.Borders" handleChange={this.putPlayerCommando}
								isChecked={this.state.config['Player.Borders']} nameCommand="toggleBorders" />
						</div>
					</div>
					<div className="settings-line">
						<label className="col-xs-4 control-label">
							{i18next.t('MONITOR_NUMBER')}
						</label>
						<div className="col-xs-6">
							<select
								id="Player.Screen"
								onChange={this.onChange}
								value={this.state.config['Player.Screen']}
							>
								{listdisplays}
							</select>
						</div>
					</div>
					<div className="settings-line">
						<label className="col-xs-4 control-label" title={i18next.t('PLAYERMONITOR_TOOLTIP')}>
							{i18next.t('PLAYERMONITOR')}
							&nbsp;
							<i className="far fa-question-circle" />
						</label>
						<div className="col-xs-6">
							<Switch idInput="Player.Monitor" handleChange={this.onChange}
								isChecked={this.state.config['Player.Monitor']} />
						</div>
					</div>
					<div className="settings-line subCategoryGroupPanel">
						{i18next.t('SETTINGS.PLAYER.DISPLAY_SETTINGS')}
					</div>
					<div className="settings-line">
						<label className="col-xs-4 control-label">
							{i18next.t('ENGINEDISPLAYCONNECTIONINFO')}
						</label>
						<div className="col-xs-6">
							<Switch idInput="Karaoke.Display.ConnectionInfo.Enabled" handleChange={this.onChange}
								isChecked={this.state.config['Karaoke.Display.ConnectionInfo.Enabled']} />
						</div>
					</div>

					{this.state.config['Karaoke.Display.ConnectionInfo.Enabled'] ? (
						<div
							id="connexionInfoSettings"
							className="settingsGroupPanel"
						>
							<div className="settings-line">
								<label className="col-xs-4 control-label" title={i18next.t('ENGINEDISPLAYCONNECTIONINFOHOST_TOOLTIP')}>
									{i18next.t('ENGINEDISPLAYCONNECTIONINFOHOST')}
                					&nbsp;
									<i className="far fa-question-circle" />
								</label>
								<div className="col-xs-6">
									<input
										className="form-control"
										id="Karaoke.Display.ConnectionInfo.Host"
										onChange={this.onChange}
										value={this.state.config['Karaoke.Display.ConnectionInfo.Host']}
									/>
								</div>
							</div>

							<div className="settings-line">
								<label className="col-xs-4 control-label" title={i18next.t('ENGINEDISPLAYCONNECTIONINFOMESSAGE_TOOLTIP')}>
									{i18next.t('ENGINEDISPLAYCONNECTIONINFOMESSAGE')}
                					&nbsp;
  									<i className="far fa-question-circle" />
								</label>
								<div className="col-xs-6">
									<input
										className="form-control"
										id="Karaoke.Display.ConnectionInfo.Message"
										onChange={this.onChange}
										value={this.state.config['Karaoke.Display.ConnectionInfo.Message']}
									/>
								</div>
							</div>
						</div>
					) : null}

					<div className="settings-line">
						<label className="col-xs-4 control-label" title={i18next.t('ENGINEDISPLAYNICKNAME_TOOLTIP')}>
							{i18next.t('ENGINEDISPLAYNICKNAME')}
							&nbsp;
  							<i className="far fa-question-circle" />
						</label>
						<div className="col-xs-6">
							<Switch idInput="Karaoke.Display.Nickname" handleChange={this.onChange}
								isChecked={this.state.config['Karaoke.Display.Nickname']} />
						</div>
					</div>

					<div className="settings-line">
						<label className="col-xs-4 control-label">
							{i18next.t('ENGINEDISPLAYAVATAR')}
						</label>
						<div className="col-xs-6">
							<Switch idInput="Karaoke.Display.Avatar" handleChange={this.onChange}
								isChecked={this.state.config['Karaoke.Display.Avatar']} />
						</div>
					</div>
				</React.Fragment> : null
		);
	}
}

export default PlayerOptions;
