import React, { Component } from "react";
import i18next from 'i18next';
import KmAppWrapperDecorator from "./decorators/KmAppWrapperDecorator"
import KmAppHeaderDecorator from "./decorators/KmAppHeaderDecorator"
import KmAppBodyDecorator from "./decorators/KmAppBodyDecorator"
import PlaylistMainDecorator from "./decorators/PlaylistMainDecorator";
import Playlist from "./karas/Playlist";
import RestrictedHelpModal from "./modals/RestrictedHelpModal"
import PollModal from "./modals/PollModal"
import getLuckyImage from "../assets/clover.png"
import webappClose from "../assets/dame.jpg"
import HelpModal from "./modals/HelpModal";
import LoginModal from "./modals/LoginModal";
import ProfilModal from "./modals/ProfilModal";
import RadioButton from "./generic/RadioButton";
import axios from "axios";
import ProgressBar from "./karas/ProgressBar";
import {buildKaraTitle, getSocket, is_touch_device,displayMessage,callModal} from './tools';

class PublicPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isPollActive: false,
      pollModal: false,
      loginModal: !this.props.logInfos.token,
      profileModal: false,
      helpModal: false,
      lyrics: false,
      restrictedHelpModal: this.props.settings.config.Frontend.Mode === 1,
      filterValue1: "",
      filterValue2: "",
      pseudoValue: "",
      mobileMenu: false,
      idsPlaylist: {left: '', right: ''},
      dropDownMenu: false,
      searchMenuOpen: false
    };
    this.openLoginOrProfileModal = this.openLoginOrProfileModal.bind(this);
    this.toggleHelpModal = this.toggleHelpModal.bind(this);
    this.setLyrics = this.setLyrics.bind(this);
    this.getLucky = this.getLucky.bind(this);
    this.changePseudo = this.changePseudo.bind(this);
    this.majIdsPlaylist = this.majIdsPlaylist.bind(this);
    this.toggleSearchMenu = this.toggleSearchMenu.bind(this);
    this.changeFilterValue = this.changeFilterValue.bind(this);
  }

  majIdsPlaylist(side, value) {
    var idsPlaylist = this.state.idsPlaylist;
    if(side === 1) {
      idsPlaylist.left = Number(value);
    } else {
      idsPlaylist.right = Number(value);
    }
    this.setState({idsPlaylist : idsPlaylist})
  }

  async componentDidMount() {
    getSocket().on('newSongPoll', () => this.setState({ isPollActive: true, pollModal: true }));
    getSocket().on('songPollEnded', () => this.setState({ isPollActive: false }));
    getSocket().on('songPollResult', () => {
      displayMessage('success', '', i18next.t('POLLENDED', { kara: data.kara.substring(0, 100), votes: data.votes }));
    });
    getSocket().on('adminMessage', data => displayMessage('info', i18next.t('CL_INFORMATIVE_MESSAGE')  + ' <br/>', data.message, data.duration));
  }

  openLoginOrProfileModal() {
    if (this.props.logInfos.token) {
      this.setState({ profileModal: true });
    } else {
      this.setState({ loginModal: true });
    }
  }

  toggleHelpModal() {
    this.setState({ loginModal: false, helpModal: !this.state.helpModal, dropDownMenu:false });
  }

  setLyrics() {
    this.setState({ lyrics: !this.state.lyrics });
  }

  // pick a random kara & add it after (not) asking user's confirmation
  async getLucky() {
    var response = await axios.get('/api/public/karas?filter=' + this.state.filterValue+'&random=1');
    if (response.data.data && response.data.data.content && response.data.data.content[0]) {
      var chosenOne = response.data.data.content[0].kid;
      var response2 = await axios.get('/api/public/karas/' + chosenOne);
      callModal('confirm', i18next.t('CL_CONGRATS'), i18next.t('CL_ABOUT_TO_ADD',{title: buildKaraTitle(response2.data.data)}), () => {
        axios.post('/api/public/karas/' + chosenOne, { requestedby: this.props.logInfos.username })
      }, 'lucky');
    }
  }

  async changePseudo(e) {
    var response = await axios.put('/api/public/myaccount', { nickname : e.target.value });
    this.setState({pseudoValue: response.data.nickname});
  }

  stopVideo() {
    var video = $('#video');
    $('.overlay').hide();
    video[0].pause();
    video.removeAttr('src');
  }

  toggleSearchMenu() {
    this.setState({searchMenuOpen: !this.state.searchMenuOpen});
  }

  changeFilterValue(e, side) {
    if (side === 1) {
      this.setState({ filterValue1: e.target.value });
    } else {
      this.setState({ filterValue2: e.target.value });
    }
  }

  render() {
    return (
      <div id="publicPage" className="kmapp--wrapper">
        {this.props.settings.config.Frontend.Mode === 0
          ?
            <center style={{ top: "50%", transform: translateY("-50%"), position: "relative" }}>
              <img style={{ maxWidth: "100%", maxHeight: "calc(100vh - 150px)" }}
                src={webappClose} />
              <div style={{ fontSize: "30px", padding: "10px" }}>{i18next.t("WEBAPPMODE_CLOSED_MESSAGE")}</div>
            </center>
          :
            <React.Fragment>
              {this.state.loginModal ?
                <LoginModal scope='public' config={this.props.settings.config} toggleHelpModal={this.toggleHelpModal} logInfos={this.props.logInfos}
                  toggleLoginModal={() => this.setState({ loginModal: !this.state.loginModal })} updateLogInfos={this.props.updateLogInfos} /> : null
              }
              {this.state.profileModal ?
                <ProfilModal settingsOnline={this.props.settings.config.Online} updateLogInfos={this.props.updateLogInfos} logInfos={this.props.logInfos} 
                  toggleProfileModal={() => this.setState({profileModal:!this.state.profileModal})} /> : null
              }
              {this.state.restrictedHelpModal ?
                <RestrictedHelpModal /> : null
              }
              {this.state.isPollActive ?
                <PollModal pollModal={this.state.pollModal} closePollModal={() => this.setState({ pollModal: false })} /> : null
              }
              {this.state.helpModal ?
                <HelpModal toggleHelpModal={this.toggleHelpModal} version={this.props.settings.version} /> : null
              }

              <KmAppWrapperDecorator>

                {
                  this.props.settings.config.Frontend.Mode === 2
                  ?
                    <KmAppHeaderDecorator mode="public">

                      <button type="button" className={"searchMenuButton btn btn-sm btn-default" + (this.state.searchMenuOpen ? " searchMenuButtonOpen" : "")} 
                        onClick={this.toggleSearchMenu}>
                        <i className="glyphicon glyphicon-filter"></i>
                      </button>

                      <div className="plSearch" style={{ width: (this.props.logInfos.role != 'guest' ? "" : "100%") }}>
                        <i className="fas fa-search"></i>
                        <input type="text" className="form-control" side="1" name="searchPlaylist"
                          defaultValue={this.state.filterValue} onChange={(e) => this.changeFilterValue(e, 1)} />
                      </div>

                      <button title={i18next.t("GET_LUCKY")} className="btn btn-lg btn-action btn-default getLucky" onClick={this.getLucky}>
                        <img src={getLuckyImage} />
                      </button>

                      {this.props.logInfos.role != 'guest' ?
                        <div className="pseudoChange">
                          <input list="pseudo" type="text" id="choixPseudo" className="form-control" placeholder={i18next.t("NICKNAME")} 
                          onBlur={this.changePseudo} onKeyPress={(e) => {if (e.which == 13) this.changePseudo(e)}} />
                        </div> : null
                      }

                      <div className="dropdown">
                        <button className="btn btn-dark dropdown-toggle klogo" id="menuPC" type="button"
                          onClick={() => this.setState({dropDownMenu: !this.state.dropDownMenu})}>
                        </button>
                        {this.state.dropDownMenu ?
                          <ul className="dropdown-menu">
                            <li><a href="#" className="changePseudo" onClick={this.openLoginOrProfileModal}>
                              <i className="glyphicon glyphicon-user"></i> {i18next.t("ACCOUNT")}</a>
                            </li>
                            <li><a href="/admin" id="logAdmin" target="_blank"><i className="glyphicon glyphicon-wrench"></i> Admin</a></li>
                            <li><a href="#" className="showSettings" onClick={this.toggleHelpModal}>
                              <i className="glyphicon glyphicon-info-sign"></i> {i18next.t("HELP")}</a>
                            </li>
                            <li><a href="#" className="logout" onClick={this.props.logOut}><i className="glyphicon glyphicon-log-out"></i> {i18next.t("LOGOUT")}</a></li>
                          </ul> : null
                        }
                      </div>

                      <div className="switchParent">
                        {this.state.isPollActive ?
                          <button className='btn btn-default showPoll' onClick={() => this.setState({ pollModal: true })}>
                            <i className="fas fa-chart-line"></i>
                          </button> : null
                        }
                        {is_touch_device() ?
                          null :
                          <RadioButton
                            title={i18next.t("SWITCH_OPTIONS")}
                            name="publicSwitchButton"
                            buttons={[
                              {
                                label: i18next.t("SWITCH_BAR_INFOS_TITLE"),
                                active: !this.state.lyrics,
                                onClick: this.setLyrics,
                              },
                              {
                                label: i18next.t("SWITCH_BAR_INFOS_LYRICS"),
                                active: this.state.lyrics,
                                onClick: this.setLyrics,

                              }
                            ]}
                          ></RadioButton>
                        }
                      </div>

                    </KmAppHeaderDecorator>
                  :
                    null
                }

                <ProgressBar lyrics={this.state.lyrics}></ProgressBar>
                
                <KmAppBodyDecorator mode={this.props.settings.config.Frontend.Mode} extraClass={this.props.settings.config.Frontend.Mode === 1 ? " mode1" : ""}>
                  <PlaylistMainDecorator>
                    <Playlist
                      scope='public'
                      side={1}
                      navigatorLanguage={this.props.navigatorLanguage}
                      logInfos={this.props.logInfos}
                      config={this.props.settings.config} 
                      idPlaylistTo={this.state.idsPlaylist.right}
                      majIdsPlaylist={this.majIdsPlaylist}
                      tags={this.props.tags}
                      toggleSearchMenu={this.toggleSearchMenu}
                      searchMenuOpen={this.state.searchMenuOpen} 
                      changeFilterValue={this.changeFilterValue}
                      filterValue={this.state.filterValue1} />
                    <Playlist
                      scope='public'
                      side={2}
                      navigatorLanguage={this.props.navigatorLanguage}
                      logInfos={this.props.logInfos}
                      config={this.props.settings.config} 
                      idPlaylistTo={this.state.idsPlaylist.left}
                      majIdsPlaylist={this.majIdsPlaylist}
                      changeFilterValue={this.changeFilterValue}
                      filterValue={this.state.filterValue2} />
                  </PlaylistMainDecorator>
                </KmAppBodyDecorator>

              </KmAppWrapperDecorator>

              <div className="toastMessageContainer"></div>

              {
                this.props.settings.config.Frontend.Mode === 2 && this.state.isPollActive
                ?
                  <div className="fixed-action-btn right right2" id="mobileActions">
                    <a className="btn-floating btn-large waves-effect z-depth-3 showPoll" onClick={() => this.setState({ pollModal: true })}>
                      <i className="glyphicon glyphicon-stats"></i>
                    </a>
                  </div>
                :
                  null
              }

              <div className="fixed-action-btn right" id="mobileActions">
                <a className="btn-floating btn-large waves-effect z-depth-3 klogo" 
                  onClick={() => this.setState({mobileMenu: !this.state.mobileMenu})}
                  style={{ backgroundColor: "#1b4875", border: ".5px solid #FFFFFF12" }}>
                </a>
                {this.state.mobileMenu ?
                  <ul>
                    {this.props.settings.config.Frontend.Mode === 2 ?
                      <React.Fragment>
                        <li><a className="z-depth-3 btn-floating btn-large logout" style={{ backgroundColor: "#111" }} onClick={this.props.logOut}>
                          <i className="glyphicon glyphicon-log-out"></i>
                        </a></li>
                        <li><a className="z-depth-3 btn-floating btn-large getLucky" style={{ backgroundColor: "#111" }} onClick={this.getLucky}>
                          <img style={{ height: "80%", marginTop: "10%" }} src={getLuckyImage} />
                        </a></li>
                      </React.Fragment> : null
                    }
                    <li><a className="z-depth-3 btn-floating btn-large showSettings" style={{ backgroundColor: "#613114" }}><i className="glyphicon glyphicon-question-sign"></i></a></li>
                    <li><a className="z-depth-3 btn-floating btn-large changePseudo" id="changePseudo" style={{ backgroundColor: "#431b50" }} onClick={this.openLoginOrProfileModal}><i className="glyphicon glyphicon-user"></i></a></li>
                    <li><a className="z-depth-3 btn-floating btn-large" id="switchInfoBar" style={{ backgroundColor: "#125633" }} onClick={this.setLyrics}>
                      {this.state.lyrics ?
                        <i className="glyphicon glyphicon-subtitles lyrics"></i> :
                        <i className="glyphicon glyphicon-info-sign infos"></i>
                      }
                    </a></li>
                  </ul> : null
                }
              </div>

              <div className="overlay" onClick={this.stopVideo}>
                <video id="video" type="video/mp4" autoPlay></video>
              </div>

              <a id="downloadAnchorElem"></a>
            </React.Fragment>
        }
      </div>
    );
  }
}

export default PublicPage;
