import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import { expand } from "./toolsReact";
import axios from "axios";
import RadioButton from "./RadioButton.jsx";

class AdminHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      privateMode: Boolean(this.props.config.Karaoke.Private),
      statusPlayer: {}
    };
    this.saveMode = this.saveMode.bind(this);
    this.adminMessage = this.adminMessage.bind(this);
    window.socket.on("playerStatus", data => {
      var val = parseInt(data.volume);
      var base = 100;
      var pow = 0.76;
      val = val / base;
      data.volume = base * Math.pow(val, 1 / pow);
      this.setState({ statusPlayer: data });
    });
  }

  async saveMode(mode) {
    var data = expand("Karaoke.Private", mode);
    this.setState({ privateMode: mode });
    await axios.put("/api/admin/settings", { setting: JSON.stringify(data) });
  }

  putPlayerCommando(event) {
    var namecommand = event.currentTarget.getAttribute("namecommand");
    var data;
    if (namecommand === "setVolume") {
      var volume = parseInt(event.currentTarget.value);
      var base = 100;
      var pow = 0.76;
      volume = Math.pow(volume, pow) / Math.pow(base, pow);
      volume = volume * base;
      data = {
        command: namecommand,
        options: volume
      };
    } else {
      data = {
        command: namecommand
      };
    }
    axios.put("/api/admin/player", data);
  }

  adminMessage() {
    this.props.callModal(
      "custom",
      "Message indispensable",
      '<select class="form-control" name="destination"><option value="screen">' +
        this.props.t("CL_SCREEN") +
        "</option>" +
        '<option value="users">' +
        this.props.t("CL_USERS") +
        '</option><option value="all">' +
        this.props.t("CL_ALL") +
        "</option></select>" +
        '<input type="text"name="duration" placeholder="5000 (ms)"/>' +
        '<input type="text" placeholder="Message" class="form-control" id="message" name="message">',
      function(data) {
        var defaultDuration = 5000;
        var msgData = {
          message: data.message,
          destination: data.destination,
          duration:
            !data.duration || isNaN(data.duration)
              ? defaultDuration
              : data.duration
        };
        axios.post("/api/admin/player/message", msgData);
      }
    );
  }

  render() {
    const t = this.props.t;
    return (
      <React.Fragment>
        <div
          id="header"
          className="header"
        >
          <div
            className="dropdown btn btn-default btn-dark pull-right"
            id="manageButton"
          >
            <button
              className="btn btn-dark pull-right dropdown-toggle klogo"
              type="button"
              id="dropdownMenu1"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="true"
            />
            <ul className="dropdown-menu" aria-labelledby="dropdownMenu1">
              <li
                title={t("ACCOUNT")}
                action="account"
                className="btn btn-default btn-dark"
                onClick={this.props.toggleProfileModal}
              >
                <i className="glyphicon glyphicon-user" />
              </li>
              <li
                title={t("LOGOUT")} onClick={this.props.logOut}
                className="btn btn-default btn-dark"
              >
                <i className="glyphicon glyphicon-log-out" />
              </li>
              <li
                title={t("SHUTDOWN")}
                className="btn btn-default btn-dark"
                onClick={this.props.powerOff}
              >
                <i className="glyphicon glyphicon-off" />
              </li>
            </ul>
          </div>

          <a
            title={t("MUTE_UNMUTE")}
            id="mutestatus"
            name="mute"
            className="btn btn-default btn-dark pull-right"
          >
            {this.state.statusPlayer.mutestatus ? (
              <i className="glyphicon glyphicon-volume-off mute" />
            ) : (
              <i className="glyphicon glyphicon-volume-up unmute" />
            )}
            <input
              title={t("VOLUME_LEVEL")}
              namecommand="setVolume"
              id="volume"
              defaultValue={
                this.state.statusPlayer.volume
                  ? this.state.statusPlayer.volume
                  : 100
              }
              type="range"
              onMouseLeave={this.putPlayerCommando}
            />
          </a>
          <button
            title={t("SHOW_HIDE_SUBS")}
            id="showSubs"
            namecommand={this.state.statusPlayer.showSubs ? "hideSubs" : "showSubs"}
            className="btn btn-default btn-dark pull-right"
            onClick={this.putPlayerCommando}
          >
            {this.state.statusPlayer.showSubs ? (
              <i className="glyphicon glyphicon-subtitles hideSubs" />
            ) : (
              <i className="glyphicon glyphicon glyphicon-question-sign showSubs" />
            )}
          </button>

          <button
            title={t("MESSAGE")}
            id="adminMessage"
            className="btn btn-dark pull-right"
            style={{ borderLeftWidth: "0px" }}
            onClick={this.adminMessage}
          >
            <i className="glyphicon glyphicon-comment" />
          </button>

          <div className="pull-left btn-group switchs">
            <RadioButton
              title={t("SWITCH_PRIVATE")}
              name="Karaoke.Private"
              buttons={[
                {
                  label:t("PRIVATE"),
                  active:this.state.privateMode,
                  activeColor:"#994240",
                  onClick:() => this.saveMode(true),
                  
                },
                {
                  label:t("PUBLIC"),
                  active:!this.state.privateMode,
                  activeColor:"#57bb00",
                  onClick:() => this.saveMode(false),
                  
                }
              ]}
            ></RadioButton>

            <RadioButton
              title={t("SWITCH_OPTIONS")}
              name="optionsButton"
              buttons={[
                {
                  label:t("CL_PLAYLISTS"),
                  active:!this.props.options,
                  onClick:this.props.setOptionMode,
                },
                {
                  label:t("OPTIONS"),
                  active:this.props.options,
                  onClick:this.props.setOptionMode,
                  
                }
              ]}
            ></RadioButton>
          </div>
          <div className="pull-left btn-group">
            <button
              title={t("STOP_AFTER")}
              id="stopAfter"
              namecommand="stopAfter"
              className="btn btn-danger-low"
              style={{ width: "50px" }}
              onClick={this.putPlayerCommando}
            >
              <i className="glyphicon glyphicon-stop" />
              <i className="glyphicon glyphicon-time secondaryIcon" />
            </button>
            <button
              title={t("STOP_NOW")}
              id="stopNow"
              namecommand="stopNow"
              className="btn btn-danger"
              onClick={this.putPlayerCommando}
            >
              {" "}
              <i className="glyphicon glyphicon-stop" />
            </button>
            <button
              title={t("REWIND")}
              id="goTo"
              namecommand="goTo"
              defaultValue="0"
              className="btn btn-dark"
              onClick={this.putPlayerCommando}
            >
              <i className="glyphicon glyphicon-fast-backward" />
            </button>
          </div>
          <div className="btn-group centerBtns">
            <button
              title={t("REWIND")}
              id="prev"
              namecommand="prev"
              className="btn btn-default"
              onClick={this.putPlayerCommando}
            >
              <i className="glyphicon glyphicon-chevron-left" />
            </button>
            <button
              title={t("PLAY_PAUSE")}
              id="status"
              namecommand={this.state.statusPlayer.status === "play" ? "pause" : "play"}
              className="btn btn-primary"
              onClick={this.putPlayerCommando}
            >
              {this.state.statusPlayer.status === "play" ? (
                <i className="glyphicon glyphicon-pause pause" />
              ) : (
                <i className="glyphicon glyphicon-play play" />
              )}
            </button>
            <button
              title={t("NEXT_SONG")}
              id="skip"
              namecommand="skip"
              className="btn btn-default"
              onClick={this.putPlayerCommando}
            >
              <i className="glyphicon glyphicon-chevron-right" />
            </button>
            <button className="btn btn-default hidden" />
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default withTranslation()(AdminHeader);
