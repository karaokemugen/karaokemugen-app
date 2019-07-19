import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import Switch from '../Switch';
import axios from 'axios';
require('babel-polyfill');

class PlayerOptions extends Component {
  constructor(props) {
    super(props);
    this.putPlayerCommando = this.putPlayerCommando.bind(this);
    this.getDisplays = this.getDisplays.bind(this);

    this.state = {
      displays: this.getDisplays()
    };
  }

  async getDisplays() {
    const res = await axios.get('/api/admin/displays');
    this.setState({ displays: res.data.data })
  }

  putPlayerCommando(event) {
    axios.put('/api/admin/player', {
      command: event.target.getAttribute('namecommand')
    });
    this.props.onChange(event);
  }

  render() {
    const t = this.props.t;
    var settings = this.props.settings;
    if (settings.Karaoke && settings.Karaoke.Display.ConnectionInfo.Host === null)
      settings.Karaoke.Display.ConnectionInfo.Host = '';
    const listdisplays =
      this.state.displays && this.state.displays.length > 0
        ? this.state.displays.map((display, index) => (
          <option key={index} value={index} >
            {" "}
            {index+1} - ({display.resolutionx}x{display.resolutiony}) {display.model}
          </option>
        ))
        : null;
    return (settings.Player ?
      <>
        <div className="form-group">
          <label className="col-xs-4 control-label">
            {t("ALWAYS_ON_TOP")}
          </label>
          <div className="col-xs-6">
            <Switch idInput="Player.StayOnTop" handleChange={this.putPlayerCommando}
              isChecked={settings.Player.StayOnTop} nameCommand="toggleAlwaysOnTop" />
          </div>
        </div>
        <div className="form-group">
          <label className="col-xs-4 control-label">
            {t("FULLSCREEN")}
          </label>
          <div className="col-xs-6">
            <Switch idInput="Player.FullScreen" handleChange={this.putPlayerCommando}
              isChecked={settings.Player.FullScreen} nameCommand="toggleFullscreen" />
          </div>
        </div>
        <div className="form-group">
          <label className="col-xs-4 control-label">
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
          <label className="col-xs-4 control-label">
            {t("ENGINEDISPLAYCONNECTIONINFO")}
          </label>
          <div className="col-xs-6">
            <Switch idInput="Karaoke.Display.ConnectionInfo.Enabled" handleChange={this.props.onChange}
              isChecked={settings.Karaoke.Display.ConnectionInfo.Enabled} />
          </div>
        </div>

        {settings.Karaoke.Display.ConnectionInfo.Enabled ? (
          <div
            id="connexionInfoSettings"
            className="well well-sm settingsGroupPanel"
          >
            <div className="form-group">
              <label className="col-xs-4 control-label">
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
              <label className="col-xs-4 control-label">
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
          <label className="col-xs-4 control-label">
            {t("PLAYERPIP")}
          </label>
          <div className="col-xs-6">
            <Switch idInput="Player.PIP.Enabled" handleChange={this.props.onChange}
              isChecked={settings.Player.PIP.Enabled} />
          </div>
        </div>
        {settings.Player.PIP.Enabled ?
          <div id="pipSettings" className="well well-sm settingsGroupPanel">
            <div className="form-group">
              <label className="col-xs-4 control-label">
                {t("VIDEO_SIZE") + " (" + settings.Player.PIP.Size + "%)"}
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
              <label className="col-xs-4 control-label">
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
                  <option value="Center" default>{t("CENTER")}</option>
                  <option value="Right"> {t("RIGHT")} </option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="col-xs-4 control-label">
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
                  <option value="Center" default>{t("CENTER")}</option>
                  <option value="Top"> {t("TOP")} </option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="col-xs-4 control-label">
                {t("ENGINEDISPLAYNICKNAME")}
              </label>
              <div className="col-xs-6">
                <Switch idInput="Karaoke.Display.Nickname" handleChange={this.props.onChange}
                  isChecked={settings.Karaoke.Display.Nickname} />
              </div>
            </div>

            <div className="form-group">
              <label className="col-xs-4 control-label">
                {t("ENGINEDISPLAYAVATAR")}
              </label>
              <div className="col-xs-6">
                <Switch idInput="Karaoke.Display.Avatar" handleChange={this.props.onChange}
                  isChecked={settings.Karaoke.Display.Avatar} />
              </div>
            </div>

            <div className="form-group">
              <label className="col-xs-4 control-label">
                {t("PLAYERMONITOR")}
              </label>
              <div className="col-xs-6">
                <Switch idInput="Player.Monitor" handleChange={this.props.onChange}
                  isChecked={settings.Player.Monitor} />
              </div>
            </div>

            <div className="form-group">
              <label className="col-xs-4 control-label">
                {t("PLAYERVISUALIZATIONEFFECTS")}
              </label>
              <div className="col-xs-6">
                <Switch idInput="Player.VisualizationEffects" handleChange={this.props.onChange}
                  isChecked={settings.Player.VisualizationEffects} />
              </div>
            </div>
          </div> : null}
      </> : null
    );
  }
}

export default withTranslation()(PlayerOptions);
