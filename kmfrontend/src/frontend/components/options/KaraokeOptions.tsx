import i18next from 'i18next';
import React, { useContext, useEffect, useState } from 'react';

import GlobalContext from '../../../store/context';
import { isElectron, sendIPC } from '../../../utils/electron';
import { commandBackend } from '../../../utils/socket';
import { dotify, expand } from '../../../utils/tools';
import Switch from '../generic/Switch';
import RemoteStatus from './RemoteStatus';

interface IProps {
	onChange: (e: any) => void;
}

function KaraokeOptions(props: IProps) {
	const context = useContext(GlobalContext);
	const [config, setConfig] = useState(dotify(context.globalState.settings.data.config));
	const [mysterySongLabel, setMysterySongLabel] = useState('');

	const addMysterySongLabel = () => {
		if (mysterySongLabel) {
			const mysterySongsLabels = config['Playlist.MysterySongs.Labels'];
			mysterySongsLabels.push(mysterySongLabel);
			config['Playlist.MysterySongs.Labels'] = mysterySongsLabels;
			saveMysterySongsLabels(mysterySongsLabels);
			setMysterySongLabel('');
		}
	};

	const deleteMysterySongLabel = (value: string) => {
		config['Playlist.MysterySongs.Labels'].splice(config['Playlist.MysterySongs.Labels'].indexOf(value), 1, null);
		saveMysterySongsLabels(config['Playlist.MysterySongs.Labels']);
	};

	const saveMysterySongsLabels = (labels: string[]) => {
		const data = expand('Playlist.MysterySongs.Labels', labels);
		commandBackend('updateSettings', { setting: data }).catch(() => {});
	};

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

	return config ? (
		<React.Fragment>
			<div id="nav-karaokeAllMode">
				<div className="settings-line subCategoryGroupPanel">
					{i18next.t('SETTINGS.KARAOKE.QUOTA_SETTINGS')}
				</div>
				<div className="settings-line">
					<label htmlFor="Karaoke.Quota.Type">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.QUOTA_TYPE')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.QUOTA_TYPE_TOOLTIP')}</span>
					</label>
					<div>
						<select id="Karaoke.Quota.Type" onChange={onChange} value={config['Karaoke.Quota.Type']}>
							<option value="0"> {i18next.t('SETTINGS.KARAOKE.QUOTA_TYPE_ZERO')} </option>
							<option value="1"> {i18next.t('SETTINGS.KARAOKE.QUOTA_TYPE_ONE')} </option>
							<option value="2"> {i18next.t('SETTINGS.KARAOKE.QUOTA_TYPE_TWO')} </option>
						</select>
					</div>
				</div>
				{config['Karaoke.Quota.Type'] === 2 ? (
					<div className="settings-line">
						<label htmlFor="Karaoke.Quota.Time">
							<span className="title">{i18next.t('SETTINGS.KARAOKE.TIME_BY_USER')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.TIME_BY_USER_TOOLTIP')}</span>
						</label>
						<div>
							<input
								type="number"
								data-exclude="true"
								id="Karaoke.Quota.Time"
								placeholder="1000"
								onChange={onChange}
								value={config['Karaoke.Quota.Time']}
							/>
						</div>
					</div>
				) : null}

				{config['Karaoke.Quota.Type'] === 1 ? (
					<div className="settings-line">
						<label htmlFor="Karaoke.Quota.Songs">
							<span className="title">{i18next.t('SETTINGS.KARAOKE.SONGS_BY_USER')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.SONGS_BY_USER_TOOLTIP')}</span>
						</label>
						<div>
							<input
								type="number"
								data-exclude="true"
								id="Karaoke.Quota.Songs"
								placeholder="1000"
								onChange={onChange}
								value={config['Karaoke.Quota.Songs']}
							/>
						</div>
					</div>
				) : null}

				{config['Karaoke.Quota.Type'] !== 0 ? (
					<div className="settings-line">
						<label htmlFor="Karaoke.Quota.FreeAutoTime">
							<span className="title">{i18next.t('SETTINGS.KARAOKE.FREE_AUTO_TIME')}</span>
							<br />
							<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.FREE_AUTO_TIME_TOOLTIP')}</span>
						</label>
						<div>
							<input
								type="number"
								data-exclude="true"
								id="Karaoke.Quota.FreeAutoTime"
								placeholder="1000"
								onChange={onChange}
								value={config['Karaoke.Quota.FreeAutoTime']}
							/>
						</div>
					</div>
				) : null}

				<div className="settings-line">
					<label htmlFor="Karaoke.Quota.FreeUpVote">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Karaoke.Quota.FreeUpVote"
							handleChange={onChange}
							isChecked={config['Karaoke.Quota.FreeUpVote']}
						/>
					</div>
				</div>
				{config['Karaoke.Quota.FreeUpVote'] ? (
					<div id="freeUpvotesSettings" className="settingsGroupPanel">
						<div className="settings-line">
							<label htmlFor="Karaoke.Quota.FreeUpVotesRequiredMin">
								<span className="title">{i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES_REQUIREDMIN')}</span>
								<br />
								<span className="tooltip">
									{i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES_REQUIREDMIN_TOOLTIP')}
								</span>
							</label>
							<div>
								<input
									type="number"
									data-exclude="true"
									id="Karaoke.Quota.FreeUpVotesRequiredMin"
									onChange={onChange}
									value={config['Karaoke.Quota.FreeUpVotesRequiredMin']}
								/>
							</div>
						</div>
						<div className="settings-line">
							<label htmlFor="Karaoke.Quota.FreeUpVotesRequiredPercent">
								<span className="title">
									{i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES_REQUIREDPERCENT')}
								</span>
								<br />
								<span className="tooltip">
									{i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES_REQUIREDPERCENT_TOOLTIP')}
								</span>
							</label>
							<div>
								<input
									type="number"
									data-exclude="true"
									id="Karaoke.Quota.FreeUpVotesRequiredPercent"
									onChange={onChange}
									value={config['Karaoke.Quota.FreeUpVotesRequiredPercent']}
								/>
							</div>
						</div>
					</div>
				) : null}

				<div className="settings-line subCategoryGroupPanel">
					{i18next.t('SETTINGS.PLAYLIST.PLAYLIST_SETTINGS')}
				</div>

				<div className="settings-line">
					<label htmlFor="Karaoke.SmartInsert">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.ENABLE_SMARTINSERT')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.ENABLE_SMARTINSERT_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Karaoke.SmartInsert"
							handleChange={onChange}
							isChecked={config['Karaoke.SmartInsert']}
						/>
					</div>
				</div>

				<div className="settings-line">
					<label htmlFor="Karaoke.AutoBalance">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.ENABLE_AUTOBALANCE')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.ENABLE_AUTOBALANCE_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Karaoke.AutoBalance"
							handleChange={onChange}
							isChecked={config['Karaoke.AutoBalance']}
						/>
					</div>
				</div>

				<div className="settings-line">
					<label htmlFor="Karaoke.AutoPlay">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.AUTOPLAY')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.AUTOPLAY_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Karaoke.Autoplay"
							handleChange={onChange}
							isChecked={config['Karaoke.Autoplay']}
						/>
					</div>
				</div>

				<div className="settings-line">
					<label htmlFor="Playlist.EndOfPlaylistAction">
						<span className="title">{i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.NAME')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.TOOLTIP')}</span>
					</label>
					<div>
						<select
							id="Playlist.EndOfPlaylistAction"
							onChange={onChange}
							value={config['Playlist.EndOfPlaylistAction']}
						>
							<option value="none">
								{' '}
								{i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.OPTIONS.NONE')}{' '}
							</option>
							<option value="repeat">
								{' '}
								{i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.OPTIONS.REPEAT')}{' '}
							</option>
							<option value="random">
								{' '}
								{i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.OPTIONS.RANDOM')}{' '}
							</option>
						</select>
					</div>
				</div>

				{config['Playlist.EndOfPlaylistAction'] === 'random' ? (
					<div className="settings-line">
						<label htmlFor="Playlist.RandomSongsAfterEndMessage">
							<span className="title">
								{i18next.t('SETTINGS.KARAOKE.PLAYLIST_RANDOMSONGSAFTERENDMESSAGE')}
							</span>
							<br />
							<span className="tooltip">
								{i18next.t('SETTINGS.KARAOKE.PLAYLIST_RANDOMSONGSAFTERENDMESSAGE_TOOLTIP')}
							</span>
						</label>
						<div>
							<Switch
								idInput="Playlist.RandomSongsAfterEndMessage"
								handleChange={onChange}
								isChecked={config['Playlist.RandomSongsAfterEndMessage']}
							/>
						</div>
					</div>
				) : null}

				<div className="settings-line">
					<label htmlFor="Playlist.AllowDuplicates">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.ALLOW_DUPLICATES')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.ALLOW_DUPLICATES_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Playlist.AllowDuplicates"
							handleChange={onChange}
							isChecked={config['Playlist.AllowDuplicates']}
						/>
					</div>
				</div>

				<div className="settings-line subCategoryGroupPanel">
					{i18next.t('SETTINGS.KARAOKE.MEDIAS_SETTINGS')}
				</div>

				<div className="settings-line">
					<label htmlFor="Playlist.Medias.Jingles.Enabled">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.PLAYLIST_JINGLES_VIDEOS')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.PLAYLIST_JINGLES_VIDEOS_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Playlist.Medias.Jingles.Enabled"
							handleChange={onChange}
							isChecked={config['Playlist.Medias.Jingles.Enabled']}
						/>
						{config['Playlist.Medias.Jingles.Enabled'] ? (
							<React.Fragment>
								<label className="label-input-options">{i18next.t('SETTINGS.KARAOKE.EVERY')}</label>
								<input
									type="number"
									data-exclude="true"
									className="input-number-options"
									id="Playlist.Medias.Jingles.Interval"
									placeholder="20"
									onChange={onChange}
									value={config['Playlist.Medias.Jingles.Interval']}
								/>
								<label className="label-input-options">{i18next.t('SETTINGS.KARAOKE.SONGS')}</label>
							</React.Fragment>
						) : null}
					</div>
				</div>
				<div className="settings-line">
					<label htmlFor="Playlist.Medias.Sponsors.Enabled">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.PLAYLIST_SPONSORS_VIDEOS')}</span>
						<br />
						<span className="tooltip">
							{i18next.t('SETTINGS.KARAOKE.PLAYLIST_SPONSORS_VIDEOS_TOOLTIP')}
						</span>
					</label>
					<div>
						<Switch
							idInput="Playlist.Medias.Sponsors.Enabled"
							handleChange={onChange}
							isChecked={config['Playlist.Medias.Sponsors.Enabled']}
						/>
						{config['Playlist.Medias.Sponsors.Enabled'] ? (
							<React.Fragment>
								<label className="label-input-options">{i18next.t('SETTINGS.KARAOKE.EVERY')}</label>
								<input
									type="number"
									data-exclude="true"
									className="input-number-options"
									id="Playlist.Medias.Sponsors.Interval"
									placeholder="50"
									onChange={onChange}
									value={config['Playlist.Medias.Sponsors.Interval']}
								/>
								<label className="label-input-options">{i18next.t('SETTINGS.KARAOKE.SONGS')}</label>
							</React.Fragment>
						) : null}
					</div>
				</div>

				<div className="settings-line">
					<label htmlFor="Playlist.Medias.Intros.Enabled">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.PLAYLIST_INTRO_VIDEOS')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.PLAYLIST_INTRO_VIDEOS_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Playlist.Medias.Intros.Enabled"
							handleChange={onChange}
							isChecked={config['Playlist.Medias.Intros.Enabled']}
						/>
						{config['Playlist.Medias.Intros.Enabled'] ? (
							<React.Fragment>
								<label className="label-input-options">{i18next.t('SETTINGS.KARAOKE.WITH')}</label>
								<input
									className="input-options"
									id="Playlist.Medias.Intros.Message"
									onChange={onChange}
									value={config['Playlist.Medias.Intros.Message'] || ''}
								/>
								<label className="label-input-options">{i18next.t('SETTINGS.KARAOKE.MESSAGE')}</label>
							</React.Fragment>
						) : null}
					</div>
				</div>

				<div className="settings-line">
					<label htmlFor="Playlist.Medias.Outros.Enabled">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.PLAYLIST_OUTRO_VIDEOS')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.PLAYLIST_OUTRO_VIDEOS_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Playlist.Medias.Outros.Enabled"
							handleChange={onChange}
							isChecked={config['Playlist.Medias.Outros.Enabled']}
						/>
						{config['Playlist.Medias.Outros.Enabled'] ? (
							<React.Fragment>
								<label className="label-input-options">{i18next.t('SETTINGS.KARAOKE.WITH')}</label>
								<input
									className="input-options"
									id="Playlist.Medias.Outros.Message"
									onChange={onChange}
									value={config['Playlist.Medias.Outros.Message'] || ''}
								/>
								<label className="label-input-options">{i18next.t('SETTINGS.KARAOKE.MESSAGE')}</label>
							</React.Fragment>
						) : null}
					</div>
				</div>
				<div className="settings-line">
					<label htmlFor="Playlist.Medias.Encores.Enabled">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.PLAYLIST_ENCORES_VIDEOS')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.PLAYLIST_ENCORES_VIDEOS_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Playlist.Medias.Encores.Enabled"
							handleChange={onChange}
							isChecked={config['Playlist.Medias.Encores.Enabled']}
						/>
						{config['Playlist.Medias.Encores.Enabled'] ? (
							<React.Fragment>
								<label className="label-input-options">{i18next.t('SETTINGS.KARAOKE.WITH')}</label>
								<input
									className="input-options"
									id="Playlist.Medias.Encores.Message"
									onChange={onChange}
									value={config['Playlist.Medias.Encores.Message'] || ''}
								/>
								<label className="label-input-options">{i18next.t('SETTINGS.KARAOKE.MESSAGE')}</label>
							</React.Fragment>
						) : null}
					</div>
				</div>

				<div className="settings-line subCategoryGroupPanel">
					{i18next.t('SETTINGS.KARAOKE.SESSION_SETTINGS')}
				</div>

				<div className="settings-line">
					<label htmlFor="Karaoke.ClassicMode">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.CLASSIC_MODE')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.CLASSIC_MODE_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Karaoke.ClassicMode"
							handleChange={onChange}
							isChecked={config['Karaoke.ClassicMode']}
							disabled={config['Karaoke.StreamerMode.Enabled']}
						/>
					</div>
				</div>
				<div className="settings-line">
					<label htmlFor="Karaoke.StreamerMode.Enabled">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.STREAM_MODE')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.STREAM_MODE_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Karaoke.StreamerMode.Enabled"
							handleChange={onChange}
							isChecked={config['Karaoke.StreamerMode.Enabled']}
							disabled={config['Karaoke.ClassicMode']}
						/>
					</div>
				</div>
				{config['Karaoke.StreamerMode.Enabled'] ? (
					<div id="streamSettings" className="settingsGroupPanel">
						<div className="settings-line">
							<p>
								{i18next.t('SETTINGS.KARAOKE.STREAMER_MODE_LABEL')}&nbsp;
								{isElectron() ? (
									<a
										href="#"
										onClick={(e) => {
											e.preventDefault();
											sendIPC('openFolder', { type: 'streamFiles' });
										}}
									>
										{i18next.t('SETTINGS.KARAOKE.OPEN_STREAMER_FILES')}
									</a>
								) : null}
							</p>
						</div>
						<div className="settings-line">
							<label htmlFor="Karaoke.StreamerMode.PauseDuration">
								<span className="title">{i18next.t('SETTINGS.KARAOKE.STREAM_PAUSE_DURATION')}</span>
								<br />
								<span className="tooltip">
									{i18next.t('SETTINGS.KARAOKE.STREAM_PAUSE_DURATION_TOOLTIP')}
								</span>
							</label>
							<div>
								<input
									type="number"
									data-exclude="true"
									id="Karaoke.StreamerMode.PauseDuration"
									placeholder="20"
									onChange={onChange}
									value={config['Karaoke.StreamerMode.PauseDuration']}
								/>
							</div>
						</div>
						<div className="settings-line">
							<label htmlFor="Karaoke.StreamerMode.Twitch.Enabled">
								<span className="title">{i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH')}</span>
								<br />
								<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH_TOOLTIP')}</span>
							</label>
							<div>
								<Switch
									idInput="Karaoke.StreamerMode.Twitch.Enabled"
									handleChange={onChange}
									isChecked={config['Karaoke.StreamerMode.Twitch.Enabled']}
								/>
							</div>
						</div>
						{config['Karaoke.StreamerMode.Twitch.Enabled'] ? (
							<div id="twitchSettings" className="settingsGroupPanel">
								<div className="settings-line">
									<a href="https://twitchapps.com/tmi/">
										{i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH_OAUTH_TOKEN_GET')}
									</a>
								</div>
								<div className="settings-line">
									<label htmlFor="Karaoke.StreamerMode.Twitch.OAuth">
										<span className="title">
											{i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH_OAUTH_TOKEN')}
										</span>
									</label>
									<div>
										<input
											type="password"
											data-exclude="true"
											id="Karaoke.StreamerMode.Twitch.OAuth"
											onChange={onChange}
											value={config['Karaoke.StreamerMode.Twitch.OAuth']}
										/>
									</div>
								</div>
								<div className="settings-line">
									<label htmlFor="Karaoke.StreamerMode.Twitch.Channel">
										<span className="title">
											{i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH_CHANNEL')}
										</span>
									</label>
									<div>
										<input
											id="Karaoke.StreamerMode.Twitch.Channel"
											onChange={onChange}
											value={config['Karaoke.StreamerMode.Twitch.Channel']}
										/>
									</div>
								</div>
							</div>
						) : null}
					</div>
				) : null}

				<div className="settings-line">
					<label htmlFor="Karaoke.MinutesBeforeSessionEndsWarning">
						<span className="title">
							{i18next.t('SETTINGS.KARAOKE.MINUTES_BEFORE_SESSION_ENDS_WARNING')}
						</span>
						<br />
						<span className="tooltip">
							{i18next.t('SETTINGS.KARAOKE.MINUTES_BEFORE_SESSION_ENDS_WARNING_TOOLTIP')}
						</span>
					</label>
					<div>
						<input
							type="number"
							data-exclude="true"
							id="Karaoke.MinutesBeforeSessionEndsWarning"
							placeholder="15"
							onChange={onChange}
							value={config['Karaoke.MinutesBeforeSessionEndsWarning']}
						/>
					</div>
				</div>
				<div className="settings-line">
					<label htmlFor="Karaoke.Poll.Enabled">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.SONGPOLL')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.SONGPOLL_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Karaoke.Poll.Enabled"
							handleChange={onChange}
							isChecked={config['Karaoke.Poll.Enabled']}
						/>
					</div>
				</div>

				{config['Karaoke.Poll.Enabled'] ? (
					<div id="songPollSettings" className="settingsGroupPanel">
						<div className="settings-line">
							<label htmlFor="Karaoke.Poll.Choices">
								<span className="title">{i18next.t('SETTINGS.KARAOKE.SONGPOLLCHOICES')}</span>
								<br />
								<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.SONGPOLLCHOICES_TOOLTIP')}</span>
							</label>
							<div>
								<input
									type="number"
									data-exclude="true"
									id="Karaoke.Poll.Choices"
									onChange={onChange}
									value={config['Karaoke.Poll.Choices']}
								/>
							</div>
						</div>
						<div className="settings-line">
							<label htmlFor="Karaoke.Poll.Choices">
								<span className="title">{i18next.t('SETTINGS.KARAOKE.SONGPOLLTIMEOUT')}</span>
								<br />
								<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.SONGPOLLTIMEOUT_TOOLTIP')}</span>
							</label>
							<div>
								<input
									type="number"
									data-exclude="true"
									id="Karaoke.Poll.Timeout"
									onChange={onChange}
									value={config['Karaoke.Poll.Timeout']}
								/>
							</div>
						</div>
					</div>
				) : null}

				<div className="settings-line subCategoryGroupPanel">
					{i18next.t('SETTINGS.KARAOKE.ONLINE_SETTINGS')}
				</div>

				<div className="settings-line">
					<label htmlFor="Online.FetchPopularSongs">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.FETCH_POPULAR_SONGS')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.FETCH_POPULAR_SONGS_TOOLTIP')}</span>
					</label>
					<div>
						<Switch
							idInput="Online.FetchPopularSongs"
							handleChange={onChange}
							isChecked={config['Online.FetchPopularSongs']}
						/>
					</div>
				</div>

				<div className="settings-line">
					<label htmlFor="Online.Remote">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.REMOTE')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.REMOTE_TOOLTIP')}</span>
					</label>
					<div>
						<Switch idInput="Online.Remote" handleChange={onChange} isChecked={config['Online.Remote']} />
					</div>
				</div>

				{config['Online.Remote'] ? <RemoteStatus /> : null}

				<div className="settings-line subCategoryGroupPanel">
					{i18next.t('SETTINGS.KARAOKE.MYSTERY_SONG_SETTINGS')}
				</div>

				<div className="settings-line">
					<label htmlFor="Playlist.MysterySongs.Hide">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.HIDE_INVISIBLE_SONGS')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.HIDE_INVISIBLE_SONGS_TOOLTIP')}</span>
					</label>
					<div>
						<select
							id="Playlist.MysterySongs.Hide"
							onChange={onChange}
							value={config['Playlist.MysterySongs.Hide']}
						>
							<option value="true">
								{' '}
								{i18next.t('SETTINGS.KARAOKE.HIDE_INVISIBLE_SONGS_HIDDEN_OPTION')}{' '}
							</option>
							<option value="false">
								{i18next.t('SETTINGS.KARAOKE.HIDE_INVISIBLE_SONGS_VISIBLE_OPTION')}
							</option>
						</select>
					</div>
				</div>

				<div className="settings-line">
					<label htmlFor="Playlist.MysterySongs.AddedSongVisibilityAdmin">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN')}</span>
						<br />
						<span className="tooltip">
							{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_TOOLTIP')}
						</span>
					</label>
					<div>
						<select
							id="Playlist.MysterySongs.AddedSongVisibilityAdmin"
							onChange={onChange}
							value={config['Playlist.MysterySongs.AddedSongVisibilityAdmin']}
						>
							<option value="false">
								{' '}
								{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_MYSTERY_OPTION')}{' '}
							</option>
							<option value="true">
								{' '}
								{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_NORMAL_OPTION')}{' '}
							</option>
						</select>
					</div>
				</div>

				<div className="settings-line">
					<label htmlFor="Playlist.MysterySongs.AddedSongVisibilityPublic">
						<span className="title">{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_PUBLIC')}</span>
						<br />
						<span className="tooltip">
							{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_PUBLIC_TOOLTIP')}
						</span>
					</label>
					<div>
						<select
							id="Playlist.MysterySongs.AddedSongVisibilityPublic"
							onChange={onChange}
							value={config['Playlist.MysterySongs.AddedSongVisibilityPublic']}
						>
							<option value="false">
								{' '}
								{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_MYSTERY_OPTION')}{' '}
							</option>
							<option value="true">
								{' '}
								{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_NORMAL_OPTION')}{' '}
							</option>
						</select>
					</div>
				</div>

				<div className="settings-line">
					<label>
						<span className="title">{i18next.t('SETTINGS.KARAOKE.LABELS_MYSTERY_SONGS')}</span>
						<br />
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.LABELS_MYSTERY_SONGS_TOOLTIP')}</span>
					</label>
					<div className="mysterySongs">
						{config['Playlist.MysterySongs.Labels']?.map((value: string) => {
							return (
								<div key={value}>
									<label>{value}</label>
									{config['Playlist.MysterySongs.Labels'].length > 1 ? (
										<button
											type="button"
											className="btn btn-default"
											onClick={() => deleteMysterySongLabel(value)}
										>
											{i18next.t('SETTINGS.KARAOKE.LABELS_MYSTERY_SONGS_DELETE')}
										</button>
									) : null}
								</div>
							);
						})}
						<div>
							<input value={mysterySongLabel} onChange={(e) => setMysterySongLabel(e.target.value)} />
							<button type="button" className="btn btn-default" onClick={addMysterySongLabel}>
								{i18next.t('SETTINGS.KARAOKE.LABELS_MYSTERY_SONGS_ADD')}
							</button>
						</div>
					</div>
				</div>
			</div>
		</React.Fragment>
	) : null;
}

export default KaraokeOptions;
