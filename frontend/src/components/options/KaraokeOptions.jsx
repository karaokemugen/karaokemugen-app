import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import Switch from '../Switch';
import {expand} from '../tools';
import axios from 'axios';

class KaraokeOptions extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mysterySongLabel: ""
    }
    this.addMysterySongLabel = this.addMysterySongLabel.bind(this);
    this.deleteMysterySongLabel = this.deleteMysterySongLabel.bind(this);
    this.saveMysterySongsLabels = this.saveMysterySongsLabels.bind(this);
  }

  addMysterySongLabel() {
    var mysterySongsLabels = this.props.settings.Playlist.MysterySongs.Labels;
    mysterySongsLabels.push(this.state.mysterySongLabel);
    this.saveMysterySongsLabels(mysterySongsLabels)
    this.setState({mysterySongLabel: ""});
  }

  deleteMysterySongLabel(value) {
    this.saveMysterySongsLabels(this.props.settings.Playlist.MysterySongs.Labels.filter(function(ele){return ele != value}));
  }

  async saveMysterySongsLabels(labels) {
    var data = expand("Playlist.MysterySongs.Labels", eval(labels));
    axios.put('/api/admin/settings', {setting: JSON.stringify(data)});
  }

  render() {
    const t = this.props.t;
    var settings = this.props.settings;
    return (settings.Karaoke ?
      <>
        <div id="nav-karaokeAllMode">
          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("QUOTA_TYPE")}
            </label>
            <div className="col-xs-6">
              <select
                type="number"
                className="form-control"
                id="Karaoke.Quota.Type"
                onChange={this.props.onChange}
                value={settings.Karaoke.Quota.Type}
              >
                <option value="0"> {t("QUOTA_TYPE_0")} </option>
                <option value="1"> {t("QUOTA_TYPE_1")} </option>
                <option value="2"> {t("QUOTA_TYPE_2")} </option>
              </select>
            </div>
          </div>
          {settings.Karaoke.Quota.Type === 2 ?
            <div className="form-group">
              <label className="col-xs-4 control-label">
                {t("TIME_BY_USER")}
              </label>
              <div className="col-xs-6">
                <input
                  type="number"
                  className="form-control"
                  id="Karaoke.Quota.Time"
                  placeholder="1000"
                  onChange={this.props.onChange}
                  value={settings.Karaoke.Quota.Time}
                />
              </div>
            </div> : null}

          {settings.Karaoke.Quota.Type === 1 ?
            <div className="form-group">
              <label className="col-xs-4 control-label">
                {t("SONGS_BY_USER")}
              </label>
              <div className="col-xs-6">
                <input
                  type="number"
                  className="form-control"
                  id="Karaoke.Quota.Songs"
                  placeholder="1000"
                  onChange={this.props.onChange}
                  value={settings.Karaoke.Quota.Songs}
                />
              </div>
            </div> : null}

          {settings.Karaoke.Quota.Type !== 0 ?
            <div className="form-group">
              <label className="col-xs-4 control-label">
                {t("FREE_AUTO_TIME")}
              </label>
              <div className="col-xs-6">
                <input
                  type="number"
                  className="form-control"
                  id="Karaoke.Quota.FreeAutoTime"
                  placeholder="1000"
                  onChange={this.props.onChange}
                  value={settings.Karaoke.Quota.FreeAutoTime}
                />
              </div>
            </div> : null}

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ENGINEJINGLESINTERVAL")}
            </label>
            <div className="col-xs-6">
              <input
                type="number"
                className="form-control"
                id="Karaoke.JinglesInterval"
                placeholder="20"
                onChange={this.props.onChange}
                value={settings.Karaoke.JinglesInterval}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ENGINEREPEATPLAYLIST")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Karaoke.Repeat" handleChange={this.props.onChange}
                isChecked={settings.Karaoke.Repeat} />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ENGINEENABLESMARTINSERT")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Karaoke.SmartInsert" handleChange={this.props.onChange}
                isChecked={settings.Karaoke.SmartInsert} />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ENGINEAUTOPLAY")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Karaoke.Autoplay" handleChange={this.props.onChange}
                isChecked={settings.Karaoke.Autoplay} />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ENGINEALLOWDUPLICATES")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Playlist.AllowDuplicates" handleChange={this.props.onChange}
                isChecked={settings.Playlist.AllowDuplicates} />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ENGINEALLOWDUPLICATESSERIES")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Playlist.AllowDuplicateSeries" handleChange={this.props.onChange}
                isChecked={settings.Playlist.AllowDuplicateSeries} />
            </div>
          </div>

          <div className="form-group settingsGroupPanel subCategoryGroupPanel">
            <div className="col-xs-12" style={{ textAlign: "center" }}>
              {t("MYSTERY_SONG_SETTINGS")}
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ENGINE_HIDE_INVISIBLE_SONGS")}
            </label>
            <div className="col-xs-6">
              <select
                className="form-control"
                id="Playlist.MysterySongs.Hide"
                onChange={this.props.onChange}
                value={settings.Playlist.MysterySongs.Hide}
              >
                <option value={true}> {t("ENGINE_HIDE_INVISIBLE_SONGS_HIDDEN_OPTION")} </option>
                <option value={false}>???</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ENGINE_ADDED_SONG_VISIBILITY_ADMIN")}
            </label>
            <div className="col-xs-6">
              <select
                className="form-control"
                id="Playlist.MysterySongs.AddedSongVisibilityAdmin"
                onChange={this.props.onChange}
                value={settings.Playlist.MysterySongs.AddedSongVisibilityAdmin}
              >
                <option value={true}> {t("ENGINE_ADDED_SONG_VISIBILITY_MYSTERY_OPTION")} </option>
                <option value={false}> {t("ENGINE_ADDED_SONG_VISIBILITY_NORMAL_OPTION")} </option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ENGINE_ADDED_SONG_VISIBILITY_PUBLIC")}
            </label>
            <div className="col-xs-6">
              <select
                className="form-control"
                id="Playlist.MysterySongs.AddedSongVisibilityPublic"
                onChange={this.props.onChange}
                value={settings.Playlist.MysterySongs.AddedSongVisibilityPublic}
              >
                <option value={true}> {t("ENGINE_ADDED_SONG_VISIBILITY_MYSTERY_OPTION")} </option>
                <option value={false}> {t("ENGINE_ADDED_SONG_VISIBILITY_NORMAL_OPTION")} </option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ENGINE_LABELS_MYSTERY_SONGS")}
            </label>
            <div className="col-xs-6">
              <div>
                <input value={this.state.mysterySongLabel} style={{margin: "10px", color: "#555"}}
                  onChange={e => this.setState({mysterySongLabel: e.target.value})}/>
                <button type="button" className="btn btn-default" onClick={this.addMysterySongLabel}>{t("ENGINE_LABELS_MYSTERY_SONGS_ADD")}</button>
              </div>
              {settings.Playlist.MysterySongs.Labels.map(value => {
                return (
                <div key={value}>
                  <label style={{margin: "10px"}}>{value}</label>
                  <button type="button" className="btn btn-default" 
                    onClick={() => this.deleteMysterySongLabel(value)}>{t("ENGINE_LABELS_MYSTERY_SONGS_DELETE")}</button>
                </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="form-group settingsGroupPanel subCategoryGroupPanel">
          <div className="col-xs-12" style={{ textAlign: "center" }}>
            {t("ONLINESETTINGS")}
          </div>
        </div>

        <div id="nav-karaokeOnlineSettings">
          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ONLINEURL")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Online.URL" handleChange={this.props.onChange}
                isChecked={settings.Online.URL} />
            </div>
          </div>
          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ONLINEUSERS")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Online.Users" handleChange={this.props.onChange}
                isChecked={settings.Online.Users} />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ONLINESTATS")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Online.Stats" handleChange={this.props.onChange}
                isChecked={settings.Online.Stats} />
            </div>
          </div>
        </div>
        <div className="form-group settingsGroupPanel subCategoryGroupPanel">
          <div className="col-xs-12" style={{ textAlign: "center" }}>
            {t("PUBLICMODESETTINGS")}
          </div>
        </div>
        <div id="nav-karaokePublicMode">
          {settings.Karaoke.Quota.FreeUpVote ?
            <div
              id="freeUpvotesSettings"
              className="well well-sm settingsGroupPanel"
            >
              <div className="form-group">
                <label className="col-xs-4 control-label">
                  {t("ENGINEFREEUPVOTESREQUIREDMIN")}
                </label>
                <div className="col-xs-6">
                  <input
                    className="form-control"
                    type="number"
                    id="Karaoke.Quota.FreeUpVotesRequiredMin"
                    onChange={this.props.onChange}
                    value={settings.Karaoke.Quota.FreeUpVotesRequiredMin}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="col-xs-4 control-label">
                  {t("ENGINEFREEUPVOTESREQUIREDPERCENT")}
                </label>
                <div className="col-xs-6">
                  <input
                    className="form-control"
                    type="number"
                    id="Karaoke.Quota.FreeUpVotesRequiredPercent"
                    onChange={this.props.onChange}
                    value={settings.Karaoke.Quota.FreeUpVotesRequiredPercent}
                  />
                </div>
              </div>
            </div> : null}

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {t("ENGINESONGPOLL")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Karaoke.Poll.Enabled" handleChange={this.props.onChange}
                isChecked={settings.Karaoke.Poll.Enabled} />
            </div>
          </div>

          {settings.Karaoke.Poll.Enabled ?
            <div id="songPollSettings" className="well well-sm settingsGroupPanel">
              <div className="form-group">
                <label className="col-xs-4 control-label">
                  {t("ENGINESONGPOLLCHOICES")}
                </label>
                <div className="col-xs-6">
                  <input
                    className="form-control"
                    type="number"
                    id="Karaoke.Poll.Choices"
                    onChange={this.props.onChange}
                    value={settings.Karaoke.Poll.Choices}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="col-xs-4 control-label">
                  {t("ENGINESONGPOLLTIMEOUT")}
                </label>
                <div className="col-xs-6">
                  <input
                    className="form-control"
                    type="number"
                    id="Karaoke.Poll.Timeout"
                    onChange={this.props.onChange}
                    value={settings.Karaoke.Poll.Timeout}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="col-xs-4 control-label">
                  {t("ENGINEFREEUPVOTES")}
                </label>
                <div className="col-xs-6">
                  <Switch idInput="Karaoke.Quota.FreeUpVote" handleChange={this.props.onChange}
                    isChecked={settings.Karaoke.Quota.FreeUpVote} />
                </div>
              </div>
            </div> : null}
        </div>
        <input
          id="App.FirstRun"
          className="hideInput hidden"
          onChange={this.props.onChange}
          value={settings.App.FirstRun}
        />
      </> : null
    );
  };
}

export default withTranslation()(KaraokeOptions);