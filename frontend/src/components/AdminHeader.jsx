import React, { Component } from "react";
import i18next from 'i18next';
import ReactDOM from 'react-dom';
import { expand, getSocket } from "./tools";
import axios from "axios";
import RadioButton from "./generic/RadioButton";
import KmAppHeaderDecorator from "./decorators/KmAppHeaderDecorator"
import AdminMessageModal from "./modals/AdminMessageModal"
import store from "../store"

class AdminHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      privateMode: Boolean(this.props.config.Karaoke.Private),
      statusPlayer: {},
      dropDownMenu: false,
      songVisibilityOperator: Boolean(this.props.config.Playlist.MysterySongs.AddedSongVisibilityAdmin)
    };
  }


  componentDidMount() {
    getSocket().on("playerStatus", data => {
      var val = parseInt(data.volume);
      var base = 100;
      var pow = 0.76;
      val = val / base;
      data.volume = base * Math.pow(val, 1 / pow);
      this.setState({ statusPlayer: data });
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.config.Playlist.MysterySongs.AddedSongVisibilityAdmin 
      !== prevProps.config.Playlist.MysterySongs.AddedSongVisibilityAdmin) {
      this.setState({ songVisibilityOperator: Boolean(this.props.config.Playlist.MysterySongs.AddedSongVisibilityAdmin)});
    }
  }

  saveMode = mode => {
    var data = expand("Karaoke.Private", mode);
    this.setState({ privateMode: mode });
    axios.put("/api/admin/settings", { setting: JSON.stringify(data) });
  };

  saveOperatorAdd = songVisibility => {
    var data = expand("Playlist.MysterySongs.AddedSongVisibilityAdmin", songVisibility);
    this.setState({ songVisibilityOperator: songVisibility });
    axios.put("/api/admin/settings", { setting: JSON.stringify(data) });
  };

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

  adminMessage = () => {
    ReactDOM.render(<AdminMessageModal />, document.getElementById('modal'));
  };

  render() {
    let volume = parseInt(this.state.statusPlayer.volume);
    volume = isNaN(volume) ? 100 : volume;

    return (
      <KmAppHeaderDecorator mode="admin">
          <div
            className="btn btn-default btn-dark"
          >
            <button
              className="btn btn-dark klogo"
              type="button"
              onClick={() => this.setState({dropDownMenu: !this.state.dropDownMenu})}
            />
            {this.state.dropDownMenu ?
              <ul className="dropdown-menu">
                <li
                  title={i18next.t("ACCOUNT")}
                  action="account"
                  className="btn btn-default btn-dark"
                  onClick={this.props.toggleProfileModal}
                >
                  <i className="fas fa-user"></i>
                </li>
                <li
                  title={i18next.t("LOGOUT")} onClick={store.logOut}
                  className="btn btn-default btn-dark"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </li>
                <li
                  title={i18next.t("SHUTDOWN")}
                  className="btn btn-default btn-dark"
                  onClick={this.props.powerOff}
                >
                  <i className="fas fa-power-off"></i>
                </li>
              </ul> : null
            }
          </div>

          <button
            title={i18next.t("MESSAGE")}
            id="adminMessage"
            className="btn btn-dark messageButton"
            onClick={this.adminMessage}
          >
            <i className="fas fa-comment"></i>
          </button>

          <button
            title={i18next.t("SHOW_HIDE_SUBS")}
            id="showSubs"
            namecommand={this.state.statusPlayer.showSubs ? "hideSubs" : "showSubs"}
            className="btn btn-dark subtitleButton"
            onClick={this.putPlayerCommando}
          >
            {this.state.statusPlayer.showSubs ? (
              <i className="fas fa-closed-captioning"></i>
            ) : (
              <span className="fa-stack">
                <i className="fas fa-closed-captioning fa-stack-1x"></i>
                <i className="fas fa-ban fa-stack-2x" style={{color:"#943d42",opacity:0.7}}></i>
              </span>
            )}
          </button>

          <button 
            type="button"
            title={i18next.t("MUTE_UNMUTE")}
            id="mutestatus"
            name="mute"
            className="btn btn-dark volumeButton"
          >
            {
                volume === 0 || this.state.statusPlayer.mutestatus 
                ? <i className="fas fa-volume-mute"></i>
                : (
                  volume > 66
                    ? <i className="fas fa-volume-up"></i>
                    : (
                      volume > 33
                        ? <i className="fas fa-volume-down"></i>
                        : <i className="fas fa-volume-off"></i>
                    )
                )
            }
            <input
              title={i18next.t("VOLUME_LEVEL")}
              namecommand="setVolume"
              id="volume"
              defaultValue={volume}
              type="range"
              onMouseUp={this.putPlayerCommando}
            />
          </button>
          

          

          <div className="header-group switchs">
            <RadioButton
              title={i18next.t("SWITCH_PRIVATE")}
              name="Karaoke.Private"
              buttons={[
                {
                  label:i18next.t("PRIVATE"),
                  active:this.state.privateMode,
                  activeColor:"#994240",
                  onClick:() => this.saveMode(true),
                  
                },
                {
                  label:i18next.t("PUBLIC"),
                  active:!this.state.privateMode,
                  activeColor:"#57bb00",
                  onClick:() => this.saveMode(false),
                  
                }
              ]}
            ></RadioButton>
              <RadioButton
              title={i18next.t("SWITCH_OPTIONS")}
              name="optionsButton"
              buttons={[
                {
                  label:i18next.t("CL_PLAYLISTS"),
                  active:!this.props.options,
                  onClick:this.props.setOptionMode,
                },
                {
                  label:i18next.t("OPTIONS"),
                  active:this.props.options,
                  onClick:this.props.setOptionMode,
                  
                }
              ]}
            ></RadioButton>
          </div>
          <div className="header-group switchs">
            <RadioButton
                title={i18next.t("ENGINE_ADDED_SONG_VISIBILITY_ADMIN")}
                name="Playlist.MysterySongs.AddedSongVisibilityAdmin"
                orientation="vertical"
                buttons={[
                  {
                    label:i18next.t("ADMIN_PANEL_ADDED_SONG_VISIBILITY_NORMAL"),
                    active:this.state.songVisibilityOperator,
                    activeColor:"#57bb00",
                    onClick:() => this.saveOperatorAdd(true),
                    
                  },
                  {
                    label:i18next.t("ADMIN_PANEL_ADDED_SONG_VISIBILITY_MYSTERY"),
                    active:!this.state.songVisibilityOperator,
                    activeColor:"#994240",
                    onClick:() => this.saveOperatorAdd(false),
                    
                  }
                ]}
              ></RadioButton>
          </div>
          <div className="header-group controls">
            <button
              title={i18next.t("STOP_AFTER")}
              id="stopAfter"
              namecommand="stopAfter"
              className="btn btn-danger-low"
              onClick={this.putPlayerCommando}
            >
              <i className="fas fa-clock"></i>
            </button>
            <button
              title={i18next.t("STOP_NOW")}
              id="stopNow"
              namecommand="stopNow"
              className="btn btn-danger"
              onClick={this.putPlayerCommando}
            >
              <i className="fas fa-stop"></i>
            </button>
            <button
              title={i18next.t("REWIND")}
              id="goTo"
              namecommand="goTo"
              defaultValue="0"
              className="btn btn-dark"
              onClick={this.putPlayerCommando}
            >
              <i className="fas fa-backward"></i>
            </button>

            <button
              title={i18next.t("PREVIOUS_SONG")}
              id="prev"
              namecommand="prev"
              className="btn btn-default"
              onClick={this.putPlayerCommando}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              title={i18next.t("PLAY_PAUSE")}
              id="status"
              namecommand={this.state.statusPlayer.playerStatus === "play" ? "pause" : "play"}
              className="btn btn-primary"
              onClick={this.putPlayerCommando}
            >
              {this.state.statusPlayer.playerStatus === "play" ? (
                <i className="fas fa-pause"></i>
              ) : (
                <i className="fas fa-play"></i>
              )}
            </button>
            <button
              title={i18next.t("NEXT_SONG")}
              id="skip"
              namecommand="skip"
              className="btn btn-default"
              onClick={this.putPlayerCommando}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
      </KmAppHeaderDecorator>
    );
  }
}

export default AdminHeader;
