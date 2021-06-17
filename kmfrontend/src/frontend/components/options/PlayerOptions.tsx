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
		}).catch(() => {});
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
						<label htmlFor="Player.StayOnTop">
							<span className="title">{i18next.t('SETTINGS.PLAYER.ALWAYS_ON_TOP')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.PLAYER.ALWAYS_ON_TOP_TOOLTIP')}</span>
						</label>
						<div>
							<Switch idInput="Player.StayOnTop" handleChange={this.putPlayerCommando}
								isChecked={this.state.config['Player.StayOnTop']} nameCommand="toggleAlwaysOnTop" />
						</div>
					</div>
					<div className="settings-line">
						<label htmlFor="Player.FullScreen">
							<span className="title">{i18next.t('SETTINGS.PLAYER.FULLSCREEN')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.PLAYER.FULLSCREEN_TOOLTIP')}</span>
						</label>
						<div>
							<Switch idInput="Player.FullScreen" handleChange={this.putPlayerCommando}
								isChecked={this.state.config['Player.FullScreen']} nameCommand="toggleFullscreen" />
						</div>
					</div>
					{!this.state.config['Player.FullScreen'] ?
						<div id="pipSettings" className="settingsGroupPanel">
							<div className="settings-line">
								<label htmlFor="Player.PIP.Size">
									<span className="title">{i18next.t('SETTINGS.PLAYER.VIDEO_SIZE')}</span>
									<br />
									<span className="tooltip">{this.state.config['Player.PIP.Size']}%</span>
								</label>
								<div>
									<input
										type="range"
										id="Player.PIP.Size"
										onChange={this.onChange}
										value={this.state.config['Player.PIP.Size']}
									/>
								</div>
							</div>

							<div className="settings-line">
								<label htmlFor="Player.PIP.PositionX">
									<span className="title">{i18next.t('SETTINGS.PLAYER.VIDEO_POSITION_X')}</span>
									<br />
									<span className="tooltip">{i18next.t('SETTINGS.PLAYER.VIDEO_POSITION_X_TOOLTIP')}</span>
								</label>
								<div>
									<select
										id="Player.PIP.PositionX"
										onChange={this.onChange}
										value={this.state.config['Player.PIP.PositionX']}
									>
										<option value="Left"> {i18next.t('SETTINGS.PLAYER.LEFT')} </option>
										<option value="Center">{i18next.t('SETTINGS.PLAYER.CENTER')}</option>
										<option value="Right"> {i18next.t('SETTINGS.PLAYER.RIGHT')} </option>
									</select>
								</div>
							</div>

							<div className="settings-line">
								<label htmlFor="Player.PIP.PositionY">
									<span className="title">{i18next.t('SETTINGS.PLAYER.VIDEO_POSITION_Y')}</span>
									<br />
									<span className="tooltip">{i18next.t('SETTINGS.PLAYER.VIDEO_POSITION_Y_TOOLTIP')}</span>
								</label>
								<div>
									<select
										id="Player.PIP.PositionY"
										onChange={this.onChange}
										value={this.state.config['Player.PIP.PositionY']}
									>
										<option value="Bottom"> {i18next.t('SETTINGS.PLAYER.BOTTOM')} </option>
										<option value="Center">{i18next.t('SETTINGS.PLAYER.CENTER')}</option>
										<option value="Top"> {i18next.t('SETTINGS.PLAYER.TOP')} </option>
									</select>
								</div>
							</div>
						</div> : null}
					<div className="settings-line">
						<label htmlFor="Player.Screen">
							<span className="title">{i18next.t('SETTINGS.PLAYER.MONITOR_NUMBER')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.PLAYER.MONITOR_NUMBER_TOOLTIP')}</span>
						</label>
						<div>
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
						<label htmlFor="Player.Borders">
							<span className="title">{i18next.t('SETTINGS.PLAYER.WINDOWBORDERS')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.PLAYER.WINDOWBORDERS_TOOLTIP')}</span>
						</label>
						<div>
							<Switch idInput="Player.Borders" handleChange={this.putPlayerCommando}
								isChecked={this.state.config['Player.Borders']} nameCommand="toggleBorders" />
						</div>
					</div>
					<div className="settings-line">
						<label htmlFor="Player.Monitor">
							<span className="title">{i18next.t('SETTINGS.PLAYER.PLAYER_MONITOR')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.PLAYER.PLAYER_MONITOR_TOOLTIP')}</span>
						</label>
						<div>
							<Switch idInput="Player.Monitor" handleChange={this.onChange}
								isChecked={this.state.config['Player.Monitor']} />
						</div>
					</div>
					<div className="settings-line subCategoryGroupPanel">
						{i18next.t('SETTINGS.PLAYER.DISPLAY_SETTINGS')}
					</div>
					<div className="settings-line">
						<label htmlFor="Karaoke.Display.ConnectionInfo.Enabled">
							<span className="title">{i18next.t('SETTINGS.PLAYER.DISPLAY_CONNECTION_INFO')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.PLAYER.DISPLAY_CONNECTION_INFO_TOOLTIP')}</span>
						</label>
						<div>
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
								<label htmlFor="Karaoke.Display.ConnectionInfo.Host">
									<span className="title">{i18next.t('SETTINGS.PLAYER.DISPLAY_CONNECTION_INFO_HOST')}</span>
									<br />
									<span className="tooltip">{i18next.t('SETTINGS.PLAYER.DISPLAY_CONNECTION_INFO_HOST_TOOLTIP')}</span>
								</label>
								<div>
									<input
										id="Karaoke.Display.ConnectionInfo.Host"
										onChange={this.onChange}
										value={this.state.config['Karaoke.Display.ConnectionInfo.Host']}
									/>
								</div>
							</div>

							<div className="settings-line">
								<label htmlFor="Karaoke.Display.ConnectionInfo.Message">
									<span className="title">{i18next.t('SETTINGS.PLAYER.DISPLAY_CONNECTION_INFO_MESSAGE')}</span>
									<br />
									<span className="tooltip">{i18next.t('SETTINGS.PLAYER.DISPLAY_CONNECTION_INFO_MESSAGE_TOOLTIP')}</span>
								</label>
								<div>
									<input
										id="Karaoke.Display.ConnectionInfo.Message"
										onChange={this.onChange}
										value={this.state.config['Karaoke.Display.ConnectionInfo.Message']}
									/>
								</div>
							</div>
						</div>
					) : null}

					<div className="settings-line">
						<label htmlFor="Karaoke.Display.Nickname">
							<span className="title">{i18next.t('SETTINGS.PLAYER.DISPLAY_NICKNAME')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.PLAYER.DISPLAY_NICKNAME_TOOLTIP')}</span>
						</label>
						<div>
							<Switch idInput="Karaoke.Display.Nickname" handleChange={this.onChange}
								isChecked={this.state.config['Karaoke.Display.Nickname']} />
						</div>
					</div>

					<div className="settings-line">
						<label htmlFor="Karaoke.Display.Avatar">
							<span className="title">{i18next.t('SETTINGS.PLAYER.DISPLAY_AVATAR')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.PLAYER.DISPLAY_AVATAR_TOOLTIP')}</span>
						</label>
						<div>
							<Switch idInput="Karaoke.Display.Avatar" handleChange={this.onChange}
								isChecked={this.state.config['Karaoke.Display.Avatar']} />
						</div>
					</div>
				</React.Fragment> : null
		);
	}
}

export default PlayerOptions;
