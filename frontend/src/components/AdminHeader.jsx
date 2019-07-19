import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import { expand, eraseCookie } from "./toolsReact";
import axios from "axios";
import RadioButton from "./RadioButton.jsx";

class AdminHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      privateMode: this.props.config && this.props.config.Karaoke.Private,
      options: false,
      statusPlayer: {}
    };
    this.saveMode = this.saveMode.bind(this);
    this.setOptionMode = this.setOptionMode.bind(this);
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
    // mode have to be a boolean [true,false]
    if(typeof mode =='object') // if we receive an event => toggle current state
      mode = !this.state.privateMode;

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

  setOptionMode(mode) {
    // mode have to be a boolean [true,false]
    if(typeof mode =='object') // if we receive an event => toggle current state
      mode = !this.state.options;

    this.setState({ options: mode });
    // setState is an asynchrone action ... value is not yet set in "this.state.options"
    // this is why I use an internal var all along
    if (!mode) {
      $("#playlist").show();
      $("#manage").hide();
    } else {
      $("#playlist").hide();
      $("#manage").show();
      if (window.introManager && window.introManager._currentStep) {
        window.introManager.nextStep();
      }
    }
  }

  poweroff() {
    axios.post("/api/admin/shutdown");
  }

  adminMessage() {
    this.props.callModal(
      "custom",
      "Message indispensable",
      '<select class="form-control" name="destination"><option value="screen">' +
        i18n.__("CL_SCREEN") +
        "</option>" +
        '<option value="users">' +
        i18n.__("CL_USERS") +
        '</option><option value="all">' +
        i18n.__("CL_ALL") +
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

  logout() {
    eraseCookie('mugenToken');
    eraseCookie('mugenTokenOnline');
    window.location.reload();
  }

  render() {
    const t = this.props.t;
    if (this.props.config && this.props.config.Online.Stats === undefined) {
      window.callOnlineStatsModal();
    }
    return (
      <React.Fragment>
        <div
          id="header"
          className="header"
          introstep="6"
          introlabel="lecteur"
          introtooltipclass="_introBottom"
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
                onClick={this.props.profileModal}
              >
                <i className="glyphicon glyphicon-user" />
              </li>
              <li
                title={t("LOGOUT")}
                className="btn btn-default btn-dark"
                onClick={this.logout}
              >
                <i className="glyphicon glyphicon-log-out" />
              </li>
              <li
                title={t("SHUTDOWN")}
                className="btn btn-default btn-dark"
                onClick={this.poweroff}
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
              data-introstep="7"
              data-introlabel="mode"
              name="Karaoke.Private"
              buttons={[
                {
                  label:t("PRIVATE"),
                  active:this.props.config && this.state.privateMode,
                  activeColor:"#994240",
                  onClick:() => this.saveMode(true),
                  
                },
                {
                  label:t("PUBLIC"),
                  active:!(this.props.config && this.state.privateMode),
                  activeColor:"#57bb00",
                  onClick:() => this.saveMode(false),
                  
                }
              ]}
            ></RadioButton>

            <RadioButton
              title={t("SWITCH_OPTIONS")}
              data-introstep="13"
              data-introlabel="settings"
              name="optionsButton"
              buttons={[
                {
                  label:t("CL_PLAYLISTS"),
                  active:!(this.props.config && this.state.options),
                  onClick:() => this.setOptionMode(false),
                },
                {
                  label:t("OPTIONS"),
                  active:this.props.config && this.state.options,
                  onClick:() => this.setOptionMode(true),
                  
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
              namecommand="play"
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
