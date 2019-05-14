import React from "react";
import { useTranslation } from "react-i18next";

var PlayerOptions = props => {
  const { t } = useTranslation();

  const listdisplays =
    props.displays.length > 0
      ? props.displays.map(display, index => (
          <option value={index}>
            {" "}
            ({display.resolutionx}x{display.resolutiony}) {display.model}
          </option>
        ))
      : null;
  return (
    <>
      <div className="form-group">
        <label htmlFor="Player.StayOnTop" className="col-xs-4 control-label">
          {t("ALWAYS_ON_TOP")}
        </label>
        <div className="col-xs-6">
          <input
            action="command"
            switch="onoff"
            type="checkbox"
            name="Player.StayOnTop"
            namecommand="toggleAlwaysOnTop"
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
            switch="onoff"
            type="checkbox"
            name="Player.FullScreen"
            namecommand="toggleFullscreen"
          />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="Player.Screen" className="col-xs-4 control-label">
          {t("MONITOR_NUMBER")}
        </label>
        <div className="col-xs-6">
          <select type="number" className="form-control" name="Player.Screen">
            {listdisplays}
          </select>
        </div>
      </div>

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
              name="Karaoke.Display.ConnectionInfo.QRCode"
              type="checkbox"
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
              name="Karaoke.Display.ConnectionInfo.Host"
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
              name="Karaoke.Display.ConnectionInfo.Message"
            />
          </div>
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="Player.PIP.Enabled" className="col-xs-4 control-label">
          {t("PLAYERPIP")}
        </label>
        <div className="col-xs-6">
          {" "}
          <input switch="onoff" type="checkbox" name="Player.PIP.Enabled" />
        </div>
      </div>

      <div id="pipSettings" className="well well-sm settingsGroupPanel">
        <div className="form-group">
          <label htmlFor="Player.PIP.Size" className="col-xs-4 control-label">
            {t("VIDEO_SIZE")}
          </label>
          <div className="col-xs-6">
            <input type="range" name="Player.PIP.Size" />
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
            <select className="form-control" name="Player.PIP.PositionX">
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
            <select className="form-control" name="Player.PIP.PositionY">
              <option value="Bottom"> {t("BOTTOM")} </option>
              <option value="Center" default>
                {" "}
                {t("CENTER")}{" "}
              </option>
              <option value="Top"> {t("TOP")} </option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayerOptions;
