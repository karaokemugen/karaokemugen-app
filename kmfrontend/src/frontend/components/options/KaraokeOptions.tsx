import i18next from 'i18next';
import React, { Component } from 'react';

import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { dotify, expand } from '../../../utils/tools';
import Switch from '../generic/Switch';

interface IProps {
	onChange: (e: any) => void;
}

interface IState {
	config?: any;
	mysterySongLabel: string;
}
class KaraokeOptions extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			mysterySongLabel: ''
		};
	}

	componentDidMount() {
		this.setState({ config: dotify(this.context.globalState.settings.data.config) });
	}

	addMysterySongLabel = () => {
		const mysterySongsLabels = this.state.config['Playlist.MysterySongs.Labels'];
		mysterySongsLabels.push(this.state.mysterySongLabel);
		const config = this.state.config;
		config['Playlist.MysterySongs.Labels'] = mysterySongsLabels;
		this.setState({ config: config });
		this.saveMysterySongsLabels(mysterySongsLabels);
		this.setState({ mysterySongLabel: '' });
	};

	deleteMysterySongLabel = (value: string) => {
		const config = this.state.config;
		config['Playlist.MysterySongs.Labels'].splice(
			config['Playlist.MysterySongs.Labels'].indexOf(value), 1, null);
		this.saveMysterySongsLabels(config['Playlist.MysterySongs.Labels']);
		config['Playlist.MysterySongs.Labels'].splice(
			config['Playlist.MysterySongs.Labels'].indexOf(null), 1);
		this.setState({ config: config });
	};

	saveMysterySongsLabels = (labels: Array<string>) => {
		const data = expand('Playlist.MysterySongs.Labels', labels);
		commandBackend('updateSettings', { setting: data });
	};

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
					<div id="nav-karaokeAllMode">
						<div className="settings-line">
							<label className="col-xs-4 control-label" title={i18next.t('QUOTA_TYPE_TOOLTIP')}>
								{i18next.t('QUOTA_TYPE')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
							</label>
							<div className="col-xs-6">
								<select
									id="Karaoke.Quota.Type"
									onChange={this.onChange}
									value={this.state.config['Karaoke.Quota.Type']}
								>
									<option value="0"> {i18next.t('QUOTA_TYPE_0')} </option>
									<option value="1"> {i18next.t('QUOTA_TYPE_1')} </option>
									<option value="2"> {i18next.t('QUOTA_TYPE_2')} </option>
								</select>
							</div>
						</div>
						{this.state.config['Karaoke.Quota.Type'] === 2 ?
							<div className="settings-line">
								<label className="col-xs-4 control-label">
									{i18next.t('TIME_BY_USER')}
								</label>
								<div className="col-xs-6">
									<input
										type="number"
										className="form-control"
										id="Karaoke.Quota.Time"
										placeholder="1000"
										onChange={this.onChange}
										value={this.state.config['Karaoke.Quota.Time']}
									/>
								</div>
							</div> : null}

						{this.state.config['Karaoke.Quota.Type'] === 1 ?
							<div className="settings-line">
								<label className="col-xs-4 control-label" title={i18next.t('SONGS_BY_USER_TOOLTIP')}>
									{i18next.t('SONGS_BY_USER')}
                &nbsp;
  							<i className="far fa-question-circle"></i>
								</label>
								<div className="col-xs-6">
									<input
										type="number"
										className="form-control"
										id="Karaoke.Quota.Songs"
										placeholder="1000"
										onChange={this.onChange}
										value={this.state.config['Karaoke.Quota.Songs']}
									/>
								</div>
							</div> : null}

						{this.state.config['Karaoke.Quota.Type'] !== 0 ?
							<div className="settings-line">
								<label className="col-xs-4 control-label" title={i18next.t('FREE_AUTO_TIME_TOOLTIP')}>
									{i18next.t('FREE_AUTO_TIME')}
                &nbsp;
  							<i className="far fa-question-circle"></i>
								</label>
								<div className="col-xs-6">
									<input
										type="number"
										className="form-control"
										id="Karaoke.Quota.FreeAutoTime"
										placeholder="1000"
										onChange={this.onChange}
										value={this.state.config['Karaoke.Quota.FreeAutoTime']}
									/>
								</div>
							</div> : null
						}



						<div className="settings-line">
							<label className="col-xs-4 control-label" title={i18next.t('ENGINEENABLESMARTINSERT_TOOLTIP')}>
								{i18next.t('ENGINEENABLESMARTINSERT')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
							</label>
							<div className="col-xs-6">
								<Switch idInput="Karaoke.SmartInsert" handleChange={this.onChange}
									isChecked={this.state.config['Karaoke.SmartInsert']} />
							</div>
						</div>

						<div className="settings-line">
							<label className="col-xs-4 control-label" title={i18next.t('ENGINEAUTOPLAY_TOOLTIP')}>
								{i18next.t('ENGINEAUTOPLAY')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
							</label>
							<div className="col-xs-6">
								<Switch idInput="Karaoke.Autoplay" handleChange={this.onChange}
									isChecked={this.state.config['Karaoke.Autoplay']} />
							</div>
						</div>

						<div className="settings-line">
							<label className="col-xs-4 control-label" title={i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.TOOLTIP')}>
								{i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.NAME')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
							</label>
							<div className="col-xs-6">
								<select
									id="Playlist.EndOfPlaylistAction"
									onChange={this.onChange}
									value={this.state.config['Playlist.EndOfPlaylistAction']}
								>
									<option value="none"> {i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.OPTIONS.NONE')} </option>
									<option value="repeat"> {i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.OPTIONS.REPEAT')} </option>
									<option value="random"> {i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.OPTIONS.RANDOM')} </option>
								</select>
							</div>
						</div>

						{this.state.config['Playlist.EndOfPlaylistAction'] === 'random' ?
							<div className="settings-line">
								<label className="col-xs-4 control-label">
									{i18next.t('SETTINGS.KARAOKE.PLAYLIST_RANDOMSONGSAFTERENDMESSAGE')}
								</label>
								<div className="col-xs-6">
									<Switch idInput="Playlist.RandomSongsAfterEndMessage" handleChange={this.onChange}
										isChecked={this.state.config['Playlist.RandomSongsAfterEndMessage']} />
								</div>
							</div> : null}

						<div className="settings-line">
							<label className="col-xs-4 control-label">
								{i18next.t('ENGINEALLOWDUPLICATES')}
							</label>
							<div className="col-xs-6">
								<Switch idInput="Playlist.AllowDuplicates" handleChange={this.onChange}
									isChecked={this.state.config['Playlist.AllowDuplicates']} />
							</div>
						</div>

						<div className="settings-line">
							<label className="col-xs-4 control-label">
								{i18next.t('ENGINEALLOWDUPLICATESSERIES')}
							</label>
							<div className="col-xs-6">
								<Switch idInput="Playlist.AllowDuplicateSeries" handleChange={this.onChange}
									isChecked={this.state.config['Playlist.AllowDuplicateSeries']} />
							</div>
						</div>

						<div className="settings-line">
							<label className="col-xs-4 control-label">
								{i18next.t('SETTINGS.KARAOKE.PLAYLIST_JINGLES_VIDEOS')}
							</label>
							<div className="col-xs-6">
								<Switch idInput="Playlist.Medias.Jingles.Enabled" handleChange={this.onChange}
									isChecked={this.state.config['Playlist.Medias.Jingles.Enabled']} />
								{this.state.config['Playlist.Medias.Jingles.Enabled'] ?
									<React.Fragment>
										<label className="label-input-options">
											{i18next.t('SETTINGS.KARAOKE.EVERY')}
										</label>
										<input
											type="number"
											className="input-number-options"
											id="Playlist.Medias.Jingles.Interval"
											placeholder="20"
											onChange={this.onChange}
											value={this.state.config['Playlist.Medias.Jingles.Interval']}
										/>
										<label className="label-input-options">
											{i18next.t('SETTINGS.KARAOKE.SONGS')}
										</label>
									</React.Fragment> : null
								}
							</div>
						</div>
						<div className="settings-line">
							<label className="col-xs-4 control-label">
								{i18next.t('SETTINGS.KARAOKE.PLAYLIST_SPONSORS_VIDEOS')}
							</label>
							<div className="col-xs-6">
								<Switch idInput="Playlist.Medias.Sponsors.Enabled" handleChange={this.onChange}
									isChecked={this.state.config['Playlist.Medias.Sponsors.Enabled']}
								/>
								{this.state.config['Playlist.Medias.Sponsors.Enabled'] ?
									<React.Fragment>
										<label className="label-input-options">
											{i18next.t('SETTINGS.KARAOKE.EVERY')}
										</label>
										<input
											type="number"
											className="input-number-options"
											id="Playlist.Medias.Sponsors.Interval"
											placeholder="50"
											onChange={this.onChange}
											value={this.state.config['Playlist.Medias.Sponsors.Interval']}
										/>
										<label className="label-input-options">
											{i18next.t('SETTINGS.KARAOKE.SONGS')}
										</label>
									</React.Fragment> : null
								}
							</div>
						</div>

						<div className="settings-line">
							<label className="col-xs-4 control-label" title={i18next.t('SETTINGS.KARAOKE.PLAYLIST_INTRO_VIDEOS_TOOLTIP')}>
								{i18next.t('SETTINGS.KARAOKE.PLAYLIST_INTRO_VIDEOS')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
							</label>
							<div className="col-xs-6">
								<Switch idInput="Playlist.Medias.Intros.Enabled" handleChange={this.onChange}
									isChecked={this.state.config['Playlist.Medias.Intros.Enabled']} />
								{this.state.config['Playlist.Medias.Intros.Enabled'] ?
									<React.Fragment>
										<label className="label-input-options">
											{i18next.t('SETTINGS.KARAOKE.WITH')}
										</label>
										<input
											className="input-options"
											id="Playlist.Medias.Intros.Message"
											onChange={this.onChange}
											value={this.state.config['Playlist.Medias.Intros.Message'] || ''}
										/>
										<label className="label-input-options">
											{i18next.t('SETTINGS.KARAOKE.MESSAGE')}
										</label>
									</React.Fragment> : null
								}
							</div>
						</div>

						<div className="settings-line">
							<label className="col-xs-4 control-label" title={i18next.t('SETTINGS.KARAOKE.PLAYLIST_OUTRO_VIDEOS_TOOLTIP')}>
								{i18next.t('SETTINGS.KARAOKE.PLAYLIST_OUTRO_VIDEOS')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
							</label>
							<div className="col-xs-6">
								<Switch idInput="Playlist.Medias.Outros.Enabled" handleChange={this.onChange}
									isChecked={this.state.config['Playlist.Medias.Outros.Enabled']} />
								{this.state.config['Playlist.Medias.Outros.Enabled'] ?
									<React.Fragment>
										<label className="label-input-options">
											{i18next.t('SETTINGS.KARAOKE.WITH')}
										</label>
										<input
											className="input-options"
											id="Playlist.Medias.Outros.Message"
											onChange={this.onChange}
											value={this.state.config['Playlist.Medias.Outros.Message'] || ''}
										/>
										<label className="label-input-options">
											{i18next.t('SETTINGS.KARAOKE.MESSAGE')}
										</label>
									</React.Fragment> : null
								}
							</div>
						</div>
						<div className="settings-line">
							<label className="col-xs-4 control-label" title={i18next.t('SETTINGS.KARAOKE.PLAYLIST_ENCORES_VIDEOS_TOOLTIP')}>
								{i18next.t('SETTINGS.KARAOKE.PLAYLIST_ENCORES_VIDEOS')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
							</label>
							<div className="col-xs-6">
								<Switch idInput="Playlist.Medias.Encores.Enabled" handleChange={this.onChange}
									isChecked={this.state.config['Playlist.Medias.Encores.Enabled']} />
								{this.state.config['Playlist.Medias.Encores.Enabled'] ?
									<React.Fragment>
										<label className="label-input-options">
											{i18next.t('SETTINGS.KARAOKE.WITH')}
										</label>
										<input
											className="input-options"
											id="Playlist.Medias.Encores.Message"
											onChange={this.onChange}
											value={this.state.config['Playlist.Medias.Encores.Message'] || ''}
										/>
										<label className="label-input-options">
											{i18next.t('SETTINGS.KARAOKE.MESSAGE')}
										</label>
									</React.Fragment> : null
								}
							</div>
						</div>
						<div className="settings-line">
							<label className="col-xs-4 control-label" title={i18next.t('CLASSIC_MODE_TOOLTIP')}>
								{i18next.t('CLASSIC_MODE')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
							</label>
							<div className="col-xs-6">
								<Switch idInput="Karaoke.ClassicMode" handleChange={this.onChange}
									isChecked={this.state.config['Karaoke.ClassicMode']} />
							</div>
						</div>
						<div className="settings-line">
							<label className="col-xs-4 control-label">
								{i18next.t('STREAM_MODE')}
							</label>
							<div className="col-xs-6">
								<Switch idInput="Karaoke.StreamerMode.Enabled" handleChange={this.onChange}
									isChecked={this.state.config['Karaoke.StreamerMode.Enabled']} />
							</div>
						</div>
						{this.state.config['Karaoke.StreamerMode.Enabled'] ?
							<div
								id="streamSettings"
								className="settingsGroupPanel"
							>
								<div className="settings-line">
									<label className="col-xs-4 control-label">
										{i18next.t('STREAM_PAUSE_DURATION')}
									</label>
									<div className="col-xs-6">
										<input
											type="number"
											className="form-control"
											id="Karaoke.StreamerMode.PauseDuration"
											placeholder="20"
											onChange={this.onChange}
											value={this.state.config['Karaoke.StreamerMode.PauseDuration']}
										/>
									</div>
								</div>
								<div className="settings-line">
									<label className="col-xs-4 control-label">
										{i18next.t('STREAM_TWITCH')}
									</label>
									<div className="col-xs-6">
										<Switch idInput="Karaoke.StreamerMode.Twitch.Enabled" handleChange={this.onChange}
											isChecked={this.state.config['Karaoke.StreamerMode.Twitch.Enabled']} />
									</div>
								</div>
								{this.state.config['Karaoke.StreamerMode.Twitch.Enabled'] ?
									<div
										id="twitchSettings"
										className="settingsGroupPanel"
									>
										<div className="settings-line">
											<a className="col-xs-4 control-label" href="https://twitchapps.com/tmi/">{i18next.t('STREAM_TWITCH_OAUTH_TOKEN_GET')}</a>
										</div>
										<div className="settings-line">
											<label className="col-xs-4 control-label">
												{i18next.t('STREAM_TWITCH_OAUTH_TOKEN')}
											</label>
											<div className="col-xs-6">
												<input type="password"
													data-exclude="true"
													className="form-control"
													id="Karaoke.StreamerMode.Twitch.OAuth"
													onChange={this.onChange}
													value={this.state.config['Karaoke.StreamerMode.Twitch.OAuth']}
												/>
											</div>
										</div>
										<div className="settings-line">
											<label className="col-xs-4 control-label">
												{i18next.t('STREAM_TWITCH_CHANNEL')}
											</label>
											<div className="col-xs-6">
												<input
													className="form-control"
													id="Karaoke.StreamerMode.Twitch.Channel"
													onChange={this.onChange}
													value={this.state.config['Karaoke.StreamerMode.Twitch.Channel']}
												/>
											</div>
										</div>
									</div> : null
								}
							</div> : null
						}


						<div className="settings-line">
							<label className="col-xs-4 control-label">
								{i18next.t('ENGINEFREEUPVOTES')}
							</label>
							<div className="col-xs-6">
								<Switch idInput="Karaoke.Quota.FreeUpVote" handleChange={this.onChange}
									isChecked={this.state.config['Karaoke.Quota.FreeUpVote']} />
							</div>
						</div>
						{this.state.config['Karaoke.Quota.FreeUpVote'] ?
							<div
								id="freeUpvotesSettings"
								className="settingsGroupPanel"
							>
								<div className="settings-line">
									<label className="col-xs-4 control-label">
										{i18next.t('ENGINEFREEUPVOTESREQUIREDMIN')}
									</label>
									<div className="col-xs-6">
										<input
											className="form-control"
											type="number"
											id="Karaoke.Quota.FreeUpVotesRequiredMin"
											onChange={this.onChange}
											value={this.state.config['Karaoke.Quota.FreeUpVotesRequiredMin']}
										/>
									</div>
								</div>
								<div className="settings-line">
									<label className="col-xs-4 control-label" title={i18next.t('ENGINEFREEUPVOTESREQUIREDPERCENT_TOOLTIP')}>
										{i18next.t('ENGINEFREEUPVOTESREQUIREDPERCENT')}
                  &nbsp;
  								<i className="far fa-question-circle"></i>
									</label>
									<div className="col-xs-6">
										<input
											className="form-control"
											type="number"
											id="Karaoke.Quota.FreeUpVotesRequiredPercent"
											onChange={this.onChange}
											value={this.state.config['Karaoke.Quota.FreeUpVotesRequiredPercent']}
										/>
									</div>
								</div>
							</div> : null}
						<div className="settings-line">
							<label className="col-xs-4 control-label">
								{i18next.t('SETTINGS.KARAOKE.MINUTES_BEFORE_SESSION_ENDS_WARNING')}
			&nbsp;
								<i className="far fa-question-circle"></i>
							</label>
							<div className="col-xs-6">
								<input
									type="number"
									className="form-control"
									id="Karaoke.MinutesBeforeSessionEndsWarning"
									placeholder="15"
									onChange={this.onChange}
									value={this.state.config['Karaoke.MinutesBeforeSessionEndsWarning']}
								/>
							</div>
						</div>
						<div className="settings-line">
							<label className="col-xs-4 control-label">
								{i18next.t('ENGINESONGPOLL')}
							</label>
							<div className="col-xs-6">
								<Switch idInput="Karaoke.Poll.Enabled" handleChange={this.onChange}
									isChecked={this.state.config['Karaoke.Poll.Enabled']} />
							</div>
						</div>

						{this.state.config['Karaoke.Poll.Enabled'] ?
							<div id="songPollSettings" className="settingsGroupPanel">
								<div className="settings-line">
									<label className="col-xs-4 control-label">
										{i18next.t('ENGINESONGPOLLCHOICES')}
									</label>
									<div className="col-xs-6">
										<input
											className="form-control"
											type="number"
											id="Karaoke.Poll.Choices"
											onChange={this.onChange}
											value={this.state.config['Karaoke.Poll.Choices']}
										/>
									</div>
								</div>
								<div className="settings-line">
									<label className="col-xs-4 control-label">
										{i18next.t('ENGINESONGPOLLTIMEOUT')}
									</label>
									<div className="col-xs-6">
										<input
											className="form-control"
											type="number"
											id="Karaoke.Poll.Timeout"
											onChange={this.onChange}
											value={this.state.config['Karaoke.Poll.Timeout']}
										/>
									</div>
								</div>
							</div> : null}

						<div className="settings-line">
							<label className="col-xs-4 control-label">
								{i18next.t('ONLINEURL')}
							</label>
							<div className="col-xs-6">
								<Switch idInput="Online.URL" handleChange={this.onChange}
									isChecked={this.state.config['Online.URL']} />
							</div>
						</div>

						<div className="settings-line subCategoryGroupPanel">
							<div className="col-xs-12" style={{ textAlign: 'center' }}>
								{i18next.t('MYSTERY_SONG_SETTINGS')}
							</div>
						</div>

						<div className="settings-line">
							<label className="col-xs-4 control-label">
								{i18next.t('ENGINE_HIDE_INVISIBLE_SONGS')}
							</label>
							<div className="col-xs-6">
								<select
									id="Playlist.MysterySongs.Hide"
									onChange={this.onChange}
									value={this.state.config['Playlist.MysterySongs.Hide']}
								>
									<option value='true'> {i18next.t('ENGINE_HIDE_INVISIBLE_SONGS_HIDDEN_OPTION')} </option>
									<option value='false'>???</option>
								</select>
							</div>
						</div>

						<div className="settings-line">
							<label className="col-xs-4 control-label" title={i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_TOOLTIP')}>
								{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
							</label>
							<div className="col-xs-6">
								<select
									id="Playlist.MysterySongs.AddedSongVisibilityAdmin"
									onChange={this.onChange}
									value={this.state.config['Playlist.MysterySongs.AddedSongVisibilityAdmin']}
								>
									<option value='false'> {i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_MYSTERY_OPTION')} </option>
									<option value='true'> {i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_NORMAL_OPTION')} </option>
								</select>
							</div>
						</div>

						<div className="settings-line">
							<label className="col-xs-4 control-label" title={i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_PUBLIC_TOOLTIP')}>
								{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_PUBLIC')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
							</label>
							<div className="col-xs-6">
								<select
									id="Playlist.MysterySongs.AddedSongVisibilityPublic"
									onChange={this.onChange}
									value={this.state.config['Playlist.MysterySongs.AddedSongVisibilityPublic']}
								>
									<option value='false'> {i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_MYSTERY_OPTION')} </option>
									<option value='true'> {i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_NORMAL_OPTION')} </option>
								</select>
							</div>
						</div>

						<div className="settings-line">
							<label className="col-xs-4 control-label">
								{i18next.t('SETTINGS.KARAOKE.LABELS_MYSTERY_SONGS')}
							</label>
							<div className="col-xs-6">
								<div>
									<input value={this.state.mysterySongLabel} style={{ margin: '10px', color: '#555' }}
										onChange={e => this.setState({ mysterySongLabel: e.target.value })} />
									<button type="button" className="btn btn-default" onClick={this.addMysterySongLabel}>{i18next.t('SETTINGS.KARAOKE.LABELS_MYSTERY_SONGS_ADD')}</button>
								</div>
								{this.state.config['Playlist.MysterySongs.Labels'].map((value: string) => {
									return (
										<div key={value}>
											<label>{value}</label>
											{this.state.config['Playlist.MysterySongs.Labels'].length > 1 ?
												<button type="button" className="btn btn-default"
													onClick={() => this.deleteMysterySongLabel(value)}>{i18next.t('SETTINGS.KARAOKE.LABELS_MYSTERY_SONGS_DELETE')}</button> : null
											}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</React.Fragment> : null
		);
	}
}

export default KaraokeOptions;
