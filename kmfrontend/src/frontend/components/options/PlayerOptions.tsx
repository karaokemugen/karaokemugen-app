import i18next from 'i18next';
import { useContext, useEffect, useMemo, useState } from 'react';

import GlobalContext from '../../../store/context';
import { getLanguagesInLangFromCode, languagesSupport } from '../../../utils/isoLanguages';
import { commandBackend } from '../../../utils/socket';
import { dotify } from '../../../utils/tools';
import Switch from '../generic/Switch';

interface IProps {
	onChange: (e: any) => void;
}

function PlayerOptions(props: IProps) {
	const context = useContext(GlobalContext);
	const [config, setConfig] = useState(dotify(context.globalState.settings.data.config));
	const [displays, setDisplays] = useState([]);
	const [audioDevices, setAudioDevices] = useState<string[][]>([]);

	const getDisplays = async () => {
		const res = await commandBackend('getDisplays');
		setDisplays(res);
	};

	const getAudioDevices = async () => {
		const res = await commandBackend('getAudioDevices');
		setAudioDevices(res);
	};

	const putPlayerCommando = (e: any) => {
		let value =
			e.target.type === 'checkbox'
				? e.target.checked
				: Number(e.target.value) && !e.target.value.includes('.')
				? Number(e.target.value)
				: e.target.value;
		if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}
		config[e.target.id] = value;
		commandBackend('sendPlayerCommand', {
			command: e.target.getAttribute('data-namecommand'),
			options: value,
		}).catch(() => {});
		props.onChange(e);
	};

	const onChange = (e: any) => {
		let value =
			e.target.type === 'checkbox'
				? e.target.checked
				: Number(e.target.value) && !e.target.value.includes('.')
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

	useEffect(() => {
		getDisplays();
		getAudioDevices();
	}, []);

	if (config['Player.Display.ConnectionInfo.Host'] === null) config['Player.Display.ConnectionInfo.Host'] = '';
	const listAudio = useMemo(
		() =>
			audioDevices?.map((device) => (
				// First element is the internal value, second is the correct label
				<option key={device[0]} value={device[0]}>
					&nbsp;
					{device[1]}
				</option>
			)),
		[audioDevices]
	);
	const listdisplays = useMemo(
		() =>
			displays?.map((display: any, index: number) => (
				<option key={index} value={index}>
					&nbsp;
					{index + 1} - ({display.resolutionX}x{display.resolutionY}) {display.model}
				</option>
			)),
		[displays]
	);
	return config ? (
		<>
			<div className="settings-line subCategoryGroupPanel">{i18next.t('SETTINGS.PLAYER.WINDOW_SETTINGS')}</div>
			<div className="settings-line">
				<label htmlFor="Player.StayOnTop">
					<span className="title">{i18next.t('SETTINGS.PLAYER.ALWAYS_ON_TOP')}</span>
					<br />
					<span className="tooltip">{i18next.t('SETTINGS.PLAYER.ALWAYS_ON_TOP_TOOLTIP')}</span>
				</label>
				<div>
					<Switch
						idInput="Player.StayOnTop"
						handleChange={putPlayerCommando}
						isChecked={config['Player.StayOnTop']}
						nameCommand="toggleAlwaysOnTop"
					/>
				</div>
			</div>
			<div className="settings-line">
				<label htmlFor="Player.FullScreen">
					<span className="title">{i18next.t('SETTINGS.PLAYER.FULLSCREEN')}</span>
					<br />
					<span className="tooltip">{i18next.t('SETTINGS.PLAYER.FULLSCREEN_TOOLTIP')}</span>
				</label>
				<div>
					<Switch
						idInput="Player.FullScreen"
						handleChange={putPlayerCommando}
						isChecked={config['Player.FullScreen']}
						nameCommand="toggleFullscreen"
					/>
				</div>
			</div>
			{!config['Player.FullScreen'] ? (
				<div id="pipSettings" className="settingsGroupPanel">
					<div className="settings-line">
						<label htmlFor="Player.PIP.Size">
							<span className="title">{i18next.t('SETTINGS.PLAYER.VIDEO_SIZE')}</span>
							<br />
							<span className="tooltip">{config['Player.PIP.Size']}%</span>
						</label>
						<div>
							<input
								type="range"
								id="Player.PIP.Size"
								onChange={onChange}
								value={config['Player.PIP.Size']}
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
								onChange={onChange}
								value={config['Player.PIP.PositionX']}
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
								onChange={onChange}
								value={config['Player.PIP.PositionY']}
							>
								<option value="Bottom"> {i18next.t('SETTINGS.PLAYER.BOTTOM')} </option>
								<option value="Center">{i18next.t('SETTINGS.PLAYER.CENTER')}</option>
								<option value="Top"> {i18next.t('SETTINGS.PLAYER.TOP')} </option>
							</select>
						</div>
					</div>
				</div>
			) : null}
			<div className="settings-line">
				<label htmlFor="Player.Screen">
					<span className="title">{i18next.t('SETTINGS.PLAYER.MONITOR_NUMBER')}</span>
					<br />
					<span className="tooltip">{i18next.t('SETTINGS.PLAYER.MONITOR_NUMBER_TOOLTIP')}</span>
				</label>
				<div>
					<select id="Player.Screen" onChange={onChange} value={config['Player.Screen']}>
						{listdisplays}
					</select>
				</div>
			</div>
			<div className="settings-line">
				<label htmlFor="Player.AudioDevice">
					<span className="title">{i18next.t('SETTINGS.PLAYER.AUDIO_DEVICE')}</span>
					<br />
					<span className="tooltip">{i18next.t('SETTINGS.PLAYER.AUDIO_DEVICE_TOOLTIP')}</span>
				</label>
				<div>
					<select
						id="Player.AudioDevice"
						onChange={putPlayerCommando}
						data-namecommand="setAudioDevice"
						value={config['Player.AudioDevice']}
					>
						{listAudio}
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
					<Switch
						idInput="Player.Borders"
						handleChange={putPlayerCommando}
						isChecked={config['Player.Borders']}
						nameCommand="toggleBorders"
					/>
				</div>
			</div>
			<div className="settings-line">
				<label htmlFor="Player.Monitor">
					<span className="title">{i18next.t('SETTINGS.PLAYER.PLAYER_MONITOR')}</span>
					<br />
					<span className="tooltip">{i18next.t('SETTINGS.PLAYER.PLAYER_MONITOR_TOOLTIP')}</span>
				</label>
				<div>
					<Switch idInput="Player.Monitor" handleChange={onChange} isChecked={config['Player.Monitor']} />
				</div>
			</div>
			<div className="settings-line subCategoryGroupPanel">{i18next.t('SETTINGS.PLAYER.DISPLAY_SETTINGS')}</div>
			<div className="settings-line">
				<label htmlFor="App.Language">
					<span className="title">{i18next.t('SETTINGS.PLAYER.PLAYER_LANGUAGE')}</span>
				</label>
				<div>
					<select id="App.Language" onChange={onChange} defaultValue={config['App.Language']}>
						{languagesSupport.map((lang) => {
							return (
								<option key={lang} value={lang}>
									{getLanguagesInLangFromCode(lang)}
								</option>
							);
						})}
					</select>
				</div>
			</div>
			<div className="settings-line">
				<label htmlFor="Player.Display.RandomQuotes">
					<span className="title">{i18next.t('SETTINGS.PLAYER.DISPLAY_RANDOMQUOTES')}</span>
					<br />
					<span className="tooltip">{i18next.t('SETTINGS.PLAYER.DISPLAY_RANDOMQUOTES_TOOLTIP')}</span>
				</label>
				<div>
					<Switch
						idInput="Player.Display.RandomQuotes"
						handleChange={onChange}
						isChecked={config['Player.Display.RandomQuotes']}
					/>
				</div>
			</div>
			<div className="settings-line">
				<label htmlFor="Player.Display.ConnectionInfo.Enabled">
					<span className="title">{i18next.t('SETTINGS.PLAYER.DISPLAY_CONNECTION_INFO')}</span>
					<br />
					<span className="tooltip">{i18next.t('SETTINGS.PLAYER.DISPLAY_CONNECTION_INFO_TOOLTIP')}</span>
				</label>
				<div>
					<Switch
						idInput="Player.Display.ConnectionInfo.Enabled"
						handleChange={onChange}
						isChecked={config['Player.Display.ConnectionInfo.Enabled']}
					/>
				</div>
			</div>

			{config['Player.Display.ConnectionInfo.Enabled'] ? (
				<div id="connexionInfoSettings" className="settingsGroupPanel">
					<div className="settings-line">
						<label htmlFor="Player.Display.ConnectionInfo.Host">
							<span className="title">{i18next.t('SETTINGS.PLAYER.DISPLAY_CONNECTION_INFO_HOST')}</span>
							<br />
							<span className="tooltip">
								{i18next.t('SETTINGS.PLAYER.DISPLAY_CONNECTION_INFO_HOST_TOOLTIP')}
							</span>
						</label>
						<div>
							<input
								id="Player.Display.ConnectionInfo.Host"
								onChange={onChange}
								value={config['Player.Display.ConnectionInfo.Host']}
							/>
						</div>
					</div>

					<div className="settings-line">
						<label htmlFor="Player.Display.ConnectionInfo.Message">
							<span className="title">
								{i18next.t('SETTINGS.PLAYER.DISPLAY_CONNECTION_INFO_MESSAGE')}
							</span>
							<br />
							<span className="tooltip">
								{i18next.t('SETTINGS.PLAYER.DISPLAY_CONNECTION_INFO_MESSAGE_TOOLTIP')}
							</span>
						</label>
						<div>
							<input
								id="Player.Display.ConnectionInfo.Message"
								onChange={onChange}
								value={config['Player.Display.ConnectionInfo.Message']}
							/>
						</div>
					</div>
				</div>
			) : null}

			<div className="settings-line">
				<label htmlFor="Player.Display.SongInfo">
					<span className="title">{i18next.t('SETTINGS.PLAYER.DISPLAY_SONGINFO')}</span>
					<br />
					<span className="tooltip">{i18next.t('SETTINGS.PLAYER.DISPLAY_SONGINFO_TOOLTIP')}</span>
				</label>
				<div>
					<Switch
						idInput="Player.Display.SongInfo"
						handleChange={onChange}
						isChecked={config['Player.Display.SongInfo']}
					/>
				</div>
			</div>

			{config['Player.Display.SongInfo'] ? (
				<div id="connexionInfoSettings" className="settingsGroupPanel">
					<div className="settings-line">
						<label htmlFor="Player.Display.Avatar">
							<span className="title">{i18next.t('SETTINGS.PLAYER.DISPLAY_AVATAR')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.PLAYER.DISPLAY_AVATAR_TOOLTIP')}</span>
						</label>
						<div>
							<Switch
								idInput="Player.Display.Avatar"
								handleChange={onChange}
								isChecked={config['Player.Display.Avatar']}
							/>
						</div>
					</div>

					<div className="settings-line">
						<label htmlFor="Player.Display.Nickname">
							<span className="title">{i18next.t('SETTINGS.PLAYER.DISPLAY_NICKNAME')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.PLAYER.DISPLAY_NICKNAME_TOOLTIP')}</span>
						</label>
						<div>
							<Switch
								idInput="Player.Display.Nickname"
								handleChange={onChange}
								isChecked={config['Player.Display.Nickname']}
							/>
						</div>
					</div>
				</div>
			) : null}
		</>
	) : null;
}

export default PlayerOptions;
