import React, { Component } from "react";
import { withTranslation } from 'react-i18next';

class KaraokeOptions extends Component {

  render() {
    const t = this.props.t;
    var settings = this.props.settings;
    return (settings.Karaoke ?
      <>
        <div id="nav-karaokeAllMode">
          <div className="form-group">
            <label
              htmlFor="Karaoke.Quota.Type"
              className="col-xs-4 control-label"
            >
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
          {settings.Karaoke.Quota.Type === "2" ?
            <div className="form-group">
              <label
                htmlFor="Karaoke.Quota.Time"
                className="col-xs-4 control-label"
              >
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

          {settings.Karaoke.Quota.Type === "1" ?
            <div className="form-group">
              <label
                htmlFor="Karaoke.Quota.Songs"
                className="col-xs-4 control-label"
              >
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

          {settings.Karaoke.Quota.Type !== "0" ?
            <div className="form-group">
              <label
                htmlFor="Karaoke.Quota.FreeAutoTime"
                className="col-xs-4 control-label"
              >
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
            <label
              htmlFor="Karaoke.JinglesInterval"
              className="col-xs-4 control-label"
            >
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
            <label htmlFor="Karaoke.Repeat" className="col-xs-4 control-label">
              {t("ENGINEREPEATPLAYLIST")}
            </label>
            <div className="col-xs-6">
              {" "}
              <input
                type="checkbox"
                id="Karaoke.Repeat"
                onChange={this.props.onChange}
                checked={settings.Karaoke.Repeat}
              />
            </div>
          </div>

          <div className="form-group">
            <label
              htmlFor="Karaoke.SmartInsert"
              className="col-xs-4 control-label"
            >
              {t("ENGINEENABLESMARTINSERT")}
            </label>
            <div className="col-xs-6">
              {" "}
              <input
                type="checkbox"
                id="Karaoke.SmartInsert"
                onChange={this.props.onChange}
                checked={settings.Karaoke.SmartInsert}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="Karaoke.Autoplay" className="col-xs-4 control-label">
              {t("ENGINEAUTOPLAY")}
            </label>
            <div className="col-xs-6">
              {" "}
              <input
                type="checkbox"
                id="Karaoke.Autoplay"
                onChange={this.props.onChange}
                checked={settings.Karaoke.Autoplay}
              />
            </div>
          </div>

          <div className="form-group">
            <label
              htmlFor="Playlist.AllowDuplicates"
              className="col-xs-4 control-label"
            >
              {t("ENGINEALLOWDUPLICATES")}
            </label>
            <div className="col-xs-6">
              {" "}
              <input
                type="checkbox"
                id="Playlist.AllowDuplicates"
                onChange={this.props.onChange}
                checked={settings.Playlist.AllowDuplicates}
              />
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
            <label htmlFor="Online.URL" className="col-xs-4 control-label">
              {t("ONLINEURL")}
            </label>
            <div className="col-xs-6">
              {" "}
              <input
                type="checkbox"
                id="Online.URL"
                onChange={this.props.onChange}
                checked={settings.Online.URL}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="Online.Users" className="col-xs-4 control-label">
              {t("ONLINEUSERS")}
            </label>
            <div className="col-xs-6">
              {" "}
              <input
                type="checkbox"
                id="Online.Users"
                onChange={this.props.onChange}
                checked={settings.Online.Users}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="Online.Stats" className="col-xs-4 control-label">
              {t("ONLINESTATS")}
            </label>
            <div className="col-xs-6">
              {" "}
              <input
                type="checkbox"
                id="Online.Stats"
                onChange={this.props.onChange}
                checked={settings.Online.Stats}
              />
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
                <label
                  className="col-xs-4 control-label"
                  htmlFor="Karaoke.Quota.FreeUpVotesRequiredMin"
                >
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
                <label
                  htmlFor="Karaoke.Quota.FreeUpVotesRequiredPercent"
                  className="col-xs-4 control-label"
                >
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
            <label
              htmlFor="Karaoke.Poll.Enabled"
              className="col-xs-4 control-label"
            >
              {t("ENGINESONGPOLL")}
            </label>
            <div className="col-xs-6">
              {" "}
              <input
                type="checkbox"
                id="Karaoke.Poll.Enabled"
                onChange={this.props.onChange}
                checked={settings.Karaoke.Poll.Enabled}
              />
            </div>
          </div>

          {settings.Karaoke.Poll.Enabled ?
            <div id="songPollSettings" className="well well-sm settingsGroupPanel">
              <div className="form-group">
                <label
                  className="col-xs-4 control-label"
                  htmlFor="Karaoke.Poll.Choices"
                >
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
                <label
                  htmlFor="Karaoke.Poll.Timeout"
                  className="col-xs-4 control-label"
                >
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
                <label
                  htmlFor="Karaoke.Quota.FreeUpVote"
                  className="col-xs-4 control-label"
                >
                  {t("ENGINEFREEUPVOTES")}
                </label>
                <div className="col-xs-6">
                  {" "}
                  <input
                    type="checkbox"
                    id="Karaoke.Quota.FreeUpVote"
                    onChange={this.props.onChange}
                    checked={settings.Karaoke.Quota.FreeUpVote}
                  />
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