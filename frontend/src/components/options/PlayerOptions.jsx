import React, { Component } from "react";
import { withTranslation } from 'react-i18next';

class PlayerOptions extends Component {

  render() {
    const t = this.props.t;
    var settings = this.props.settings;
    if (settings.Karaoke && settings.Karaoke.Display.ConnectionInfo.Host === null)
      settings.Karaoke.Display.ConnectionInfo.Host = '';
    const listdisplays =
      this.props.displays.length > 0
        ? this.props.displays.map(display, index => (
          <option value={index} >
            {" "}
            ({display.resolutionx}x{display.resolutiony}) {display.model}
          </option>
        ))
        : null;
    return (settings.Player ?
      <>
        <div className="form-group">
          <label htmlFor="Player.StayOnTop" className="col-xs-4 control-label">
            {t("ALWAYS_ON_TOP")}
          </label>
          <div className="col-xs-6">
            <input
              action="command"
              type="checkbox"
              id="Player.StayOnTop"
              namecommand="toggleAlwaysOnTop"
              onChange={this.props.onChange}
              checked={settings.Player.StayOnTop}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="Player.FullScreen" className="col-xs-4 control-label">
            {t("FULLSCREEN")}
          </label>
          <div className="col-xs-6">
            <input
              action="command"
              type="checkbox"
              id="Player.FullScreen"
              namecommand="toggleFullscreen"
              onChange={this.props.onChange}
              checked={settings.Player.FullScreen}

            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="Player.Screen" className="col-xs-4 control-label">
            {t("MONITOR_NUMBER")}
          </label>
          <div className="col-xs-6">
            <select
              type="number"
              className="form-control"
              id="Player.Screen"
              onChange={this.props.onChange}
              value={settings.Player.Screen}
            >
              {listdisplays}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label
            htmlFor="Karaoke.Display.ConnectionInfo.Enabled"
            className="col-xs-4 control-label"
          >
            {t("ENGINEDISPLAYCONNECTIONINFO")}
          </label>
          <div className="col-xs-6">
            {" "}
            <input
              type="checkbox"
              id="Karaoke.Display.ConnectionInfo.Enabled"
              onChange={this.props.onChange}
              checked={settings.Karaoke.Display.ConnectionInfo.Enabled}
            />
          </div>
        </div>

        {settings.Karaoke.Display.ConnectionInfo.Enabled ? (
          <div
            id="connexionInfoSettings"
            className="well well-sm settingsGroupPanel"
          >
            <div className="form-group">
              <label
                className="col-xs-4 control-label"
                htmlFor="Karaoke.Display.ConnectionInfo.QRCode"
              >
                {t("ENGINEDISPLAYCONNECTIONINFOQRCODE")}
              </label>
              <div className="col-xs-6">
                <input
                  id="Karaoke.Display.ConnectionInfo.QRCode"
                  type="checkbox"
                  onChange={this.props.onChange}
                  checked={settings.Karaoke.Display.ConnectionInfo.QRCode}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label
                htmlFor="Karaoke.Display.ConnectionInfo.Host"
                className="col-xs-4 control-label"
              >
                {t("ENGINEDISPLAYCONNECTIONINFOHOST")}
              </label>
              <div className="col-xs-6">
                <input
                  className="form-control"
                  id="Karaoke.Display.ConnectionInfo.Host"
                  onChange={this.props.onChange}
                  value={settings.Karaoke.Display.ConnectionInfo.Host}
                />
              </div>
            </div>

            <div className="form-group">
              <label
                htmlFor="Karaoke.Display.ConnectionInfo.Message"
                className="col-xs-4 control-label"
              >
                {t("ENGINEDISPLAYCONNECTIONINFOMESSAGE")}
              </label>
              <div className="col-xs-6">
                <input
                  className="form-control"
                  id="Karaoke.Display.ConnectionInfo.Message"
                  onChange={this.props.onChange}
                  value={settings.Karaoke.Display.ConnectionInfo.Message}
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="form-group">
          <label htmlFor="Player.PIP.Enabled" className="col-xs-4 control-label">
            {t("PLAYERPIP")}
          </label>
          <div className="col-xs-6">
            {" "}
            <input
              type="checkbox"
              id="Player.PIP.Enabled"
              onChange={this.props.onChange}
              checked={settings.Player.PIP.Enabled}
            />
          </div>
        </div>
        {settings.Player.PIP.Enabled ?
          <div id="pipSettings" className="well well-sm settingsGroupPanel">
            <div className="form-group">
              <label htmlFor="Player.PIP.Size" className="col-xs-4 control-label">
                {t("VIDEO_SIZE")+" ("+settings.Player.PIP.Size+"%)"}
              </label>
              <div className="col-xs-6">
                <input
                  type="range"
                  id="Player.PIP.Size"
                  onChange={this.props.onChange}
                  value={settings.Player.PIP.Size}
                />
              </div>
            </div>

            <div className="form-group">
              <label
                htmlFor="Player.PIP.PositionX"
                className="col-xs-4 control-label"
              >
                {t("VIDEO_POSITION_X")}
              </label>
              <div className="col-xs-6">
                <select
                  className="form-control"
                  id="Player.PIP.PositionX"
                  onChange={this.props.onChange}
                  value={settings.Player.PIP.PositionX}
                >
                  <option value="Left"> {t("LEFT")} </option>
                  <option value="Center" default>
                    {" "}
                    {t("CENTER")}{" "}
                  </option>
                  <option value="Right"> {t("RIGHT")} </option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label
                htmlFor="Player.PIP.PositionY"
                className="col-xs-4 control-label"
              >
                {t("VIDEO_POSITION_Y")}
              </label>
              <div className="col-xs-6">
                <select
                  className="form-control"
                  id="Player.PIP.PositionY"
                  onChange={this.props.onChange}
                  value={settings.Player.PIP.PositionY}
                >
                  <option value="Bottom"> {t("BOTTOM")} </option>
                  <option value="Center" default>
                    {" "}
                    {t("CENTER")}{" "}
                  </option>
                  <option value="Top"> {t("TOP")} </option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label
                htmlFor="Karaoke.Display.Nickname"
                className="col-xs-4 control-label"
              >
                {t("ENGINEDISPLAYNICKNAME")}
              </label>
              <div className="col-xs-6">
                {" "}
                <input
                  type="checkbox"
                  id="Karaoke.Display.Nickname"
                  onChange={this.props.onChange}
                  checked={settings.Karaoke.Display.Nickname}
                />
              </div>
            </div>

            <div className="form-group">
              <label
                htmlFor="Karaoke.Display.Avatar"
                className="col-xs-4 control-label"
              >
                {t("ENGINEDISPLAYAVATAR")}
              </label>
              <div className="col-xs-6">
                {" "}
                <input
                  type="checkbox"
                  id="Karaoke.Display.Avatar"
                  onChange={this.props.onChange}
                  checked={settings.Karaoke.Display.Avatar}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="Player.Monitor" className="col-xs-4 control-label">
                {t("PLAYERMONITOR")}
              </label>
              <div className="col-xs-6">
                {" "}
                <input
                  type="checkbox"
                  id="Player.Monitor"
                  onChange={this.props.onChange}
                  checked={settings.Player.Monitor}
                />
              </div>
            </div>

            <div className="form-group">
              <label
                htmlFor="Player.VisualizationEffects"
                className="col-xs-4 control-label"
              >
                {t("PLAYERVISUALIZATIONEFFECTS")}
              </label>
              <div className="col-xs-6">
                {" "}
                <input
                  type="checkbox"
                  id="Player.VisualizationEffects"
                  onChange={this.props.onChange}
                  checked={settings.Player.VisualizationEffects}
                />
              </div>
            </div>
          </div> : null}
      </> : null
    );
  }
}

export default withTranslation()(PlayerOptions);
