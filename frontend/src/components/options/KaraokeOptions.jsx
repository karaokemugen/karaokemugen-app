import React, { Component } from "react";
import i18next from 'i18next';
import Switch from '../generic/Switch';
import { expand, dotify } from '../tools';
import axios from 'axios';

class KaraokeOptions extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mysterySongLabel: "",
      settings: dotify(this.props.settings)
    }
    this.addMysterySongLabel = this.addMysterySongLabel.bind(this);
    this.deleteMysterySongLabel = this.deleteMysterySongLabel.bind(this);
    this.saveMysterySongsLabels = this.saveMysterySongsLabels.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  addMysterySongLabel() {
    var mysterySongsLabels = this.state.settings["Playlist.MysterySongs.Labels"];
    mysterySongsLabels.push(this.state.mysterySongLabel);
    var settings = this.state.settings;
    this.state.settings["Playlist.MysterySongs.Labels"] = mysterySongsLabels;
    this.setState({ settings: settings });
    this.saveMysterySongsLabels(mysterySongsLabels)
    this.setState({ mysterySongLabel: "" });
  }

  deleteMysterySongLabel(value) {
    var settings = this.state.settings;
    this.state.settings["Playlist.MysterySongs.Labels"] = this.state.settings["Playlist.MysterySongs.Labels"].filter(function (ele) { return ele != value });
    this.setState({ settings: settings });
    this.saveMysterySongsLabels(this.state.settings["Playlist.MysterySongs.Labels"].filter(function (ele) { return ele != value }));
  }

  async saveMysterySongsLabels(labels) {
    var data = expand("Playlist.MysterySongs.Labels", eval(labels));
    axios.put('/api/admin/settings', { setting: JSON.stringify(data) });
  }

  onChange(e) {
    var settings = this.state.settings;
    var value = e.target.type === 'checkbox' ? e.target.checked : 
      (Number(e.target.value) ? Number(e.target.value) : e.target.value);
    if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    }
    settings[e.target.id] = value;
    this.setState({ settings: settings });
    if (e.target.type != "number" || (Number(e.target.value))) this.props.onChange(e);
  }

  render() {
    return (
      <React.Fragment>
        <div id="nav-karaokeAllMode">
          <div className="form-group">
            <label className="col-xs-4 control-label" title={i18next.t("QUOTA_TYPE_TOOLTIP")}>
              {i18next.t("QUOTA_TYPE")}
              &nbsp;
              <i className="far fa-question-circle"></i>
            </label>
            <div className="col-xs-6">
              <select
                type="number"
                className="form-control"
                id="Karaoke.Quota.Type"
                onChange={this.onChange}
                value={this.state.settings["Karaoke.Quota.Type"]}
              >
                <option value="0"> {i18next.t("QUOTA_TYPE_0")} </option>
                <option value="1"> {i18next.t("QUOTA_TYPE_1")} </option>
                <option value="2"> {i18next.t("QUOTA_TYPE_2")} </option>
              </select>
            </div>
          </div>
          {this.state.settings["Karaoke.Quota.Type"] === 2 ?
            <div className="form-group">
              <label className="col-xs-4 control-label">
                {i18next.t("TIME_BY_USER")}
              </label>
              <div className="col-xs-6">
                <input
                  type="number"
                  className="form-control"
                  id="Karaoke.Quota.Time"
                  placeholder="1000"
                  onChange={this.onChange}
                  value={this.state.settings["Karaoke.Quota.Time"]}
                />
              </div>
            </div> : null}

          {this.state.settings["Karaoke.Quota.Type"] === 1 ?
            <div className="form-group">
              <label className="col-xs-4 control-label" title={i18next.t("SONGS_BY_USER_TOOLTIP")}>
                {i18next.t("SONGS_BY_USER")}
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
                  value={this.state.settings["Karaoke.Quota.Songs"]}
                />
              </div>
            </div> : null}

          {this.state.settings["Karaoke.Quota.Type"] !== 0 ?
            <div className="form-group">
              <label className="col-xs-4 control-label" title={i18next.t("FREE_AUTO_TIME_TOOLTIP")}>
                {i18next.t("FREE_AUTO_TIME")}
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
                  value={this.state.settings["Karaoke.Quota.FreeAutoTime"]}
                />
              </div>
            </div> : null}

          <div className="form-group">
            <label className="col-xs-4 control-label" title={i18next.t("ENGINEJINGLESINTERVAL_TOOLTIP")}>
              {i18next.t("ENGINEJINGLESINTERVAL")}
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
                value={this.state.settings["Karaoke.JinglesInterval"]}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("ENGINEREPEATPLAYLIST")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Karaoke.Repeat" handleChange={this.onChange}
                isChecked={this.state.settings["Karaoke.Repeat"]} />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label" title={i18next.t("ENGINEENABLESMARTINSERT_TOOLTIP")}>
              {i18next.t("ENGINEENABLESMARTINSERT")}
              &nbsp;
              <i className="far fa-question-circle"></i>
            </label>
            <div className="col-xs-6">
              <Switch idInput="Karaoke.SmartInsert" handleChange={this.onChange}
                isChecked={this.state.settings["Karaoke.SmartInsert"]} />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label" title={i18next.t("ENGINEAUTOPLAY_TOOLTIP")}>
              {i18next.t("ENGINEAUTOPLAY")}
              &nbsp;
              <i className="far fa-question-circle"></i>
            </label>
            <div className="col-xs-6">
              <Switch idInput="Karaoke.Autoplay" handleChange={this.onChange}
                isChecked={this.state.settings["Karaoke.Autoplay"]} />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("ENGINEALLOWDUPLICATES")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Playlist.AllowDuplicates" handleChange={this.onChange}
                isChecked={this.state.settings["Playlist.AllowDuplicates"]} />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("ENGINEALLOWDUPLICATESSERIES")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Playlist.AllowDuplicateSeries" handleChange={this.onChange}
                isChecked={this.state.settings["Playlist.AllowDuplicateSeries"]} />
            </div>
          </div>
          <div className="form-group">
            <label className="col-xs-4 control-label" title={i18next.t("CLASSIC_MODE_TOOLTIP")}>
              {i18next.t("CLASSIC_MODE")}
              &nbsp;
              <i className="far fa-question-circle"></i>
            </label>
            <div className="col-xs-6">
              <Switch idInput="Karaoke.ClassicMode" handleChange={this.onChange}
                isChecked={this.state.settings["Karaoke.ClassicMode"]} />
            </div>
          </div>
          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("STREAM_MODE")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Karaoke.StreamerMode.Enabled" handleChange={this.onChange}
                isChecked={this.state.settings["Karaoke.StreamerMode.Enabled"]} />
            </div>
          </div>
          {this.state.settings["Karaoke.StreamerMode.Enabled"] ?
            <div
              id="streamSettings"
              className="well well-sm settingsGroupPanel"
            >
              <div className="form-group">
                <label className="col-xs-4 control-label">
                  {i18next.t("STREAM_PAUSE_DURATION")}
                </label>
                <div className="col-xs-6">
                  <input
                    type="number"
                    className="form-control"
                    id="Karaoke.StreamerMode.PauseDuration"
                    placeholder="20"
                    onChange={this.onChange}
                    value={this.state.settings["Karaoke.StreamerMode.PauseDuration"]}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="col-xs-4 control-label">
                  {i18next.t("STREAM_TWITCH")}
                </label>
                <div className="col-xs-6">
                  <Switch idInput="Karaoke.StreamerMode.Twitch.Enabled" handleChange={this.onChange}
                    isChecked={this.state.settings["Karaoke.StreamerMode.Twitch.Enabled"]} />
                </div>
              </div>
              {this.state.settings["Karaoke.StreamerMode.Twitch.Enabled"] ?
                <div
                  id="twitchSettings"
                  className="well well-sm settingsGroupPanel"
                >
                  <div className="form-group">
                    <a className="col-xs-4 control-label" href="https://twitchapps.com/tmi/" target='_blank'>{i18next.t("STREAM_TWITCH_OAUTH_TOKEN_GET")}</a>
                  </div>
                  <div className="form-group">
                    <label className="col-xs-4 control-label">
                      {i18next.t("STREAM_TWITCH_OAUTH_TOKEN")}
                    </label>
                    <div className="col-xs-6">
                      <input type="password"
                        data-exclude="true"
                        className="form-control"
                        id="Karaoke.StreamerMode.Twitch.OAuth"
                        onChange={this.onChange}
                        value={this.state.settings["Karaoke.StreamerMode.Twitch.OAuth"]}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="col-xs-4 control-label">
                      {i18next.t("STREAM_TWITCH_CHANNEL")}
                    </label>
                    <div className="col-xs-6">
                      <input
                        className="form-control"
                        id="Karaoke.StreamerMode.Twitch.Channel"
                        onChange={this.onChange}
                        value={this.state.settings["Karaoke.StreamerMode.Twitch.Channel"]}
                      />
                    </div>
                  </div>
                </div> : null
              }
            </div> : null
          }

          <div className="form-group settingsGroupPanel subCategoryGroupPanel">
            <div className="col-xs-12" style={{ textAlign: "center" }}>
              {i18next.t("MYSTERY_SONG_SETTINGS")}
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("ENGINE_HIDE_INVISIBLE_SONGS")}
            </label>
            <div className="col-xs-6">
              <select
                className="form-control"
                id="Playlist.MysterySongs.Hide"
                onChange={this.onChange}
                value={this.state.settings["Playlist.MysterySongs.Hide"]}
              >
                <option value={true}> {i18next.t("ENGINE_HIDE_INVISIBLE_SONGS_HIDDEN_OPTION")} </option>
                <option value={false}>???</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label" title={i18next.t("ENGINE_ADDED_SONG_VISIBILITY_ADMIN_TOOLTIP")}>
              {i18next.t("ENGINE_ADDED_SONG_VISIBILITY_ADMIN")}
              &nbsp;
              <i className="far fa-question-circle"></i>
            </label>
            <div className="col-xs-6">
              <select
                className="form-control"
                id="Playlist.MysterySongs.AddedSongVisibilityAdmin"
                onChange={this.onChange}
                value={this.state.settings["Playlist.MysterySongs.AddedSongVisibilityAdmin"]}
              >
                <option value={false}> {i18next.t("ENGINE_ADDED_SONG_VISIBILITY_MYSTERY_OPTION")} </option>
                <option value={true}> {i18next.t("ENGINE_ADDED_SONG_VISIBILITY_NORMAL_OPTION")} </option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label" title={i18next.t("ENGINE_ADDED_SONG_VISIBILITY_PUBLIC_TOOLTIP")}>
              {i18next.t("ENGINE_ADDED_SONG_VISIBILITY_PUBLIC")}
              &nbsp;
              <i className="far fa-question-circle"></i>
            </label>
            <div className="col-xs-6">
              <select
                className="form-control"
                id="Playlist.MysterySongs.AddedSongVisibilityPublic"
                onChange={this.onChange}
                value={this.state.settings["Playlist.MysterySongs.AddedSongVisibilityPublic"]}
              >
                <option value={false}> {i18next.t("ENGINE_ADDED_SONG_VISIBILITY_MYSTERY_OPTION")} </option>
                <option value={true}> {i18next.t("ENGINE_ADDED_SONG_VISIBILITY_NORMAL_OPTION")} </option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("ENGINE_LABELS_MYSTERY_SONGS")}
            </label>
            <div className="col-xs-6">
              <div>
                <input value={this.state.mysterySongLabel} style={{ margin: "10px", color: "#555" }}
                  onChange={e => this.setState({ mysterySongLabel: e.target.value })} />
                <button type="button" className="btn btn-default" onClick={this.addMysterySongLabel}>{i18next.t("ENGINE_LABELS_MYSTERY_SONGS_ADD")}</button>
              </div>
              {this.state.settings["Playlist.MysterySongs.Labels"].map(value => {
                return (
                  <div key={value}>
                    <label style={{ margin: "10px" }}>{value}</label>
                    <button type="button" className="btn btn-default"
                      onClick={() => this.deleteMysterySongLabel(value)}>{i18next.t("ENGINE_LABELS_MYSTERY_SONGS_DELETE")}</button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="form-group settingsGroupPanel subCategoryGroupPanel">
          <div className="col-xs-12" style={{ textAlign: "center" }}>
            {i18next.t("ONLINESETTINGS")}
          </div>
        </div>

        <div id="nav-karaokeOnlineSettings">
          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("ONLINEURL")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Online.URL" handleChange={this.onChange}
                isChecked={this.state.settings["Online.URL"]} />
            </div>
          </div>
          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("ONLINEUSERS")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Online.Users" handleChange={this.onChange}
                isChecked={this.state.settings["Online.Users"]} />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("ONLINESTATS")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Online.Stats" handleChange={this.onChange}
                isChecked={this.state.settings["Online.Stats"]} />
            </div>
          </div>

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("CHECK_APP_UPDATES")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Online.Updates" handleChange={this.onChange}
                isChecked={this.state.settings["Online.Updates"]} />
            </div>
          </div>
          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("AUTO_UPDATE_JINGLES")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Online.JinglesUpdate" handleChange={this.onChange}
                isChecked={this.state.settings["Online.JinglesUpdate"]} />
            </div>
          </div>
        </div>
        <div className="form-group settingsGroupPanel subCategoryGroupPanel">
          <div className="col-xs-12" style={{ textAlign: "center" }}>
            {i18next.t("PUBLICMODESETTINGS")}
          </div>
        </div>

        <div id="nav-karaokePublicMode">
          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("ENGINEFREEUPVOTES")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Karaoke.Quota.FreeUpVote" handleChange={this.onChange}
                isChecked={this.state.settings["Karaoke.Quota.FreeUpVote"]} />
            </div>
          </div>
          {this.state.settings["Karaoke.Quota.FreeUpVote"] ?
            <div
              id="freeUpvotesSettings"
              className="well well-sm settingsGroupPanel"
            >
              <div className="form-group">
                <label className="col-xs-4 control-label">
                  {i18next.t("ENGINEFREEUPVOTESREQUIREDMIN")}
                </label>
                <div className="col-xs-6">
                  <input
                    className="form-control"
                    type="number"
                    id="Karaoke.Quota.FreeUpVotesRequiredMin"
                    onChange={this.onChange}
                    value={this.state.settings["Karaoke.Quota.FreeUpVotesRequiredMin"]}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="col-xs-4 control-label" title={i18next.t("ENGINEFREEUPVOTESREQUIREDPERCENT_TOOLTIP")}>
                  {i18next.t("ENGINEFREEUPVOTESREQUIREDPERCENT")}
                  &nbsp;
                  <i className="far fa-question-circle"></i>
                </label>
                <div className="col-xs-6">
                  <input
                    className="form-control"
                    type="number"
                    id="Karaoke.Quota.FreeUpVotesRequiredPercent"
                    onChange={this.onChange}
                    value={this.state.settings["Karaoke.Quota.FreeUpVotesRequiredPercent"]}
                  />
                </div>
              </div>
            </div> : null}

          <div className="form-group">
            <label className="col-xs-4 control-label">
              {i18next.t("ENGINESONGPOLL")}
            </label>
            <div className="col-xs-6">
              <Switch idInput="Karaoke.Poll.Enabled" handleChange={this.onChange}
                isChecked={this.state.settings["Karaoke.Poll.Enabled"]} />
            </div>
          </div>

          {this.state.settings["Karaoke.Poll.Enabled"] ?
            <div id="songPollSettings" className="well well-sm settingsGroupPanel">
              <div className="form-group">
                <label className="col-xs-4 control-label">
                  {i18next.t("ENGINESONGPOLLCHOICES")}
                </label>
                <div className="col-xs-6">
                  <input
                    className="form-control"
                    type="number"
                    id="Karaoke.Poll.Choices"
                    onChange={this.onChange}
                    value={this.state.settings["Karaoke.Poll.Choices"]}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="col-xs-4 control-label">
                  {i18next.t("ENGINESONGPOLLTIMEOUT")}
                </label>
                <div className="col-xs-6">
                  <input
                    className="form-control"
                    type="number"
                    id="Karaoke.Poll.Timeout"
                    onChange={this.onChange}
                    value={this.state.settings["Karaoke.Poll.Timeout"]}
                  />
                </div>
              </div>
            </div> : null}
        </div>
        <input
          id="App.FirstRun"
          className="hideInput hidden"
          onChange={this.onChange}
          value={this.state.settings["App.FirstRun"]}
        />
      </React.Fragment>
    );
  };
}

export default KaraokeOptions;
