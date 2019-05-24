import React from "react";
import { useTranslation } from "react-i18next";

var KaraokeOptions = props => {
  const { t } = useTranslation();
  return (
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
              name="Karaoke.Quota.Type"
              value={props.settings.Karaoke.Quota.Type}
            >
              <option value="0"> {t("QUOTA_TYPE_0")} </option>
              <option value="1"> {t("QUOTA_TYPE_1")} </option>
              <option value="2"> {t("QUOTA_TYPE_2")} </option>
            </select>
          </div>
        </div>
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
              name="Karaoke.Quota.Time"
              placeholder="1000"
              value={props.settings.Karaoke.Quota.Time}
            />
          </div>
        </div>
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
              name="Karaoke.Quota.Songs"
              placeholder="1000"
              value={props.settings.Karaoke.Quota.Songs}
            />
          </div>
        </div>
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
              name="Karaoke.Quota.FreeAutoTime"
              placeholder="1000"
              value={props.settings.Karaoke.Quota.FreeAutoTime}
            />
          </div>
        </div>
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
              name="Karaoke.JinglesInterval"
              placeholder="20"
              value={props.settings.Karaoke.JinglesInterval}
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
              onChange={props.onChange}
              value={props.settings.Karaoke.Repeat}
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
              onChange={props.onChange}
              value={props.settings.Karaoke.SmartInsert}
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
              onChange={props.onChange}
              value={props.settings.Karaoke.Autoplay}
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
              onChange={props.onChange}
              value={props.settings.Playlist.AllowDuplicates}
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
              onChange={props.onChange}
              value={props.settings.Online.URL}
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
              onChange={props.onChange}
              value={props.settings.Online.Users}
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
              onChange={props.onChange}
              value={props.settings.Online.Stats}
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
                name="Karaoke.Quota.FreeUpVotesRequiredMin"
                value={props.settings.Quota.FreeUpVotesRequiredMin}
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
                name="Karaoke.Quota.FreeUpVotesRequiredPercent"
                value={props.settings.Quota.FreeUpVotesRequiredPercent}
              />
            </div>
          </div>
        </div>

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
              onChange={props.onChange}
              value={props.settings.Poll.Enabled}
            />
          </div>
        </div>

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
                name="Karaoke.Poll.Choices"
                value={props.settings.Poll.Choices}
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
                name="Karaoke.Poll.Timeout"
                value={props.settings.Poll.Timeout}
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
                onChange={props.onChange}
                value={props.settings.Quota.FreeUpVote}
              />
            </div>
          </div>
        </div>
      </div>
      <input
        name="App.FirstRun"
        className="hideInput hidden"
        value={props.settings.App.FirstRun}
      />
    </>
  );
};

export default KaraokeOptions;
