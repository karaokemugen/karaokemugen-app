import React, { Component } from "react";
import i18next from 'i18next';
import KmAppWrapperDecorator from "./decorators/KmAppWrapperDecorator"
import KmAppHeaderDecorator from "./decorators/KmAppHeaderDecorator"
import KmAppBodyDecorator from "./decorators/KmAppBodyDecorator"
import PlaylistMainDecorator from "./decorators/PlaylistMainDecorator";
import Playlist from "./karas/Playlist";
import PollModal from "./modals/PollModal"
import getLuckyImage from "../assets/clover.png"
import webappClose from "../assets/dame.jpg"
import HelpModal from "./modals/HelpModal";
import LoginModal from "./modals/LoginModal";
import ProfilModal from "./modals/ProfilModal";
import ClassicModeModal from './modals/ClassicModeModal';
import RadioButton from "./generic/RadioButton";
import axios from "axios";
import ProgressBar from "./karas/ProgressBar";
import {buildKaraTitle, getSocket, is_touch_device,displayMessage,callModal} from './tools';
import store from "../store";
import ReactDOM from 'react-dom';
class PublicPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isPollActive: false,
      helpModal: false,
      lyrics: false,
      pseudoValue: "",
      mobileMenu: false,
      idsPlaylist: {left: '', right: ''},
      dropDownMenu: false,
      searchMenuOpen: false,
      classicModeModal: false
    };
    if (!store.getLogInfos().token) {
      this.openLoginOrProfileModal();
    } else if (this.props.settings.config.Frontend.Mode === 1) {
      callModal('confirm', i18next.t("WEBAPPMODE_LIMITED_NAME"),
        (<React.Fragment>
          <div className="text">
            {i18next.t("CL_HELP_PUBLIC_MOBILE_RESTRICTED")}
          </div>
          <div className="text">
            {i18next.t("CL_HELP_PUBLIC_MOBILE_RESTRICTED_DESCRIPTION")}
          </div>
        </React.Fragment>));
    }
  }

  majIdsPlaylist = (side, value) => {
    var idsPlaylist = this.state.idsPlaylist;
    if(side === 1) {
      idsPlaylist.left = Number(value);
    } else {
      idsPlaylist.right = Number(value);
    }
    this.setState({idsPlaylist : idsPlaylist})
  };

  async componentDidMount() {
    getSocket().on('playerStatus', this.displayClassicModeModal);
    getSocket().on('newSongPoll', () => {
      this.setState({ isPollActive: true});
      ReactDOM.render(<PollModal />, document.getElementById('modal'));
    });
    getSocket().on('songPollEnded', () => {
      this.setState({ isPollActive: false });
      ReactDOM.unmountComponentAtNode(document.getElementById('modal'));
    });
    getSocket().on('songPollResult', (data) => {
      displayMessage('success',  i18next.t('POLLENDED', { kara: data.kara.substring(0, 100), votes: data.votes }));
    });
    getSocket().on('adminMessage', data => displayMessage('info', 
      <div><label>{i18next.t('CL_INFORMATIVE_MESSAGE')}</label> <br/>{data.message}</div>, data.duration));
  }

  displayClassicModeModal = async data => {
    if (data.status === 'stop' && data.playerStatus === 'pause' && data.currentRequester === store.getLogInfos().username && !this.state.classicModeModal) {
        ReactDOM.render(<ClassicModeModal />, document.getElementById('modal'));
        this.setState({ classicModeModal: true });
    } else if (data.playerStatus !== 'pause' && this.state.classicModeModal) {
        ReactDOM.unmountComponentAtNode(document.getElementById('modal'));
        this.setState({ classicModeModal: false });
    }
};

  openLoginOrProfileModal = () => {
    if (store.getLogInfos().token) {
      ReactDOM.render(<ProfilModal
        settingsOnline={this.props.settings.config.Online}
      />, document.getElementById('modal'));
    } else {
      ReactDOM.render(<LoginModal
        scope="public"
        version={this.props.settings.version}
      />, document.getElementById('modal'));
    }
  };

  setLyrics = () => {
    this.setState({ lyrics: !this.state.lyrics });
  };

  // pick a random kara & add it after (not) asking user's confirmation
  getLucky = async () => {
    var response = await axios.get('/api/public/karas?filter=' + store.getFilterValue(1)+'&random=1');
    if (response.data.data && response.data.data.content && response.data.data.content[0]) {
      var chosenOne = response.data.data.content[0].kid;
      var response2 = await axios.get('/api/public/karas/' + chosenOne);
      callModal('confirm', i18next.t('CL_CONGRATS'), i18next.t('CL_ABOUT_TO_ADD',{title: buildKaraTitle(response2.data.data)}), () => {
        axios.post('/api/public/karas/' + chosenOne, { requestedby: store.getLogInfos().username })
      }, 'lucky');
    }
  };

  changePseudo = async e => {
    var response = await axios.put('/api/public/myaccount', { nickname : e.target.value });
    this.setState({pseudoValue: response.data.nickname});
  };

  toggleSearchMenu = () => {
    this.setState({searchMenuOpen: !this.state.searchMenuOpen});
  };

  updateKidPlaying = kid => {
    this.setState({kidPlaying: kid});
  };

  render() {
    var logInfos = store.getLogInfos();
    return (
      <div id="publicPage" className="kmapp--wrapper">
        {this.props.settings.config.Frontend.Mode === 0 ? (
          <center
            style={{
              top: "25%",
              position: "relative"
            }}
          >
            <img
              style={{ maxWidth: "100%", maxHeight: "calc(100vh - 150px)" }}
              src={webappClose}
            />
            <div style={{ fontSize: "30px", padding: "10px" }}>
              {i18next.t("WEBAPPMODE_CLOSED_MESSAGE")}
            </div>
          </center>
        ) : (
          <React.Fragment>
            <KmAppWrapperDecorator>
              {this.props.settings.config.Frontend.Mode === 2 ? (
                <KmAppHeaderDecorator mode="public">
                  <button
                    type="button"
                    className={
                      "searchMenuButton btn btn-sm btn-default" +
                      (this.state.searchMenuOpen
                        ? " searchMenuButtonOpen"
                        : "")
                    }
                    onClick={this.toggleSearchMenu}
                  >
                    <i className="fas fa-filter" />
                  </button>

                  <div
                    className="plSearch"
                    style={{
                      width:
                        logInfos.role != "guest" ? "" : "100%"
                    }}
                  >
                    <i className="fas fa-search" />
                    <input
                      type="text"
                      className="form-control"
                      side="1"
                      name="searchPlaylist"
                      defaultValue={store.getFilterValue(1)}
                      onChange={e =>
                        store.setFilterValue(
                          e.target.value,
                          1,
                          this.state.idsPlaylist.left
                        )
                      }
                    />
                  </div>

                  {is_touch_device() ? null : (
                    <button
                      title={i18next.t("GET_LUCKY")}
                      className="btn btn-lg btn-action btn-default getLucky"
                      onClick={this.getLucky}
                    >
                      <img src={getLuckyImage} />
                    </button>
                  )}

                  {logInfos.role != "guest" &&
                  this.props.settings.config.Frontend.Mode === 1 ? (
                    <div className="pseudoChange">
                      <input
                        list="pseudo"
                        type="text"
                        id="choixPseudo"
                        className="form-control"
                        placeholder={i18next.t("NICKNAME")}
                        onBlur={this.changePseudo}
                        onKeyPress={e => {
                          if (e.which == 13) this.changePseudo(e);
                        }}
                      />
                    </div>
                  ) : null}

                  {is_touch_device() ? null : (
                    <div className="dropdown">
                      <button
                        className="btn btn-dark dropdown-toggle klogo"
                        id="menuPC"
                        type="button"
                        onClick={() =>
                          this.setState({
                            dropDownMenu: !this.state.dropDownMenu
                          })
                        }
                      />
                      {this.state.dropDownMenu ? (
                        <ul className="dropdown-menu">
                          <li>
                            <a
                              href="#"
                              className="changePseudo"
                              onClick={this.openLoginOrProfileModal}
                            >
                              <i className="fas fa-user" />&nbsp;
                              {i18next.t("ACCOUNT")}
                            </a>
                          </li>
                          <li>
                            <a href="/admin" id="logAdmin" target="_blank">
                              <i className="fas fa-wrench" /> Admin
                            </a>
                          </li>
                          <li>
                            <a href="#" onClick={() => 
                                ReactDOM.render(<HelpModal version={this.props.settings.version} />, document.getElementById('modal'))}>
                              <i className="fas fa-info-circle" />&nbsp;
                              {i18next.t("HELP")}
                            </a>
                          </li>
                          <li>
                            <a
                              href="#"
                              className="logout"
                              onClick={store.logOut}
                            >
                              <i className="fas fa-sign-out-alt" />&nbsp;
                              {i18next.t("LOGOUT")}
                            </a>
                          </li>
                        </ul>
                      ) : null}
                    </div>
                  )}

                  <div className="switchParent">
                    {this.state.isPollActive ? (
                      <button
                        className="btn btn-default showPoll"
                        onClick={() => ReactDOM.render(<PollModal />, document.getElementById('modal'))}
                      >
                        <i className="fas fa-chart-line" />
                      </button>
                    ) : null}
                    {is_touch_device() ? null : (
                      <RadioButton
                        title={i18next.t("SWITCH_OPTIONS")}
                        name="publicSwitchButton"
                        buttons={[
                          {
                            label: i18next.t("SWITCH_BAR_INFOS_TITLE"),
                            active: !this.state.lyrics,
                            onClick: this.setLyrics
                          },
                          {
                            label: i18next.t("SWITCH_BAR_INFOS_LYRICS"),
                            active: this.state.lyrics,
                            onClick: this.setLyrics
                          }
                        ]}
                      />
                    )}
                  </div>
                </KmAppHeaderDecorator>
              ) : null}

              <ProgressBar scope="public" lyrics={this.state.lyrics} />

              <KmAppBodyDecorator
                mode={this.props.settings.config.Frontend.Mode}
                extraClass={
                  this.props.settings.config.Frontend.Mode === 1
                    ? " mode1"
                    : ""
                }
              >
                <PlaylistMainDecorator>
                  <Playlist
                    scope="public"
                    side={1}
                    navigatorLanguage={this.props.navigatorLanguage}
                    config={this.props.settings.config}
                    idPlaylistTo={this.state.idsPlaylist.right}
                    majIdsPlaylist={this.majIdsPlaylist}
                    tags={this.props.tags}
                    toggleSearchMenu={this.toggleSearchMenu}
                    searchMenuOpen={this.state.searchMenuOpen}
                    showVideo={this.props.showVideo}
                    kidPlaying={this.state.kidPlaying}
                  />
                  <Playlist
                    scope="public"
                    side={2}
                    navigatorLanguage={this.props.navigatorLanguage}
                    config={this.props.settings.config}
                    idPlaylistTo={this.state.idsPlaylist.left}
                    majIdsPlaylist={this.majIdsPlaylist}
                    showVideo={this.props.showVideo}
                    updateKidPlaying={this.updateKidPlaying}
                  />
                </PlaylistMainDecorator>
              </KmAppBodyDecorator>
            </KmAppWrapperDecorator>

            {is_touch_device() ? (
              <React.Fragment>
                {this.props.settings.config.Frontend.Mode === 2 &&
                this.state.isPollActive ? (
                  <div
                    className="fixed-action-btn right right2 mobileActions"
                  >
                    <a
                      className="btn-floating btn-large waves-effect z-depth-3 showPoll"
                      onClick={() => ReactDOM.render(<PollModal />, document.getElementById('modal'))}
                    >
                      <i className="fas fa-bar-chart" />
                    </a>
                  </div>
                ) : null}

                <div className="fixed-action-btn right mobileActions">
                  <a
                    className="btn-floating btn-large waves-effect z-depth-3 klogo"
                    onClick={() =>
                      this.setState({ mobileMenu: !this.state.mobileMenu })
                    }
                    style={{
                      backgroundColor: "#1b4875",
                      border: ".5px solid #FFFFFF12"
                    }}
                  />
                  {this.state.mobileMenu ? (
                    <ul>
                      {this.props.settings.config.Frontend.Mode === 2 ? (
                        <React.Fragment>
                          <li>
                            <a
                              className="z-depth-3 btn-floating btn-large logout"
                              style={{ backgroundColor: "#111" }}
                              onClick={store.logOut}
                            >
                              <i className="fas fa-sign-out-alt" />
                            </a>
                          </li>
                          <li>
                            <a
                              className="z-depth-3 btn-floating btn-large getLucky"
                              style={{ backgroundColor: "#111" }}
                              onClick={this.getLucky}
                            >
                              <img
                                style={{ height: "80%", marginTop: "10%" }}
                                src={getLuckyImage}
                              />
                            </a>
                          </li>
                        </React.Fragment>
                      ) : null}
                      <li>
                        <a
                          className="z-depth-3 btn-floating btn-large"
                          style={{ backgroundColor: "#613114" }}
                          onClick={() => ReactDOM.render(<HelpModal />, document.getElementById('modal'))}
                        >
                          <i className="fas fa-question-circle" />
                        </a>
                      </li>
                      <li>
                        <a
                          className="z-depth-3 btn-floating btn-large changePseudo"
                          id="changePseudo"
                          style={{ backgroundColor: "#431b50" }}
                          onClick={this.openLoginOrProfileModal}
                        >
                          <i className="fas fa-user" />
                        </a>
                      </li>
                      <li>
                        <a
                          className="z-depth-3 btn-floating btn-large"
                          id="switchInfoBar"
                          style={{ backgroundColor: "#125633" }}
                          onClick={this.setLyrics}
                        >
                          {this.state.lyrics ? (
                            <i className="fas fa-cc lyrics" />
                          ) : (
                            <i className="fas fa-info-circle infos" />
                          )}
                        </a>
                      </li>
                    </ul>
                  ) : null}
                </div>
              </React.Fragment>
            ) : null}


          </React.Fragment>
        )}
      </div>
    );
  }
}

export default PublicPage;
