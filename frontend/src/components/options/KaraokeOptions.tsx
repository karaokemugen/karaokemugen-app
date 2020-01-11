import React, { Component } from 'react';
import i18next from 'i18next';
import Switch from '../generic/Switch';
import { expand, dotify } from '../tools';
import axios from 'axios';
import { Config } from '~../../../src/types/config';

interface IProps {
	config: Config;
	onChange: (e:any) => void;
}

interface IState {
	config: any;
	mysterySongLabel: string;
}
class KaraokeOptions extends Component<IProps, IState> {
	constructor(props:IProps) {
		super(props);
		this.state = {
			mysterySongLabel: '',
			config: dotify(this.props.config)
		};
	}

  addMysterySongLabel = () => {
  	var mysterySongsLabels = this.state.config['Playlist.MysterySongs.Labels'];
  	mysterySongsLabels.push(this.state.mysterySongLabel);
  	var config = this.state.config;
  	this.state.config['Playlist.MysterySongs.Labels'] = mysterySongsLabels;
  	this.setState({ config: config });
  	this.saveMysterySongsLabels(mysterySongsLabels);
  	this.setState({ mysterySongLabel: '' });
  };

  deleteMysterySongLabel = (value:string) => {
  	var config = this.state.config;
  	this.state.config['Playlist.MysterySongs.Labels'] = this.state.config['Playlist.MysterySongs.Labels'].filter((ele:string) => {
  		return ele != value; 
  	});
  	this.setState({ config: config });
  	this.saveMysterySongsLabels(this.state.config['Playlist.MysterySongs.Labels'].filter((ele:string) => {
  		return ele != value; 
  	}));
  };

  saveMysterySongsLabels = async (labels:Array<string>) => {
  	var data = expand('Playlist.MysterySongs.Labels', labels);
  	axios.put('/api/settings', { setting: JSON.stringify(data) });
  };

  onChange = (e:any) => {
  	var config = this.state.config;
  	var value = e.target.type === 'checkbox' ? e.target.checked : 
  		(Number(e.target.value) ? Number(e.target.value) : e.target.value);
  	if (value === 'true') {
  		value = true;
  	} else if (value === 'false') {
  		value = false;
  	}
  	config[e.target.id] = value;
  	this.setState({ config: config });
  	if (e.target.type != 'number' || (Number(e.target.value))) this.props.onChange(e);
  };

  render() {
  	return (
  		<React.Fragment>
  			<div id="nav-karaokeAllMode">
  				<div className="form-group">
  					<label className="col-xs-4 control-label" title={i18next.t('QUOTA_TYPE_TOOLTIP')}>
  						{i18next.t('QUOTA_TYPE')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
  					</label>
  					<div className="col-xs-6">
  						<select
  							className="form-control"
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
  					<div className="form-group">
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
  					<div className="form-group">
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
  					<div className="form-group">
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
  					</div> : null}

  				<div className="form-group">
  					<label className="col-xs-4 control-label" title={i18next.t('ENGINEJINGLESINTERVAL_TOOLTIP')}>
  						{i18next.t('ENGINEJINGLESINTERVAL')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
  					</label>
  					<div className="col-xs-6">
  						<input
  							type="number"
  							className="form-control"
  							id="Karaoke.JinglesInterval"
  							placeholder="20"
  							onChange={this.onChange}
  							value={this.state.config['Karaoke.JinglesInterval']}
  						/>
  					</div>
  				</div>

  				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('ENGINEREPEATPLAYLIST')}
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Karaoke.Repeat" handleChange={this.onChange}
  							isChecked={this.state.config['Karaoke.Repeat']} />
  					</div>
  				</div>

  				<div className="form-group">
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

  				<div className="form-group">
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

  				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('ENGINEALLOWDUPLICATES')}
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Playlist.AllowDuplicates" handleChange={this.onChange}
  							isChecked={this.state.config['Playlist.AllowDuplicates']} />
  					</div>
  				</div>

  				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('ENGINEALLOWDUPLICATESSERIES')}
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Playlist.AllowDuplicateSeries" handleChange={this.onChange}
  							isChecked={this.state.config['Playlist.AllowDuplicateSeries']} />
  					</div>
  				</div>

  				<div className="form-group">
  					<label className="col-xs-4 control-label" title={i18next.t('SETTINGS.KARAOKE.PLAYLIST_INTRO_VIDEOS_TOOLTIP')}>
  						{i18next.t('SETTINGS.KARAOKE.PLAYLIST_INTRO_VIDEOS')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Playlist.Medias.Intros.Enabled" handleChange={this.onChange}
  							isChecked={this.state.config['Playlist.Medias.Intros.Enabled']} />
  					</div>
  				</div>

				<div className="form-group">
  					<label className="col-xs-4 control-label" title={i18next.t('SETTINGS.KARAOKE.PLAYLIST_OUTRO_VIDEOS_TOOLTIP')}>
  						{i18next.t('SETTINGS.KARAOKE.PLAYLIST_OUTRO_VIDEOS')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Playlist.Medias.Outros.Enabled" handleChange={this.onChange}
  							isChecked={this.state.config['Playlist.Medias.Outros.Enabled']} />
  					</div>
  				</div>

				<div className="form-group">
  					<label className="col-xs-4 control-label" title={i18next.t('SETTINGS.KARAOKE.PLAYLIST_ENCORES_VIDEOS_TOOLTIP')}>
  						{i18next.t('SETTINGS.KARAOKE.PLAYLIST_ENCORES_VIDEOS')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Playlist.Medias.Encores.Enabled" handleChange={this.onChange}
  							isChecked={this.state.config['Playlist.Medias.Encores.Enabled']} />
  					</div>
  				</div>

				<div className="form-group">
  					<label className="col-xs-4 control-label" title={i18next.t('SETTINGS.KARAOKE.QUICKSTART_TOOLTIP')}>
  						{i18next.t('SETTINGS.KARAOKE.QUICKSTART')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="App.QuickStart" handleChange={this.onChange}
  							isChecked={this.state.config['App.QuickStart']} />
  					</div>
  				</div>

  				<div className="form-group">
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
  				<div className="form-group">
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
  						<div className="form-group">
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
  						<div className="form-group">
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
  								<div className="form-group">
  									<a className="col-xs-4 control-label" href="https://twitchapps.com/tmi/" target='_blank'>{i18next.t('STREAM_TWITCH_OAUTH_TOKEN_GET')}</a>
  								</div>
  								<div className="form-group">
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
  								<div className="form-group">
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

  				<div className="form-group subCategoryGroupPanel">
  					<div className="col-xs-12" style={{ textAlign: 'center' }}>
  						{i18next.t('MYSTERY_SONG_SETTINGS')}
  					</div>
  				</div>

  				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('ENGINE_HIDE_INVISIBLE_SONGS')}
  					</label>
  					<div className="col-xs-6">
  						<select
  							className="form-control"
  							id="Playlist.MysterySongs.Hide"
  							onChange={this.onChange}
  							value={this.state.config['Playlist.MysterySongs.Hide']}
  						>
  							<option value='true'> {i18next.t('ENGINE_HIDE_INVISIBLE_SONGS_HIDDEN_OPTION')} </option>
  							<option value='false'>???</option>
  						</select>
  					</div>
  				</div>

  				<div className="form-group">
  					<label className="col-xs-4 control-label" title={i18next.t('ENGINE_ADDED_SONG_VISIBILITY_ADMIN_TOOLTIP')}>
  						{i18next.t('ENGINE_ADDED_SONG_VISIBILITY_ADMIN')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
  					</label>
  					<div className="col-xs-6">
  						<select
  							className="form-control"
  							id="Playlist.MysterySongs.AddedSongVisibilityAdmin"
  							onChange={this.onChange}
  							value={this.state.config['Playlist.MysterySongs.AddedSongVisibilityAdmin']}
  						>
  							<option value='false'> {i18next.t('ENGINE_ADDED_SONG_VISIBILITY_MYSTERY_OPTION')} </option>
  							<option value='true'> {i18next.t('ENGINE_ADDED_SONG_VISIBILITY_NORMAL_OPTION')} </option>
  						</select>
  					</div>
  				</div>

  				<div className="form-group">
  					<label className="col-xs-4 control-label" title={i18next.t('ENGINE_ADDED_SONG_VISIBILITY_PUBLIC_TOOLTIP')}>
  						{i18next.t('ENGINE_ADDED_SONG_VISIBILITY_PUBLIC')}
              &nbsp;
  						<i className="far fa-question-circle"></i>
  					</label>
  					<div className="col-xs-6">
  						<select
  							className="form-control"
  							id="Playlist.MysterySongs.AddedSongVisibilityPublic"
  							onChange={this.onChange}
  							value={this.state.config['Playlist.MysterySongs.AddedSongVisibilityPublic']}
  						>
  							<option value='false'> {i18next.t('ENGINE_ADDED_SONG_VISIBILITY_MYSTERY_OPTION')} </option>
  							<option value='true'> {i18next.t('ENGINE_ADDED_SONG_VISIBILITY_NORMAL_OPTION')} </option>
  						</select>
  					</div>
  				</div>

  				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('ENGINE_LABELS_MYSTERY_SONGS')}
  					</label>
  					<div className="col-xs-6">
  						<div>
  							<input value={this.state.mysterySongLabel} style={{ margin: '10px', color: '#555' }}
  								onChange={e => this.setState({ mysterySongLabel: e.target.value })} />
  							<button type="button" className="btn btn-default" onClick={this.addMysterySongLabel}>{i18next.t('ENGINE_LABELS_MYSTERY_SONGS_ADD')}</button>
  						</div>
  						{this.state.config['Playlist.MysterySongs.Labels'].map((value:string) => {
  							return (
  								<div key={value}>
  									<label style={{ margin: '10px' }}>{value}</label>
  									<button type="button" className="btn btn-default"
  										onClick={() => this.deleteMysterySongLabel(value)}>{i18next.t('ENGINE_LABELS_MYSTERY_SONGS_DELETE')}</button>
  								</div>
  							);
  						})}
  					</div>
  				</div>
  			</div>
  			<div className="form-group subCategoryGroupPanel">
  				<div className="col-xs-12" style={{ textAlign: 'center' }}>
  					{i18next.t('ONLINESETTINGS')}
  				</div>
  			</div>

  			<div id="nav-karaokeOnlineSettings">
  				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('ONLINEURL')}
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Online.URL" handleChange={this.onChange}
  							isChecked={this.state.config['Online.URL']} />
  					</div>
  				</div>
  				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('ONLINEUSERS')}
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Online.Users" handleChange={this.onChange}
  							isChecked={this.state.config['Online.Users']} />
  					</div>
  				</div>

  				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('ONLINESTATS')}
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Online.Stats" handleChange={this.onChange}
  							isChecked={this.state.config['Online.Stats']} />
  					</div>
  				</div>

  				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('CHECK_APP_UPDATES')}
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Online.Updates.App" handleChange={this.onChange}
  							isChecked={this.state.config['Online.Updates.App']} />
  					</div>
  				</div>
  				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('SETTINGS.KARAOKE.AUTO_UPDATE_JINGLES')}
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Online.Updates.Medias.Jingles" handleChange={this.onChange}
  							isChecked={this.state.config['Online.Updates.Medias.Jingles']} />
  					</div>
  				</div>
  				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('SETTINGS.KARAOKE.AUTO_UPDATE_INTROS')}
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Online.Updates.Medias.Intros" handleChange={this.onChange}
  							isChecked={this.state.config['Online.Updates.Medias.Intros']} />
  					</div>
  				</div>
				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('SETTINGS.KARAOKE.AUTO_UPDATE_OUTROS')}
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Online.Updates.Medias.Outros" handleChange={this.onChange}
  							isChecked={this.state.config['Online.Updates.Medias.Outros']} />
  					</div>
  				</div>
				<div className="form-group">
  					<label className="col-xs-4 control-label">
  						{i18next.t('SETTINGS.KARAOKE.AUTO_UPDATE_ENCORES')}
  					</label>
  					<div className="col-xs-6">
  						<Switch idInput="Online.Updates.Medias.Encores" handleChange={this.onChange}
  							isChecked={this.state.config['Online.Updates.Medias.Encores']} />
  					</div>
  				</div>
  			</div>
  			<div className="form-group subCategoryGroupPanel">
  				<div className="col-xs-12" style={{ textAlign: 'center' }}>
  					{i18next.t('PUBLICMODESETTINGS')}
  				</div>
  			</div>

  			<div id="nav-karaokePublicMode">
  				<div className="form-group">
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
  						<div className="form-group">
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
  						<div className="form-group">
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

  				<div className="form-group">
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
  						<div className="form-group">
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
  						<div className="form-group">
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
  			</div>
  		</React.Fragment>
  	);
  }
}

export default KaraokeOptions;
